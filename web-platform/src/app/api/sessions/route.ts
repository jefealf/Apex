import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'sessions.json');

export async function GET() {
    if (!fs.existsSync(SESSIONS_FILE)) {
        return NextResponse.json([]);
    }

    try {
        const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const data = JSON.parse(content);
        // Sort by date descending (newest first)
        const sorted = data.sort((a: any, b: any) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
        return NextResponse.json(sorted);
    } catch (e) {
        return NextResponse.json([]);
    }
}
