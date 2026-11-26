import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Activity, 
  Wifi, 
  Zap, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  Sliders, 
  Radio, 
  Layers, 
  AlertTriangle, 
  TrendingUp,
  Cpu,
  BarChart3
} from 'lucide-react';

export interface HeartbeatSample {
  timestamp: number;
  timeOffset: number; // seconds ago
  frequency: number;  // in Hz (e.g. 5 - 30)
  latency: number;    // in ms (e.g. 10 - 75)
  packetLoss: number; // percentage (e.g. 0.00)
  jitter: number;     // in ms
  nodeId: string;
}

interface AgentHeartbeatWidgetProps {
  activeNodeId?: string;
  onNodeAlert?: (message: string) => void;
  className?: string;
}

const NODES = [
  { id: 'NODE-SCARLET-01', name: 'Scarlet Core', region: 'asia-southeast1 (SG)', baseLatency: 22, baseFreq: 18.5 },
  { id: 'NODE-AZURE-02', name: 'Azure Edge Filter', region: 'us-west1 (OR)', baseLatency: 38, baseFreq: 14.0 },
  { id: 'NODE-AMBER-03', name: 'Amber Relay', region: 'europe-west3 (FRA)', baseLatency: 48, baseFreq: 12.2 },
  { id: 'NODE-VERDANT-04', name: 'Verdant Synapse', region: 'asia-east1 (TW)', baseLatency: 29, baseFreq: 22.0 },
];

