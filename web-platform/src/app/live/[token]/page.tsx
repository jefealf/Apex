"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Wifi, WifiOff, Flag as RaceFlag } from "lucide-react";
import { VehicleHealth } from "@/components/engineer/VehicleHealth";
import { RaceStrategy } from "@/components/engineer/RaceStrategy";
import { PaceAnalysis } from "@/components/engineer/PaceAnalysis";
import { LiveTrackMap } from "@/components/engineer/LiveTrackMap";

export default function LivePitwallPage() {
    const params = useParams();
    const token = params.token as string;

    const [isConnected, setIsConnected] = useState(false);
    const [telemetry, setTelemetry] = useState<any>(null);

    // Refs for socket callbacks to access latest state without dependency loops
    // None needed for map anymore

    useEffect(() => {
        if (!token) return;

        // Connect to WebSocket Server (Relative URL via socket.io)
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        const socket = io(socketUrl);

        socket.on("connect", () => {
            console.log("Connected to Pitwall Server");
            setIsConnected(true);
            socket.emit("join_room", token);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from Pitwall Server");
            setIsConnected(false);
        });

        socket.on("telemetry_update", (data: any) => {
            setTelemetry(data);
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    return (
        <div className="flex flex-col h-screen bg-[#09090b] text-white font-sans overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-white/5 bg-[#0d0d0f] flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        ApexMind Live Pitwall
                    </span>
                    <div className="px-2 py-0.5 rounded bg-zinc-800 border border-white/5 text-xs text-zinc-400 font-mono">
                        {token}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2">
                        {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />}
                        <span className="text-xs font-bold text-zinc-500 uppercase">
                            {isConnected ? "LIVE DATA" : "CONNECTING..."}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 p-4 grid grid-cols-2 grid-rows-2 gap-4 min-h-0 overflow-hidden">

                {/* Quadrant A: Vehicle Health */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden group">
                    <VehicleHealth telemetry={telemetry} />
                </div>

                {/* Quadrant B: Pace Analysis */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden">
                    <PaceAnalysis telemetry={telemetry} />
                </div>

                {/* Quadrant C: Context (TRACK MAP) */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl flex flex-col relative overflow-hidden">
                    <LiveTrackMap telemetry={telemetry} />
                </div>

                {/* Quadrant D: Strategy */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden">
                    <RaceStrategy telemetry={telemetry} />
                </div>

            </main>
        </div>
    );
}
