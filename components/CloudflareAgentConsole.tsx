import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Server, Activity, RefreshCw, Power } from 'lucide-react';
import { TerminalTelemetry } from './astra/TerminalTelemetry';

interface SwarmNode {
  id: string;
  name: string;
  region: string;
  online: boolean;
  latencyMs: number;
  freqHz: number;
}

interface HeartbeatPoint {
  ts: Date;
  frequency: number;
  latencyMs: number;
}

const INITIAL_NODES: SwarmNode[] = [
  { id: 'cf-sin', name: 'Edge Router SIN-01', region: 'Singapore', online: true, latencyMs: 24, freqHz: 42 },
  { id: 'cf-dac', name: 'Dhaka Gateway DAC-02', region: 'Bangladesh', online: true, latencyMs: 31, freqHz: 38 },
  { id: 'cf-fra', name: 'Hamburg Bridge FRA-01', region: 'Germany', online: true, latencyMs: 48, freqHz: 29 },
  { id: 'cf-iad', name: 'Voice Inference IAD-04', region: 'US-East', online: true, latencyMs: 62, freqHz: 35 },
  { id: 'cf-nrt', name: 'Backup Worker NRT-03', region: 'Tokyo', online: false, latencyMs: 0, freqHz: 0 },
];

export const CloudflareAgentConsole: React.FC = () => {
  const [nodes, setNodes] = useState<SwarmNode[]>(INITIAL_NODES);
  const [heartbeatSeries, setHeartbeatSeries] = useState<HeartbeatPoint[]>(() => {
    const now = Date.now();
    return Array.from({ length: 24 }, (_, idx) => ({
      ts: new Date(now - (23 - idx) * 1500),
      frequency: Math.round(32 + Math.sin(idx * 0.5) * 8 + Math.random() * 5),
      latencyMs: Math.round(34 + Math.cos(idx * 0.4) * 7 + Math.random() * 6),
    }));
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Live telemetry ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) =>
          n.online
            ? {
                ...n,
                latencyMs: Math.max(12, Math.round(n.latencyMs + (Math.random() - 0.5) * 6)),
                freqHz: Math.max(10, Math.round(n.freqHz + (Math.random() - 0.5) * 5)),
              }
            : n
        )
      );

      setHeartbeatSeries((prev) => {
        const activeNodes = nodes.filter((n) => n.online);
        const avgLat =
          activeNodes.length > 0
            ? Math.round(activeNodes.reduce((s, n) => s + n.latencyMs, 0) / activeNodes.length)
            : 0;
        const avgFreq =
          activeNodes.length > 0
            ? Math.round(activeNodes.reduce((s, n) => s + n.freqHz, 0) / activeNodes.length)
            : 0;

        return [
          ...prev.slice(1),
          {
            ts: new Date(),
            frequency: Math.max(8, avgFreq + Math.round((Math.random() - 0.5) * 6)),
            latencyMs: Math.max(10, avgLat + Math.round((Math.random() - 0.5) * 5)),
          },
        ];
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [nodes]);

  // Dynamic D3 Heartbeat Line Chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || heartbeatSeries.length < 2) return;

    const width = 620;
    const height = 210;
    const margin = { top: 16, right: 44, bottom: 28, left: 40 };

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(heartbeatSeries, (d) => d.ts) as [Date, Date])
      .range([0, innerW]);

    const yFreqScale = d3
      .scaleLinear()
      .domain([0, Math.max(60, d3.max(heartbeatSeries, (d) => d.frequency) || 50) + 10])
      .range([innerH, 0]);

    const yLatScale = d3
      .scaleLinear()
      .domain([0, Math.max(80, d3.max(heartbeatSeries, (d) => d.latencyMs) || 60) + 15])
      .range([innerH, 0]);

    // Grid lines
    g.append('g')
      .attr('stroke', 'rgba(148,163,184,0.12)')
      .call(d3.axisLeft(yFreqScale).ticks(4).tickSize(-innerW).tickFormat(() => ''))
      .select('.domain')
      .remove();

    // Left Axis (Frequency Hz)
    g.append('g')
      .call(d3.axisLeft(yFreqScale).ticks(4))
      .attr('color', '#38bdf8')
      .attr('font-size', '10px');

    // Right Axis (Latency ms)
    g.append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(d3.axisRight(yLatScale).ticks(4))
      .attr('color', '#f59e0b')
      .attr('font-size', '10px');

    // Bottom Time Axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => d3.timeFormat('%H:%M:%S')(d as Date))
      )
      .attr('color', '#94a3b8')
      .attr('font-size', '10px');

    const freqArea = d3
      .area<HeartbeatPoint>()
      .x((d) => xScale(d.ts))
      .y0(innerH)
      .y1((d) => yFreqScale(d.frequency))
      .curve(d3.curveMonotoneX);

    const freqLine = d3
      .line<HeartbeatPoint>()
      .x((d) => xScale(d.ts))
      .y((d) => yFreqScale(d.frequency))
      .curve(d3.curveMonotoneX);

    const latLine = d3
      .line<HeartbeatPoint>()
      .x((d) => xScale(d.ts))
      .y((d) => yLatScale(d.latencyMs))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(heartbeatSeries)
      .attr('fill', 'rgba(34, 211, 238, 0.12)')
      .attr('d', freqArea);

    g.append('path')
      .datum(heartbeatSeries)
      .attr('fill', 'none')
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 2.2)
      .attr('d', freqLine);

    g.append('path')
      .datum(heartbeatSeries)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 3')
      .attr('d', latLine);
  }, [heartbeatSeries]);

  const onlineCount = nodes.filter((n) => n.online).length;
  const offlineCount = nodes.length - onlineCount;
  const latestPoint = heartbeatSeries[heartbeatSeries.length - 1];

  const toggleNode = (id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              online: !n.online,
              latencyMs: !n.online ? 32 : 0,
              freqHz: !n.online ? 34 : 0,
            }
          : n
      )
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
      {/* Multi-Agent Swarm Health Summary Widget (Online vs Offline) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 lg:col-span-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Server className="h-4 w-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Swarm Cluster Health</h3>
              <p className="text-xs text-slate-400">Online vs. Offline Edge Nodes</p>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
            {onlineCount}/{nodes.length} Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <span className="text-xs text-emerald-300">Nodes Online</span>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{onlineCount}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <span className="text-xs text-slate-400">Nodes Offline</span>
            <p className="mt-1 text-2xl font-bold text-slate-200 tabular-nums">{offlineCount}</p>
          </div>
        </div>

        {/* Visual Online/Offline Ratio Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(onlineCount / nodes.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 space-y-2">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-950/60 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-200">{node.name}</p>
                <p className="text-[11px] text-slate-500">
                  {node.region} ·{' '}
                  <span className="font-mono tabular-nums">
                    {node.online ? `${node.latencyMs}ms · ${node.freqHz}Hz` : 'Offline'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  node.online
                    ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Power className="h-3 w-3" />
                <span>{node.online ? 'Online' : 'Offline'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time D3 Agent Heartbeat Dashboard Widget */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Agent Heartbeat</h3>
              <p className="text-xs text-slate-400">
                Real-time telemetry frequency (Hz) & average node latency (ms)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <span className="text-cyan-300">
              Freq: {latestPoint?.frequency ?? 0} Hz
            </span>
            <span className="text-amber-300">
              Latency: {latestPoint?.latencyMs ?? 0} ms
            </span>
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>

        <div className="mt-4">
          <svg ref={svgRef} className="w-full h-56" role="img" aria-label="Agent Heartbeat telemetry line chart" />
        </div>

        <div className="mt-2 flex items-center justify-end gap-5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-cyan-400" />
            Telemetry Frequency (Hz)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
            Node Latency (ms)
          </span>
        </div>
      </div>
      </div>

      <TerminalTelemetry
        latencyMs={latestPoint?.latencyMs}
        activeProjectName="Edge Swarm Cluster"
        className="rounded-2xl border border-slate-800 bg-slate-900/75"
      />
    </div>
  );
};
