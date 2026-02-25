import React from 'react';
import { FuelStrategy } from './FuelStrategy';
import { RelativeTable } from './RelativeTable';

interface RaceStrategyProps {
    telemetry: any;
}

export const RaceStrategy: React.FC<RaceStrategyProps> = ({ telemetry }) => {
    return (
        <div className="w-full h-full flex flex-col gap-2 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/20" />

            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-1 pl-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> Race Strategy
            </h3>

            {/* Intelligent Relative (Takes most space) */}
            <RelativeTable telemetry={telemetry} />

            {/* Fuel Calculator (Bottom) */}
            <FuelStrategy telemetry={telemetry} />
        </div>
    );
};
