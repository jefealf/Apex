'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    ArrowLeft, Upload, Settings, Share2, Download,
    Map as MapIcon, Activity, AlertCircle, ChevronRight,
    Flag, Zap, Clock, MousePointer2, LayoutDashboard,
    Timer, Layers, BookOpen, Wrench, Flame, Droplets, RotateCcw, ArrowRightLeft,
    Play, Pause, Square, SkipBack, Trophy
} from 'lucide-react';
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from '@/lib/utils';

// --- TYPES ---
type TelemetryPoint = {
    timestamp: number;
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    rpm: number;
    lat?: number;
    lon?: number;
    steering_angle?: number;
    lap_number?: number;
    lap_distance?: number;
    current_lap_time?: number;
    fuel_level?: number;
    track_temp?: number;
    air_temp?: number;
};

type LapData = {
    lapNumber: number;
    lapTime: number;
    isValid: boolean;
    points: TelemetryPoint[];
    sectors: { s1: number; s2: number; s3: number };
};

// --- MOCK REFERENCE LAP (Simulating a Pro Driver) ---
// In a real app, this would come from a database based on track/car
const generateReferenceLap = (points: number) => {
    return Array.from({ length: points }).map((_, i) => ({
        timestamp: i * 0.1,
        speed: 100 + Math.sin(i * 0.1) * 50 + 20, // Slightly faster
        throttle: Math.max(0, Math.sin(i * 0.05)),
        brake: Math.max(0, -Math.sin(i * 0.05)),
        lat: 0, lon: 0,
        lap_number: 0,
        fuel_level: 5.0 - (i * 0.01), // usage
        track_temp: 35
    }));
};

