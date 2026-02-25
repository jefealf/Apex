import React from 'react';
import { RelativeTable } from './RelativeTable';
import { AlertTriangle, Flag, Info } from 'lucide-react';

interface RaceStrategyV2Props {
    telemetry: any;
}

export const RaceStrategyV2: React.FC<RaceStrategyV2Props> = ({ telemetry }) => {

    // Mock Race Control Messages if empty
    const raceMessages = telemetry?.race_messages || [
        { id: 1, type: "WARN", text: "TRACK LIMITS TURN 4 - WARNING", time: "12:04" },
        { id: 2, type: "INFO", text: "PIT LANE OPEN", time: "12:00" },
    ];

    // Mock Pit Strategy details
    const lapsToOptimal = telemetry?.laps_to_optimal_pit ?? 4;
    const targetDelta = telemetry?.delta_to_target ?? -0.150;

    return (
        <div className="w-full h-full flex items-stretch gap-4">

            {/* Left Box: Relative Table (Expanded, handles own scroll) */}
            <div className="flex-1 bg-black/20 rounded-lg border border-white/5 overflow-hidden flex flex-col p-1">
                <RelativeTable telemetry={telemetry} />
            </div>

            {/* Right Box: Strategy & Race Control */}
            <div className="w-48 flex flex-col gap-3">

                {/* Pit Strategy Metrics */}
                <div className="bg-black/40 rounded-lg border border-white/5 p-3 flex flex-col gap-3">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">PIT WINDOW</span>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-mono text-white font-bold">{lapsToOptimal}</span>
                            <span className="text-[10px] text-zinc-400 font-mono mb-1">LAPS</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5" />

                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">TARGET DELTA</span>
                        <div className={`text-xl font-mono font-bold ${targetDelta < 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {targetDelta < 0 ? '' : '+'}{targetDelta.toFixed(3)}s
                        </div>
                    </div>
                </div>

                {/* Race Control Ticker / Feed */}
                <div className="flex-1 bg-yellow-500/5 rounded-lg border border-yellow-500/20 p-2 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1 mb-2">
                        <Flag className="w-3 h-3 text-yellow-500" />
                        <span className="text-[9px] text-yellow-500 uppercase font-bold tracking-widest">RACE CONTROL</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {raceMessages.map((msg: any) => (
                            <div key={msg.id} className="flex flex-col bg-black/40 p-1.5 rounded border border-white/5">
                                <span className="text-[8px] text-zinc-500 font-mono">{msg.time}</span>
                                <span className={`text-[10px] font-mono leading-tight ${msg.type === 'WARN' ? 'text-yellow-400' : 'text-zinc-300'}`}>
                                    {msg.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
