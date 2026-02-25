import socketio
import logging
import time

class LiveStreamer:
    def __init__(self, server_url="http://localhost:4000"):
        self.sio = socketio.Client()
        self.server_url = server_url
        self.is_connected = False
        self.session_id = None

    def connect(self):
        # We don't set session_id here anymore; we wait for the server
        self.session_id = None
        try:
            if not self.is_connected:
                self.sio.connect(self.server_url)
                self.is_connected = True
                logging.info(f"🟢 Connected to Live Pitwall Server at {self.server_url}")
                
                # Announce Session Logic
                self.sio.emit('identify_agent', {}) # Just say hello

                @self.sio.event
                def connect():
                    self.is_connected = True
                    logging.info("🟢 Connected to Live Stream Server")

                @self.sio.event
                def disconnect():
                    self.is_connected = False
                    logging.info("🔴 Disconnected from Live Stream")
                
                @self.sio.on('update_session')
                def handle_session_update(data):
                    new_id = data.get('sessionId')
                    if new_id:
                        self.session_id = new_id
                        logging.info(f"✅ Session Started! Streaming to Room: {new_id}")
                    else:
                        self.session_id = None
                        logging.info("⏹️ Session Stopped.")

        except Exception as e:
            logging.error(f"Failed to connect to Live Stream: {e}")
            self.is_connected = False

    def send_telemetry(self, data):
        if self.is_connected and self.session_id:
            try:
                payload = {
                    "token": self.session_id, # Target room
                    "data": data
                }
                self.sio.emit('telemetry_update', payload)
            except Exception as e:
                logging.error(f"Error sending live telemetry: {e}")

    def disconnect(self):
        if self.is_connected:
            self.sio.disconnect()
