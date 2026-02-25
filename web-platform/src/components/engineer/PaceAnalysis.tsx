import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PaceAnalysisProps {
    telemetry: any;
}

interface LapData {
    lap: number;
    time: number;
}

export const PaceAnalysis: React.FC<PaceAnalysisProps> = ({ telemetry }) => {
    const [history, setHistory] = useState<LapData[]>([]);
    const [lastLapProcessed, setLastLapProcessed] = useState<number>(-1);

    // Effect to detect new lap and add to history
    useEffect(() => {
        if (!telemetry) return;

        const currentLap = telemetry.lap_number;
        const lastLapTime = telemetry.last_lap_time;

        // Validation: Must be a new lap, and have a valid time (not 0 or -1)
        // We trigger when 'currentLap' increments. The 'last_lap_time' refers to (currentLap - 1).
        if (currentLap > lastLapProcessed && lastLapTime > 0) {

            // Avoid duplicates if effect runs multiple times
            setHistory(prev => {
                // Check if we already have this lap
                const lapNum = currentLap - 1;
                if (prev.some(d => d.lap === lapNum)) return prev;

                return [...prev, { lap: lapNum, time: lastLapTime }];
            });

            setLastLapProcessed(currentLap);
        } else if (lastLapProcessed === -1 && currentLap > 0) {
            // Initial sync: convert undefined/init state to current
            setLastLapProcessed(currentLap);
        }

    }, [telemetry?.lap_number, telemetry?.last_lap_time]);

    // Calculate Average
    const validLaps = history.filter(d => d.time > 0);
    const avgTime = validLaps.length > 0
        ? validLaps.reduce((acc, curr) => acc + curr.time, 0) / validLaps.length
        : 0;

    // Helper to format time (Seconds -> MM:SS.ms)
    const formatTime = (seconds: number) => {
        if (!seconds) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(1);
        return `${m}:${s.padStart(4, '0')}`;
    };

    return (
        <div className="w-full h-full flex flex-col relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 z-10">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 pl-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" /> Pace Analysis
                </h3>
                {validLaps.length > 0 && (
                    <div className="text-[10px] font-mono text-zinc-500">
                        AVG: <span className="text-zinc-300">{formatTime(avgTime)}</span>
                    </div>
                )}
            </div>

            {/* Graph Container */}
            <div className="flex-1 w-full min-h-0 bg-black/20 rounded-lg border border-white/5 relative">
                {history.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="lap"
                                stroke="#555"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                stroke="#555"
                                fontSize={10}
                                tickFormatter={(val) => val.toFixed(1)}
                                tickLine={false}
                                axisLine={false}
                                width={35}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                                labelStyle={{ color: '#888', marginBottom: '4px' }}
                                formatter={(val: any) => [formatTime(val as number), "Time"]}
                                labelFormatter={(label) => `Lap ${label}`}
                            />
                            {avgTime > 0 && (
                                <ReferenceLine y={avgTime} stroke="white" strokeDasharray="3 3" opacity={0.3} />
                            )}
                            <Line
                                type="monotone"
                                dataKey="time"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 3 }}
                                activeDot={{ r: 5, fill: '#fff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                        <span className="text-xl mb-2">📉</span>
                        <span className="text-xs font-mono">Completing Laps...</span>
                        {history.length === 1 && <span className="text-[10px] mt-2">1 Data Point (Need 2 for Line)</span>}
                    </div>
                )}
            </div>

            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20" />
        </div>
    );
};
