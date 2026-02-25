import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server, Socket } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface TelemetryData {
    token: string;
    data: any;
}

// Simple single-session storage for MVP
let currentSessionId = "";

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    // Attach Socket.io to the Same HTTP Server
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    console.log("🏎️ ApexMind Live Pitwall Server starting...");

    io.on("connection", (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        // Send current session to new connectors immediately
        if (currentSessionId) {
            socket.emit("session_info", { sessionId: currentSessionId });
        }

        // AGENT: Just identification
        socket.on("identify_agent", () => {
            console.log(`🤖 Agent connected: ${socket.id}`);
            // If session is already running, tell the new agent immediately
            if (currentSessionId) {
                socket.emit("update_session", { sessionId: currentSessionId });
            }
        });

        // HOST: Commands to start/stop
        socket.on("command_start_session", () => {
            // Generate a simple 6-char ID
            const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
            currentSessionId = newId;
            console.log(`📢 Session STARTED: ${currentSessionId}`);

            // Tell everyone (Agent + Host)
            io.emit("session_info", { sessionId: currentSessionId }); // Update UI
            io.emit("update_session", { sessionId: currentSessionId }); // Update Agent
        });

        socket.on("command_stop_session", () => {
            console.log(`🛑 Session STOPPED: ${currentSessionId}`);
            currentSessionId = "";

            // Tell everyone
            io.emit("session_info", { sessionId: "" });
            io.emit("update_session", { sessionId: null });
        });

        // GUEST/HOST: Joins a room
        socket.on("join_room", (token: string) => {
            socket.join(token);
            console.log(`Socket ${socket.id} joined room: ${token}`);
        });

        // AGENT: Sends telemetry
        socket.on("telemetry_update", (payload: TelemetryData) => {
            const { token, data } = payload;
            // Broadcast to everyone in the room EXCEPT the sender
            socket.to(token).emit("telemetry_update", data);
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`🚀 Unified Next.js + WebSocket Server running on port ${port}`);
    });
});
