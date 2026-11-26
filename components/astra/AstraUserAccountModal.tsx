import React, { useState, useEffect } from 'react';
import { User, sendEmailVerification, updateProfile } from 'firebase/auth';
import {
  X,
  User as UserIcon,
  Mail,
  Building2,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FolderKanban,
  Music,
} from 'lucide-react';
import { AstraUserProfile } from '../../src/types/astra';
import { syncUserProfileToFirestore } from '../../src/services/astraFirestoreSync';

interface AstraUserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: AstraUserProfile | null;
  projectCount: number;
  musicTrackCount: number;
  onProfileUpdated: (profile: AstraUserProfile) => void;
  onLogout: () => void;
}

export const AstraUserAccountModal: React.FC<AstraUserAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  projectCount,
  musicTrackCount,
  onProfileUpdated,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile?.displayName || user?.displayName || '');
      setOrganization(profile?.organization || '');
      setStatusMsg(null);
    }
  }, [isOpen, profile, user]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const cleanName = displayName.trim() || 'Astra User';
      await updateProfile(user, { displayName: cleanName });
      const updated = await syncUserProfileToFirestore(user, {
        displayName: cleanName,
        organization: organization.trim(),
      });
      onProfileUpdated(updated);
      setStatusMsg('Profile saved to Cloud Firestore.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendEmailVerification(user);
      setStatusMsg('Verification email sent. Check your inbox.');
    } catch {
      setStatusMsg('Verification email was sent recently. Please check your inbox.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
              <UserIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Account & Cloud Sync</h2>
              <p className="text-xs text-slate-400">Manage profile and workspace ownership</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close account modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <FolderKanban className="h-3.5 w-3.5 text-cyan-400" />
              <span>Projects</span>
            </div>
            <p className="mt-1 text-lg font-bold text-white tabular-nums">{projectCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Music className="h-3.5 w-3.5 text-amber-400" />
              <span>Music Tracks</span>
            </div>
            <p className="mt-1 text-lg font-bold text-white tabular-nums">{musicTrackCount}</p>
          </div>
        </div>

        {!user.emailVerified && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Email not verified yet</span>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              className="shrink-0 font-semibold text-amber-300 underline hover:text-amber-200"
            >
              Resend
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
              {user.emailVerified && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Organization</label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {statusMsg && (
            <p className="text-xs text-cyan-300">{statusMsg}</p>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
