import React from 'react';
import {
  Mic,
  MicOff,
  Monitor,
  Camera,
  Cpu,
  Radio,
  BarChart3,
  VideoOff,
} from 'lucide-react';
import { ConnectionState, SpeakerMode, SwarmMetricSnapshot } from '../../src/types/astra';

interface TelemetryPanelProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  isVisionActive: boolean;
  visionSource: 'screen' | 'camera';
  onToggleVision: (source: 'screen' | 'camera') => void;
  speakerMode: SpeakerMode;
  speakerText: string;
  swarmState: {
    nlp: 'standby' | 'online' | 'active';
    redbird: 'standby' | 'online' | 'active';
    devops: 'standby' | 'online' | 'active';
    dreamhouse: 'standby' | 'online' | 'active';
    vision: 'standby' | 'online' | 'active';
  };
  swarmHistory: SwarmMetricSnapshot[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  metrics: {
    audioChunksSent: number;
    visionFramesSent: number;
    latencyMs: number;
  };
  onOpenDailySummary: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  connectionState,
  onConnect,
  onDisconnect,
  isVisionActive,
  visionSource,
  onToggleVision,
  speakerMode,
  speakerText,
  swarmState,
  swarmHistory,
  videoRef,
  metrics,
  onOpenDailySummary,
}) => {
  const latest = swarmHistory[swarmHistory.length - 1];
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const agents = [
    { id: 'nlp', label: 'NLP Autonomous Core', status: swarmState.nlp, cpu: latest?.nlpCpu ?? 18 },
    { id: 'redbird', label: 'Red Bird Logistics', status: swarmState.redbird, cpu: latest?.redbirdCpu ?? 22 },
    { id: 'devops', label: 'DevOps CI/CD Agent', status: swarmState.devops, cpu: latest?.devopsCpu ?? 14 },
    { id: 'dreamhouse', label: 'Dream House IoT', status: swarmState.dreamhouse, cpu: latest?.dreamhouseCpu ?? 11 },
    { id: 'vision', label: 'Vision Telemetry', status: swarmState.vision, cpu: latest?.visionCpu ?? 9 },
  ];

  return (
    <div className="flex flex-col gap-3 text-slate-200">
      {/* Neural Audio Control */}
      <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span>Live Voice Uplink</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {metrics.latencyMs} ms
          </span>
        </div>

        <p className="mt-1.5 font-mono text-[11px] text-slate-400">{speakerText}</p>

        <div className="mt-2.5 flex gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <MicOff className="h-3.5 w-3.5" />
              <span>Disconnect Mic</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isConnecting}
              onClick={onConnect}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>{isConnecting ? 'Authorizing...' : 'Start Live Voice'}</span>
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
          <span>Mode: {speakerMode}</span>
          <span>Chunks: {metrics.audioChunksSent}</span>
        </div>
      </div>

      {/* Vision Feed */}
      <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Vision Telemetry</span>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            Frames: {metrics.visionFramesSent}
          </span>
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-[#1A2233] bg-black/70 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${isVisionActive ? 'block' : 'hidden'}`}
          />
          {!isVisionActive && (
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <VideoOff className="h-4 w-4" />
              <span className="text-[11px]">No active stream</span>
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onToggleVision('screen')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isVisionActive && visionSource === 'screen'
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                : 'border-[#1E2738] bg-[#0B0E17] text-slate-300 hover:bg-[#111623]'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Screen</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleVision('camera')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isVisionActive && visionSource === 'camera'
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                : 'border-[#1E2738] bg-[#0B0E17] text-slate-300 hover:bg-[#111623]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Camera</span>
          </button>
        </div>
      </div>

      {/* Swarm Health */}
      <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>Swarm Agents</span>
          </div>
          <button
            type="button"
            onClick={onOpenDailySummary}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-300 hover:text-amber-200"
          >
            <BarChart3 className="h-3 w-3" />
            <span>Report</span>
          </button>
        </div>

        <div className="mt-2.5 space-y-2">
          {agents.map((a) => (
            <div key={a.id} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate text-slate-300">{a.label}</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {a.status} · {a.cpu}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#111623]">
                <div
                  className={`h-full transition-all duration-300 ${
                    a.status === 'active'
                      ? 'bg-cyan-400'
                      : a.status === 'online'
                      ? 'bg-emerald-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, a.cpu)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
