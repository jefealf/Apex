import React from 'react';
import { TirePatch } from './TirePatch';

interface CarSilhouetteProps {
    telemetry: any;
}

export const CarSilhouette: React.FC<CarSilhouetteProps> = ({ telemetry }) => {
    if (!telemetry) return null;

    return (
        <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Car Container: Maintain Aspect Ratio 1:2 approx, max-height full */}
            <div className="relative h-full aspect-[1/2] max-h-full">

                {/* Chassis SVG */}
                <svg className="absolute inset-0 w-full h-full text-zinc-800 drop-shadow-2xl" viewBox="0 0 160 320" preserveAspectRatio="xMidYMid meet">
                    {/* Floor / Diffuser */}
                    <path d="M40,20 L120,20 L130,80 L140,160 L140,260 L110,300 L50,300 L20,260 L20,160 L30,80 Z"
                        fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />

                    {/* Cockpit / Nose */}
                    <path d="M80,10 L100,60 L100,140 L110,180 L80,200 L50,180 L60,140 L60,60 Z"
                        fill="#18181b" stroke="currentColor" strokeWidth="2" />

                    {/* Front Wing */}
                    <path d="M20,30 L140,30 L130,10 L30,10 Z" fill="#27272a" stroke="currentColor" strokeWidth="1" />

                    {/* Rear Wing */}
                    <rect x="30" y="290" width="100" height="20" rx="4" fill="#27272a" stroke="currentColor" strokeWidth="1" />
                </svg>

                {/* Engine / Fluids Center */}
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[50%] flex flex-col gap-2 z-10">
                    {/* Oil */}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500 uppercase">
                            <span>Oil</span>
                            <span className="text-white">{Math.round(telemetry.oil_temp)}°</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0" />
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${telemetry.oil_temp > 120 ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`}
                                    style={{ width: '60%' }} // Mock
                                />
                            </div>
                        </div>
                    </div>

                    {/* Water */}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500 uppercase">
                            <span>Water</span>
                            <span className="text-white">{Math.round(telemetry.water_temp)}°</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${telemetry.water_temp > 110 ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`}
                                    style={{ width: '75%' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tires Positioning (Percents relative to car container) */}
                {/* LF: Top Left */}
                <div className="absolute top-[10%] -left-[25%] w-[35%] h-[25%]">
                    <TirePatch position="LF" temp={telemetry.lf_temp} wear={telemetry.lf_wear || 1.0} pressure={telemetry.lf_pressure} />
                </div>
                {/* RF: Top Right */}
                <div className="absolute top-[10%] -right-[25%] w-[35%] h-[25%]">
                    <TirePatch position="RF" temp={telemetry.rf_temp} wear={telemetry.rf_wear || 1.0} pressure={telemetry.rf_pressure} />
                </div>
                {/* LR: Bottom Left */}
                <div className="absolute bottom-[15%] -left-[25%] w-[35%] h-[25%]">
                    <TirePatch position="LR" temp={telemetry.lr_temp} wear={telemetry.lr_wear || 1.0} pressure={telemetry.lr_pressure} />
                </div>
                {/* RR: Bottom Right */}
                <div className="absolute bottom-[15%] -right-[25%] w-[35%] h-[25%]">
                    <TirePatch position="RR" temp={telemetry.rr_temp} wear={telemetry.rr_wear || 1.0} pressure={telemetry.rr_pressure} />
                </div>
            </div>

            {/* Controls Overlay (Bottom) */}
            <div className="absolute bottom-0 w-full flex justify-between px-4 py-1 text-[10px] font-mono text-zinc-500 uppercase bg-black/20 backdrop-blur-sm rounded-t-lg">
                <div className="flex flex-col items-center">
                    <span className="text-[8px]">BBias</span>
                    <span className="text-white font-bold">{telemetry.brake_bias?.toFixed(1) || "50.0"}%</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[8px]">Fuel</span>
                    <span className="text-white font-bold">{telemetry.fuel_map || "1"}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[8px]">TC</span>
                    <span className="text-white font-bold">{telemetry.tc_level || "1"}</span>
                </div>
            </div>
        </div>
    );
};
