import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Storage Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TELEMETRY_DIR = path.join(DATA_DIR, 'telemetry');

// Ensure dirs exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TELEMETRY_DIR)) fs.mkdirSync(TELEMETRY_DIR, { recursive: true });

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // Payload expected structure:
        // {
        //   type: 'telemetry' | 'session_update',
        //   sessionId: 'uuid',
        //   data: { ... }
        // }

        const { type, sessionId, data } = payload;

        if (!sessionId) {
            return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
        }

        // 1. Handle Session Summary Update (Dashboard Data)
        if (type === 'session_update') {
            let sessions = [];
            if (fs.existsSync(SESSIONS_FILE)) {
                try {
                    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
                } catch (e) { }
            }

            // Upsert session
            const index = sessions.findIndex((s: any) => s.id === sessionId);
            // Merge existing data with new data to preserve fields
            const sessionData = {
                id: sessionId,
                lastUpdate: new Date().toISOString(),
                ...data
            };

            if (index >= 0) {
                sessions[index] = { ...sessions[index], ...sessionData };
            } else {
                sessions.push(sessionData);
            }

            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
        }

        // 2. Handle Telemetry (Analysis Data)
        if (type === 'telemetry') {
            const telemetryFile = path.join(TELEMETRY_DIR, `${sessionId}.json`);
            let telemetry = [];

            // Read existing if small enough, or just append line by line
            // For prototype, we'll keep using JSON array but be mindful of size.
            // In production, this would be a Time Series DB or Append-Only Log.
            if (fs.existsSync(telemetryFile)) {
                try {
                    telemetry = JSON.parse(fs.readFileSync(telemetryFile, 'utf-8'));
                } catch (e) { }
            }

            // Allow batch arrays or single objects
            if (Array.isArray(data)) {
                telemetry.push(...data);
            } else {
                telemetry.push(data);
            }

            fs.writeFileSync(telemetryFile, JSON.stringify(telemetry));
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to process data' }, { status: 500 });
    }
}
