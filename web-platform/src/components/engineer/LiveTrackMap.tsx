import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Navigation } from "lucide-react";

interface LiveTrackMapProps {
    telemetry: any;
}

interface Point {
    x: number;
    y: number;
}

interface LapTrace {
    lap: number;
    points: Point[];
    color: string;
}

const LAP_COLORS = [
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
];

export const LiveTrackMap: React.FC<LiveTrackMapProps> = ({ telemetry }) => {
    const [history, setHistory] = useState<LapTrace[]>([]);
    // currentPointsRef used for accumulation without re-renders
    const currentPointsRef = useRef<Point[]>([]);
    const lastLapRef = useRef<number>(-1);
    // state to force render
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!telemetry) return;

        const currentLap = telemetry.lap_number;
        const newPoint = { x: telemetry.lat, y: telemetry.lon };

        // Initialize
        if (lastLapRef.current === -1) {
            lastLapRef.current = currentLap;
        }

        // Lap Change Logic
        if (currentLap > lastLapRef.current) {
            const completedLapNum = lastLapRef.current;
            const completedPoints = [...currentPointsRef.current];

            // Only save valid laps (>20 points)
            if (completedPoints.length > 20) {
                setHistory(prev => [
                    ...prev,
                    {
                        lap: completedLapNum,
                        points: completedPoints,
                        color: LAP_COLORS[completedLapNum % LAP_COLORS.length]
                    }
                ].slice(-5)); // Keep last 5 laps max to save memory
            }

            currentPointsRef.current = [];
            lastLapRef.current = currentLap;
        }

        // Add Point (Throttle?)
        // For visual smoothness we want every point, but maybe limit distance?
        const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
        if (!lastPoint || (Math.abs(lastPoint.x - newPoint.x) > 0.1 || Math.abs(lastPoint.y - newPoint.y) > 0.1)) {
            currentPointsRef.current.push(newPoint);
        }

        // Trigger Render
        setTick(prev => prev + 1);

    }, [telemetry]);

    // MAP SCALING - STABILIZED
    // First, collect all points to determine rendering space
    const allPoints = useMemo(() => {
        return [
            ...history.flatMap(l => l.points),
            ...currentPointsRef.current
        ];
    }, [history, telemetry]); // Update on history change or telemetry tick

    // We only update bounds when they expand significantly or on lap change to prevent jitter.
    const [bounds, setBounds] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);

    useEffect(() => {
        if (allPoints.length < 2) return;

        // Calculate current limits
        const xs = allPoints.map(p => p.x);
        const ys = allPoints.map(p => p.y);
        const currentMinX = Math.min(...xs);
        const currentMaxX = Math.max(...xs);
        const currentMinY = Math.min(...ys);
        const currentMaxY = Math.max(...ys);

        setBounds(prev => {
            // Initial Set
            if (!prev) {
                return { minX: currentMinX, maxX: currentMaxX, minY: currentMinY, maxY: currentMaxY };
            }

            // Expansion Logic: Only update if we go OUTSIDE the current bounds + padding buffer
            // This prevents "shaking" when inside the known area.
            // We expand the bounds slightly more than needed to prevent frequent updates.
            const padding = 0.05; // 5% buffer trigger
            const width = prev.maxX - prev.minX;
            const height = prev.maxY - prev.minY;

            let newBounds = { ...prev };
            let changed = false;

            if (currentMinX < prev.minX) { newBounds.minX = currentMinX - (width * 0.1); changed = true; }
            if (currentMaxX > prev.maxX) { newBounds.maxX = currentMaxX + (width * 0.1); changed = true; }
            if (currentMinY < prev.minY) { newBounds.minY = currentMinY - (height * 0.1); changed = true; }
            if (currentMaxY > prev.maxY) { newBounds.maxY = currentMaxY + (height * 0.1); changed = true; }

            return changed ? newBounds : prev;
        });

    }, [allPoints.length, Math.floor(currentPointsRef.current.length / 50)]); // Update on Lap Change OR every 50 points

    const norm = useMemo(() => {
        if (!bounds) return null;

        const width = bounds.maxX - bounds.minX || 1;
        const height = bounds.maxY - bounds.minY || 1;
        // Visual Padding
        const padX = width * 0.05;
        const padY = height * 0.05;

        return {
            minX: bounds.minX - padX,
            minY: bounds.minY - padY,
            width: width + (padX * 2),
            height: height + (padY * 2)
        };
    }, [bounds]);

    const generatePath = (points: Point[]) => {
        if (!norm || points.length < 2) return "";
        // Optimization: Decimate points for SVG performance if strictly needed, 
        // but for < 5000 points SVG is usually okay. 
        // We can skip every 2nd point if density is high.
        return points.map(p => {
            const x = ((p.x - norm.minX) / norm.width) * 100;
            const y = ((p.y - norm.minY) / norm.height) * 100;
            return `${x.toFixed(2)},${(100 - y).toFixed(2)}`; // Limit precision to reduce DOM size
        }).join(" ");
    };

    // Calculate current position on normalized map
    const currentPos = (() => {
        if (!norm || !telemetry) return { x: 50, y: 50 };
        const x = ((telemetry.lat - norm.minX) / norm.width) * 100;
        const y = ((telemetry.lon - norm.minY) / norm.height) * 100;
        return { x, y: 100 - y };
    })();

    // Wind Direction (Rotation)
    // Assume 0 = North (Up). 
    // If telemetry.wind_dir is radians/degrees.
    // iRacing WindDir is usually radians from North? Need to verify.
    // Let's assume Radians.
    const windRot = telemetry ? (telemetry.wind_dir * 180 / Math.PI) : 0;


    return (
        <div className="w-full h-full flex flex-col relative">
            {/* Header */}
            <div className="absolute top-0 left-0 bg-zinc-900/80 backdrop-blur p-2 rounded-br-xl z-10 border-r border-b border-white/5">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Track Map
                </h3>
            </div>

            {/* Weather / Info Overlay (Bottom Right) */}
            <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-2 items-end">
                {/* Wind */}
                {telemetry && (
                    <div className="bg-black/50 backdrop-blur rounded p-2 flex items-center gap-3 border border-white/5">
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 font-bold">WIND</div>
                            <div className="text-xs font-mono text-white">{(telemetry.wind_vel * 3.6).toFixed(1)} km/h</div>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center relative bg-zinc-800">
                            <div
                                style={{ transform: `rotate(${windRot}deg)` }}
                                className="transition-transform duration-500"
                            >
                                <Navigation size={14} className="text-blue-400 fill-blue-400/20" />
                            </div>
                            <span className="absolute text-[6px] text-zinc-600 top-0.5">N</span>
                        </div>
                    </div>
                )}
                {/* Temp */}
                {telemetry && (
                    <div className="bg-black/50 backdrop-blur rounded p-2 text-right border border-white/5">
                        <div className="text-[10px] text-zinc-500 font-bold">TRACK TEMP</div>
                        <div className="text-sm font-mono text-white">{telemetry.track_temp?.toFixed(1)}°C</div>
                    </div>
                )}
            </div>


            {/* Map Canvas */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                {allPoints.length > 20 ? (
                    <svg className="w-full h-full p-4 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        {/* History Laps */}
                        {history.map((l) => (
                            <polyline
                                key={l.lap}
                                points={generatePath(l.points)}
                                fill="none"
                                stroke={l.color}
                                strokeWidth="1"
                                strokeOpacity="0.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}

                        {/* Current Lap */}
                        <polyline
                            points={generatePath(currentPointsRef.current)}
                            fill="none"
                            stroke={LAP_COLORS[telemetry?.lap_number % LAP_COLORS.length] || "#fff"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]"
                        />

                        {/* Player Dot */}
                        <circle
                            cx={currentPos.x}
                            cy={currentPos.y}
                            r="1.5"
                            fill="white"
                            className="drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                        />
                    </svg>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600/50">
                        <Navigation size={48} className="mb-2 opacity-20" />
                        <span className="text-xs font-mono animate-pulse">Mapping Track...</span>
                    </div>
                )}
            </div>

            {/* Background */}
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/20" />
        </div>
    );
};
