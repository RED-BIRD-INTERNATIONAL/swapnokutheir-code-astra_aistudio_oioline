import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Cpu,
  HardDrive,
  Network,
  Play,
  Pause,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { SwarmMetricSnapshot } from '../../src/types/astra';

export type TelemetryProfile = 'nominal' | 'inference' | 'sync';

export interface TerminalTelemetrySample {
  id: number;
  time: string;
  cpuPct: number;
  cpuUserPct: number;
  cpuSysPct: number;
  memUsedMb: number;
  memTotalMb: number;
  memPct: number;
  netRxMbps: number;
  netTxMbps: number;
  netPps: number;
  latencyMs: number;
}

export interface TerminalTelemetryProps {
  swarmHistory?: SwarmMetricSnapshot[];
  swarmState?: {
    nlp: 'standby' | 'online' | 'active';
    redbird: 'standby' | 'online' | 'active';
    devops: 'standby' | 'online' | 'active';
    dreamhouse: 'standby' | 'online' | 'active';
    vision: 'standby' | 'online' | 'active';
  };
  latencyMs?: number;
  activeProjectName?: string;
  className?: string;
}

const MEM_TOTAL_MB = 4096;
const HISTORY_LENGTH = 36;

const PROFILE_CONFIG: Record<
  TelemetryProfile,
  {
    label: string;
    cpuBase: number;
    cpuSpread: number;
    memBaseMb: number;
    memSpreadMb: number;
    rxBase: number;
    txBase: number;
    netSpread: number;
    latencyBase: number;
  }
