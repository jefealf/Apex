import React from 'react';

interface FuelStrategyProps {
    telemetry: any;
}

export const FuelStrategy: React.FC<FuelStrategyProps> = ({ telemetry }) => {
    if (!telemetry) return null;

    const fuelLevel = telemetry.fuel_level || 0.0;
    const fuelPct = telemetry.fuel_pct || 0.0;
    // Mocking consumption/laps for now until we have real data
    const lapsRemaining = 15; // Mock
    const fuelPerLap = 2.4; // Mock
    const fuelNeeded = lapsRemaining * fuelPerLap;

    // Status Logic
    const isSafe = fuelLevel >= fuelNeeded;
    const deltaLaps = (fuelLevel - fuelNeeded) / fuelPerLap;

    return (
        <div className="bg-black/40 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fuel Strategy</span>
                <span className={`text-xs font-bold font-mono ${isSafe ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
                    {deltaLaps > 0 ? '+' : ''}{deltaLaps.toFixed(1)} Laps
                </span>
            </div>

            {/* Main Bar Container */}
            <div className="relative w-full h-6 bg-zinc-800 rounded flex overflow-hidden">
                {/* Current Fuel (Yellow) */}
                <div
                    className="h-full bg-yellow-500 transition-all duration-500 relative min-w-[2px]"
                    style={{ width: `${fuelPct * 100}%` }}
                >
                    {/* Gloss Effect */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20" />
                </div>

                {/* Target Line (Ghost) - Calculated position based on tank capacity */}
                {/* Assuming 100% = Tank Capacity. Logic: (Need / Capacity) * 100 */}
                {/* Mocking Capacity as 100L for simplicity or using telemetry if available */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{ left: `${(fuelNeeded / 100) * 100}%` }} // Simplified, needs real capacity
                />

                {/* If Danger, show striped pattern in the gap? Complex CSS, skipping for MVP visual */}
            </div>

            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>{fuelLevel.toFixed(1)}L <span className="text-zinc-600">(NOW)</span></span>
                <span>{fuelNeeded.toFixed(1)}L <span className="text-zinc-600">(REQ)</span></span>
            </div>
        </div>
    );
};