export default function AnalysisPage() {
    const params = useParams();
    const router = useRouter();

    // Data State
    const [allPoints, setAllPoints] = useState<TelemetryPoint[]>([]); // Full Session
    const [laps, setLaps] = useState<LapData[]>([]);
    const [selectedLap, setSelectedLap] = useState<number | null>(null); // Index in laps array
    const [zoomRange, setZoomRange] = useState<{ start: number, end: number } | null>(null); // Zoom filter
    const [isZoomed, setIsZoomed] = useState(true); // Map Zoom Toggle

    // Visualization State (Filtered)
    const [data, setData] = useState<TelemetryPoint[]>([]); // Current View (Main Lap)
    const [compareLap, setCompareLap] = useState<number | null>(null);   // Index in laps array for comparison

    // Replay State
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState<number>(0);
    const playbackRef = useRef<NodeJS.Timeout | null>(null);

    // Derived Comparison Data
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const referencePoints = compareLap !== null && laps[compareLap] ? laps[compareLap].points : null;

        // 1. Process full dataset with deltas
        const fullData = data.map((point, i) => {
            let refPoint = null;

            if (referencePoints && referencePoints.length > 0) {
                // Simple Index Matching (assuming similar sampling rate)
                const refIndex = Math.min(Math.floor(i * (referencePoints.length / data.length)), referencePoints.length - 1);
                refPoint = referencePoints[refIndex];
            }

            return {
                ...point,
                refSpeed: refPoint ? refPoint.speed : null,
                refThrottle: refPoint ? refPoint.throttle : null,
                refBrake: refPoint ? refPoint.brake : null,
                refGear: refPoint ? refPoint.gear : null,
                refSteering: refPoint ? refPoint.steering_angle : null,
                refFuelLevel: refPoint ? refPoint.fuel_level : null,

                refLat: refPoint ? refPoint.lat : null,
                refLon: refPoint ? refPoint.lon : null,
                delta: refPoint ? (point.current_lap_time || 0) - (refPoint.current_lap_time || 0) : 0 // Rough delta
            };
        });

        // 2. Apply Zoom
        if (zoomRange) {
            return fullData.slice(zoomRange.start, zoomRange.end);
        }

        return fullData;
    }, [data, compareLap, laps, zoomRange]);

    // 2. SMART SEGMENTER (Corner Detection)
    // Detects corners based on significant steering input
    const detectedCorners = useMemo(() => {
        if (!data || data.length === 0) return [];

        const corners: { name: string, start: number, end: number }[] = [];
        let inCorner = false;
        let startIndex = 0;
        let turnCount = 1;

        // Thresholds
        const STEER_THRESHOLD = 0.05; // ~3 degrees
        const MIN_DURATION = 30; // Min points to be a real corner

        data.forEach((p, i) => {
            const steer = Math.abs(p.steering_angle || 0);

            if (!inCorner) {
                if (steer > STEER_THRESHOLD) {
                    inCorner = true;
                    startIndex = i;
                }
            } else {
                if (steer < STEER_THRESHOLD) {
                    inCorner = false;
                    // Validate duration
                    if ((i - startIndex) > MIN_DURATION) {
                        // Pad the corner (enter/exit context)
                        const padding = 50;
                        const safeStart = Math.max(0, startIndex - padding);
                        const safeEnd = Math.min(data.length - 1, i + padding);

                        corners.push({
                            name: `T${turnCount}`,
                            start: safeStart,
                            end: safeEnd
                        });
                        turnCount++;
                    }
                }
            }
        });

        return corners;
    }, [data]);

    const [referenceData, setReferenceData] = useState<any[]>([]); // Comparison Lap

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const hoverData = useMemo(() => hoverIndex !== null && chartData[hoverIndex] ? chartData[hoverIndex] : null, [chartData, hoverIndex]);

    // --- GHOST CAR LOGIC (Time-Based) ---
    const ghostPoint = useMemo(() => {
        if (!hoverData || compareLap === null || !laps[compareLap]) return null;

        const targetTime = hoverData.current_lap_time;
        if (targetTime === undefined) return null;

        const refPoints = laps[compareLap].points;

        // Binary Search to find the segment [p1, p2]
        let low = 0;
        let high = refPoints.length - 2;
        let idx = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if ((refPoints[mid].current_lap_time || 0) <= targetTime) {
                idx = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // Interpolation (Lerp)
        const p1 = refPoints[idx];
        const p2 = refPoints[idx + 1] || p1;

        const t1 = p1.current_lap_time || 0;
        const t2 = p2.current_lap_time || 0;

        let ratio = 0;
        if (t2 > t1) {
            ratio = (targetTime - t1) / (t2 - t1);
            ratio = Math.max(0, Math.min(1, ratio));
        }

        const interpolate = (start?: number, end?: number) => {
            if (start === undefined || end === undefined) return 0;
            return start + (end - start) * ratio;
        };

        return {
            lat: interpolate(p1.lat, p2.lat),
            lon: interpolate(p1.lon, p2.lon),
            current_lap_time: targetTime
        };
    }, [hoverData, compareLap, laps]);

    // Helpers
    const formatLapTime = (sec: number) => {
        if (!sec || sec === Infinity) return "-:--.---";
        const min = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(3);
        return `${min}:${s.padStart(6, '0')}`;
    };

    const currentLapTime = data.length > 0 ? (data[data.length - 1].timestamp - data[0].timestamp) : 0;
    const [activeTab, setActiveTab] = useState<'driving' | 'data' | 'timing'>('driving');

    useEffect(() => {
        if (!params.id) return;

        fetch(`/api/telemetry/${params.id}`)
            .then(res => res.json())
            .then(response => {
                if (response.error) {
                    console.error("Telemetry not found");
                    setLoading(false);
                    return;
                }

                const rawPoints: TelemetryPoint[] = response.telemetry || [];
                // Sort by timestamp
                rawPoints.sort((a, b) => a.timestamp - b.timestamp);
                setAllPoints(rawPoints);
                setSession(response.session || {});

                // --- PROCESS LAPS ---
                const parsedLaps: LapData[] = [];
                let currentLapNum = -1;
                let currentLapPoints: TelemetryPoint[] = [];
                const potentialLaps: LapData[] = [];

                rawPoints.forEach(p => {
                    const carLap = p.lap_number ?? 0;

                    if (carLap !== currentLapNum) {
                        // Push previous lap if exists
                        if (currentLapPoints.length > 50) { // Filter noise
                            const startTime = currentLapPoints[0].timestamp;
                            const endTime = currentLapPoints[currentLapPoints.length - 1].timestamp;
                            const calculatedLapTime = endTime - startTime;

                            // Collect candidates first
                            if (currentLapNum > 0) {
                                potentialLaps.push({
                                    lapNumber: currentLapNum,
                                    lapTime: calculatedLapTime,
                                    isValid: true,
                                    points: [...currentLapPoints],
                                    sectors: { s1: 0, s2: 0, s3: 0 }
                                });
                            }
                        }
                        currentLapNum = carLap;
                        currentLapPoints = [];
                    }
                    currentLapPoints.push(p);
                });
                // Note: We intentionally DROP the final incomplete buffer here.

                // Filter Outliers based on Median Time
                if (potentialLaps.length > 0) {
                    const sortedTimes = [...potentialLaps].sort((a, b) => a.lapTime - b.lapTime);
                    const mid = Math.floor(sortedTimes.length / 2);
                    const medianTime = sortedTimes.length % 2 !== 0
                        ? sortedTimes[mid].lapTime
                        : (sortedTimes[mid - 1].lapTime + sortedTimes[mid].lapTime) / 2;

                    // STRICT FILTER: Lap must be > 70% of Median Pace
                    const minLapTime = medianTime * 0.7;

                    potentialLaps.forEach(lap => {
                        if (lap.lapTime > minLapTime) {
                            parsedLaps.push(lap);
                        }
                    });
                }

                setLaps(parsedLaps);

                // Default: Select Best Lap (Fastest Valid)
                const bestLap = parsedLaps.filter(l => l.isValid && l.lapNumber > 0).sort((a, b) => a.lapTime - b.lapTime)[0];
                const initialLap = bestLap || parsedLaps[parsedLaps.length - 1]; // Fallback to last

                if (initialLap) {
                    setData(initialLap.points);
                    setSelectedLap(parsedLaps.indexOf(initialLap));
                } else {
                    setData(rawPoints); // Fallback: Show all
                }

                setReferenceData(generateReferenceLap(initialLap?.points.length || 200));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load telemetry", err);
                setLoading(false);
            });
    }, [params.id]);

    // --- MAP PROJECTION LOGIC ---
    // 1. Calculate Bounds & Scales
    const mapConfig = useMemo(() => {
        if (data.length < 2) return null;

        const lats = data.map(p => p.lat || 0).filter(l => l !== 0);
        const lons = data.map(p => p.lon || 0).filter(l => l !== 0);

        if (lats.length === 0) return null;

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        const latSpan = maxLat - minLat || 1;
        const lonSpan = maxLon - minLon || 1;

        // SVG Dimensions
        const width = 800;
        const height = 600;
        const padding = 50;

        return { minLat, minLon, latSpan, lonSpan, width, height, padding };
    }, [data]);

    // 2. Helper to project lat/lon to SVG
    const projectPoint = (lat: number, lon: number) => {
        if (!mapConfig) return { x: 0, y: 0 };
        const { minLat, minLon, latSpan, lonSpan, width, height, padding } = mapConfig;

        const normX = (lon - minLon) / lonSpan;
        const normY = (lat - minLat) / latSpan;

        const x = padding + normX * (width - 2 * padding);
        const y = height - (padding + normY * (height - 2 * padding)); // Invert Y
        return { x, y };
    };

    // 3. Generate Heatmap Segments (Color-Coded)
    const heatmapSegments = useMemo(() => {
        if (!mapConfig || chartData.length < 2) return [];

        const segments: { d: string, color: string }[] = [];
        const CHUNK_SIZE = 5; // Smaller chunks for smoother gradients

        for (let i = 0; i < chartData.length - 1; i += CHUNK_SIZE) {
            // Include one extra point for continuity
            const chunk = chartData.slice(i, Math.min(i + CHUNK_SIZE + 1, chartData.length));
            if (chunk.length < 2) continue;

            // Calculate Avg Delta for color
            const avgDelta = chunk.reduce((sum, p) => sum + (p.delta || 0), 0) / chunk.length;

            let color = "#3b82f6"; // Default Blue
            if (avgDelta < -0.05) color = "#22c55e"; // Green (Faster)
            else if (avgDelta > 0.05) color = "#ef4444"; // Red (Slower)

            // Build Path
            const d = chunk.map((p, idx) => {
                if (!p.lat || !p.lon) return "";
                const { x, y } = projectPoint(p.lat, p.lon);
                return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");

            segments.push({ d, color });
        }
        return segments;
    }, [chartData, mapConfig]);

    // 4. Generate Reference Path (Yellow)
    const refMapPath = useMemo(() => {
        if (!mapConfig || compareLap === null || !laps[compareLap]) return "";
        const refPointsRaw = laps[compareLap].points;

        const points = refPointsRaw.map(p => {
            if (!p.lat || !p.lon) return null;
            const { x, y } = projectPoint(p.lat, p.lon);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).filter(Boolean);

        if (points.length < 2) return "";
        return points.map((pt, i) => (i === 0 ? `M ${pt}` : `L ${pt}`)).join(" ");
    }, [mapConfig, compareLap, laps]);

    const bestLap = session?.best_lap ? session.best_lap.toFixed(3) : "--:--";
    const trackName = session?.track || "Pista Desconhecida";
    const carName = session?.car || "Carro Desconhecido"; // Fixed: Defined variable

    // --- REPLAY LOGIC ---
    useEffect(() => {
        if (isPlaying && chartData.length > 0) {
            playbackRef.current = setInterval(() => {
                setPlaybackIndex(prev => {
                    const next = prev + 1;
                    if (next >= chartData.length) {
                        setIsPlaying(false);
                        return 0;
                    }
                    // Sync "Hover" state with Playback
                    setHoverIndex(next);
                    return next;
                });
            }, 20); // 50fps
        } else {
            if (playbackRef.current) clearInterval(playbackRef.current);
        }
        return () => {
            if (playbackRef.current) clearInterval(playbackRef.current);
        };
    }, [isPlaying, chartData]);

    return (
        <div className="flex h-screen bg-[#0d0d0f] text-white font-sans overflow-hidden">

            {/* 1. SIDEBAR NAVIGATION */}
            {/* 1. SIDEBAR NAVIGATION */}
            <Sidebar />



            {/* 3. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative min-w-0">



                {/* TOP AREA: TRACK MAP & INSIGHTS OVERLAY */}
                <div className="flex-1 relative bg-[#131315] min-h-0 overflow-hidden flex flex-col">

                    {/* Map Container */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]">
                        {/* Map Controls */}
                        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
                            <button
                                onClick={() => setIsZoomed(!isZoomed)}
                                className={`p-2 rounded-lg border text-xs font-bold shadow-lg transition-all ${isZoomed
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-zinc-800/80 border-white/10 text-zinc-400 hover:text-white"
                                    }`}
                            >
                                {isZoomed ? "ZOOM: ON" : "ZOOM: OFF"}
                            </button>
                        </div>

                        {heatmapSegments.length > 0 ? (
                            <svg
                                viewBox={(() => {
                                    if (isZoomed && hoverData?.lat && hoverData?.lon) {
                                        const { x, y } = projectPoint(hoverData.lat, hoverData.lon);
                                        const zoomW = 300; // Visible area width (smaller = more zoom)
                                        const zoomH = 225; // Aspect ratio 4:3
                                        return `${x - zoomW / 2} ${y - zoomH / 2} ${zoomW} ${zoomH}`;
                                    }
                                    return "0 0 800 600";
                                })()}
                                className="w-full h-full transition-all duration-500 ease-out"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                <defs>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="4" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>

                                {/* Reference Trace (Yellow) - Underneath */}
                                {refMapPath && (
                                    <path
                                        d={refMapPath}
                                        stroke="#eab308"
                                        strokeWidth={isZoomed ? 2 : 3}
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeOpacity={0.4}
                                        strokeDasharray="5 5"
                                    />
                                )}

                                {/* Main Trace (Heatmap) */}
                                <g filter="url(#glow)">
                                    {heatmapSegments.map((segment, i) => (
                                        <path
                                            key={i}
                                            d={segment.d}
                                            stroke={segment.color}
                                            strokeWidth={isZoomed ? 2 : 3}
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    ))}
                                </g>

                                {/* Start/Finish Marker */}
                                <circle
                                    cx={projectPoint(chartData[0]?.lat || 0, chartData[0]?.lon || 0).x}
                                    cy={projectPoint(chartData[0]?.lat || 0, chartData[0]?.lon || 0).y}
                                    r={isZoomed ? 3 : 5}
                                    fill="white"
                                />

                                {/* --- CURSORS (Replay/Hover) --- */}
                                {hoverData?.lat && hoverData?.lon && (() => {
                                    const { x, y } = projectPoint(hoverData.lat, hoverData.lon);
                                    return (
                                        <g>
                                            {/* Pulse Effect */}
                                            <circle cx={x} cy={y} r={isZoomed ? 8 : 12} fill="#3b82f6" fillOpacity="0.3">
                                                <animate attributeName="r" from={isZoomed ? 8 : 12} to={isZoomed ? 15 : 20} dur="1.5s" repeatCount="indefinite" />
                                                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
                                            </circle>
                                            {/* Player Dot */}
                                            <circle cx={x} cy={y} r={isZoomed ? 4 : 5} fill="#3b82f6" stroke="white" strokeWidth={2} />
                                        </g>
                                    );
                                })()}

                                {ghostPoint?.lat && ghostPoint?.lon && (() => {
                                    const { x, y } = projectPoint(ghostPoint.lat, ghostPoint.lon);
                                    return (
                                        <g>
                                            {/* Ghost Dot */}
                                            <circle cx={x} cy={y} r={isZoomed ? 3 : 4} fill="#eab308" stroke="black" strokeWidth={1} fillOpacity={0.8} />
                                        </g>
                                    );
                                })()}

                            </svg>
                        ) : (
                            <div className="text-zinc-500 text-sm flex flex-col items-center">
                                <MapIcon className="w-12 h-12 mb-2 opacity-20" />
                                <p>Sem dados de GPS suficientes para gerar o mapa.</p>
                            </div>
                        )}


                        {/* Map Legend */}
                        {heatmapSegments.length > 0 && (
                            <div className="absolute bottom-6 left-6 z-40 bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex flex-col gap-2 shadow-2xl">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Delta Tempo</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                    <span className="text-[10px] font-bold text-green-500">Ganho (Rápido)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                    <span className="text-[10px] font-bold text-red-500">Perda (Lento)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* INSIGHTS POPUP */}
                    {data.length > 50 && (
                        <div className="absolute top-8 left-8 z-10 w-96 bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-xs font-bold">AI</div>
                                    <span className="font-bold text-sm text-purple-200">Coach Feedback</span>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <p className="text-sm text-zinc-300">
                                    Analisando seus dados em tempo real. Continue pilotando para calibração completa.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* MINI MAP (Minimalist Gray - Zoom Only) */}
                    {isZoomed && heatmapSegments.length > 0 && hoverIndex !== null && (
                        <div className="absolute top-16 right-6 z-50 w-48 h-36 opacity-80 pointer-events-none transition-opacity duration-300">
                            <svg
                                viewBox="0 0 800 600"
                                className="w-full h-full"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* Reference Trace (Subtle) */}
                                {refMapPath && (
                                    <path d={refMapPath} stroke="#27272a" strokeWidth={8} fill="none" />
                                )}
                                {/* Main Trace (Gray) */}
                                {heatmapSegments.map((segment, i) => (
                                    <path key={i} d={segment.d} stroke="#52525b" strokeWidth={10} fill="none" strokeLinecap="round" />
                                ))}
                                {/* Player Cursor (White/Bright to stand out) */}
                                {hoverData?.lat && hoverData?.lon && (() => {
                                    const { x, y } = projectPoint(hoverData.lat, hoverData.lon);
                                    return (
                                        <circle cx={x} cy={y} r={20} fill="#f4f4f5" />
                                    );
                                })()}
                                {/* Zoom Rect (Subtle White) */}
                                {hoverData?.lat && hoverData?.lon && (() => {
                                    const { x, y } = projectPoint(hoverData.lat, hoverData.lon);
                                    return (
                                        <rect
                                            x={x - 150} y={y - 112.5}
                                            width={300} height={225}
                                            fill="none" stroke="white" strokeWidth={2} strokeOpacity={0.3} rx={10}
                                        />
                                    )
                                })()}
                            </svg>
                        </div>
                    )}
                </div>

                {/* BOTTOM AREA: ADVANCED COMPARISON BAR (Coach Dave Style) */}
                <div className="h-[35vh] min-h-[300px] bg-[#09090b] border-t border-white/10 flex flex-col z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

                    {/* 1. CONTEXT HEADER (Comparison) */}
                    <div className="h-12 bg-[#131315] border-b border-white/5 flex items-center justify-between px-6">
                        {/* MY LAP (Left) */}
                        <div className="flex items-center gap-6 text-blue-400">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">My Lap</span>
                                <span className="text-xl font-mono font-bold leading-none">{formatLapTime(currentLapTime || 0)}</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-80">
                                <div className="flex items-center gap-1" title="Track Temp"><Flame className="w-3 h-3" /> <span className="text-xs font-mono">{(hoverData?.track_temp || 0).toFixed(1)}°C</span></div>
                                <div className="flex items-center gap-1" title="Fuel"><Droplets className="w-3 h-3" /> <span className="text-xs font-mono">{(hoverData?.fuel_level || 0).toFixed(2)}L</span></div>
                            </div>
                        </div>

                        {/* DELTA (Center) */}
                        <div className={`flex flex-col items-center transition-all ${compareLap === null ? 'opacity-20 blur-sm grayscale' : ''}`}>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Delta</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black font-mono tracking-tighter ${(hoverData?.delta || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {compareLap === null ? '0.000' : (
                                        <>
                                            {(hoverData?.delta || 0) > 0 ? '+' : ''}{(hoverData?.delta || 0).toFixed(3)}
                                        </>
                                    )}
                                </span>
                                <span className={`text-[10px] font-bold ${(hoverData?.delta || 0) > 0 ? 'text-red-500/80' : 'text-green-500/80'}`}>s</span>
                            </div>
                        </div>

                        {/* REFERENCE LAP (Right) */}
                        <div className={`flex items-center gap-6 text-yellow-500 justify-end transition-all ${compareLap === null ? 'opacity-20 blur-sm grayscale' : ''}`}>
                            <div className="flex items-center gap-3 opacity-80">
                                <div className="flex items-center gap-1" title="Track Temp"><Flame className="w-3 h-3" /> <span className="text-xs font-mono">{(hoverData?.track_temp || 0).toFixed(1)}°C</span></div>
                                <div className="flex items-center gap-1" title="Fuel"><Droplets className="w-3 h-3" /> <span className="text-xs font-mono">{(hoverData?.refFuelLevel || 0).toFixed(2)}L</span></div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-right">Reference</span>
                                <span className="text-xl font-mono font-bold leading-none">{laps[compareLap || 0] ? formatLapTime(laps[compareLap || 0].lapTime) : "-:--.---"}</span>
                            </div>
                        </div>
                    </div>




                    {/* 2. INPUT PANEL (Steering & Pedals) */}
                    <div className="flex-1 grid grid-cols-[1fr_300px_1fr] relative">

                        {/* OVERLAY for Reference Selection (If needed) */}
                        {/* OVERLAY for Reference Selection */}
                        {compareLap === null && (
                            <div className="absolute inset-y-0 right-0 left-1/2 z-50 flex items-center justify-center bg-[#09090b]/90 backdrop-blur-sm">
                                <button
                                    onClick={() => {
                                        if (laps.length > 0) {
                                            const bestLapIndex = laps.reduce((bestIdx, lap, idx) => {
                                                if (!lap.isValid) return bestIdx;
                                                return lap.lapTime < laps[bestIdx].lapTime ? idx : bestIdx;
                                            }, 0);
                                            setCompareLap(bestLapIndex);
                                        }
                                    }}
                                    className="w-full h-full flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3 text-zinc-500 group-hover:text-blue-400 transition-colors">
                                        <ArrowRightLeft className="w-5 h-5" />
                                        <span className="text-sm font-bold tracking-widest uppercase">
                                            Modo de Comparação
                                        </span>
                                    </div>

                                    <p className="text-[10px] sm:text-xs font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase tracking-wide max-w-md text-center px-8">
                                        Selecione uma volta de referência <br className="hidden sm:block" />
                                        <span className="text-zinc-500 font-bold group-hover:text-blue-500 transition-colors">
                                            ou clique aqui para selecionar a volta mais rápida
                                        </span>
                                    </p>
                                </button>
                            </div>
                        )}

                        {/* LEFT: MY INPUTS */}
                        <div className="p-4 flex items-center gap-4 justify-end border-r border-white/5 bg-[#09090b]">
                            {/* Pedals */}
                            <div className="flex flex-col gap-2 w-32">
                                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase">
                                    <span>Throttle</span>
                                    <span>{((hoverData?.throttle || 0) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${(hoverData?.throttle || 0) * 100}%` }}></div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase mt-1">
                                    <span>Brake</span>
                                    <span>{((hoverData?.brake || 0) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${(hoverData?.brake || 0) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Gear Box */}
                            <div className="flex flex-col items-center justify-center w-12 h-14 bg-zinc-800 rounded border border-zinc-700/50 shadow-inner">
                                <span className="text-2xl font-black italic text-white leading-none">{hoverData?.gear || '-'}</span>
                                <span className="text-[7px] text-zinc-500 font-bold uppercase mt-1">GEAR</span>
                            </div>

                            {/* Steering Wheel Visual */}
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <Image
                                    src="/volante.webp"
                                    alt="Steering"
                                    width={64}
                                    height={64}
                                    className="object-contain drop-shadow-lg"
                                    style={{ transform: `rotate(${(hoverData?.steering_angle || 0) * 50}deg)` }}
                                />
                            </div>
                        </div>

                        {/* CENTER: SPEED COMPARISON */}
                        <div className="flex flex-row items-center justify-center gap-12 bg-[#0c0c0e] border-x border-white/5 relative overflow-hidden">
                            {/* Speed Background Effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent opacity-20"></div>

                            {/* My Speed */}
                            <div className="flex flex-col items-center relative z-10">
                                <div className="text-5xl font-black italic tracking-tighter text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                    {(hoverData?.speed || 0).toFixed(0)}
                                </div>
                                <div className="text-[10px] font-bold text-blue-500/50 uppercase tracking-widest mt-1">MY SPEED</div>
                            </div>

                            {/* Divider with VS */}
                            <div className="h-full w-px bg-white/10 relative flex items-center justify-center">
                                <span className="bg-[#0c0c0e] text-[8px] text-zinc-600 font-bold px-1 border border-white/10 rounded">VS</span>
                            </div>

                            {/* Ref Speed */}
                            <div className="flex flex-col items-center relative z-10 opacity-80">
                                <div className="text-5xl font-black italic tracking-tighter text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                    {(hoverData?.refSpeed || 0).toFixed(0)}
                                </div>
                                <div className="text-[10px] font-bold text-yellow-500/50 uppercase tracking-widest mt-1">REF SPEED</div>
                            </div>
                        </div>

                        {/* RIGHT: REFERENCE INPUTS (Mirror) */}
                        <div className="p-4 flex items-center gap-4 border-l border-white/5 bg-[#09090b]">
                            {/* Steering Wheel Visual */}
                            <div className="relative w-16 h-16 flex items-center justify-center opacity-60">
                                <Image
                                    src="/volante.webp"
                                    alt="Ref Steering"
                                    width={64}
                                    height={64}
                                    className="object-contain drop-shadow-lg grayscale sepia brightness-150 saturate-200 hue-rotate-15"
                                    style={{ transform: `rotate(${(hoverData?.refSteering || 0) * 50}deg)` }}
                                />
                            </div>

                            {/* Gear Box */}
                            <div className="flex flex-col items-center justify-center w-12 h-14 bg-zinc-800/50 rounded border border-zinc-700/30 shadow-inner opacity-60">
                                <span className="text-2xl font-black italic text-yellow-500 leading-none">{hoverData?.refGear || '-'}</span>
                                <span className="text-[7px] text-zinc-500 font-bold uppercase mt-1">GEAR</span>
                            </div>

                            {/* Pedals */}
                            <div className="flex flex-col gap-2 w-32 opacity-60">
                                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase">
                                    <span>Throttle</span>
                                    <span>{((hoverData?.refThrottle || 0) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${(hoverData?.refThrottle || 0) * 100}%` }}></div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase mt-1">
                                    <span>Brake</span>
                                    <span>{((hoverData?.refBrake || 0) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-600" style={{ width: `${(hoverData?.refBrake || 0) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. TIMELINE (Micro-Sectors) */}
                    <div className="h-8 bg-[#18181b] border-t border-white/5 flex relative group/timeline">
                        {/* Play/Pause Control */}
                        <button
                            onClick={() => {
                                if (isPlaying) {
                                    setIsPlaying(false);
                                } else {
                                    if (playbackIndex >= chartData.length - 1) setPlaybackIndex(0);
                                    setIsPlaying(true);
                                }
                            }}
                            className="w-10 flex-shrink-0 border-r border-white/5 flex items-center justify-center bg-[#202022] hover:bg-[#27272a] text-zinc-400 hover:text-white transition-colors z-20"
                            title={isPlaying ? "Pause" : "Play Replay"}
                        >
                            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>

                        {/* Timeline Track */}
                        <div className="flex-1 flex relative overflow-hidden">
                            {/* Playback Cursor */}
                            <div
                                className="absolute top-0 bottom-0 bg-blue-500 z-50 pointer-events-none transition-all duration-[20ms] ease-linear w-1 shadow-[0_0_10px_#3b82f6]"
                                style={{
                                    left: chartData.length > 0 ? `${(playbackIndex / chartData.length) * 100}%` : '0%'
                                }}
                            />
                        </div>
                    </div>

                    {/* 4. MAIN GRAPH (Comparison) */}
                    <div className="h-32 flex-shrink-0 relative bg-[#09090b]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} onMouseMove={(e: any) => {
                                if (e && e.activeTooltipIndex !== undefined) {
                                    setHoverIndex(e.activeTooltipIndex);
                                }
                            }}
                                onMouseLeave={() => {
                                    if (!isPlaying) setHoverIndex(null);
                                }}
                            >
                                <defs>
                                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    content={() => <div className="hidden" />}
                                    cursor={{ stroke: 'white', strokeWidth: 1 }}
                                />
                                <YAxis yAxisId="left" domain={[0, 350]} hide />
                                <YAxis yAxisId="right" domain={[0, 1]} hide />

                                {hoverIndex !== null && (
                                    <ReferenceLine x={hoverIndex} stroke="white" strokeOpacity={0.5} strokeWidth={1} />
                                )}

                                {/* --- SPEED (Area) --- */}
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="refSpeed"
                                    stroke="#eab308"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fill="transparent"
                                    className="opacity-50"
                                    activeDot={false}
                                    isAnimationActive={false}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="speed"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#speedGradient)"
                                    animationDuration={300}
                                />

                                {/* --- THROTTLE (Green) --- */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="throttle"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={false}
                                    animationDuration={300}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="refThrottle"
                                    stroke="#22c55e"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    className="opacity-50"
                                    dot={false}
                                    isAnimationActive={false}
                                />

                                {/* --- BRAKE (Red) --- */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="brake"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={false}
                                    animationDuration={300}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="refBrake"
                                    stroke="#ef4444"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    className="opacity-50"
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            {/* End of Advanced Comparison Bar */}

            {/* 4. RIGHT SIDEBAR (Session/Stints) */}
            <div className="w-72 flex-shrink-0 bg-[#0d0d0f] border-l border-white/5 flex flex-col">

                {/* AUTO SEGMENTATION (Smart Corners) */}
                <div className="p-4 border-b border-white/5 bg-[#09090b]">
                    <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-purple-500" />
                        SMART SEGMENTATION
                    </h3>
                </div>
                <div className="p-2 grid grid-cols-4 gap-2 border-b border-white/5 pb-4">
                    {/* Full Circuit Button */}
                    <button
                        onClick={() => setZoomRange(null)}
                        className={`p-2 rounded text-xs font-bold transition-all border ${!zoomRange
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50"
                            : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                            }`}
                    >
                        FULL
                    </button>
                    {detectedCorners.map((c, i) => (
                        <button
                            key={i}
                            onClick={() => setZoomRange({ start: c.start, end: c.end })}
                            className={`p-2 rounded text-xs font-bold transition-all border ${zoomRange && zoomRange.start === c.start
                                ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50"
                                : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                }`}
                        >
                            {c.name}
                        </button>
                    ))}
                    {detectedCorners.length === 0 && (
                        <div className="col-span-4 text-xs text-zinc-600 text-center py-2">
                            Aguardando voltas rápidas...
                        </div>
                    )}
                </div>

                <div className="p-4 border-b border-white/5 bg-[#09090b]">
                    <h3 className="text-sm font-bold text-zinc-300">VOLTAS NA SESSÃO</h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-2 space-y-1">
                        {laps.length === 0 && (
                            <div className="text-xs text-zinc-500 text-center mt-4">
                                Carregando voltas...
                            </div>
                        )}
                        {(() => {
                            const validLaps = laps.filter(l => l.isValid && l.lapNumber > 0);
                            const bestTime = validLaps.length > 0 ? Math.min(...validLaps.map(l => l.lapTime)) : 0;

                            return laps.map((lap, index) => {
                                const isBest = lap.lapTime === bestTime && lap.isValid && lap.lapNumber > 0;
                                const deltaVal = lap.lapTime - bestTime;
                                const deltaStr = isBest ? "BEST" : `+${deltaVal.toFixed(3)}`;

                                return (
                                    <LapItem
                                        key={index}
                                        num={lap.lapNumber}
                                        time={formatLapTime(lap.lapTime)}
                                        delta={deltaStr}
                                        selected={index === selectedLap}
                                        comparing={index === compareLap}
                                        invalid={!lap.isValid}
                                        isBest={isBest}
                                        onClick={() => {
                                            setSelectedLap(index);
                                            setData(lap.points);
                                        }}
                                        onCompare={() => setCompareLap(index === compareLap ? null : index)}
                                    />
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div >
    );
}

// --- SUB-COMPONENTS ---



function TabItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all",
                active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
        >
            {label}
            {active && <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
    )
}

function InsightItem({ label, text, status }: { label: string, text: string, status: 'good' | 'warning' | 'bad' | 'neutral' }) {
    const colors = {
        good: "text-green-400",
        warning: "text-yellow-400",
        bad: "text-red-400",
        neutral: "text-zinc-400"
    };

    return (
        <div className="flex gap-4">
            <div className={cn("text-[10px] font-bold w-12 text-right pt-0.5", colors[status])}>
                {label}
            </div>
            <div className="flex-1 text-sm font-medium text-zinc-200 border-l border-white/10 pl-4">
                {text}
            </div>
        </div>
    )
}

function StintHeader({ label, time }: { label: string, time: string }) {
    return (
        <div className="flex items-center justify-between px-3 py-2 mt-4 mb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>{label}</span>
            <span>{time}</span>
        </div>
    )
}

function LapItem({ num, time, delta, selected, comparing, invalid = false, isBest = false, onClick, onCompare }: {
    num: number, time: string, delta: string, selected: boolean, comparing: boolean, invalid?: boolean, isBest?: boolean, onClick?: () => void, onCompare?: () => void
}) {
    return (
        <div className="flex items-center gap-1 group/item">
            <button
                onClick={onClick}
                className={cn(
                    "flex-1 flex items-center justify-between px-3 py-2 rounded border transition-all text-sm font-mono relative",
                    selected
                        ? "bg-blue-600 border-blue-500 text-white shadow-lg z-10"
                        : comparing
                            ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500"
                            : "bg-zinc-900/50 border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white",
                    invalid && !selected && !comparing && "opacity-50 text-red-500"
                )}>
                <div className="flex items-center gap-3">
                    <span className={cn("w-6 text-right", selected ? "text-blue-200" : "text-zinc-600")}>{num}</span>
                    <span className={cn(invalid ? "line-through" : "")}>{time}</span>
                </div>
                <div className={cn(
                    "text-xs font-mono font-bold",
                    isBest ? "text-purple-500" : (delta.startsWith('+') ? "text-red-500" : "text-green-500"),
                    selected && "text-white"
                )}>
                    {isBest ? <Trophy className="w-3 h-3 fill-current" /> : delta}
                </div>
            </button>

            {/* Context Action: Set as Reference */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCompare && onCompare();
                }}
                className={cn(
                    "w-8 h-[38px] flex items-center justify-center rounded border transition-all",
                    comparing
                        ? "bg-yellow-500 text-black border-yellow-500 font-bold"
                        : "bg-zinc-900/50 border-transparent text-zinc-600 hover:bg-zinc-800 hover:text-yellow-500"
                )}
                title="Set as Reference"
            >
                <span className="text-[10px] uppercase font-bold">VS</span>
            </button>
        </div>
    )
}
