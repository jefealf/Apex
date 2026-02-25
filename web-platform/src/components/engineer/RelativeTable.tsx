import React from 'react';

interface RelativeTableProps {
    telemetry: any;
}

// Mock Data Structure for Drivers
interface Driver {
    carIdx: number;
    name: string;
    class: string;
    irating: number;
    gap: number; // Seconds relative to player (negative = ahead, positive = behind)
    trend: 'catching' | 'losing' | 'stable';
    isPlayer?: boolean;
}

export const RelativeTable: React.FC<RelativeTableProps> = ({ telemetry }) => {
    // Use real data from backend, or empty array if not ready
    const drivers: Driver[] = telemetry?.relative || [];

    if (drivers.length === 0) {
        return (
            <div className="flex-1 flex flex-col min-h-0 bg-black/20 rounded-lg overflow-hidden border border-white/5">
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5">
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1">Driver</div>
                    <div className="w-16 text-right">Gap</div>
                </div>
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs animate-pulse">
                    Waiting for Relative...
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/20 rounded-lg overflow-hidden border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Driver</div>
                <div className="w-16 text-right">Gap</div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {drivers.map((d) => {
                    // Trend Logic for visuals
                    // Catching (Green): We are faster.
                    // Losing (Red): They are faster.

                    let gapBg = "bg-transparent";
                    let gapText = "text-zinc-300";
                    let arrow = "";

                    if (d.trend === 'catching') {
                        gapBg = "bg-green-500/10";
                        gapText = "text-green-400";
                        arrow = "▼"; // Gap closing
                    } else if (d.trend === 'losing') {
                        gapBg = "bg-red-500/10";
                        gapText = "text-red-400";
                        arrow = "▲"; // Gap opening (if ahead) or closing (if behind) - Context matters!
                        // Simplified: Green = Good for us. Red = Bad for us.
                    }

                    if (d.isPlayer) {
                        return (
                            <div key={d.carIdx} className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-l-2 border-cyan-500 text-xs font-bold text-white relative">
                                <div className="w-8 text-center text-cyan-400">{d.carIdx}</div>
                                <div className="flex-1 truncate">{telemetry?.driver_name || "HERO"}</div>
                                <div className="w-16 text-right font-mono text-cyan-400">---</div>
                            </div>
                        );
                    }

                    return (
                        <div key={d.carIdx} className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors text-xs">
                            <div className={`w-8 text-center font-mono ${d.class === "P1" ? "text-yellow-500" : "text-zinc-500"}`}>
                                {d.carIdx}
                            </div>
                            <div className="flex-1 truncate text-zinc-300">
                                {d.name} <span className="text-[10px] text-zinc-600 ml-1">({d.irating / 1000}k)</span>
                            </div>
                            <div className={`w-16 text-right font-mono font-bold flex items-center justify-end gap-1 ${gapBg} rounded px-1 py-0.5 ${gapText}`}>
                                <span className="text-[8px] opacity-70">{arrow}</span>
                                {Math.abs(d.gap).toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
