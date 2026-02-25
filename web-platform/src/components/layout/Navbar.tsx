"use client";

import Link from "next/link";
import { Activity, Download, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function Navbar() {
    const pathname = usePathname();

    const routes = [
        { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
        { href: "/analysis", label: "Analysis", active: pathname.startsWith("/analysis") },
    ];

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter text-white hover:text-blue-400 transition-colors">
                    <Activity className="h-6 w-6 text-blue-500" />
                    ApexMind
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-white",
                                route.active ? "text-white" : "text-zinc-400"
                            )}
                        >
                            {route.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button className="hidden md:flex items-center gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-all">
                        <Download className="h-3.5 w-3.5" />
                        Download Agent
                    </button>
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                        <User className="h-4 w-4 text-zinc-400" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
