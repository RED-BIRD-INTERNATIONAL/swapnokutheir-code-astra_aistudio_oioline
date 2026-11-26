import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { VaultAuthMode } from '../../src/services/vaultAuth';

interface VaultSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultToken: string;
  vaultMode: VaultAuthMode;
  vaultExpiresAt: number | null;
  onLockVault: () => void;
  onTokenRotated: (payload: { token: string; expiresAt: number; mode: VaultAuthMode }) => void;
  onSessionExpired: () => void;
}

export const VaultSecurityModal: React.FC<VaultSecurityModalProps> = ({
  isOpen,
  onClose,
  vaultToken,
  vaultMode,
  vaultExpiresAt,
  onLockVault,
  onTokenRotated,
  onSessionExpired,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const expiryText = vaultExpiresAt
    ? new Date(vaultExpiresAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Active Session';

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vaultToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401 && currentPassword.length === 0) {
        onSessionExpired();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'VAULT_UNAUTHORIZED') {
          onSessionExpired();
          return;
        }
        throw new Error(data.error || 'Failed to rotate master password');
      }

      onTokenRotated({
        token: data.token,
        expiresAt: data.expiresAt,
        mode: data.mode,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg('Studio master password rotated and session token refreshed.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#1E2738] bg-[#0B0E17] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A2233] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Studio Security Vault</h2>
              <p className="font-mono text-[11px] text-slate-400">
                Scrypt Verification · Memory Session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111623] hover:text-white transition-colors"
            aria-label="Close security modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Protection Mode
            </p>
            <p className="mt-1 text-xs font-semibold text-white">
              {vaultMode === 'env-configured' ? 'Environment Secret' : 'Claimed Passcode'}
            </p>
          </div>
          <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3">
            <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>Session Expires</span>
            </div>
            <p className="mt-1 font-mono text-xs font-semibold text-cyan-300 tabular-nums">
              {expiryText}
            </p>
          </div>
        </div>

        {vaultMode === 'claimed' ? (
          <form onSubmit={handleRotatePassword} className="mt-5 space-y-3 border-t border-[#1A2233] pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>Rotate Claimed Studio Password</span>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Confirm New</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#111623] border border-[#243047] hover:border-cyan-400/60 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Update Master Password</span>
            </button>
          </form>
        ) : (
          <div className="mt-4 rounded-xl border border-[#1A2233] bg-[#07090F] p-3.5 text-xs text-slate-400 leading-relaxed">
            Master password is managed centrally via server secret{' '}
            <span className="font-mono text-slate-200">ASTRA_MASTER_PASSWORD</span>. Update it in your environment secrets to rotate credentials.
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#1A2233] pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLockVault();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock & Revoke Session</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#243047] bg-[#111623] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultSecurityModal;
