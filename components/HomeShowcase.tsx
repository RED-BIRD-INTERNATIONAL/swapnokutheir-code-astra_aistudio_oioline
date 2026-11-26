import React, { useState } from 'react';
import { ArrowRight, Ship, Music, FolderKanban, ShieldCheck, Search } from 'lucide-react';
import type { AppRoute } from './Navbar';

interface HomeShowcaseProps {
  onNavigate: (route: AppRoute) => void;
}

const SAMPLE_TRACKING: Record<string, { route: string; status: string; eta: string }> = {
  'RBI-2026-0442': {
    route: 'Chittagong (BDCGP) -> Hamburg (DEHAM)',
    status: 'In Transit · 40FT High Cube Container',
    eta: 'Oct 14, 2026',
  },
  'RBI-2026-0439': {
    route: 'Dhaka (DAC) -> Stockholm (ARN)',
    status: 'Customs Clearance Completed',
    eta: 'Oct 03, 2026',
  },
};

export const HomeShowcase: React.FC<HomeShowcaseProps> = ({ onNavigate }) => {
  const [trackingInput, setTrackingInput] = useState('RBI-2026-0442');
  const [lookupResult, setLookupResult] = useState<{
    route: string;
    status: string;
    eta: string;
  } | null>(SAMPLE_TRACKING['RBI-2026-0442']);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const key = trackingInput.trim().toUpperCase();
    setLookupResult(
      SAMPLE_TRACKING[key] || {
        route: 'Chittagong Port -> European Hub',
        status: 'Registered in Red Bird Trade Ledger',
        eta: 'Check Operations Portal for live manifest',
      }
    );
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 space-y-12">
      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-12 items-center rounded-2xl border border-[#1A2233] bg-[#0B0E17] p-6 sm:p-10">
        <div className="lg:col-span-7 space-y-5">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">
            Astra-Gravity Command & Red Bird Logistics
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Central AI Studio & Global Apparel Operations
          </h1>
          <p className="max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">
            Red Bird International coordinates garment manufacturing, export L/C documentation, container telemetry, and dedicated cloud AI workspaces—complete with voice automation and AI music studio mastering inside one password-protected vault.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              <span>Enter Astra Studio</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('music')}
              className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
            >
              Open Music Lab
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="rounded-xl border border-[#243047] bg-[#07090F] px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-[#111623] transition-colors cursor-pointer"
            >
              Operations Portal
            </button>
          </div>
        </div>

        {/* Interactive Tracking Card */}
        <div className="lg:col-span-5 rounded-xl border border-[#1A2233] bg-[#07090F] p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-sm font-bold text-white">
            <Ship className="h-4 w-4 text-cyan-400" />
            <span>Quick Consignment Lookup</span>
          </div>

          <form onSubmit={handleTrack} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Enter Invoice / Tracking ID"
                className="w-full rounded-xl border border-[#243047] bg-[#0B0E17] py-2 pl-9 pr-3 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-[#243047] bg-[#111623] px-4 py-2 text-xs font-semibold text-white hover:border-cyan-400/50 transition-colors"
            >
              Track
            </button>
          </form>

          {lookupResult && (
            <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4 text-xs space-y-1.5">
              <p className="font-mono font-semibold text-cyan-300">{trackingInput.toUpperCase()}</p>
              <p className="text-slate-200 font-medium">{lookupResult.route}</p>
              <p className="text-slate-400">{lookupResult.status}</p>
              <p className="text-emerald-400 font-mono tabular-nums">ETA: {lookupResult.eta}</p>
            </div>
          )}
        </div>
      </section>

      {/* Capabilities Strip */}
      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-6">
          <FolderKanban className="h-5 w-5 text-cyan-400" />
          <h2 className="mt-4 font-display text-base font-bold text-white">Multi-Project Workspaces</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Create isolated projects for export shipments, IoT scripts, or technical specs—each with persistent chat transcripts, inline editing, and version snapshots.
          </p>
        </div>

        <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-6">
          <Music className="h-5 w-5 text-amber-400" />
          <h2 className="mt-4 font-display text-base font-bold text-white">AI Music & Lyrics Mastering Lab</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Compose playable multi-track music, mix 4 audio stems live, arrange Bengali/English lyrics, and export high-resolution WAV files.
          </p>
        </div>

        <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-6">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="mt-4 font-display text-base font-bold text-white">Master Password Vault</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Server-side scrypt verification, HMAC session tokens held strictly in memory, brute-force lockout protection, and authenticated live WebSocket audio.
          </p>
        </div>
      </section>
    </main>
  );
};