export const AgentHeartbeatWidget: React.FC<AgentHeartbeatWidgetProps> = ({
  activeNodeId = 'NODE-SCARLET-01',
  onNodeAlert,
  className = '',
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeNodeId);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [samplingRateMs, setSamplingRateMs] = useState<number>(1000); // 1s default
  const [viewWindowSeconds, setViewWindowSeconds] = useState<number>(30); // 30s window
  const [hoveredPoint, setHoveredPoint] = useState<HeartbeatSample | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [activeSeries, setActiveSeries] = useState<'both' | 'latency' | 'frequency'>('both');

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 260 });

  const activeNode = useMemo(() => {
    return NODES.find(n => n.id === selectedNodeId) || NODES[0];
  }, [selectedNodeId]);

  // Seed initial history
  const [history, setHistory] = useState<HeartbeatSample[]>(() => {
    const now = Date.now();
    const count = 35;
    const initial: HeartbeatSample[] = [];
    const baseLat = 22;
    const baseFr = 18.5;

    for (let i = count - 1; i >= 0; i--) {
      const ts = now - i * 1000;
      const noise = (Math.random() - 0.5) * 4;
      const freqNoise = (Math.random() - 0.5) * 2.5;
      initial.push({
        timestamp: ts,
        timeOffset: -i,
        latency: Math.max(12, Math.round((baseLat + noise) * 10) / 10),
        frequency: Math.max(5, Math.round((baseFr + freqNoise) * 10) / 10),
        packetLoss: Math.random() > 0.95 ? 0.05 : 0.0,
        jitter: Math.round(Math.abs(noise) * 10) / 10,
        nodeId: 'NODE-SCARLET-01',
      });
    }
    return initial;
  });

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setDimensions({
          width: Math.max(340, clientWidth),
          height: 250,
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Live streaming tick generator
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setHistory(prev => {
        const now = Date.now();
        const last = prev[prev.length - 1];
        const baseLat = activeNode.baseLatency;
        const baseFr = activeNode.baseFreq;

        // Realistic edge jitter walk
        const latJitter = (Math.random() - 0.48) * 5.2;
        const freqJitter = (Math.random() - 0.5) * 3.1;
        
        // Occasional micro-burst or pulse wave
        const isPulse = Math.random() > 0.88;
        const extraLat = isPulse ? Math.random() * 12 : 0;
        const extraFreq = isPulse ? Math.random() * 5 : 0;

        const nextLat = Math.max(8, Math.min(110, Math.round((baseLat + latJitter + extraLat) * 10) / 10));
        const nextFreq = Math.max(4, Math.min(38, Math.round((baseFr + freqJitter + extraFreq) * 10) / 10));

        if (nextLat > 70 && onNodeAlert) {
          onNodeAlert(`High latency spike detected on ${activeNode.name}: ${nextLat}ms`);
        }

        const newSample: HeartbeatSample = {
          timestamp: now,
          timeOffset: 0,
          latency: nextLat,
          frequency: nextFreq,
          packetLoss: Math.random() > 0.97 ? 0.08 : 0,
          jitter: Math.round(Math.abs(latJitter) * 10) / 10,
          nodeId: activeNode.id,
        };

        // Keep last 45 samples
        const updated = [...prev.slice(-44), newSample];
        return updated.map((pt, idx) => ({
          ...pt,
          timeOffset: -(updated.length - 1 - idx) * (samplingRateMs / 1000),
        }));
      });
    }, samplingRateMs);

    return () => clearInterval(interval);
  }, [isStreaming, samplingRateMs, activeNode, onNodeAlert]);

  // Compute live aggregates
  const stats = useMemo(() => {
    if (history.length === 0) {
      return { currentLat: 0, avgLat: 0, minLat: 0, maxLat: 0, currentFreq: 0, avgFreq: 0, maxFreq: 0, avgJitter: 0 };
    }
    const current = history[history.length - 1];
    const lats = history.map(h => h.latency);
    const freqs = history.map(h => h.frequency);
    const jitters = history.map(h => h.jitter);

    const sumLat = lats.reduce((a, b) => a + b, 0);
    const sumFreq = freqs.reduce((a, b) => a + b, 0);
    const sumJitter = jitters.reduce((a, b) => a + b, 0);

    return {
      currentLat: current.latency,
      avgLat: Math.round((sumLat / lats.length) * 10) / 10,
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      currentFreq: current.frequency,
      avgFreq: Math.round((sumFreq / freqs.length) * 10) / 10,
      maxFreq: Math.max(...freqs),
      avgJitter: Math.round((sumJitter / jitters.length) * 10) / 10,
      packetLoss: current.packetLoss,
    };
  }, [history]);

  // D3 Chart Dimensions & Scales
  const margin = { top: 24, right: 46, bottom: 28, left: 46 };
  const innerWidth = Math.max(10, dimensions.width - margin.left - margin.right);
  const innerHeight = Math.max(10, dimensions.height - margin.top - margin.bottom);

  // D3 Scales
  const { xScale, yLatencyScale, yFreqScale, latencyPath, freqPath, latencyAreaPath, freqAreaPath } = useMemo(() => {
    if (history.length < 2) {
      return {
        xScale: null,
        yLatencyScale: null,
        yFreqScale: null,
        latencyPath: '',
        freqPath: '',
        latencyAreaPath: '',
        freqAreaPath: '',
      };
    }

    const xMin = history.length > 0 ? history[0].timestamp : Date.now() - 30000;
    const xMax = history.length > 0 ? history[history.length - 1].timestamp : Date.now();
    const x = d3.scaleTime()
      .domain([xMin, xMax])
      .range([0, innerWidth]);

    const maxLatVal = Math.max(...history.map(d => d.latency), 50);
    const maxLat = maxLatVal * 1.2;
    const yLat = d3.scaleLinear()
      .domain([0, maxLat])
      .range([innerHeight, 0]);

    const maxFreqVal = Math.max(...history.map(d => d.frequency), 25);
    const maxFreq = maxFreqVal * 1.25;
    const yFreq = d3.scaleLinear()
      .domain([0, maxFreq])
      .range([innerHeight, 0]);

    // Generator curves
    const lineLat = d3.line<HeartbeatSample>()
      .x(d => x(d.timestamp))
      .y(d => yLat(d.latency))
      .curve(d3.curveMonotoneX);

    const areaLat = d3.area<HeartbeatSample>()
      .x(d => x(d.timestamp))
      .y0(innerHeight)
      .y1(d => yLat(d.latency))
      .curve(d3.curveMonotoneX);

    const lineFr = d3.line<HeartbeatSample>()
      .x(d => x(d.timestamp))
      .y(d => yFreq(d.frequency))
      .curve(d3.curveMonotoneX);

    const areaFr = d3.area<HeartbeatSample>()
      .x(d => x(d.timestamp))
      .y0(innerHeight)
      .y1(d => yFreq(d.frequency))
      .curve(d3.curveMonotoneX);

    return {
      xScale: x,
      yLatencyScale: yLat,
      yFreqScale: yFreq,
      latencyPath: lineLat(history) || '',
      freqPath: lineFr(history) || '',
      latencyAreaPath: areaLat(history) || '',
      freqAreaPath: areaFr(history) || '',
    };
  }, [history, innerWidth, innerHeight]);

  // Handle Mouse Hover / Crosshair using D3 Bisector
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !xScale || history.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    const mouseY = e.clientY - rect.top - margin.top;

    if (mouseX < 0 || mouseX > innerWidth || mouseY < 0 || mouseY > innerHeight) {
      setHoveredPoint(null);
      setHoverPos(null);
      return;
    }

    const hoveredDate = xScale.invert(mouseX).getTime();
    const bisect = d3.bisector<HeartbeatSample, number>(d => d.timestamp).center;
    const idx = bisect(history, hoveredDate);
    const closest = history[Math.max(0, Math.min(history.length - 1, idx))];

    if (closest) {
      setHoveredPoint(closest);
      setHoverPos({
        x: xScale(closest.timestamp) + margin.left,
        y: mouseY + margin.top,
      });
    }
  }, [xScale, history, innerWidth, innerHeight, margin.left, margin.top]);

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverPos(null);
  };

  // Trigger Burst Simulation
  const handleSimulateBurst = () => {
    setHistory(prev => {
      const now = Date.now();
      const burstSample: HeartbeatSample = {
        timestamp: now,
        timeOffset: 0,
        latency: Math.round((activeNode.baseLatency + 28 + Math.random() * 15) * 10) / 10,
        frequency: Math.round((activeNode.baseFreq + 12 + Math.random() * 6) * 10) / 10,
        packetLoss: 0.02,
        jitter: 8.4,
        nodeId: activeNode.id,
      };
      return [...prev.slice(-44), burstSample];
    });
  };

  // Current head coordinates for pulse dot
  const currentHead = history[history.length - 1];
  const headX = (xScale && currentHead) ? xScale(currentHead.timestamp) : 0;
  const headLatY = (yLatencyScale && currentHead) ? yLatencyScale(currentHead.latency) : 0;
  const headFreqY = (yFreqScale && currentHead) ? yFreqScale(currentHead.frequency) : 0;

  // Grid ticks
  const latTicks = useMemo(() => yLatencyScale ? yLatencyScale.ticks(4) : [], [yLatencyScale]);
  const timeTicks = useMemo(() => xScale ? xScale.ticks(5) : [], [xScale]);

  return (
    <div className={`p-5 bg-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden backdrop-blur-md ${className}`}>
      {/* Background ambient edge glow */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-orange-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative">
            <Activity className="w-5 h-5 text-orange-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreaming ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isStreaming ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Agent Heartbeat</h3>
              <span className="text-[10px] font-mono font-medium text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live D3 Waveform
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Telemetry Frequency & Edge Latency</span>
              <span>•</span>
              <span className="font-mono text-slate-300">{activeNode.name}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Node Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Node selector */}
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          >
            {NODES.map(n => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.region})
              </option>
            ))}
          </select>

          {/* Series display toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setActiveSeries('both')}
              className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                activeSeries === 'both' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setActiveSeries('frequency')}
              className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                activeSeries === 'frequency' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hz
            </button>
            <button
              onClick={() => setActiveSeries('latency')}
              className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                activeSeries === 'latency' ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ms
            </button>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? 'Pause Real-Time Telemetry' : 'Resume Live Stream'}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition"
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Burst Simulator */}
          <button
            onClick={handleSimulateBurst}
            title="Simulate Instantaneous Telemetry Burst"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-xl text-xs font-semibold transition"
          >
            <Zap className="w-3 h-3 text-orange-400" />
            <span className="hidden sm:inline">Burst</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Telemetry Frequency KPI */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Telemetry Freq
            </span>
            <span className="text-[10px] font-mono text-slate-500">Target ~20 Hz</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {stats.currentFreq}
            </span>
            <span className="text-xs font-mono text-cyan-400">Hz</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
            <span>avg: {stats.avgFreq} Hz</span>
            <span>peak: {stats.maxFreq} Hz</span>
          </div>
        </div>

        {/* Round-trip Latency KPI */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-orange-400 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${stats.currentLat > 60 ? 'bg-red-400 animate-ping' : 'bg-orange-400'}`} />
              Node Latency
            </span>
            <span className="text-[10px] font-mono text-slate-500">RTT</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {stats.currentLat}
            </span>
            <span className="text-xs font-mono text-orange-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
            <span>avg: {stats.avgLat} ms</span>
            <span>min: {stats.minLat} ms</span>
          </div>
        </div>

        {/* Latency Jitter KPI */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" />
              Jitter / Delta
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Stable</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              ±{stats.avgJitter}
            </span>
            <span className="text-xs font-mono text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
            <span>loss: {stats.packetLoss}%</span>
            <span>99th: {Math.round(stats.maxLat * 0.95)}ms</span>
          </div>
        </div>

        {/* Pulse / Node Status */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Radio className="w-3 h-3 text-orange-400 animate-pulse" />
              Heartbeat Sync
            </span>
            <span className="text-[10px] font-mono text-slate-500">MCP-01</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold font-mono text-emerald-400 uppercase tracking-tight">
              LOCKED
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
            <span>window: 30s</span>
            <span>rate: {samplingRateMs}ms</span>
          </div>
        </div>
      </div>

      {/* D3 Dynamic Chart Canvas */}
      <div 
        ref={containerRef} 
        className="relative w-full h-[250px] bg-slate-950/70 border border-slate-800/70 rounded-2xl overflow-hidden select-none"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        >
          <defs>
            {/* Orange gradient for Latency area */}
            <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#ea580c" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.0" />
            </linearGradient>

            {/* Cyan gradient for Frequency area */}
            <linearGradient id="freqGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </linearGradient>

            {/* SVG Filter for line glow */}
            <filter id="neonGlowOrange" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f97316" floodOpacity="0.75" />
            </filter>
            <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#06b6d4" floodOpacity="0.75" />
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Background Horizontal Grid Lines & Latency Labels */}
            {latTicks.map((tickVal) => {
              if (!yLatencyScale) return null;
              const y = yLatencyScale(tickVal);
              return (
                <g key={`grid-lat-${tickVal}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={innerWidth}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  {/* Left Y-axis Latency Label */}
                  <text
                    x={-10}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {Math.round(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* Right Y-axis Frequency Labels */}
            {yFreqScale && yFreqScale.ticks(4).map((fVal) => {
              const y = yFreqScale(fVal);
              return (
                <text
                  key={`axis-fr-${fVal}`}
                  x={innerWidth + 10}
                  y={y + 3.5}
                  textAnchor="start"
                  fill="#06b6d4"
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {Math.round(fVal)}
                </text>
              );
            })}

            {/* SLA Reference Threshold (50ms) */}
            {yLatencyScale && yLatencyScale(50) >= 0 && yLatencyScale(50) <= innerHeight && (
              <g>
                <line
                  x1={0}
                  y1={yLatencyScale(50)}
                  x2={innerWidth}
                  y2={yLatencyScale(50)}
                  stroke="#ef4444"
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={innerWidth - 6}
                  y={yLatencyScale(50) - 4}
                  textAnchor="end"
                  fill="#ef4444"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  SLA 50ms Limit
                </text>
              </g>
            )}

            {/* Time Axis Ticks at bottom */}
            {timeTicks.map((t) => {
              if (!xScale) return null;
              const xPos = xScale(t);
              const diffSec = Math.round((t.getTime() - Date.now()) / 1000);
              const label = diffSec === 0 ? 'NOW' : `${diffSec}s`;
              return (
                <g key={`time-${t.getTime()}`}>
                  <line
                    x1={xPos}
                    y1={innerHeight}
                    x2={xPos}
                    y2={innerHeight + 5}
                    stroke="#334155"
                    strokeWidth={1}
                  />
                  <text
                    x={xPos}
                    y={innerHeight + 16}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {(activeSeries === 'both' || activeSeries === 'frequency') && (
              <path
                d={freqAreaPath}
                fill="url(#freqGlow)"
              />
            )}
            {(activeSeries === 'both' || activeSeries === 'latency') && (
              <path
                d={latencyAreaPath}
                fill="url(#latencyGlow)"
              />
            )}

            {/* D3 Line Paths */}
            {(activeSeries === 'both' || activeSeries === 'frequency') && (
              <path
                d={freqPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={2}
                filter="url(#neonGlowCyan)"
              />
            )}

            {(activeSeries === 'both' || activeSeries === 'latency') && (
              <path
                d={latencyPath}
                fill="none"
                stroke="#f97316"
                strokeWidth={2.2}
                filter="url(#neonGlowOrange)"
              />
            )}

            {/* Current Real-time Leading Pulse Heads */}
            {xScale && currentHead && (
              <>
                {/* Frequency Head */}
                {(activeSeries === 'both' || activeSeries === 'frequency') && (
                  <g transform={`translate(${headX}, ${headFreqY})`}>
                    <circle r={7} fill="#06b6d4" opacity={0.25} className="animate-ping" />
                    <circle r={3.5} fill="#06b6d4" stroke="#083344" strokeWidth={1.5} />
                  </g>
                )}

                {/* Latency Head */}
                {(activeSeries === 'both' || activeSeries === 'latency') && (
                  <g transform={`translate(${headX}, ${headLatY})`}>
                    <circle r={8} fill="#f97316" opacity={0.3} className="animate-ping" />
                    <circle r={4} fill="#f97316" stroke="#431407" strokeWidth={1.5} />
                  </g>
                )}
              </>
            )}

            {/* Hover Crosshair Vertical Line */}
            {hoveredPoint && xScale && (
              <g>
                <line
                  x1={xScale(hoveredPoint.timestamp)}
                  y1={0}
                  x2={xScale(hoveredPoint.timestamp)}
                  y2={innerHeight}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                {/* Dot on Latency */}
                {yLatencyScale && (
                  <circle
                    cx={xScale(hoveredPoint.timestamp)}
                    cy={yLatencyScale(hoveredPoint.latency)}
                    r={4.5}
                    fill="#f97316"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                )}
                {/* Dot on Frequency */}
                {yFreqScale && (
                  <circle
                    cx={xScale(hoveredPoint.timestamp)}
                    cy={yFreqScale(hoveredPoint.frequency)}
                    r={4.5}
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            )}
          </g>

          {/* Axis Unit Headers */}
          <text
            x={margin.left}
            y={14}
            fill="#f97316"
            fontSize={10}
            fontFamily="monospace"
            fontWeight="bold"
          >
            ← Latency (ms)
          </text>
          <text
            x={dimensions.width - margin.right}
            y={14}
            textAnchor="end"
            fill="#06b6d4"
            fontSize={10}
            fontFamily="monospace"
            fontWeight="bold"
          >
            Telemetry Freq (Hz) →
          </text>
        </svg>

        {/* Hover Inspection Tooltip HUD */}
        {hoveredPoint && hoverPos && (
          <div
            className="absolute pointer-events-none z-30 px-3 py-2 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full text-[11px] font-mono space-y-1"
            style={{
              left: `${Math.max(80, Math.min(dimensions.width - 80, hoverPos.x))}px`,
              top: `${Math.max(50, hoverPos.y - 12)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-4 text-slate-400 border-b border-slate-800 pb-1">
              <span>{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</span>
              <span className="text-emerald-400 font-bold">{hoveredPoint.timeOffset}s ago</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-orange-400 font-semibold">Latency:</span>
              <span className="text-white font-bold">{hoveredPoint.latency} ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-cyan-400 font-semibold">Frequency:</span>
              <span className="text-white font-bold">{hoveredPoint.frequency} Hz</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
              <span>Jitter: ±{hoveredPoint.jitter}ms</span>
              <span>Loss: {hoveredPoint.packetLoss}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-1 bg-orange-500 rounded" />
            <strong className="text-slate-200">Orange</strong>: Edge Latency (ms)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-1 bg-cyan-400 rounded" />
            <strong className="text-slate-200">Cyan</strong>: Ingest Rate (Hz)
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>Buffer: <strong className="text-slate-300">{history.length} ticks</strong></span>
          <span>SLA Target: <strong className="text-emerald-400">&lt; 50ms</strong></span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            D3 Engine Online
          </span>
        </div>
      </div>
    </div>
  );
};
