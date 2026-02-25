"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useState, useEffect, useRef } from "react";
import { Wifi, Share2, Copy, CheckCircle2, User } from "lucide-react";
import { io } from "socket.io-client";

export default function EngineerPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [sessionToken, setSessionToken] = useState("");
    const [viewerCount, setViewerCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        // Connect to WS Server (Uses relative URL in prod, or custom env)
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        // Listen for active session from Agent
        socket.on("session_info", (data: { sessionId: string }) => {
            setSessionToken(data.sessionId);
            socket.emit("join_room", data.sessionId);
        });

        socket.on("viewer_joined", () => setViewerCount(prev => prev + 1));

        return () => {
            socket.disconnect();
        };
    }, []);

    const copyLink = async () => {
        const url = `${window.location.origin}/live/${sessionToken}`;
        console.log("Attempting to copy:", url);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Clipboard failed:", err);
            // Fallback
            prompt("Copie o link abaixo:", url);
        }
    };

    const handleStartSession = () => {
        console.log("Starting Session...");
        socketRef.current?.emit("command_start_session");
    };

    const handleStopSession = () => {
        console.log("Stopping Session...");
        socketRef.current?.emit("command_stop_session");
        // Optimistic update to immediately clear UI
        setSessionToken("");
        setCopied(false);
    };

    return (
        <div className="flex h-screen bg-[#0d0d0f] text-white font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col p-8 overflow-y-auto">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Wifi className={isConnected ? "text-green-500" : "text-red-500 animate-pulse"} />
                            Live Pitwall
                        </h1>
                        <p className="text-zinc-400 mt-2">Transmita sua telemetria em tempo real para seu engenheiro ou coach.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 px-6 py-3 rounded-xl">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                        <span className="font-mono text-sm font-bold text-zinc-300">
                            STATUS: {isConnected ? "ONLINE" : "OFFLINE"}
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                    {/* Link Card */}
                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Share2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Link da Sessão</h3>
                                <p className="text-sm text-zinc-500">Controle a transmissão para seu engenheiro.</p>
                            </div>
                        </div>

                        {sessionToken ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 bg-black/50 border border-white/10 p-4 rounded-xl">
                                    <a
                                        href={`/live/v2/${sessionToken}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 font-mono text-blue-400 text-lg truncate hover:underline hover:text-blue-300 transition-colors"
                                    >
                                        apexmind.io/live/v2/{sessionToken}
                                    </a>
                                    <button
                                        onClick={copyLink}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                        title="Copiar Link"
                                    >
                                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={`/live/v2/${sessionToken}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 font-bold rounded-xl border border-blue-500/20 transition-all text-center"
                                    >
                                        ABRIR PITWALL
                                    </a>
                                    <button
                                        onClick={handleStopSession}
                                        className="flex items-center justify-center py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/20 transition-all"
                                    >
                                        PARAR SESSÃO
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3 text-yellow-500">
                                    <span className="text-xl">⚠️</span>
                                    <span className="text-sm font-medium">O Agente deve estar rodando antes de iniciar.</span>
                                </div>
                                <button
                                    onClick={handleStartSession}
                                    disabled={!isConnected}
                                    className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2
                                        ${isConnected
                                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        }`}
                                >
                                    <Wifi className="w-5 h-5" />
                                    INICIAR SESSÃO AO VIVO
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Card */}
                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Espectadores Ativos</h3>
                                <p className="text-sm text-zinc-500">Engenheiros conectados na sala.</p>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-6xl font-bold text-white font-mono">
                                {viewerCount}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-12 max-w-3xl">
                    <h3 className="text-lg font-bold mb-4 text-zinc-300">Como funciona?</h3>
                    <ul className="space-y-4 text-zinc-400">
                        <li className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">1</span>
                            Abra o iRacing ou ACC e entre na pista.
                        </li>
                        <li className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">2</span>
                            Certifique-se que o <strong>ApexMind Agent</strong> está rodando no seu PC.
                        </li>
                        <li className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">3</span>
                            Clique em <strong>INICIAR SESSÃO</strong> para gerar um link único e seguro.
                        </li>
                    </ul>
                </div>

            </main>
        </div>
    );
}
