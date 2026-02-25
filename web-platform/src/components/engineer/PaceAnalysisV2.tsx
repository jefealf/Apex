import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface LapData {
    lap: number;
    time: number;
    s1: number;
    s2: number;
    s3: number;
}

interface PaceAnalysisProps {
    telemetry: any;
}

export const PaceAnalysisV2: React.FC<PaceAnalysisProps> = ({ telemetry }) => {
    const [history, setHistory] = useState<LapData[]>([]);
    const [lastLapProcessed, setLastLapProcessed] = useState<number>(-1);

    // Effect to detect new lap and add to history
    useEffect(() => {
        if (!telemetry || telemetry.lap_number <= 1) return;

        const currentLapNum = telemetry.lap_number;

        // Has the lap changed?
        if (currentLapNum > lastLapProcessed && telemetry.last_lap_time > 0) {

            // Avoid duplicates
            if (history.length > 0 && history[history.length - 1].lap === currentLapNum - 1) {
                return;
            }

            // Mock Sectors if not provided by telemetry yet (fallback)
            const s1 = telemetry.sector_1_time || (telemetry.last_lap_time * 0.3);
            const s2 = telemetry.sector_2_time || (telemetry.last_lap_time * 0.4);
            const s3 = telemetry.sector_3_time || (telemetry.last_lap_time * 0.3);

            const newLap: LapData = {
                lap: currentLapNum - 1,
                time: telemetry.last_lap_time,
                s1, s2, s3
            };

            setHistory(prev => {
                const newHistory = [...prev, newLap];
                // Keep last 100 laps for performance
                if (newHistory.length > 100) return newHistory.slice(-100);
                return newHistory;
            });
            setLastLapProcessed(currentLapNum);
        }
    }, [telemetry?.lap_number, telemetry?.last_lap_time]);

    const formatTime = (seconds: number) => {
        if (!seconds || seconds <= 0) return "--:--.---";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    // Calculate Averages and Bests
    const avgTime = history.length > 0
        ? history.reduce((sum, lap) => sum + lap.time, 0) / history.length
        : 0;

    const bestS1 = history.length > 0 ? Math.min(...history.map(l => l.s1)) : 999;
    const bestS2 = history.length > 0 ? Math.min(...history.map(l => l.s2)) : 999;
    const bestS3 = history.length > 0 ? Math.min(...history.map(l => l.s3)) : 999;

    const currentS1 = telemetry?.current_sector_1_time || 0;
    const currentS2 = telemetry?.current_sector_2_time || 0;
    const currentS3 = telemetry?.current_sector_3_time || 0;

    // Helper for Sector Color (Purple = Overall Best, Green = Personal Best/Good, Yellow = Slower)
    const getSectorColor = (current: number, best: number) => {
        if (current <= 0) return "text-zinc-600";
        if (current <= best) return "text-purple-400 font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]";
        if (current < best + 0.5) return "text-green-400 font-bold drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]";
        return "text-yellow-500";
    };

    return (
        <div className="w-full h-full flex flex-col gap-3">

            {/* Top Row: Timers & Sectors */}
            <div className="grid grid-cols-3 gap-2">
                {/* Current Lap & Sectors */}
                <div className="col-span-1 flex flex-col justify-between bg-black/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">CURRENT</div>
                    <div className="text-2xl font-mono text-white tracking-tighter">
                        {telemetry?.current_lap_time > 0 ? formatTime(telemetry.current_lap_time) : "--:--.---"}
                    </div>

                    {/* Micro Sectors */}
                    <div className="flex gap-1 mt-2">
                        <div className={`flex-1 text-[10px] bg-zinc-900/50 rounded px-1 py-0.5 text-center font-mono ${getSectorColor(currentS1, bestS1)}`}>
                            {currentS1 > 0 ? currentS1.toFixed(1) : "-.-"}
                        </div>
                        <div className={`flex-1 text-[10px] bg-zinc-900/50 rounded px-1 py-0.5 text-center font-mono ${getSectorColor(currentS2, bestS2)}`}>
                            {currentS2 > 0 ? currentS2.toFixed(1) : "-.-"}
                        </div>
                        <div className={`flex-1 text-[10px] bg-zinc-900/50 rounded px-1 py-0.5 text-center font-mono ${getSectorColor(currentS3, bestS3)}`}>
                            {currentS3 > 0 ? currentS3.toFixed(1) : "-.-"}
                        </div>
                    </div>
                </div>

                {/* Last Lap */}
                <div className="col-span-1 flex flex-col justify-start bg-black/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">LAST LAP</div>
                    <div className="text-xl font-mono text-zinc-300 mt-1">
                        {telemetry?.last_lap_time > 0 ? formatTime(telemetry.last_lap_time) : "--:--.---"}
                    </div>
                    {history.length > 0 && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-auto">
                            Δ {((telemetry?.last_lap_time || 0) - avgTime).toFixed(3)}s (Avg)
                        </div>
                    )}
                </div>

                {/* Best Lap */}
                <div className="col-span-1 flex flex-col justify-start bg-purple-500/10 rounded-lg p-2 border border-purple-500/20 relative overflow-hidden">
                    <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold z-10">SESSION BEST</div>
                    <div className="text-xl font-mono text-purple-100 font-bold mt-1 z-10 drop-shadow-[0_0_5px_rgba(168,85,247,0.3)]">
                        {telemetry?.best_lap_time > 0 ? formatTime(telemetry.best_lap_time) : "--:--.---"}
                    </div>
                </div>
            </div>

            {/* Middle Row: Graph */}
            <div className="flex-1 w-full min-h-[100px] bg-black/40 rounded-lg border border-white/5 relative p-2">
                <div className="absolute top-2 right-4 text-[10px] text-zinc-500 font-mono z-10 flex gap-4">
                    {avgTime > 0 && <span>AVG: {formatTime(avgTime)}</span>}
                </div>
                {history.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="lap"
                                stroke="#666"
                                fontSize={10}
                                tickMargin={5}
                                tickFormatter={(val) => `L${val}`}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                stroke="#666"
                                fontSize={10}
                                tickFormatter={(val) => val.toFixed(1)}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                                labelStyle={{ color: '#a1a1aa' }}
                                formatter={(value: any) => [formatTime(value as number), 'Lap Time']}
                                labelFormatter={(label) => `Lap ${label}`}
                            />
                            {/* Average Line */}
                            <Line
                                type="step"
                                dataKey={() => avgTime}
                                stroke="#52525b"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                dot={false}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="time"
                                stroke="#a855f7"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#18181b', strokeWidth: 2 }}
                                activeDot={{ r: 5, fill: '#a855f7' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                        <span className="text-xl mb-2 opacity-50">📉</span>
                        <span className="text-[10px] font-mono tracking-widest uppercase">Awaiting Lap Data</span>
                    </div>
                )}
            </div>

            {/* Bottom Row: Live Inputs */}
            <div className="h-20 flex gap-2">
                {/* Speed Gauge */}
                <div className="flex-1 bg-black/40 rounded-lg flex flex-col items-center justify-center border border-white/5">
                    <div className="text-3xl font-bold italic text-white tracking-tighter font-mono">
                        {Math.round(telemetry?.speed || 0)}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">KM/H</div>
                </div>

                {/* Gear */}
                <div className="w-16 bg-blue-500/10 rounded-lg flex flex-col items-center justify-center border border-blue-500/20">
                    <div className="text-3xl font-bold text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">
                        {telemetry?.gear === 0 ? "N" : telemetry?.gear === -1 ? "R" : Math.round(telemetry?.gear || 0)}
                    </div>
                    <div className="text-[9px] text-blue-500/50 font-bold uppercase tracking-widest mt-0.5">GEAR</div>
                </div>

                {/* Inputs Bar */}
                <div className="w-20 bg-black/40 rounded-lg border border-white/5 flex p-1.5 gap-1.5">
                    {/* Throttle */}
                    <div className="flex-1 rounded-sm bg-zinc-900 overflow-hidden relative flex flex-col-reverse">
                        <div className="w-full bg-emerald-500 transition-all duration-75" style={{ height: `${(telemetry?.throttle || 0) * 100}%` }} />
                        <div className="absolute top-1 w-full text-center text-[8px] text-emerald-500 pointer-events-none font-bold">THR</div>
                    </div>
                    {/* Brake */}
                    <div className="flex-1 rounded-sm bg-zinc-900 overflow-hidden relative flex flex-col-reverse">
                        <div className="w-full bg-red-500 transition-all duration-75" style={{ height: `${(telemetry?.brake || 0) * 100}%` }} />
                        <div className="absolute top-1 w-full text-center text-[8px] text-red-500 pointer-events-none font-bold">BRK</div>
                    </div>
                </div>
            </div>

        </div>
    );
};
