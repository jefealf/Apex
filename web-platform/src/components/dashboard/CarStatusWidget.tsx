"use client";

import { Droplets, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarStatusProps {
    telemetry: any;
}

export function CarStatusWidget({ telemetry }: CarStatusProps) {
    // Helpers for Tire Formatting
    const getTempColor = (temp_c: number) => {
        if (!temp_c) return "bg-zinc-700";
        if (temp_c < 40) return "bg-blue-500";
        if (temp_c < 80) return "bg-green-500"; // Optimal (approx)
        if (temp_c < 100) return "bg-orange-500";
        return "bg-red-500";
    };

    const Tire = ({ label, temp, press }: { label: string, temp: number, press: number }) => (
        <div className="flex flex-col items-center gap-1">
            <div className={cn("w-14 h-20 rounded-lg flex items-center justify-center border-2 border-zinc-800 transition-colors duration-500", getTempColor(temp))}>
                <span className="text-white font-bold text-shadow">{Math.round(temp)}°C</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono">{press.toFixed(1)} <span className="text-[10px]">kPa</span></div>
        </div>
    );

    return (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-purple-500" />
                    Status do Veículo
                </h3>
                {telemetry.fuel_level !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full border border-white/5">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-mono text-white">{telemetry.fuel_level.toFixed(1)} L <span className="text-zinc-500">({(telemetry.fuel_pct * 100).toFixed(0)}%)</span></span>
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-8 relative">
                {/* Car Chassis Diagram (Simplified) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="w-32 h-48 bg-zinc-500 rounded-3xl" />
                </div>

                <div className="flex flex-col gap-12 z-10">
                    <Tire label="EF" temp={telemetry.lf_temp || 0} press={telemetry.lf_press || 0} />
                    <Tire label="ET" temp={telemetry.lr_temp || 0} press={telemetry.lr_press || 0} />
                </div>

                <div className="flex flex-col gap-12 z-10">
                    <Tire label="DF" temp={telemetry.rf_temp || 0} press={telemetry.rf_press || 0} />
                    <Tire label="DT" temp={telemetry.rr_temp || 0} press={telemetry.rr_press || 0} />
                </div>
            </div>

            <div className="mt-6 text-center">
                <p className="text-xs text-zinc-500">Monitoramento de Pneus e Combustível em Tempo Real</p>
            </div>
        </div>
    );
}
