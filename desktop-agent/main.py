import time
import sys
import logging
from telemetry import TelemetryReader
from uploader import DataUploader
from live_stream import LiveStreamer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

import uuid
import os

def main():
    logging.info("ApexMind Agent v3.0 - REAL DATA MODE Started")
    
    # Use environment variables for production flexibility
    api_url = os.environ.get("API_URL", "http://127.0.0.1:3000/api/ingest")
    ws_url = os.environ.get("WS_URL", "http://127.0.0.1:3000")
    
    reader = TelemetryReader()
    uploader = DataUploader(api_url=api_url)
    streamer = LiveStreamer(server_url=ws_url)
    
    # Generate a new session ID for this run
    # In a real app, we'd detect session transitions (Practice -> Race) and generate new IDs
    session_id = str(uuid.uuid4())
    logging.info(f"Session ID: {session_id}")

    # Connect to Live Stream (Wait for Server to assign Room ID)
    streamer.connect()
    
    last_meta_update = 0
    
    try:
        while True:
            # Connection Loop
            if not reader.is_connected():
                # Try to connect
                connected = reader.connect()
                if not connected:
                    time.sleep(2)
                    continue
                
                # Reset Session ID on new connection if needed, or keep persistent for app life
                # session_id = str(uuid.uuid4()) 
                
            # Once connected, try to get static session info
            # Initial default values
            car_class = "Unknown"
            car_name = "Unknown"
            full_track_name = "Unknown Track"
            license_str = "R 0.00"
            irating = 0
            
            logging.info("Connected. Streaming...")
            
            # Data Loop
            while reader.is_connected():
                # Periodically check for metadata if we don't have it yet
                if car_name == "Unknown" or full_track_name == "Unknown Track":
                    try:
                        session_info = reader.get_session_info()
                        if session_info:
                            if isinstance(session_info, dict):
                                info = session_info
                            else:
                                info = yaml.safe_load(session_info)
                                
                            # 1. Try to get Track Info (WeekendInfo) - Independent of Driver
                            if full_track_name == "Unknown Track" and 'WeekendInfo' in info:
                                weekend_info = info.get('WeekendInfo', {})
                                track_name = weekend_info.get('TrackDisplayName', 'Unknown Track')
                                track_config = weekend_info.get('TrackConfigName', '')
                                
                                if track_name != 'Unknown Track':
                                    full_track_name = f"{track_name} - {track_config}" if track_config and track_config != "N/A" else track_name
                                    logging.info(f"📍 Track Detected: {full_track_name}")
                                    
                            # 2. Try to get Driver Info (DriverInfo)
                            if car_name == "Unknown" and 'DriverInfo' in info:
                                driver_info = info.get('DriverInfo', {})
                                drivers = driver_info.get('Drivers', [])
                                player_idx = driver_info.get('DriverCarIdx', -1)
                                
                                # Only proceed if we have a valid player index (not -1)
                                if player_idx >= 0 and player_idx < len(drivers):
                                    player_car = drivers[player_idx]
                                    car_name = player_car.get('CarScreenName', 'Unknown')
                                    license_str = player_car.get('LicString', 'R 0.00')
                                    irating = player_car.get('IRating', 0)
                                    
                                    # Classify Car
                                    name_lower = car_name.lower()
                                    if any(x in name_lower for x in ['f3', 'f4', 'formula', 'dallara', 'ir-01', 'indy', 'skip']):
                                        car_class = "Formula"
                                    elif any(x in name_lower for x in ['gt3', 'gt4', 'ferrari', 'porsche', 'bmw', 'audi', 'mercedes', 'lamborghini']):
                                        car_class = "Sports"
                                    else:
                                        car_class = "Sports"
                                    
                                    logging.info(f"🏎️  Car Detected: {car_name} ({car_class}) | Lic: {license_str} | iR: {irating}")
                                else:
                                    # Log only once every 5 seconds to avoid spam
                                    if int(time.time()) % 5 == 0:
                                        logging.info(f"Waiting for Driver ID... (Current Index: {player_idx})")
                            
                    except Exception as e:
                        logging.error(f"Error parsing metadata: {e}")

                data = reader.get_latest_data()
                if data:
                    current_time = time.time()
                    
                    # 1. Send Telemetry Batch (High Freq)
                    # We wrap it in a protocol envelope
                    telemetry_payload = {
                        "type": "telemetry",
                        "sessionId": session_id,
                        "data": data # Array or single object
                    }
                    uploader.send_batch(telemetry_payload) # Need to update uploader to accept dict directly
                    streamer.send_telemetry(data) # Live Stream!
                    
                    # 2. Send Session Update (Low Freq - every 5s)
                    if current_time - last_meta_update > 5:
                        # Only send if we have at least partial info
                        if full_track_name != "Unknown Track" or car_name != "Unknown":
                             meta_payload = {
                                "type": "session_update",
                                "sessionId": session_id,
                                "data": {
                                    "track": full_track_name,
                                    "car": car_name,
                                    "class": car_class,
                                    "irating": irating,
                                    "license": license_str,
                                    "incidents": data.get('incidents', 0),
                                    "best_lap": data.get('best_lap_time', 0),
                                    "laps": data.get('lap_number', 0)
                                }
                            }
                             uploader.send_batch(meta_payload)
                             last_meta_update = current_time
                             logging.info(f"📡 Sending Update: {full_track_name} | {car_name} | Inc: {data.get('incidents', 0)}")
                        else:
                             # Still waiting for initial lock
                             if int(time.time()) % 5 == 0:
                                 logging.info("⏳ Waiting for Session Info... (Please enter the car)")
                                 last_meta_update = current_time
                        
                else:
                    if not reader.is_connected():
                        break
            
                time.sleep(0.033) 
            
    except KeyboardInterrupt:
        logging.info("Stopping...")

if __name__ == "__main__":
    main()
