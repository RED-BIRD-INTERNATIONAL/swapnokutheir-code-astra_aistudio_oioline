import React from 'react';
import { X, Cpu, HardDrive, Activity } from 'lucide-react';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NODE_SUMMARY = [
  { name: 'NLP Autonomous Router', avgCpu: 22, peakCpu: 78, memMb: 245, tasks24h: 142 },
  { name: 'Red Bird Trade Engine', avgCpu: 28, peakCpu: 84, memMb: 340, tasks24h: 89 },
  { name: 'DevOps Swarm Agent', avgCpu: 16, peakCpu: 71, memMb: 195, tasks24h: 54 },
  { name: 'Dream House IoT Node', avgCpu: 12, peakCpu: 60, memMb: 142, tasks24h: 310 },
  { name: 'Vision Frame Analyzer', avgCpu: 14, peakCpu: 68, memMb: 265, tasks24h: 37 },
];

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">24-Hour Swarm Performance Summary</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Compute utilization, memory footprint, and task throughput across active agents
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close summary modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Fleet Avg Load</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-white tabular-nums">18.4%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span>Total Memory</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-white tabular-nums">1,187 MB</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Completed Tasks</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-white tabular-nums">632</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Agent Module</th>
                <th className="px-4 py-2.5 text-right font-semibold">Avg CPU</th>
                <th className="px-4 py-2.5 text-right font-semibold">Peak CPU</th>
                <th className="px-4 py-2.5 text-right font-semibold">Memory</th>
                <th className="px-4 py-2.5 text-right font-semibold">24h Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {NODE_SUMMARY.map((node) => (
                <tr key={node.name} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-medium text-slate-200">{node.name}</td>
                  <td className="px-4 py-2.5 text-right text-cyan-300 tabular-nums">{node.avgCpu}%</td>
                  <td className="px-4 py-2.5 text-right text-amber-300 tabular-nums">{node.peakCpu}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{node.memMb} MB</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-300 tabular-nums">{node.tasks24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
