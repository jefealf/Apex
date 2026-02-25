import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    // Paths
    const telemetryDir = path.join(process.cwd(), 'data', 'telemetry');
    const filePath = path.join(telemetryDir, `${id}.json`);
    const sessionsFile = path.join(process.cwd(), 'data', 'sessions.json');

    console.log(`[Telemetry API] Request ID: ${id}`);
    console.log(`[Telemetry API] FilePath: ${filePath}`);
    console.log(`[Telemetry API] Exists? ${fs.existsSync(filePath)}`);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Telemetry not found' }, { status: 404 });
    }

    try {
        // Read Telemetry Points
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Handle potential multiple JSON objects if appended loosely (ndjson) or single array
        // Our python script appends lines? 
        // Let's assume standard JSON array for now or handle NDJSON.
        // Re-reading `ingest` logic: it appends to a file. 
        // If it appends valid JSON objects one by one (NDJSON), we need to parse line by line.

        // Let's safe-read as array if possible, or parse lines
        let points = [];
        try {
            points = JSON.parse(fileContent);
        } catch {
            // If parse fails, it might be NDJSON (newlines)
            points = fileContent.trim().split('\n').map(line => {
                try { return JSON.parse(line); } catch { return null; }
            }).filter(Boolean);
        }

        // Fetch Session Metadata (Car, Track) from sessions.json
        let sessionMeta = {};
        if (fs.existsSync(sessionsFile)) {
            const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
            sessionMeta = sessions.find((s: any) => s.id === id) || {};
        }

        return NextResponse.json({
            session: sessionMeta,
            telemetry: points
        });

    } catch (e) {
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}
