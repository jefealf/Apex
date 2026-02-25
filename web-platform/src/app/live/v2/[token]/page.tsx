"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { Wifi, WifiOff, Clock } from "lucide-react";

import { VehicleHealthV2 } from "@/components/engineer/VehicleHealthV2";
import { RaceStrategyV2 } from "@/components/engineer/RaceStrategyV2";
import { PaceAnalysisV2 } from "@/components/engineer/PaceAnalysisV2";
import { LiveTrackMapV2 } from "@/components/engineer/LiveTrackMapV2";

export default function LivePitwallV2Page() {
    const params = useParams();
    const token = params.token as string;

    const [isConnected, setIsConnected] = useState(false);
    const [telemetry, setTelemetry] = useState<any>(null);

    useEffect(() => {
        if (!token) return;

        // Connect to WebSocket Server (Relative URL via socket.io)
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        const socket = io(socketUrl);

        socket.on("connect", () => {
            console.log("Connected to Pitwall Server V2");
            setIsConnected(true);
            socket.emit("join_room", token);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from Pitwall Server V2");
            setIsConnected(false);
        });

        socket.on("telemetry_update", (data: any) => {
            setTelemetry(data);
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    // Live Clock for Header
    const [time, setTime] = useState("");
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-[#070709] text-zinc-100 font-sans overflow-hidden">
            {/* Header (V2 Clean Design) */}
            <header className="h-12 shrink-0 border-b border-white/10 bg-[#0a0a0c] flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                        APEXMIND <span className="text-zinc-500 font-normal">PITWALL PRO</span>
                    </span>
                    <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono font-bold tracking-widest">
                        TOKEN: {token}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Race Control Ticker (Placeholder) */}
                    <div className="hidden md:flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded text-xs font-mono text-yellow-500">
                        <span className="animate-pulse w-2 h-2 rounded-full bg-yellow-500" />
                        RACE CONTROL: WAITING FOR SESSION
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
                        <Clock className="w-3 h-3" />
                        {time}
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-white/5">
                        {isConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            {isConnected ? <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">LIVE</span> : <span className="text-red-500">OFFLINE</span>}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Grid Layout (Strict Anti-Overlap) */}
            {/* Using a 12-column grid for precise control.
                Row 1 (Top): Track Map (Left, 4 col), Strategy / Relative (Middle, 4 col), Vehicle Health (Right, 4 col)
                Row 2 (Bottom): Pace Analysis (Spans Full Width or partial)
                Alternative Layout based on Stitch:
                Left: Track Map (Large)
                Middle: Race Strategy (Top) + Vehicle Health (Bottom)
                Right: Pace Analysis
            */}
            <main className="flex-1 p-4 grid grid-cols-12 grid-rows-[auto_1fr] md:grid-rows-2 gap-4 min-h-0 overflow-hidden">

                {/* Panel 1: Vehicle Health (Col 1-3) */}
                <div className="col-span-12 md:col-span-3 bg-[#0e0e11] border border-white/5 rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Vehicle Status
                        </h2>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center text-zinc-600 font-mono text-xs">
                        <VehicleHealthV2 telemetry={telemetry} />
                    </div>
                </div>

                {/* Panel 2: Race Strategy / Relative (Col 4-7) */}
                <div className="col-span-12 md:col-span-4 bg-[#0e0e11] border border-white/5 rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-bold text-emerald-400/70 tracking-widest uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Race Strategy
                        </h2>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center text-zinc-600 font-mono text-xs">
                        <RaceStrategyV2 telemetry={telemetry} />
                    </div>
                </div>

                {/* Panel 3: Pace Analysis (Col 8-12) */}
                <div className="col-span-12 md:col-span-5 bg-[#0e0e11] border border-white/5 rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-bold text-purple-400/70 tracking-widest uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Pace Analysis
                        </h2>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center text-zinc-600 font-mono text-xs">
                        <PaceAnalysisV2 telemetry={telemetry} />
                    </div>
                </div>

                {/* Panel 4: Track Map (Row 2, Full Width or Left) */}
                <div className="col-span-12 md:col-span-12 bg-[#0e0e11] border border-white/5 rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="absolute top-3 left-3 z-10">
                        <h2 className="text-xs font-bold text-yellow-400/70 tracking-widest uppercase flex items-center gap-2 bg-black/50 p-1.5 rounded border border-white/5 backdrop-blur">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Track Map
                        </h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs">
                        <LiveTrackMapV2 telemetry={telemetry} />
                    </div>
                </div>

            </main>
        </div>
    );
}
