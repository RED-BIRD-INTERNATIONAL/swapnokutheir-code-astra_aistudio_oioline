import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Settings2, Check } from 'lucide-react';
import { AstraProject } from '../../src/types/astra';

interface ProjectSelectorProps {
  projects: AstraProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenProjectManager: () => void;
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenProjectManager,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const active = projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:border-cyan-400/60 transition-colors cursor-pointer"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: active?.color || '#22D3EE' }}
          />
          <span className="truncate font-semibold text-white">
            {active?.name || 'Select Project'}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-[#243047] bg-[#0B0E17] p-1.5 shadow-2xl">
          <div className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Active Workspaces ({projects.length})
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {projects.map((proj) => {
              const isSelected = proj.id === activeProjectId;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(proj.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#111623] text-white border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-[#111623] hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: proj.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{proj.name}</p>
                      <p className="truncate text-[11px] font-mono text-slate-400 tabular-nums">
                        {proj.category} · {proj.fileCount} files
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-[#1A2233] pt-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenNewProjectModal();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/15 px-2.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenProjectManager();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#111623] px-2.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Manage All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
