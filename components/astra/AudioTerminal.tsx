import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Volume2,
  Trash2,
  Camera,
  Loader2,
  FolderKanban,
  FileCode2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { AstraProject, ChatMessage, ConnectionState } from '../../src/types/astra';

interface AudioTerminalProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearTranscript: () => void;
  onPlaySpeech: (text: string, audioBase64?: string) => void;
  connectionState: ConnectionState;
  isProcessing: boolean;
  onCaptureFrameAsPrompt: () => void;
  isVisionActive: boolean;
  activeProject: AstraProject;
  onOpenProjectManager: () => void;
  onOpenWorkspaceFile?: (filename: string) => void;
}

function getProjectQuickPrompts(project: AstraProject): { label: string; prompt: string }[] {
  const cat = (project.category || '').toLowerCase();
  if (cat.includes('logistics') || cat.includes('trade')) {
    return [
      {
        label: 'Packing List Draft (Hamburg)',
        prompt: 'হামবুর্গের ১২,৫০০ পিস টি-শার্ট চালানের জন্য একটি সম্পূর্ণ প্যাকিং লিস্ট তৈরি করে ওয়ার্কস্পেসে সেভ করো।',
      },
      {
        label: 'L/C Compliance Audit',
        prompt: 'Review LC-984420-EUR terms and generate an export compliance checklist markdown file.',
      },
    ];
  }
  if (cat.includes('devops') || cat.includes('iot') || cat.includes('automation')) {
    return [
      {
        label: 'IoT Energy Telemetry Script',
        prompt: 'Write a Python telemetry watchdog script for Dream House solar inverter monitoring and update the workspace.',
      },
      {
        label: 'Zero-Downtime CI Pipeline',
        prompt: 'Update gitlab_vercel_deploy.yml with health-check smoke tests before production promotion.',
      },
    ];
  }
  return [
    {
      label: 'Create Architecture Spec',
      prompt: `'${project.name}' প্রজেক্টের জন্য একটি পরিপূর্ণ আর্কিটেকচার স্পেসিফিকেশন ডকুমেন্ট তৈরি করো।`,
    },
    {
      label: 'Generate Action Plan',
      prompt: `Draft a crisp milestone roadmap and technical checklist for ${project.name}.`,
    },
  ];
}

export const AudioTerminal: React.FC<AudioTerminalProps> = ({
  messages,
  onSendMessage,
  onClearTranscript,
  onPlaySpeech,
  isProcessing,
  onCaptureFrameAsPrompt,
  isVisionActive,
  activeProject,
  onOpenProjectManager,
  onOpenWorkspaceFile,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    setInput('');
    onSendMessage(trimmed);
  };

  const quickPrompts = getProjectQuickPrompts(activeProject);

  return (
    <div className="flex h-full flex-col bg-[#07090F]">
      {/* Active project strip */}
      <div className="flex items-center justify-between border-b border-[#1A2233] bg-[#090C14] px-4 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: activeProject.color }}
          />
          <span className="truncate font-semibold text-slate-100">{activeProject.name}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-[11px] text-slate-400 truncate">{activeProject.category}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenProjectManager}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E2738] bg-[#0B0E17] px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors"
          >
            <FolderKanban className="h-3.5 w-3.5 text-cyan-400" />
            <span>Projects</span>
          </button>
          <button
            type="button"
            onClick={onClearTranscript}
            className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[11px] text-slate-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            title="Clear active project transcript"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Transcript Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1E2738] bg-[#0B0E17] text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-sm font-bold text-white">
              {activeProject.name} Terminal Ready
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
              Ask Astra-Gravity in Bengali or English to draft export invoices, inspect shipments, write scripts, or generate files directly into your workspace.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="text-center font-mono text-[11px] text-slate-500 py-1 border-y border-[#1A2233]/50"
                >
                  {msg.content} · {msg.timestamp}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                    isUser
                      ? 'bg-[#11192B] border-cyan-500/30 text-slate-100'
                      : 'bg-[#0B0E17] border-[#1A2233] text-slate-200'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-6 text-[11px]">
                    <span className={`font-semibold ${isUser ? 'text-cyan-300' : 'text-amber-300'}`}>
                      {isUser ? 'You' : 'Astra-Gravity'}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">{msg.timestamp}</span>
                  </div>

                  {msg.imagePreview && (
                    <img
                      src={msg.imagePreview}
                      alt="Captured telemetry frame"
                      className="mb-2.5 max-h-48 rounded-lg border border-[#243047] object-contain"
                    />
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1A2233] pt-2.5">
                      {msg.toolCalls.map((tc, i) => (
                        <button
                          key={`${tc.filename}-${i}`}
                          type="button"
                          onClick={() => onOpenWorkspaceFile?.(tc.filename)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#111623] border border-cyan-500/30 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <FileCode2 className="h-3.5 w-3.5" />
                          <span>Updated {tc.filename}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {!isUser && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onPlaySpeech(msg.content, msg.audioBase64)}
                        className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Astra-Gravity is processing and updating workspace...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter Prompt Bar (shown when conversation is fresh) */}
      {messages.length <= 2 && !isProcessing && (
        <div className="border-t border-[#1A2233] bg-[#090C14]/80 px-4 py-2 flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <button
              key={qp.label}
              type="button"
              onClick={() => onSendMessage(qp.prompt)}
              className="rounded-lg border border-[#1E2738] bg-[#0B0E17] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 transition-colors cursor-pointer"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Prompt Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[#1A2233] bg-[#090C14] p-3 flex items-center gap-2"
      >
        {isVisionActive && (
          <button
            type="button"
            onClick={onCaptureFrameAsPrompt}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors"
            title="Analyze current screen/camera frame"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Scan Frame</span>
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার নির্দেশ লিখুন (বাংলা বা English)... যেমন: 'হামবুর্গের নতুন প্যাকিং লিস্ট তৈরি করো'"
          className="flex-1 rounded-xl border border-[#243047] bg-[#07090F] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
