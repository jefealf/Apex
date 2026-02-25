import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Navigation, CloudLightning } from "lucide-react";

interface LiveTrackMapV2Props {
    telemetry: any;
}

interface Point {
    x: number;
    y: number;
    pct: number;
}

interface LapTrace {
    lap: number;
    points: Point[];
    color: string;
}

interface TrafficCar {
    idx: number;
    pct: number;
    class_id: number;
    class_name: string;
    is_player: boolean;
}

const LAP_COLORS = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

export const LiveTrackMapV2: React.FC<LiveTrackMapV2Props> = ({ telemetry }) => {
    const [history, setHistory] = useState<LapTrace[]>([]);
    const currentPointsRef = useRef<Point[]>([]);
    const lastLapRef = useRef<number>(-1);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!telemetry) return;

        const currentLap = telemetry.lap_number;
        const newPoint = { x: telemetry.lat, y: telemetry.lon, pct: telemetry.lap_pct || 0 };

        if (lastLapRef.current === -1) {
            lastLapRef.current = currentLap;
        }

        if (currentLap > lastLapRef.current) {
            const completedLapNum = lastLapRef.current;
            const completedPoints = [...currentPointsRef.current];

            if (completedPoints.length > 20) {
                setHistory(prev => [
                    ...prev,
                    { lap: completedLapNum, points: completedPoints, color: LAP_COLORS[completedLapNum % LAP_COLORS.length] }
                ].slice(-5));
            }
            currentPointsRef.current = [];
            lastLapRef.current = currentLap;
        }

        const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
        if (!lastPoint || (Math.abs(lastPoint.x - newPoint.x) > 0.1 || Math.abs(lastPoint.y - newPoint.y) > 0.1)) {
            currentPointsRef.current.push(newPoint);
        }
        setTick(prev => prev + 1);

    }, [telemetry]);

    const allPoints = useMemo(() => {
        return [...history.flatMap(l => l.points), ...currentPointsRef.current];
    }, [history, telemetry]);

    const [bounds, setBounds] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);

    useEffect(() => {
        if (allPoints.length < 2) return;
        const xs = allPoints.map(p => p.x);
        const ys = allPoints.map(p => p.y);
        const currentMinX = Math.min(...xs);
        const currentMaxX = Math.max(...xs);
        const currentMinY = Math.min(...ys);
        const currentMaxY = Math.max(...ys);

        setBounds(prev => {
            if (!prev) return { minX: currentMinX, maxX: currentMaxX, minY: currentMinY, maxY: currentMaxY };
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
    }, [allPoints.length, Math.floor(currentPointsRef.current.length / 50)]);

    const norm = useMemo(() => {
        if (!bounds) return null;
        const width = bounds.maxX - bounds.minX || 1;
        const height = bounds.maxY - bounds.minY || 1;
        const padX = width * 0.05;
        const padY = height * 0.05;
        return { minX: bounds.minX - padX, minY: bounds.minY - padY, width: width + (padX * 2), height: height + (padY * 2) };
    }, [bounds]);

    const generatePath = (points: Point[]) => {
        if (!norm || points.length < 2) return "";
        return points.map(p => {
            const x = ((p.x - norm.minX) / norm.width) * 100;
            const y = ((p.y - norm.minY) / norm.height) * 100;
            return `${x.toFixed(2)},${(100 - y).toFixed(2)}`;
        }).join(" ");
    };

    const getPointAtPct = (targetPct: number) => {
        if (!allPoints.length || !norm) return null;
        let bestPoint = allPoints[0];
        let minDiff = 1.0;
        for (const p of allPoints) {
            let diff = Math.abs(p.pct - targetPct);
            if (diff > 0.5) diff = 1.0 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                bestPoint = p;
                if (minDiff < 0.001) break;
            }
        }
        const x = ((bestPoint.x - norm.minX) / norm.width) * 100;
        const y = ((bestPoint.y - norm.minY) / norm.height) * 100;
        return { x, y: 100 - y };
    };

    const currentPos = (() => {
        if (!norm || !telemetry) return { x: 50, y: 50 };
        const x = ((telemetry.lat - norm.minX) / norm.width) * 100;
        const y = ((telemetry.lon - norm.minY) / norm.height) * 100;
        return { x, y: 100 - y };
    })();

    const windRot = telemetry ? (telemetry.wind_dir * 180 / Math.PI) : 0;

    // Auto-generated colors based on class string length/hash for now
    const getClassColor = (classId: number) => {
        const hues = [0, 120, 240, 60, 300, 180];
        return `hsl(${hues[classId % hues.length]}, 70%, 50%)`;
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/20">
            {/* Weather / Info Overlay (Top Right now for better grid fit) */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                {telemetry && (
                    <div className="bg-black/50 backdrop-blur rounded p-1.5 flex items-center gap-2 border border-white/5">
                        <div className="text-right">
                            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">WIND</div>
                            <div className="text-[10px] font-mono text-white">{(telemetry.wind_vel * 3.6).toFixed(1)} km/h</div>
                        </div>
                        <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center relative bg-zinc-800">
                            <div style={{ transform: `rotate(${windRot}deg)` }} className="transition-transform duration-500">
                                <Navigation size={10} className="text-blue-400 fill-blue-400/20" />
                            </div>
                            <span className="absolute text-[5px] text-zinc-600 top-[1px]">N</span>
                        </div>
                    </div>
                )}
                {telemetry && (
                    <div className="bg-black/50 backdrop-blur rounded p-1.5 flex items-center gap-2 border border-white/5">
                        <CloudLightning size={14} className="text-yellow-500" />
                        <div className="text-right">
                            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">TRACK TRP</div>
                            <div className="text-[10px] font-mono text-white">{telemetry.track_temp?.toFixed(1)}°C</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Map Canvas */}
            <div className="flex-1 w-full h-full relative">
                {allPoints.length > 20 ? (
                    <svg className="w-full h-full p-6 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        {/* History Laps */}
                        {history.map((l) => (
                            <polyline
                                key={l.lap}
                                points={generatePath(l.points)}
                                fill="none"
                                stroke={l.color}
                                strokeWidth="0.5"
                                strokeOpacity="0.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}

                        {/* Current Lap */}
                        <polyline
                            points={generatePath(currentPointsRef.current)}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                        />

                        {/* TRAFFIC OVERLAY */}
                        {telemetry?.traffic?.map((car: TrafficCar) => {
                            if (car.is_player) return null;
                            const pos = getPointAtPct(car.pct);
                            if (!pos) return null;
                            return (
                                <circle
                                    key={car.idx}
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="1.2"
                                    fill={getClassColor(car.class_id)}
                                    className="transition-all duration-300 ease-linear"
                                >
                                    <title>{car.class_name} #{car.idx}</title>
                                </circle>
                            );
                        })}

                        {/* Player Dot */}
                        <circle
                            cx={currentPos.x}
                            cy={currentPos.y}
                            r="2"
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth="0.5"
                            className="drop-shadow-[0_0_6px_rgba(59,130,246,1)] z-10"
                        />
                    </svg>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600/50">
                        <Navigation size={32} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-mono tracking-widest uppercase animate-pulse">Mapping Circuit...</span>
                    </div>
                )}
            </div>
            {/* V2 specific subtle background glow instead of solid color line */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>
    );
};
