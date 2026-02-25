"use client";

import { useEffect, useState } from "react";
import { Trophy, Activity, History, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'Formula' | 'Sports'>('Sports');

    useEffect(() => {
        fetch('/api/sessions')
            .then(res => res.json())
            .then(data => {
                setSessions(data);
            });
    }, []);

    // Filter Data based on Active Tab
    const filteredSessions = sessions.filter(s => {
        // Handle legacy/test data that might miss class
        const cls = s.class || "Sports";
        return cls === activeTab;
    });

    // Calculate Stats based on Filtered Data
    const latest = filteredSessions.length > 0 ? filteredSessions[0] : null;
    const totalLaps = filteredSessions.reduce((acc, s) => acc + (s.laps || 0), 0);
    const totalIncidents = filteredSessions.reduce((acc, s) => acc + (s.incidents || 0), 0);
    const avgSafety = filteredSessions.length > 0 ? (totalIncidents / filteredSessions.length).toFixed(1) : "0.0";

    // Get latest iRating/License from the most recent session
    const currentIRating = latest?.irating || "N/A";
    const currentLicense = latest?.license || "R 0.00";

    // License Logic
    const getLicenseStyle = (lic: string) => {
        const part = lic.split(' ')[0];
        let letter = part;
        let color = "bg-red-500";

        if (part.startsWith('R')) { letter = "R"; color = "text-red-500"; }
        if (part.startsWith('D')) { letter = "D"; color = "text-orange-500"; }
        if (part.startsWith('C')) { letter = "C"; color = "text-yellow-500"; }
        if (part.startsWith('B')) { letter = "B"; color = "text-green-500"; }
        if (part.startsWith('A')) { letter = "A"; color = "text-blue-500"; }
        if (part.startsWith('P') || part.startsWith('S')) { letter = "S"; color = "text-zinc-100"; }

        return { letter, color };
    };

    const { letter: licenseLetter, color: licenseColor } = getLicenseStyle(currentLicense);

    return (
        <div className="flex h-screen bg-[#0d0d0f] text-white font-sans overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col relative min-w-0 overflow-y-auto">
                <main className="container mx-auto px-6 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold">
                            Carreira <span className={activeTab === 'Formula' ? "text-blue-500" : "text-orange-500"}>{activeTab === 'Formula' ? "Open Wheel" : "Sports Car"}</span>
                        </h1>

                        {/* Category Switcher (Moved from Header) */}
                        <div className="flex items-center bg-zinc-900/50 rounded-full p-1 border border-white/5">
                            <button
                                onClick={() => setActiveTab('Formula')}
                                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", activeTab === 'Formula' ? "bg-zinc-800 text-white shadow-lg shadow-black/50" : "text-zinc-400 hover:text-white")}
                            >
                                Formula
                            </button>
                            <button
                                onClick={() => setActiveTab('Sports')}
                                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", activeTab === 'Sports' ? "bg-zinc-800 text-white shadow-lg shadow-black/50" : "text-zinc-400 hover:text-white")}
                            >
                                GT / Sports
                            </button>
                        </div>
                    </div>

                    {/* Career Stats Grid - FILTERED */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <StatCard
                            label="iRating"
                            value={currentIRating.toString()}
                            diff="Atual"
                            icon={<Trophy className="text-yellow-500" />}
                        />
                        <StatCard
                            label="Safety Rating"
                            value={currentLicense}
                            diff="Licença Atual"
                            icon={<span className={`font-bold text-xl font-mono ${licenseColor}`}>{licenseLetter}</span>}
                            color={licenseColor.replace('text-', 'bg-').replace('-500', '-600')}
                        />
                        <StatCard
                            label="Voltas Registradas"
                            value={totalLaps.toString()}
                            diff="Nesta Categoria"
                            icon={<Activity className="text-green-500" />}
                        />
                        <StatCard
                            label="Média de Incidentes"
                            value={`${avgSafety}x`}
                            diff="Por Sessão"
                            icon={<Zap className={Number(avgSafety) < 4 ? "text-green-500" : "text-red-500"} />}
                        />
                    </div>

                    {/* Recent Activity Section - FILTERED */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <History className="w-5 h-5 text-zinc-400" />
                                    Sessões de {activeTab === 'Formula' ? "Formula" : "GT"} ({filteredSessions.length})
                                </h2>
                                {/* <button className="text-sm text-blue-400 hover:text-blue-300">Ver Histórico Completo</button> */}
                            </div>

                            <div className="space-y-4">
                                {filteredSessions.length === 0 && (
                                    <div className="p-8 text-center text-zinc-500 bg-zinc-900 border border-white/5 rounded-xl">
                                        Nenhuma sessão de {activeTab} registrada ainda.
                                    </div>
                                )}
                                {filteredSessions.map((session, i) => (
                                    <div key={i} className="group relative bg-zinc-900 border border-white/5 hover:border-blue-500/50 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-blue-900/10">
                                        <Link href={`/analysis/${session.id}`} className="absolute inset-0 z-10" />

                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-2xl text-zinc-600">
                                                    {(session.track || "UK").substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{session.track || "Desconhecida"}</h3>
                                                    <p className="text-zinc-400 text-sm mb-1">{session.car || "Carro Genérico"}</p>
                                                    <p className="text-zinc-500 text-xs">
                                                        {session.lastUpdate ? new Date(session.lastUpdate).toLocaleDateString() : "Hoje"} •
                                                        {session.lastUpdate ? new Date(session.lastUpdate).toLocaleTimeString() : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Melhor Volta</p>
                                                    <p className="text-xl font-mono font-bold text-white">
                                                        {session.best_lap > 0 ? (session.best_lap).toFixed(3) : "--:--"}
                                                    </p>
                                                </div>
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Incidentes</p>
                                                    <p className={cn("text-xl font-mono font-bold", session.incidents === 0 ? "text-green-500" : "text-yellow-500")}>
                                                        {session.incidents}x
                                                        {parseInt(session.irating) < 100 && <span className="ml-2 text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded">TEST</span>}
                                                    </p>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar: Weekly Goals / quick stats */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
                                <h3 className="font-semibold mb-4">Metas da Semana</h3>
                                <div className="space-y-4">
                                    <GoalItem label="Completar 5 Corridas" current={3} target={5} />
                                    <GoalItem label="Safety Rating > 4.0" current={4.49} target={4.0} color="bg-blue-500" />
                                    <GoalItem label="Reduzir Incidentes/Corrida" current={2.1} target={4.0} inverse />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/10 rounded-xl p-6">
                                <h3 className="font-semibold mb-2 text-blue-100">ApexMind Pro</h3>
                                <p className="text-sm text-blue-200/60 mb-4">Desbloqueie análises avançadas de telemetria comparativa com pilotos profissionais.</p>
                                <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
                                    Ver Planos
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function StatCard({ label, value, diff, icon, chart, color = "#eab308" }: any) {
    return (
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">{label}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                    <p className={cn("text-xs font-medium mt-1", diff.includes('+') ? "text-green-400" : "text-zinc-500")}>{diff}</p>
                </div>
                <div className="p-2 bg-zinc-800 rounded-lg text-white">
                    {icon}
                </div>
            </div>
            {chart && (
                <div className="h-16 absolute bottom-0 left-0 right-0 opacity-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chart.map((v: number, i: number) => ({ val: v, i }))}>
                            <Line type="monotone" dataKey="val" stroke={color} strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

function GoalItem({ label, current, target, color = "bg-green-500", inverse }: any) {
    const pct = Math.min(100, Math.max(0, (current / target) * 100));
    const displayPct = inverse ? 100 - pct : pct;

    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">{label}</span>
                <span className="text-zinc-500">{current} / {target}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${displayPct}%` }} />
            </div>
        </div>
    )
}
