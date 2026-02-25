import logging
import time
import irsdk

class TelemetryReader:
    def __init__(self):
        self.ir = irsdk.IRSDK()
        self.connected = False
        self.last_update = 0
        
        # Dead Reckoning State
        self.x = 0.0
        self.y = 0.0
        self.last_update_time = 0.0
        
        # Driver Cache
        self.drivers = {}
        self.last_driver_update = 0

    def connect(self):
        if self.connected:
            return True
            
        try:
            # Check if iRacing is running and shared memory is available
            if self.ir.startup():
                logging.info("Connected to iRacing SDK")
                self.connected = True
                return True
            else:
                return False
        except Exception as e:
            logging.error(f"Connection error: {e}")
            return False

    def is_connected(self):
        if not self.connected:
            return False
            
        # Verify connection is still alive
        if not self.ir.is_initialized:
            self.connected = False
            return False
            
        return True

    def get_session_info(self):
        if not self.connected:
            return None
        try:
            # iRacing splits this into multiple keys. 
            # We merge them to create a structure similar to the full YAML dump.
            merged_info = {}
            
            # Critical Blocks
            merged_info['SessionInfo'] = self.ir['SessionInfo'] or {}
            merged_info['WeekendInfo'] = self.ir['WeekendInfo'] or {}
            merged_info['DriverInfo'] = self.ir['DriverInfo'] or {}
            
            # Optional but useful
            merged_info['CameraInfo'] = self.ir['CameraInfo'] or {}
            merged_info['RadioInfo'] = self.ir['RadioInfo'] or {}
            merged_info['SplitTimeInfo'] = self.ir['SplitTimeInfo'] or {}
            
            return merged_info
        except Exception as e:
            logging.error(f"Error fetching session info: {e}")
            return None

    def get_latest_data(self):
        if not self.connected:
            return None

        # Freeze buffer
        self.ir.freeze_var_buffer_latest()
        
        try:
            # Helper
            def get(key, default=0):
                val = self.ir[key] 
                return val if val is not None else default

            # Attempt to identify car class roughly if not already cached
            # In a full app, we parse the full YAML `self.ir['SessionInfo']` once per session
            # For 60Hz loop, we just grab variables.
            
            # Additional GT/Formula specific channels
            # Note: Some might return 0 if car doesn't have them
            
            data = {
                "timestamp": get('SessionTime'),
                "session_tick": get('SessionTick'),
                
                # Physics
                "speed": get('Speed') * 3.6, 
                "rpm": get('RPM'),
                "gear": get('Gear'),
                "throttle": get('Throttle'), 
                "brake": get('Brake'),    
                "clutch": get('Clutch'),
                "steering_angle": get('SteeringWheelAngle'), 
                
                # Handling (GT specific)
                "abs_active": get('BrakeABSactive', 0),
                "tc_active": get('TractionControlActive', 0),
                
                # Safety / Consistency
                "incidents": get('PlayerCarTeamIncidentCount', 0),
                "flags": get('SessionFlags', 0),
                
                # Position
                "lap_distance": get('LapDistPtr'), 
                "lap_number": get('Lap'),
                "track_temp": get('TrackTempCrew'),
                "air_temp": get('AirTemp'),
                
                # Car State (Fuel & Tires)
                "fuel_level": get('FuelLevel'), # Liters
                "fuel_pct": get('FuelLevelPct'), # 0.0 to 1.0
                
                # Position (Normalized)
                "lap_pct": get('LapDistPct'),

                # Environmental Conditions
                "track_wetness": get('TrackWetness'), # 0=Dry, 1=Wet
                "skies": get('Skies'), # 0=Clear, 1=PtCldY, 2=Cldy, 3=Ovcst
                "air_density": get('AirDensity'),
                "air_pressure": get('AirPressure'),
                "wind_vel": get('WindVel'),
                "wind_dir": get('WindDir'),
                "relative_humidity": get('RelativeHumidity'),
                
                # Input Detail
                "steering_torque": get('SteeringWheelTorque'), # Nm (FFB)
                
                # Tires (Temp = Surface/Carcass Middle, Pressure = KPa)
                "lf_temp": get('LFtempCM'),
                "rf_temp": get('RFtempCM'),
                "lr_temp": get('LRtempCM'),
                "rr_temp": get('RRtempCM'),
                
                "lf_press": get('LFpressure'),
                "rf_press": get('RFpressure'),
                "lr_press": get('LRpressure'),
                "rr_press": get('RRpressure'),
                
                # Mapping Coordinates
                "lat": get('Lat'),
                "lon": get('Lon'),
                "alt": get('Alt'),
                
                # Timing
                "current_lap_time": get('LapCurrentLapTime'),
                "last_lap_time": get('LapLastLapTime'),
                "best_lap_time": get('LapBestLapTime'),
            }
            
            # --- Advanced Logic: Drivers & Relative & Traffic ---
            self.update_drivers()
            
            player_idx = self.ir['PlayerCarIdx']
            
            # --- Advanced Battery / ERS (Fallback if car doesn't support) ---
            data['ers_pct'] = get('EnergyBatteryPct', get('dcERSBatteryPct', 0.84)) # Mock 84% if 0
            deploy_mode_int = get('dcDeployMode', 0)
            deploy_modes = ["BUILD", "BALANCED", "ATTACK", "QUALY"]
            data['ers_deploy_status'] = deploy_modes[deploy_mode_int % len(deploy_modes)]

            # --- Pit Strategy Metrics ---
            # Estimate fuel consumption (Very basic, requires full session tracking for accuracy)
            fuel_used_per_lap = get('FuelUsePerHour', 0) / 3600 * 100 # Rough approx or use static
            if fuel_used_per_lap == 0: fuel_used_per_lap = 2.5 # Fake 2.5L/lap
            laps_rem = data['fuel_level'] / fuel_used_per_lap if fuel_used_per_lap > 0 else 0
            data['laps_to_optimal_pit'] = max(0, int(laps_rem))
            data['delta_to_target'] = -0.150 # Mock value for now

            # --- Race Control Messages Parser ---
            data['race_messages'] = self._parse_flags(data['flags'])
            
            # 1. Prepare Traffic List (For Map)
            # We want position of EVERY car on track
            traffic = []
            car_dist_pcts = self.ir['CarIdxLapDistPct']
            
            if car_dist_pcts:
                for idx, driver in self.drivers.items():
                    # Get pct
                    pct = car_dist_pcts[idx]
                    if pct == -1: continue 

                    traffic.append({
                        "idx": idx,
                        "pct": pct,
                        "class_id": driver['class_id'],
                        "class_name": driver['class_name'],
                        "is_player": (idx == player_idx)
                    })
            
            data['traffic'] = traffic

            # 2. Calculate Relative (Time Gaps)
            if player_idx is not None and player_idx != -1:
                data['relative'] = self.calculate_relative(player_idx, data['session_tick'])
            else:
                data['relative'] = []
            # ------------------------------------------
            
            # --- Dead Reckoning (Fake GPS) ---
            # iRacing live SDK doesn't give Lat/Lon. We calculate it.
            now = time.time()
            dt = now - self.last_update_time if self.last_update_time > 0 else 0.016
            self.last_update_time = now
            
            # Avoid large jumps if paused
            if dt > 1.0: dt = 0.016
            
            # Speed is m/s
            speed_ms = data['speed'] / 3.6
            yaw = get('YawNorth', 0) # Radians usually
            
            # Integrate
            import math
            self.x += speed_ms * math.cos(yaw) * dt
            self.y += speed_ms * math.sin(yaw) * dt
            
            data['lat'] = self.x
            data['lon'] = self.y
            # ----------------------------------
            
            return data
            
        except Exception as e:
            logging.error(f"Error reading vars: {e}")
            self.connected = False
            return None

    def _parse_flags(self, flags_bitmask):
        messages = []
        fmt_time = time.strftime("%H:%M")
        
        # Simplified iRacing SessionFlags bitmask
        if flags_bitmask & 0x08: # yellow
            messages.append({"id": time.time(), "type": "WARN", "text": "YELLOW FLAG", "time": fmt_time})
        if flags_bitmask & 0x100: # yellowWaving
            messages.append({"id": time.time()+1, "type": "WARN", "text": "YELLOW FLAG WAVING", "time": fmt_time})
        if flags_bitmask & 0x04: # green
            messages.append({"id": time.time()+2, "type": "INFO", "text": "TRACK CLEAR (GREEN)", "time": fmt_time})
        if flags_bitmask & 0x20: # blue
            messages.append({"id": time.time()+3, "type": "INFO", "text": "BLUE FLAG - CAR APPROACHING", "time": fmt_time})
        if flags_bitmask & 0x20000: # black
            messages.append({"id": time.time()+4, "type": "WARN", "text": "BLACK FLAG (PENALTY)", "time": fmt_time})
            
        if not messages:
            messages.append({"id": 1, "type": "INFO", "text": "RACE CONTROL: NO ACTIVE FLAGS", "time": fmt_time})
            
        return messages

    def update_drivers(self):
        # Only update periodically or if empty
        if self.drivers and (time.time() - self.last_driver_update < 10):
            return

        try:
            driver_info = self.ir['DriverInfo']
            if not driver_info: return
            
            raw_drivers = driver_info.get('Drivers', [])
            
            # Map CarIdx -> Driver Data
            for d in raw_drivers:
                idx = d.get('CarIdx', -1)
                if idx == -1: continue
                
                self.drivers[idx] = {
                    "idx": idx,
                    "name": d.get('UserName', 'Unknown'),
                    "number": d.get('CarNumber', '#'),
                    "irating": d.get('IRating', 0),
                    "lic": d.get('LicString', 'R 0.0'),
                    "class_id": d.get('CarClassID', 0),
                    "class_name": d.get('CarScreenNameShort', 'Car'), # Or use CarClassShortName
                    "is_player": (idx == self.ir['PlayerCarIdx'])
                }
            
            self.last_driver_update = time.time()
            
        except Exception as e:
            logging.error(f"Error updating drivers: {e}")

    def calculate_relative(self, player_idx, tick):
        try:
            # Get Distances
            car_dist_pct = self.ir['CarIdxLapDistPct']
            if not car_dist_pct: return []
            
            player_pct = car_dist_pct[player_idx]
            if player_pct == -1: return [] # Player not on track
            
            # Track Length estimate (if not available, assume standard ~4000m or time based)
            # Better: Use LapBestLapTime or estimates to convert Pct to Time.
            # Fallback: Assume a 90s lap for gap calc if unknown.
            # If we generally know speed, Speed = Dist / Time. 
            # We don't have track length in meters easily available in vars without parsing SessionInfo YAML.
            # Let's use a rough estimate: 1% gap ~ 1 second (very rough, but standard).
            # ACTUALLY: Let's assume 100s lap time for now to convert % to seconds. Refine later.
            est_lap_time = 100.0 
            
            relative = []
            
            for idx, driver in self.drivers.items():
                if idx == player_idx: continue # We add player separately or handle in frontend? Frontend handles "Hero" row usually.
                
                dist_pct = car_dist_pct[idx]
                if dist_pct == -1: continue # Car not on track
                
                # Calculate Delta Pct (Shortest path around circle)
                delta = dist_pct - player_pct
                if delta > 0.5: delta -= 1.0
                if delta < -0.5: delta += 1.0
                
                # Convert to seconds
                gap = delta * est_lap_time
                
                # Filter: Only cars within +/- 8 seconds (typical relative box)
                # Or maybe 20s.
                if abs(gap) < 30: 
                    # Trend Logic: simple placeholder. 
                    # Real trend requires storing previous gap history.
                    trend = 'stable' 
                    
                    relative.append({
                        "carIdx": idx,
                        "name": driver['name'],
                        "class": driver['class_name'],
                        "irating": driver['irating'],
                        "gap": gap,
                        "trend": trend,
                        "isPlayer": False
                    })
            
            # Add Player (Center)
            relative.append({
                "carIdx": player_idx,
                "name": "YOU",
                "class": self.drivers[player_idx]['class_name'],
                "irating": self.drivers[player_idx]['irating'],
                "gap": 0.0,
                "trend": "stable",
                "isPlayer": True
            })
            
            # Sort by gap (negative = ahead, positive = behind)
            relative.sort(key=lambda x: x['gap'])
            
            return relative
            
        except Exception as e:
            logging.error(f"Relative calc error: {e}")
            return []
