import Link from "next/link";
import { ArrowRight, BarChart2, Zap, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            ApexMind Agent v3.0 Now Available
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            The Digital Engineer for <br /> Virtual Racers
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Transform raw telemetry into actionable speed. ApexMind collects data silently while you race and acts as your personal track engineer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition-all hover:scale-105"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="h-12 px-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-white/10 transition-all">
              Download Agent
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-zinc-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-yellow-400" />}
            title="Zero Friction"
            description="Install once, forget it. The agent detects your simulator automatically and uploads data in the background."
          />
          <FeatureCard
            icon={<BarChart2 className="h-8 w-8 text-blue-400" />}
            title="Smart Telemetry"
            description="Don't drown in data. Get simplified, actionable insights on where you are losing time against your rivals."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-green-400" />}
            title="Social Grid"
            description="Compare your laps with friends and pro drivers. See exactly why they are 0.5s faster in Turn 1."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
