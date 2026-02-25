import React from 'react';

interface TirePatchProps {
    position: 'LF' | 'RF' | 'LR' | 'RR';
    temp: number; // Surface temp in Celsius
    wear: number; // Wear percentage (1.0 = new, 0.0 = worn)
    pressure?: number;
}

export const TirePatch: React.FC<TirePatchProps> = ({ position, temp, wear, pressure }) => {
    // Interpolate Color based on Temp
    // < 70: Cold (Blue)
    // 70-100: Optimal (Green)
    // > 100: Hot (Red)

    // Normalized value for gradient (0 to 1) relative to range 40C to 130C
    const getGradientColor = (t: number) => {
        if (t < 70) return "#3b82f6"; // Blue-500
        if (t < 100) return "#22c55e"; // Green-500
        return "#ef4444"; // Red-500
    };

    const mainColor = getGradientColor(temp);

    // Radial Gradient ID to be unique per tire
    const gradientId = `tire-grad-${position}`;

    return (
        <div className="relative group w-full h-full">
            {/* Wear Arc (Outer Ring) */}
            <svg className="absolute inset-0 w-full h-full p-[2%] overflow-visible">
                <rect
                    x="5%" y="5%" width="90%" height="90%"
                    rx="15%" ry="10%"
                    fill="url(#carbongrid)"
                    className="stroke-zinc-800"
                    strokeWidth="2"
                />
            </svg>

            {/* Main Tire Body */}
            <div
                className="absolute inset-[10%] rounded-lg overflow-hidden border border-white/10"
                style={{
                    background: `radial-gradient(circle at center, ${mainColor}40 0%, ${mainColor}10 60%, transparent 100%)`,
                    boxShadow: temp > 100 ? `0 0 15px ${mainColor}40` : 'none'
                }}
            >
                {/* Core Heat Indicator */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full blur-md opacity-80 transition-colors duration-500"
                    style={{ backgroundColor: mainColor }}
                />

                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('/tire-texture.png')] opacity-20 mix-blend-overlay"></div>
            </div>

            {/* Info Overlay (Always Visible) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <span className="text-[min(3vw,12px)] font-bold text-white drop-shadow-md">{Math.round(temp)}°</span>
                {pressure && <span className="text-[min(2vw,8px)] text-zinc-300 font-mono hidden sm:block">{pressure.toFixed(1)}</span>}
            </div>

            {/* Position Label */}
            <div className="absolute -bottom-[20%] left-0 w-full text-center">
                <span className={`text-[min(2.5vw,10px)] font-mono font-bold ${temp > 100 ? "text-red-500 animate-pulse" : "text-zinc-500"
                    }`}>
                    {position}
                </span>
            </div>
        </div>
    );
};
