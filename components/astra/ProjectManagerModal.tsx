import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  FolderKanban,
  Trash2,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';
import { AstraProject } from '../../src/types/astra';

export interface CreateProjectPayload {
  name: string;
  category: string;
  description: string;
  color: string;
  template: 'blank' | 'logistics' | 'software' | 'creative';
}

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: AstraProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (payload: CreateProjectPayload) => void;
  onUpdateProject: (id: string, updates: Partial<AstraProject>) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  initialCreateMode?: boolean;
}

const COLOR_OPTIONS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
  initialCreateMode = false,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(initialCreateMode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Operations');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [template, setTemplate] = useState<'blank' | 'logistics' | 'software' | 'creative'>('blank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowCreateForm(initialCreateMode);
    }
  }, [isOpen, initialCreateMode]);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({
      name: name.trim(),
      category: category.trim() || 'General',
      description: description.trim(),
      color,
      template,
    });
    setName('');
    setDescription('');
    setShowCreateForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FolderKanban className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Astra Project Workspaces</h2>
              <p className="text-xs text-slate-400">
                Create, rename, duplicate, or switch dedicated workspaces and chat histories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showCreateForm ? 'View All Projects' : 'New Project'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close manager"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showCreateForm ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Project Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Nordic Autumn Export 2026"
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Apparel, Music, DevOps, IoT"
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Purpose of this dedicated project workspace..."
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Starter Template</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as CreateProjectPayload['template'])}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="blank">Clean Workspace</option>
                    <option value="logistics">Export & Logistics Manifest</option>
                    <option value="software">Software & Cloud Architecture</option>
                    <option value="creative">Songwriting & Music Lyrics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Accent Color</label>
                  <div className="mt-2 flex items-center gap-2.5">
                    {COLOR_OPTIONS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`h-7 w-7 rounded-lg transition-transform ${
                          color === hex ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Select color ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Create & Switch Project
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const isEditing = editingId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                      isActive
                        ? 'border-cyan-500/60 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full max-w-xs rounded-lg border border-cyan-500 bg-slate-900 px-2.5 py-1 text-sm text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editName.trim()) {
                                onUpdateProject(proj.id, { name: editName.trim() });
                              }
                              setEditingId(null);
                            }}
                            className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 hover:bg-emerald-500/30"
                            aria-label="Save project name"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: proj.color }}
                          />
                          <h3 className="truncate text-sm font-bold text-white">{proj.name}</h3>
                          {isActive && (
                            <span className="text-[11px] font-semibold text-cyan-300">· Active</span>
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {proj.category} · {proj.fileCount} files · {proj.messageCount} messages
                      </p>
                      {proj.description && (
                        <p className="mt-1 truncate text-xs text-slate-500">{proj.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(proj.id);
                            onClose();
                          }}
                          className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          Open
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(proj.id);
                          setEditName(proj.name);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Rename project"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Duplicate project"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