> = {
  nominal: {
    label: 'Nominal',
    cpuBase: 28,
    cpuSpread: 14,
    memBaseMb: 1680,
    memSpreadMb: 180,
    rxBase: 42,
    txBase: 26,
    netSpread: 18,
    latencyBase: 24,
  },
  inference: {
    label: 'Inference Spike',
    cpuBase: 72,
    cpuSpread: 19,
    memBaseMb: 2840,
    memSpreadMb: 240,
    rxBase: 88,
    txBase: 64,
    netSpread: 28,
    latencyBase: 36,
  },
  sync: {
    label: 'Sync Burst',
    cpuBase: 48,
    cpuSpread: 16,
    memBaseMb: 2210,
    memSpreadMb: 210,
    rxBase: 146,
    txBase: 118,
    netSpread: 38,
    latencyBase: 42,
  },
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function generateSample(
  id: number,
  profile: TelemetryProfile,
  prev?: TerminalTelemetrySample,
  swarmSnapshot?: SwarmMetricSnapshot,
  externalLatencyMs?: number,
  offsetSeconds = 0
): TerminalTelemetrySample {
  const cfg = PROFILE_CONFIG[profile];
  const now = new Date(Date.now() - offsetSeconds * 1000);
  const time = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const swarmAvgCpu = swarmSnapshot
    ? (swarmSnapshot.nlpCpu +
        swarmSnapshot.redbirdCpu +
        swarmSnapshot.devopsCpu +
        swarmSnapshot.dreamhouseCpu +
        swarmSnapshot.visionCpu) /
      5
    : cfg.cpuBase;

  const targetCpu = profile === 'nominal' && swarmSnapshot ? swarmAvgCpu * 1.35 : cfg.cpuBase;
  const prevCpu = prev?.cpuPct ?? targetCpu;
  const cpuPct = Math.round(
    clamp(prevCpu * 0.55 + targetCpu * 0.45 + (Math.random() - 0.5) * cfg.cpuSpread, 6, 98)
  );
  const cpuUserPct = Math.round(cpuPct * 0.72);
  const cpuSysPct = Math.max(1, cpuPct - cpuUserPct);

  const swarmMemSum = swarmSnapshot
    ? swarmSnapshot.nlpMem +
      swarmSnapshot.redbirdMem +
      swarmSnapshot.devopsMem +
      swarmSnapshot.dreamhouseMem +
      swarmSnapshot.visionMem +
      420
    : cfg.memBaseMb;

  const targetMem = profile === 'nominal' && swarmSnapshot ? swarmMemSum : cfg.memBaseMb;
  const prevMem = prev?.memUsedMb ?? targetMem;
  const memUsedMb = Math.round(
    clamp(
      prevMem * 0.7 + targetMem * 0.3 + (Math.random() - 0.5) * cfg.memSpreadMb,
      640,
      MEM_TOTAL_MB - 128
    )
  );
  const memPct = Math.round((memUsedMb / MEM_TOTAL_MB) * 100);

  const prevRx = prev?.netRxMbps ?? cfg.rxBase;
  const prevTx = prev?.netTxMbps ?? cfg.txBase;
  const netRxMbps =
    Math.round(
      clamp(prevRx * 0.5 + cfg.rxBase * 0.5 + (Math.random() - 0.5) * cfg.netSpread, 4, 240) * 10
    ) / 10;
  const netTxMbps =
    Math.round(
      clamp(prevTx * 0.5 + cfg.txBase * 0.5 + (Math.random() - 0.5) * (cfg.netSpread * 0.8), 2, 200) *
        10
    ) / 10;
  const netPps = Math.round((netRxMbps + netTxMbps) * 118 + Math.random() * 240);

  const baseLat = externalLatencyMs ?? cfg.latencyBase;
  const latencyMs = Math.round(clamp(baseLat + (Math.random() - 0.48) * 10, 8, 120));

  return {
    id,
    time,
    cpuPct,
    cpuUserPct,
    cpuSysPct,
    memUsedMb,
    memTotalMb: MEM_TOTAL_MB,
    memPct,
    netRxMbps,
    netTxMbps,
    netPps,
    latencyMs,
  };
}

function buildInitialSamples(
  profile: TelemetryProfile,
  latestSwarm?: SwarmMetricSnapshot,
  latencyMs?: number
): TerminalTelemetrySample[] {
  const arr: TerminalTelemetrySample[] = [];
  for (let i = HISTORY_LENGTH - 1; i >= 0; i--) {
    const prev = arr[arr.length - 1];
    arr.push(
      generateSample(
        HISTORY_LENGTH - i,
        profile,
        prev,
        latestSwarm,
        latencyMs,
        i
      )
    );
  }
  return arr;
}

interface SparklineChartProps {
  values: number[];
  secondaryValues?: number[];
  maxValue: number;
  primaryStroke: string;
  primaryFill: string;
  secondaryStroke?: string;
  ariaLabel: string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  values,
  secondaryValues,
  maxValue,
  primaryStroke,
  primaryFill,
  secondaryStroke,
  ariaLabel,
}) => {
  const width = 320;
  const height = 88;
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const toPoints = (series: number[]) =>
    series.map((v, i) => {
      const x = padX + (series.length <= 1 ? innerW : (i / (series.length - 1)) * innerW);
      const ratio = clamp(v / maxValue, 0, 1);
      const y = padY + innerH - ratio * innerH;
      return { x, y };
    });

  const primaryPts = toPoints(values);
  const lineD = primaryPts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD =
    primaryPts.length > 0
      ? `${lineD} L ${primaryPts[primaryPts.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${primaryPts[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`
      : '';

  const secondaryPts = secondaryValues ? toPoints(secondaryValues) : [];
  const secondaryD = secondaryPts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-22 w-full overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Subtle reference gridlines */}
      {[0.25, 0.5, 0.75].map((t) => {
        const y = padY + innerH * t;
        return (
          <line
            key={t}
            x1={padX}
            y1={y}
            x2={width - padX}
            y2={y}
            stroke="rgba(148, 163, 184, 0.14)"
            strokeDasharray="2 3"
          />
        );
      })}
      {areaD && <path d={areaD} fill={primaryFill} />}
      {lineD && (
        <path
          d={lineD}
          fill="none"
          stroke={primaryStroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {secondaryD && secondaryStroke && (
        <path
          d={secondaryD}
          fill="none"
          stroke={secondaryStroke}
          strokeWidth={1.75}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export const TerminalTelemetry: React.FC<TerminalTelemetryProps> = ({
  swarmHistory,
  swarmState,
  latencyMs,
  activeProjectName,
  className = '',
}) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [intervalMs, setIntervalMs] = useState<500 | 1000 | 2000>(1000);
  const [profile, setProfile] = useState<TelemetryProfile>('nominal');
  const [samples, setSamples] = useState<TerminalTelemetrySample[]>(() =>
    buildInitialSamples('nominal', swarmHistory?.[swarmHistory.length - 1], latencyMs)
  );

  const latestSwarm = swarmHistory?.[swarmHistory.length - 1];

  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      setSamples((prev) => {
        const last = prev[prev.length - 1];
        const nextId = (last?.id ?? 0) + 1;
        const nextSample = generateSample(nextId, profile, last, latestSwarm, latencyMs);
        return [...prev.slice(1), nextSample];
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, intervalMs, profile, latestSwarm, latencyMs]);

  const handleReset = useCallback(() => {
    setSamples(buildInitialSamples(profile, latestSwarm, latencyMs));
  }, [profile, latestSwarm, latencyMs]);

  const latest = samples[samples.length - 1];

  const stats = useMemo(() => {
    const cpuPeak = Math.max(...samples.map((s) => s.cpuPct));
    const cpuAvg = Math.round(samples.reduce((acc, s) => acc + s.cpuPct, 0) / samples.length);
    const memPeakMb = Math.max(...samples.map((s) => s.memUsedMb));
    const netPeakRx = Math.max(...samples.map((s) => s.netRxMbps));
    const netMaxScale = Math.max(120, Math.ceil(netPeakRx / 40) * 40 + 20);
    return { cpuPeak, cpuAvg, memPeakMb, netPeakRx, netMaxScale };
  }, [samples]);

  const agentProcesses = useMemo(() => {
    const factor = profile === 'inference' ? 1.55 : profile === 'sync' ? 1.25 : 1.0;
    const netFactor = profile === 'sync' ? 2.1 : profile === 'inference' ? 1.4 : 1.0;

    const rows = [
      {
        pid: 1042,
        unit: 'astra-nlp-router',
        role: 'Autonomous Command & Tooling',
        state: swarmState?.nlp || 'active',
        cpu: clamp(Math.round((latestSwarm?.nlpCpu ?? 18) * factor), 4, 96),
        memMb: Math.round((latestSwarm?.nlpMem ?? 310) * (profile === 'inference' ? 1.45 : 1)),
        netKbps: Math.round((420 + (latest?.netRxMbps ?? 40) * 6.5) * netFactor),
      },
      {
        pid: 1088,
        unit: 'redbird-trade-sync',
        role: 'Logistics Manifest & L/C Worker',
        state: swarmState?.redbird || 'online',
        cpu: clamp(Math.round((latestSwarm?.redbirdCpu ?? 21) * factor), 3, 92),
        memMb: Math.round((latestSwarm?.redbirdMem ?? 365) * (profile === 'sync' ? 1.2 : 1)),
        netKbps: Math.round((680 + (latest?.netTxMbps ?? 25) * 9.2) * netFactor),
      },
      {
        pid: 1124,
        unit: 'devops-edge-daemon',
        role: 'Cloudflare & CI Pipeline Watcher',
        state: swarmState?.devops || 'online',
        cpu: clamp(Math.round((latestSwarm?.devopsCpu ?? 14) * factor), 2, 85),
        memMb: Math.round(latestSwarm?.devopsMem ?? 228),
        netKbps: Math.round((310 + (latest?.netRxMbps ?? 30) * 4.4) * netFactor),
      },
      {
        pid: 1190,
        unit: 'dreamhouse-iot-bus',
        role: 'Telemetry Socket & Inverter Bridge',
        state: swarmState?.dreamhouse || 'online',
        cpu: clamp(Math.round((latestSwarm?.dreamhouseCpu ?? 11) * factor), 2, 74),
        memMb: Math.round(latestSwarm?.dreamhouseMem ?? 164),
        netKbps: Math.round((190 + (latest?.netTxMbps ?? 20) * 3.1) * netFactor),
      },
      {
        pid: 1215,
        unit: 'vision-ocr-stream',
        role: 'Multimodal Frame & Audio Encoder',
        state: swarmState?.vision || 'standby',
        cpu: clamp(Math.round((latestSwarm?.visionCpu ?? 9) * factor), 1, 90),
        memMb: Math.round((latestSwarm?.visionMem ?? 290) * (profile === 'inference' ? 1.3 : 1)),
        netKbps: Math.round((240 + (latest?.netRxMbps ?? 25) * 5.0) * netFactor),
      },
    ];

    return rows;
  }, [latest, latestSwarm, profile, swarmState]);

  const cpuHigh = (latest?.cpuPct ?? 0) >= 80;
  const memHigh = (latest?.memPct ?? 0) >= 80;

  return (
    <section
      aria-label="Terminal Telemetry"
      className={`flex h-full flex-col overflow-y-auto bg-[#07090F] p-4 sm:p-5 text-slate-200 ${className}`}
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A2233] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="font-display text-base font-bold tracking-tight text-white">
              Terminal Telemetry
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            <span>{activeProjectName ? `${activeProjectName} runtime` : 'Autonomous agent host'}</span>
            <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {isStreaming ? `Streaming every ${intervalMs} ms` : 'Stream paused'}
            </span>
            <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Last tick {latest?.time}</span>
          </p>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workload Simulation Profile */}
          <div
            role="group"
            aria-label="Simulated workload profile"
            className="flex items-center gap-1 rounded-lg border border-[#1A2233] bg-[#0B0E17] p-1"
          >
            {(Object.keys(PROFILE_CONFIG) as TelemetryProfile[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile(key)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  profile === key
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {PROFILE_CONFIG[key].label}
              </button>
            ))}
          </div>

          {/* Sampling Cadence */}
          <div
            role="group"
            aria-label="Telemetry sampling interval"
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 font-mono"
          >
            {([500, 1000, 2000] as const).map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => setIntervalMs(ms)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                  intervalMs === ms
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
              </button>
            ))}
          </div>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setIsStreaming((s) => !s)}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isStreaming
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Reset telemetry window"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Column Resource Telemetry Grid: CPU, Memory, Network */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* CPU Utilization */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span>CPU Utilization</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {latest?.cpuPct ?? 0}%
                </span>
                <span
                  className={`text-xs font-medium ${
                    cpuHigh ? 'text-amber-300' : 'text-emerald-400'
                  }`}
                >
                  {cpuHigh ? 'Elevated' : 'Nominal'}
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400 tabular-nums">
              <div>Avg {stats.cpuAvg}%</div>
              <div>Peak {stats.cpuPeak}%</div>
            </div>
          </div>

          <SparklineChart
            values={samples.map((s) => s.cpuPct)}
            maxValue={100}
            primaryStroke="#22d3ee"
            primaryFill="rgba(34, 211, 238, 0.14)"
            ariaLabel="Real-time CPU usage percentage stream"
          />

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] font-mono text-slate-400 tabular-nums">
            <span>User {latest?.cpuUserPct ?? 0}%</span>
            <span>Kernel {latest?.cpuSysPct ?? 0}%</span>
            <span>8 vCPU</span>
          </div>
        </div>

        {/* Memory Allocation */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <HardDrive className="h-4 w-4 text-purple-400" />
                <span>Memory Allocation</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {((latest?.memUsedMb ?? 0) / 1024).toFixed(2)} GB
                </span>
                <span
                  className={`font-mono text-xs font-medium tabular-nums ${
                    memHigh ? 'text-amber-300' : 'text-purple-300'
                  }`}
                >
                  {latest?.memPct ?? 0}%
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400 tabular-nums">
              <div>Quota {(MEM_TOTAL_MB / 1024).toFixed(1)} GB</div>
              <div>Peak {(stats.memPeakMb / 1024).toFixed(2)} GB</div>
            </div>
          </div>

          <SparklineChart
            values={samples.map((s) => s.memUsedMb)}
            maxValue={MEM_TOTAL_MB}
            primaryStroke="#a855f7"
            primaryFill="rgba(168, 85, 247, 0.14)"
            ariaLabel="Real-time memory allocation stream"
          />

          <div className="space-y-1.5 border-t border-slate-800/80 pt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-purple-400 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${latest?.memPct ?? 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>Used {latest?.memUsedMb ?? 0} MB</span>
              <span>Free {MEM_TOTAL_MB - (latest?.memUsedMb ?? 0)} MB</span>
            </div>
          </div>
        </div>

        {/* Network I/O */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Network className="h-4 w-4 text-emerald-400" />
                <span>Network Throughput</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {latest?.netRxMbps.toFixed(1) ?? '0.0'} Mbps
                </span>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  TX {latest?.netTxMbps.toFixed(1) ?? '0.0'}
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400 tabular-nums">
              <div>RTT {latest?.latencyMs ?? 0} ms</div>
              <div>Peak {stats.netPeakRx.toFixed(1)} Mbps</div>
            </div>
          </div>

          <SparklineChart
            values={samples.map((s) => s.netRxMbps)}
            secondaryValues={samples.map((s) => s.netTxMbps)}
            maxValue={stats.netMaxScale}
            primaryStroke="#10b981"
            primaryFill="rgba(16, 185, 129, 0.14)"
            secondaryStroke="#f59e0b"
            ariaLabel="Real-time network inbound and outbound throughput stream"
          />

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] font-mono text-slate-400 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 bg-emerald-400" />
              RX In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-amber-400" />
              TX Out
            </span>
            <span>{(latest?.netPps ?? 0).toLocaleString()} pps</span>
          </div>
        </div>
      </div>

      {/* Autonomous Agent Process Breakdown Table */}
      <div className="mt-5 rounded-xl border border-slate-800/90 bg-slate-950/75 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Active Agent Daemons</h3>
            <p className="text-xs text-slate-400">
              Per-process compute, resident memory, and socket throughput across autonomous workers
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {agentProcesses.length} workers · {samples.length}-tick window
          </span>
        </div>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800/80 text-slate-400">
              <tr>
                <th className="py-2.5 pr-3 font-mono font-semibold">PID</th>
                <th className="py-2.5 pr-3 font-semibold">Agent Service</th>
                <th className="py-2.5 pr-3 font-semibold">Workload</th>
                <th className="py-2.5 pr-3 font-semibold">State</th>
                <th className="py-2.5 pl-3 text-right font-semibold">CPU</th>
                <th className="py-2.5 pl-3 text-right font-semibold">Memory</th>
                <th className="py-2.5 pl-3 text-right font-semibold">Net I/O</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {agentProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 pr-3 font-mono text-slate-400 tabular-nums">
                    {proc.pid}
                  </td>
                  <td className="py-2.5 pr-3 font-mono font-semibold text-cyan-300 whitespace-nowrap">
                    {proc.unit}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-300">{proc.role}</td>
                  <td className="py-2.5 pr-3 font-mono capitalize">
                    <span
                      className={
                        proc.state === 'active'
                          ? 'text-cyan-300'
                          : proc.state === 'online'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }
                    >
                      {proc.state}
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono text-slate-200 tabular-nums">
                    {proc.cpu}%
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono text-slate-200 tabular-nums">
                    {proc.memMb} MB
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono text-emerald-300 tabular-nums">
                    {proc.netKbps.toLocaleString()} KB/s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default TerminalTelemetry;
