import React from 'react';
import { CarSilhouette } from './CarSilhouette';
import { Battery, Droplet } from 'lucide-react';

interface VehicleHealthV2Props {
    telemetry: any;
}

export const VehicleHealthV2: React.FC<VehicleHealthV2Props> = ({ telemetry }) => {

    // Fallbacks
    const fuelPct = telemetry?.fuel_pct ?? 0;
    const fuelLiters = telemetry?.fuel_level ?? 0;
    const ersPct = telemetry?.ers_pct ?? 0.84; // Mock 84% for now until backend sends it
    const deployStatus = telemetry?.ers_deploy_status ?? "BALANCED"; // Mock

    return (
        <div className="w-full h-full flex gap-4 relative">

            {/* Left: Car Silhouette (Tires, Temps) */}
            <div className="flex-1 relative bg-black/20 rounded-lg border border-white/5 p-2 flex items-center justify-center">
                {telemetry ? (
                    <CarSilhouette telemetry={telemetry} />
                ) : (
                    <span className="text-zinc-700 animate-pulse text-[10px] font-mono tracking-widest uppercase">Awaiting Link...</span>
                )}
            </div>

            {/* Right: Powertrain & Energy */}
            <div className="w-16 flex flex-col gap-2">

                {/* Fuel Column */}
                <div className="flex-1 bg-black/40 rounded-lg border border-white/5 flex flex-col p-1.5 items-center justify-between">
                    <Droplet className="w-3 h-3 text-cyan-500 mb-1" />
                    <div className="flex-1 w-full relative bg-zinc-900 rounded-sm overflow-hidden mb-1">
                        <div
                            className="absolute bottom-0 w-full bg-cyan-500 transition-all duration-300"
                            style={{ height: `${fuelPct * 100}%` }}
                        />
                        {/* Low Fuel Warning Pattern (Overlay) */}
                        {fuelPct < 0.1 && (
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)]" />
                        )}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 font-bold">{fuelLiters.toFixed(1)}L</div>
                </div>

                {/* ERS / Battery Column */}
                <div className="flex-1 bg-black/40 rounded-lg border border-white/5 flex flex-col p-1.5 items-center justify-between">
                    <Battery className="w-3 h-3 text-emerald-500 mb-1" />
                    <div className="flex-1 w-full relative bg-zinc-900 rounded-sm overflow-hidden mb-1 flex flex-col-reverse">
                        {/* Battery Level */}
                        <div
                            className={`w-full transition-all duration-300 ${ersPct < 0.2 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ height: `${ersPct * 100}%` }}
                        />
                        {/* Deployment State Overlay */}
                        <div className="absolute inset-x-0 bottom-1 flex justify-center">
                            <div className="text-[6px] font-black text-black bg-white/50 px-0.5 rounded uppercase tracking-tighter">
                                {deployStatus}
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold">{Math.round(ersPct * 100)}%</div>
                </div>

            </div>
        </div>
    );
};
