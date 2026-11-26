import React, { useState } from 'react';
import { Cpu, Database, Activity } from 'lucide-react';
import { SwarmMetricSnapshot } from '../../src/types/astra';

interface SwarmGraphProps {
  history: SwarmMetricSnapshot[];
  activeAgentId?: string;
}

interface AgentConfig {
  id: keyof Omit<SwarmMetricSnapshot, 'time'>;
  cpuKey: keyof SwarmMetricSnapshot;
  memKey: keyof SwarmMetricSnapshot;
  name: string;
  shortName: string;
  color: string;
  stroke: string;
  fillId: string;
}

const AGENTS: AgentConfig[] = [
  {
    id: 'nlpCpu',
    cpuKey: 'nlpCpu',
    memKey: 'nlpMem',
    name: 'NLP & Executive (Sumon Core)',
    shortName: 'NLP Core',
    color: '#00f0ff',
    stroke: '#00f0ff',
    fillId: 'gradNlp',
  },
  {
    id: 'redbirdCpu',
    cpuKey: 'redbirdCpu',
    memKey: 'redbirdMem',
    name: 'Red Bird Garment Logistics',
    shortName: 'Red Bird',
    color: '#00ff66',
    stroke: '#00ff66',
    fillId: 'gradRedbird',
  },
  {
    id: 'devopsCpu',
    cpuKey: 'devopsCpu',
    memKey: 'devopsMem',
    name: 'DevOps (Vercel & GitLab)',
    shortName: 'DevOps',
    color: '#b026ff',
    stroke: '#b026ff',
    fillId: 'gradDevops',
  },
  {
    id: 'dreamhouseCpu',
    cpuKey: 'dreamhouseCpu',
    memKey: 'dreamhouseMem',
    name: "'Dream house' IoT Controller",
    shortName: 'Dream house',
    color: '#f59e0b',
    stroke: '#f59e0b',
    fillId: 'gradDreamhouse',
  },
  {
    id: 'visionCpu',
    cpuKey: 'visionCpu',
    memKey: 'visionMem',
    name: 'Vision & Document OCR',
    shortName: 'Vision',
    color: '#f43f5e',
    stroke: '#f43f5e',
    fillId: 'gradVision',
  },
];

