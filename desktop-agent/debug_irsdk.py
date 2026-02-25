import irsdk
import logging
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def debug_irsdk():
    logging.info("--- iRacing SDK Introspection ---")
    ir = irsdk.IRSDK()
    if not ir.startup():
        logging.error("Could not connect to iRacing.")
        return

    logging.info("Connected.")
    
    # Test retrieving different top-level keys
    keys_to_try = ['SessionInfo', 'WeekendInfo', 'DriverInfo', 'CameraInfo', 'RadioInfo']
    
    for key in keys_to_try:
        try:
            data = ir[key]
            if data:
                logging.info(f"\n[KEY: {key}] Found! Type: {type(data)}")
                if isinstance(data, dict):
                    logging.info(f"Keys: {list(data.keys())}")
                else:
                    logging.info(f"Value prefix: {str(data)[:50]}...")
            else:
                logging.info(f"\n[KEY: {key}] returned None or empty.")
        except Exception as e:
            logging.error(f"\n[KEY: {key}] Error: {e}")

if __name__ == "__main__":
    debug_irsdk()
