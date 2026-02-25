import time
import yaml
import logging
from telemetry import TelemetryReader

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def debug_main():
    logging.info("--- iRacing SessionInfo Debugger ---")
    logging.info("Connecting to iRacing...")
    
    reader = TelemetryReader()
    
    if not reader.connect():
        logging.error("Could not connect to iRacing. Please make sure the simulator is running.")
        return

    logging.info("Connected! Fetching Session Info...")
    time.sleep(1) # Give it a moment
    
    try:
        raw_yaml = reader.get_session_info()
        if not raw_yaml:
            logging.error("Received empty Session Info.")
            return
            
        logging.info("Session Info received. Parsing...")
        
        if isinstance(raw_yaml, dict):
            logging.info("Session Info is already a Dictionary.")
            info = raw_yaml
            # Dump to file as YAML for inspection
            with open("debug_session_info.yaml", "w") as f:
                yaml.dump(info, f)
        else:
            logging.info("Session Info is String. Parsing...")
            with open("debug_session_info.yaml", "w") as f:
                f.write(raw_yaml)
            info = yaml.safe_load(raw_yaml)
            
        driver_info = info.get('DriverInfo', {})
        drivers = driver_info.get('Drivers', [])
        player_idx = driver_info.get('DriverCarIdx', -1)
        
        logging.info(f"DriverCarIdx: {player_idx}")
        logging.info(f"Total Drivers: {len(drivers)}")
        
        if 0 <= player_idx < len(drivers):
            me = drivers[player_idx]
            logging.info(f"\n--- MY DRIVER DATA (Index {player_idx}) ---")
            logging.info(f"UserName: {me.get('UserName')}")
            logging.info(f"CarScreenName: {me.get('CarScreenName')}")
            logging.info(f"CarScreenNameShort: {me.get('CarScreenNameShort')}")
            logging.info(f"CarClassShortName: {me.get('CarClassShortName')}")
            logging.info(f"LicString: {me.get('LicString')}")
            logging.info(f"IRating: {me.get('IRating')}")
            logging.info(f"LicColor: {me.get('LicColor')}")
            
            # Print ALL keys for the driver to see what's available
            logging.info(f"\n[ALL AVAILABLE KEYS FOR DRIVER]: {list(me.keys())}")
        else:
            logging.error(f"Player Index {player_idx} out of range (0-{len(drivers)-1})")

    except Exception as e:
        logging.error(f"Error parsing: {e}")

if __name__ == "__main__":
    debug_main()
