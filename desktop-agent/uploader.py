import logging
import requests
import json
import time

class DataUploader:
    def __init__(self, api_url):
        self.api_url = api_url
        self.session = requests.Session()

    def send_batch(self, payload):
        try:
            # Payload is now built in main.py with type/meta
            headers = {'Content-Type': 'application/json'}
            response = self.session.post(self.api_url, data=json.dumps(payload), headers=headers)
            if response.status_code != 200:
                logging.error(f"Upload failed: {response.status_code}")
        except Exception as e:
            logging.error(f"Upload error: {e}")
