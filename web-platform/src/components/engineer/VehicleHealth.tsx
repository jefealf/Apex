import React from 'react';
import { CarSilhouette } from './CarSilhouette';

interface VehicleHealthProps {
    telemetry: any;
}

export const VehicleHealth: React.FC<VehicleHealthProps> = ({ telemetry }) => {
    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            {/* Header */}
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2 z-10">
                <span className="w-2 h-2 bg-red-500 rounded-full" /> Vehicle Health
            </h3>

            {/* Main Visual */}
            <div className="flex-1 relative">
                {telemetry ? (
                    <CarSilhouette telemetry={telemetry} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-zinc-700 animate-pulse text-xs">Waiting for Telemetry...</span>
                    </div>
                )}
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 bg-red-500/5 -z-10 rounded-xl" />
        </div>
    );
};
