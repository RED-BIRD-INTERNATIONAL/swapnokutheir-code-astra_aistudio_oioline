import React, { useState, useEffect } from 'react';
import {
  FileText,
  History,
  Copy,
  Check,
  Download,
  RotateCcw,
  Save,
  FolderKanban,
  Pencil,
  Eye,
} from 'lucide-react';
import { AstraProject, FileVersion, WorkspaceFileUpdate } from '../../src/types/astra';

interface AutonomousWorkspaceProps {
  files: WorkspaceFileUpdate[];
  activeFileIndex: number;
  onSelectFile: (idx: number) => void;
  onRevertFileVersion: (fileIndex: number, version: FileVersion) => void;
  onSaveNewVersion: (fileIndex: number, summary: string) => void;
  onUpdateFileContent?: (fileIndex: number, newContent: string) => void;
  activeProject: AstraProject;
  onOpenProjectManager: () => void;
}

export const AutonomousWorkspace: React.FC<AutonomousWorkspaceProps> = ({
  files,
  activeFileIndex,
  onSelectFile,
  onRevertFileVersion,
  onSaveNewVersion,
  onUpdateFileContent,
  activeProject,
  onOpenProjectManager,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [snapshotNote, setSnapshotNote] = useState('');

  const safeIndex = activeFileIndex >= 0 && activeFileIndex < files.length ? activeFileIndex : 0;
  const activeFile = files[safeIndex];

  useEffect(() => {
    setDraftContent(activeFile?.content || '');
    setIsEditing(false);
  }, [safeIndex, activeFile?.filename, activeFile?.content]);

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(isEditing ? draftContent : activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([isEditing ? draftContent : activeFile.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveInlineEdit = () => {
    if (!activeFile || !onUpdateFileContent) return;
    onUpdateFileContent(safeIndex, draftContent);
    setIsEditing(false);
  };

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400 bg-[#07090F]">
        <FileText className="h-10 w-10 text-slate-600" />
        <h3 className="mt-3 font-display text-sm font-semibold text-white">Workspace Empty</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-400">
          Ask Astra-Gravity in the terminal or save lyrics from Music Lab to populate {activeProject.name}.
        </p>
      </div>
    );
  }

  const displayedContent = isEditing ? draftContent : activeFile?.content || '';

  return (
    <div className="flex h-full flex-col bg-[#07090F]">
      {/* File Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2233] bg-[#090C14] px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {files.map((file, idx) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => onSelectFile(idx)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                idx === safeIndex
                  ? 'border-cyan-500/40 bg-[#111623] text-cyan-200'
                  : 'border-transparent text-slate-400 hover:bg-[#0B0E17] hover:text-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{file.filename}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onUpdateFileContent && (
            isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveInlineEdit}
                  className="flex items-center gap-1 rounded-lg bg-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftContent(activeFile?.content || '');
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-[#1E2738] px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 rounded-lg border border-[#1E2738] bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-300 hover:border-amber-400/50 hover:text-amber-300 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showHistory
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                : 'border-transparent text-slate-400 hover:bg-[#111623] hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="tabular-nums">History ({activeFile?.versions?.length || 1})</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-[#111623] hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-[#111623] hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={onOpenProjectManager}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111623] hover:text-cyan-300 transition-colors"
            title="Manage projects"
          >
            <FolderKanban className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content + Optional Version History Drawer */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-auto p-4">
          <div className="mb-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {activeProject.name} / {activeFile?.filename} ({activeFile?.language})
            </span>
            <span className="tabular-nums">
              {displayedContent.split('\n').length} lines · {displayedContent.length} chars
            </span>
          </div>

          {isEditing ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              spellCheck={false}
              className="flex-1 min-h-[420px] w-full resize-none rounded-xl border border-cyan-500/40 bg-[#0B0E17] p-4 font-mono text-xs leading-relaxed text-slate-100 focus:outline-none"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4 font-mono text-xs leading-relaxed text-slate-200">
              {activeFile?.content}
            </pre>
          )}
        </div>

        {showHistory && activeFile && (
          <div className="w-72 shrink-0 border-l border-[#1A2233] bg-[#090C14] p-3.5 overflow-y-auto">
            <h4 className="font-display text-xs font-bold text-white">Version Snapshots</h4>
            <div className="mt-2.5 flex gap-1.5">
              <input
                type="text"
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="Checkpoint note..."
                className="flex-1 rounded-lg border border-[#243047] bg-[#07090F] px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  onSaveNewVersion(safeIndex, snapshotNote || 'Manual checkpoint');
                  setSnapshotNote('');
                }}
                className="rounded-lg bg-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
                title="Save manual snapshot"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {(activeFile.versions || []).map((ver) => (
                <div
                  key={ver.id}
                  className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-300 tabular-nums">
                      v{ver.versionNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">{ver.relativeTime}</span>
                  </div>
                  <p className="mt-1 text-slate-300 leading-snug">{ver.summary}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{ver.author}</span>
                    <button
                      type="button"
                      onClick={() => onRevertFileVersion(safeIndex, ver)}
                      className="flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
