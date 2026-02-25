"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft, Download, Share2, Settings, Zap, Play,
    ChevronRight, AlertCircle, Map as MapIcon, Activity
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AnalysisPage() {
    const { id } = useParams();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursorDist, setCursorDist] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/sessions')
            .then(res => res.json())
            .then(rawData => {
                // Sort by distance/time
                // For track map, we need to filter out pits or outlaps ideally
                // We will just use the main chunk of data
                const sorted = rawData.sort((a: any, b: any) => a.timestamp - b.timestamp);
                setData(sorted);
                setLoading(false);
            });
    }, [id]);

    // Derived Data for Visualization
    const trackMapData = useMemo(() => {
        // Downsample for map performance
        return data.filter((_, i) => i % 5 === 0).map(p => ({
            x: p.lon, // In a real app we'd project Lat/Lon to X/Y using logic
            y: p.lat,
            speed: p.speed,
            distance: p.lap_distance
        }));
    }, [data]);

    // Normalize map coordinates to fit SVG viewbox
    const mapBounds = useMemo(() => {
        if (trackMapData.length === 0) return null;
        const xs = trackMapData.map(p => p.x);
        const ys = trackMapData.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }, [trackMapData]);

    if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Loading Telemetry...</div>;

    return (
        <div className="min-h-screen bg-[#0b0b0d] text-zinc-200 font-sans overflow-hidden flex flex-col">
            {/* Top Toolbar (Coach Dave Style) */}
            <header className="h-14 border-b border-white/5 bg-[#121214] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="h-8 w-[1px] bg-white/10" />
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wide">{data[0]?.track_name || "Unknown Track"}</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{data[0]?.car_name || "Unknown Car"} • {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ButtonIcon icon={<Download className="w-4 h-4" />} label="Export" />
                    <ButtonIcon icon={<Share2 className="w-4 h-4" />} label="Share" />
                    <div className="h-6 w-[1px] bg-white/10 mx-2" />
                    <ButtonIcon icon={<Settings className="w-4 h-4" />} />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR: Insights & Stints */}
                <aside className="w-80 border-r border-white/5 bg-[#0e0e10] flex flex-col">
                    {/* Insights Header */}
                    <div className="p-4 border-b border-white/5 bg-gradient-to-r from-purple-900/10 to-transparent">
                        <h2 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> AI INSIGHTS
                        </h2>
                    </div>

                    {/* Insights List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <InsightCard
                            type="braking"
                            title="Late Braking - T1"
                            desc="You started braking 15m later than your reference lap. Good entry speed carried."
                        />
                        <InsightCard
                            type="throttle"
                            title="Early Throttle - T4"
                            desc="Wait for the apex. You are applying 100% throttle before the car is rotated."
                            negative
                        />
                        <InsightCard
                            type="shifting"
                            title="Short Shifting"
                            desc="You are shifting at 7200RPM. Optimal range for this car is 8100RPM."
                            negative
                        />
                    </div>

                    {/* Stint/Lap Selector */}
                    <div className="h-1/2 border-t border-white/5 flex flex-col">
                        <div className="p-3 border-b border-white/5 bg-[#121214] flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-400">LAPS</span>
                            <span className="text-xs font-mono text-zinc-500">STINT 1</span>
                        </div>
                        <div className="overflow-y-auto">
                            {[1, 2, 3, 4, 5].map(lap => (
                                <div key={lap} className={cn("flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer text-sm font-mono", lap === 3 ? "bg-white/5" : "")}>
                                    <span className={cn(lap === 3 ? "text-white font-bold" : "text-zinc-500")}>{lap}</span>
                                    <span className={cn(lap === 3 ? "text-blue-400" : "text-zinc-300")}>1:32.405</span>
                                    <span className="text-xs text-green-500">-0.124</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT: Map & Graphs */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#0b0b0d]">

                    {/* TOP SECTION: Track Map & Delta */}
                    <div className="h-[45%] flex border-b border-white/5">
                        <div className="flex-1 relative p-6 flex items-center justify-center bg-gradient-to-b from-[#0b0b0d] to-[#121214]">
                            {/* Track Map SVG */}
                            {mapBounds && (
                                <svg viewBox={`${mapBounds.minX} ${mapBounds.minY} ${mapBounds.width} ${mapBounds.height}`} className="w-full h-full max-h-[400px] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                    <defs>
                                        <linearGradient id="gradientTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#8b5cf6" />
                                        </linearGradient>
                                    </defs>
                                    <polyline
                                        points={trackMapData.map(p => `${p.x},${p.y}`).join(" ")}
                                        fill="none"
                                        stroke="url(#gradientTrack)"
                                        strokeWidth={mapBounds.width * 0.015} // Scale stroke with map size
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Player Dot (Moves with cursor) */}
                                    {cursorDist !== null && (() => {
                                        // Find closest point to cursorDist
                                        const pt = trackMapData.reduce((prev, curr) => Math.abs(curr.distance - cursorDist) < Math.abs(prev.distance - cursorDist) ? curr : prev);
                                        return <circle cx={pt.x} cy={pt.y} r={mapBounds.width * 0.03} fill="white" stroke="black" strokeWidth={1} />
                                    })()}
                                </svg>
                            )}

                            {/* Overlay Stats */}
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur border border-white/10 rounded-lg p-3 text-right">
                                <p className="text-xs text-zinc-400">TRACK TEMP</p>
                                <p className="text-lg font-mono font-bold text-white">{data[0]?.track_temp?.toFixed(1) || 27}°C</p>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM SECTION: Stacked Telemetry Charts */}
                    <div className="flex-1 bg-[#0b0b0d] p-4 flex flex-col gap-1 relative">

                        {/* 1. Speed Chart */}
                        <div className="flex-1 relative border border-white/5 bg-[#0e0e10] rounded-t-lg overflow-hidden group">
                            <div className="absolute left-2 top-2 text-[10px] font-bold text-zinc-500 z-10 px-2 py-1 bg-black/50 rounded">SPEED</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} onMouseMove={(e: any) => e.activePayload && setCursorDist(e.activePayload[0].payload.lap_distance)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <XAxis dataKey="lap_distance" hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1 }} />
                                    <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "white" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 2. Inputs (Throttle/Brake) */}
                        <div className="flex-1 relative border border-white/5 bg-[#0e0e10] overflow-hidden group">
                            <div className="absolute left-2 top-2 text-[10px] font-bold text-zinc-500 z-10 px-2 py-1 bg-black/50 rounded">INPUTS</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} onMouseMove={(e: any) => e.activePayload && setCursorDist(e.activePayload[0].payload.lap_distance)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                                    <YAxis hide domain={[0, 1]} />
                                    <XAxis dataKey="lap_distance" hide />
                                    <Tooltip content={() => null} cursor={{ stroke: 'white', strokeWidth: 1 }} />
                                    <Area type="step" dataKey="throttle" stroke="none" fill="#22c55e" fillOpacity={0.4} />
                                    <Area type="step" dataKey="brake" stroke="none" fill="#ef4444" fillOpacity={0.4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 3. Steering / Gears */}
                        <div className="h-16 relative border border-white/5 bg-[#0e0e10] rounded-b-lg overflow-hidden">
                            <div className="absolute left-2 top-2 text-[10px] font-bold text-zinc-500 z-10 px-2 py-1 bg-black/50 rounded">GEAR</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} onMouseMove={(e: any) => e.activePayload && setCursorDist(e.activePayload[0].payload.lap_distance)}>
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <XAxis dataKey="lap_distance" hide />
                                    <Tooltip content={() => null} cursor={{ stroke: 'white', strokeWidth: 1 }} />
                                    <Line type="step" dataKey="gear" stroke="#fbbf24" strokeWidth={1} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}

function ButtonIcon({ icon, label }: any) {
    return (
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors">
            {icon}
            {label && <span>{label}</span>}
        </button>
    )
}

function InsightCard({ type, title, desc, negative }: any) {
    const color = negative ? "text-red-400 border-red-500/20 bg-red-900/10" : "text-green-400 border-green-500/20 bg-green-900/10";
    return (
        <div className={cn("p-3 rounded border text-xs", color)}>
            <h4 className="font-bold mb-1 uppercase opacity-80">{type}</h4>
            <p className="font-semibold text-white mb-1">{title}</p>
            <p className="opacity-70 leading-relaxed">{desc}</p>
        </div>
    )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 backdrop-blur border border-white/20 p-2 rounded text-xs font-mono shadow-xl">
                <p className="text-zinc-400 mb-1">Dist: {Math.round(payload[0].payload.lap_distance)}m</p>
                <p className="text-blue-400 font-bold">SPD: {payload[0].payload.speed.toFixed(0)} km/h</p>
                <p className="text-green-400 font-bold">THR: {(payload[0].payload.throttle * 100).toFixed(0)}%</p>
            </div>
        );
    }
    return null;
};
