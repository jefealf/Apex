"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, Cpu, Wrench, Download, ShoppingBag, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname.startsWith(path);

    return (
        <aside className="w-16 flex-shrink-0 flex flex-col items-center py-6 border-r border-white/5 bg-[#09090b] z-20 h-screen sticky top-0">
            {/* Home / Dashboard Link */}
            <Link href="/dashboard" className={cn("mb-8 p-2 rounded-xl transition-all", isActive('/dashboard') ? "bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white" : "bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white")}>
                <Home className="w-6 h-6" />
            </Link>

            <nav className="flex-1 flex flex-col gap-4 w-full px-2">
                {/* Active Module */}
                <SidebarItem icon={<Activity className="w-5 h-5" />} label="Analyse" active={isActive('/analysis')} />

                {/* Coming Soon Modules */}
                <div className="w-full h-px bg-white/5 my-2" /> {/* Divider */}

                <Link href="/engineer">
                    <SidebarItem icon={<Cpu className="w-5 h-5" />} label="Engenheiro" active={isActive('/engineer')} />
                </Link>
                <SidebarItem icon={<Wrench className="w-5 h-5" />} label="Setup" active={false} comingSoon />
                <SidebarItem icon={<Download className="w-5 h-5" />} label="Download" active={false} comingSoon />
                <SidebarItem icon={<ShoppingBag className="w-5 h-5" />} label="Lojinha" active={false} comingSoon />
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto flex flex-col gap-4 w-full px-2 items-center">
                <button className="p-3 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-white/5" title="Configurações">
                    <Settings className="w-5 h-5" />
                </button>
                <button className="p-3 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-white/5" title="Conta">
                    <User className="w-5 h-5" />
                </button>
            </div>
        </aside>
    );
}

function SidebarItem({ icon, label, active, comingSoon }: { icon: React.ReactNode, label: string, active: boolean, comingSoon?: boolean }) {
    return (
        <div className="relative group flex justify-center">
            <button
                className={cn(
                    "p-3 rounded-xl transition-all relative",
                    active
                        ? "text-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                    comingSoon && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-zinc-500"
                )}
            >
                {icon}
                {active && (
                    <span className="absolute -right-1 top-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse border border-[#09090b]" />
                )}
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50 flex items-center gap-2">
                {label}
                {comingSoon && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded uppercase font-bold tracking-wider">
                        Em breve
                    </span>
                )}
            </div>
        </div>
    );
}
