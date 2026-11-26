import React from 'react';
import { X, Cpu, ShieldCheck, Music, FolderKanban } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Astra-Gravity Workspace Architecture</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Multimodal AI, Cloud Project Persistence & Music Studio
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white">Account-Isolated Cloud Sync</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Every workspace project, generated file, conversation transcript, and saved song is stored privately under your authenticated account in Cloud Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <FolderKanban className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <h3 className="font-semibold text-white">Dedicated Project Contexts</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Create, duplicate, or switch between independent workspaces for apparel export invoices, IoT controllers, DevOps pipelines, or creative songwriting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <Music className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h3 className="font-semibold text-white">Music Studio & Lyrics Arranger</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Describe any mood, genre, BPM, and language (Bengali or English) to compose a multi-track playable score with live 4-stem mixing, arranged lyrics, and instant WAV export.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <h3 className="font-semibold text-white">Live Audio & Vision Uplink</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Connect your microphone or screen/camera stream for low-latency bilingual voice collaboration and automatic workspace updates.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