export const SwarmGraph: React.FC<SwarmGraphProps> = ({ history }) => {
  const [metricType, setMetricType] = useState<'cpu' | 'mem'>('cpu');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  const width = 360;
  const height = 110;
  const padding = { top: 12, right: 12, bottom: 20, left: 32 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxY = metricType === 'cpu' ? 100 : 1024;
  const pointsCount = Math.max(history.length, 2);
  const stepX = graphWidth / (pointsCount - 1);

  const generatePath = (key: keyof SwarmMetricSnapshot) => {
    if (history.length === 0) return '';
    const coords = history.map((snapshot, index) => {
      const val = Number(snapshot[key]) || 0;
      const x = padding.left + index * stepX;
      const y = padding.top + graphHeight - (Math.min(val, maxY) / maxY) * graphHeight;
      return { x, y };
    });

    if (coords.length === 1) {
      return `M ${coords[0].x} ${coords[0].y}`;
    }

    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  };

  const generateArea = (key: keyof SwarmMetricSnapshot) => {
    if (history.length < 2) return '';
    const linePath = generatePath(key);
    const lastX = padding.left + (history.length - 1) * stepX;
    const firstX = padding.left;
    const bottomY = padding.top + graphHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const currentSnapshot = history[history.length - 1] || {
    nlpCpu: 18,
    nlpMem: 240,
    redbirdCpu: 22,
    redbirdMem: 310,
    devopsCpu: 15,
    devopsMem: 195,
    dreamhouseCpu: 12,
    dreamhouseMem: 140,
    visionCpu: 8,
    visionMem: 260,
  };

  const avgCpu = Math.round(
    (currentSnapshot.nlpCpu +
      currentSnapshot.redbirdCpu +
      currentSnapshot.devopsCpu +
      currentSnapshot.dreamhouseCpu +
      currentSnapshot.visionCpu) / 5
  );

  const totalMem =
    currentSnapshot.nlpMem +
    currentSnapshot.redbirdMem +
    currentSnapshot.devopsMem +
    currentSnapshot.dreamhouseMem +
    currentSnapshot.visionMem;

  return (
    <div className="flex flex-col gap-2 bg-black/60 rounded-xl p-2.5 border border-purple-500/25 font-mono">
      {/* Metric Mode & Filter Bar */}
      <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMetricType('cpu')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
              metricType === 'cpu'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-2.5 h-2.5" />
            <span>CPU (%)</span>
          </button>
          <button
            onClick={() => setMetricType('mem')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
              metricType === 'mem'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-2.5 h-2.5" />
            <span>RAM (MB)</span>
          </button>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold">{avgCpu}% avg</span>
          </span>
          <span className="text-purple-300 font-bold">{totalMem} MB</span>
        </div>
      </div>

      {/* Real-time SVG Vector Graph */}
      <div className="relative w-full h-[115px] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {AGENTS.map((agent) => (
              <linearGradient
                key={agent.fillId}
                id={agent.fillId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={agent.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={agent.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines and Y labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + graphHeight * (1 - pct);
            const label = metricType === 'cpu' ? `${Math.round(pct * 100)}%` : `${Math.round(pct * maxY)}`;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="2,3"
                />
                <text
                  x={padding.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(148, 163, 184, 0.7)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Render Area & Line for each Agent */}
          {AGENTS.map((agent) => {
            const isVisible = selectedAgent === 'all' || selectedAgent === agent.shortName;
            if (!isVisible) return null;
            const key = metricType === 'cpu' ? agent.cpuKey : agent.memKey;
            const linePath = generatePath(key);
            const areaPath = generateArea(key);
            return (
              <g key={agent.id} className="transition-opacity duration-300">
                <path d={areaPath} fill={`url(#${agent.fillId})`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke={agent.stroke}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  opacity={selectedAgent === agent.shortName ? 1 : 0.85}
                />
              </g>
            );
          })}

          {/* Bottom Time Axis */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={width - padding.right}
            y2={padding.top + graphHeight}
            stroke="rgba(0, 240, 255, 0.3)"
          />
        </svg>

        <div className="absolute top-1 right-2 pointer-events-none flex items-center gap-1 text-[8px] text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
          <Activity className="w-2.5 h-2.5 animate-spin" />
          <span>REALTIME 1.5s</span>
        </div>
      </div>

      {/* Swarm Agents Mini Matrix with Live Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {AGENTS.map((agent) => {
          const cpuVal = Number(currentSnapshot[agent.cpuKey]) || 0;
          const memVal = Number(currentSnapshot[agent.memKey]) || 0;
          const isSelected = selectedAgent === agent.shortName;
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(selectedAgent === agent.shortName ? 'all' : agent.shortName)}
              className={`p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-black/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span className="flex items-center gap-1 truncate font-semibold" style={{ color: agent.color }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
                  <span className="truncate">{agent.shortName}</span>
                </span>
                <span className="text-[8px] text-slate-500 font-normal">
                  {metricType === 'cpu' ? `${cpuVal}%` : `${memVal}M`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, metricType === 'cpu' ? cpuVal : (memVal / maxY) * 100)}%`,
                    backgroundColor: agent.color,
                  }}
                />
              </div>
            </button>
          );
        })}

        {selectedAgent !== 'all' && (
          <button
            onClick={() => setSelectedAgent('all')}
            className="p-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-[9px] flex items-center justify-center gap-1 hover:bg-cyan-900/50 transition-all col-span-2 sm:col-span-1"
          >
            <span>Show All</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SwarmGraph;
