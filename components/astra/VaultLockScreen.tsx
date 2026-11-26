import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  Infinity as InfinityIcon,
  AudioLines,
  FolderGit2,
  Cpu,
} from 'lucide-react';
import type { VaultAuthMode } from '../../src/services/vaultAuth';

interface VaultLockScreenProps {
  onUnlocked: (payload: { token: string; expiresAt: number; mode: VaultAuthMode }) => void;
  sessionNotice?: string | null;
}

function evaluatePasswordStrength(pw: string): { label: string; score: number; barColor: string } {
  if (!pw) return { label: 'Enter at least 8 characters', score: 0, barColor: 'bg-slate-700' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { label: 'Weak · Add length or symbols', score: 25, barColor: 'bg-red-400' };
  if (score === 2) return { label: 'Fair · Good baseline', score: 50, barColor: 'bg-amber-400' };
  if (score === 3) return { label: 'Strong · Studio grade', score: 75, barColor: 'bg-cyan-400' };
  return { label: 'Maximum · Vault hardened', score: 100, barColor: 'bg-emerald-400' };
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  onUnlocked,
  sessionNotice,
}) => {
  const [vaultMode, setVaultMode] = useState<VaultAuthMode | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchVaultStatus = async () => {
    setStatusError(null);
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reach security vault');
      setVaultMode(data.mode as VaultAuthMode);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Connection error checking vault status');
    }
  };

  useEffect(() => {
    fetchVaultStatus();
  }, []);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          await fetchVaultStatus();
        }
        throw new Error(data.error || 'Failed to claim studio password');
      }
      setPassword('');
      setConfirmPassword('');
      onUnlocked({
        token: data.token,
        expiresAt: data.expiresAt,
        mode: data.mode,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to configure studio password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!password) {
      setFormError('Enter your studio master password to unlock.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'SETUP_REQUIRED') {
          setVaultMode('setup-required');
        }
        throw new Error(data.error || 'Authentication failed');
      }
      setPassword('');
      onUnlocked({
        token: data.token,
        expiresAt: data.expiresAt,
        mode: data.mode,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid studio password');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = evaluatePasswordStrength(password);
  const isSetup = vaultMode === 'setup-required';

  return (
    <div className="min-h-screen bg-[#07090F] text-slate-100 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Subtle architectural grid lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl border border-[#1A2233] bg-[#0B0E17] rounded-2xl overflow-hidden shadow-2xl grid lg:grid-cols-12">
        {/* Left Studio Architecture Overview */}
        <div className="lg:col-span-5 bg-[#090C14] border-b lg:border-b-0 lg:border-r border-[#1A2233] p-7 sm:p-9 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <InfinityIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold tracking-tight text-white">
                  Astra-Gravity Studio
                </h1>
                <p className="font-mono text-[11px] text-slate-400">
                  Red Bird International · Command Center
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="font-mono text-[11px] uppercase tracking-widest text-amber-400">
                Protected Studio Entry
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white leading-snug">
                Central AI Engineering, Voice & Music Mastering Vault
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                সমস্ত প্রজেক্ট, অটোনমাস কোড ওয়ার্কস্পেস, লাইভ ভয়েস আপলিঙ্ক এবং মিউজিক ল্যাব এখন মাস্টার পাসওয়ার্ড দ্বারা সুরক্ষিত।
              </p>
            </div>

            <div className="mt-8 space-y-4 border-t border-[#1A2233] pt-6 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                <div>
                  <p className="font-semibold text-white">Live Neural Terminal & Vision</p>
                  <p className="mt-0.5 text-slate-400">
                    Bilingual Bengali & English voice console with screen telemetry.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AudioLines className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-white">AI Music & Lyrics Mastering Lab</p>
                  <p className="mt-0.5 text-slate-400">
                    4-stem real-time synthesis, Bengali/English lyrics sheet, and WAV export.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FolderGit2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Versioned Project Workspaces</p>
                  <p className="mt-0.5 text-slate-400">
                    Isolated logistics manifests, DevOps pipelines, and IoT blueprints.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[#1A2233] pt-4 flex items-center justify-between font-mono text-[11px] text-slate-500">
            <span>Scrypt KDF · HMAC-SHA256</span>
            <span>Session Memory Vault</span>
          </div>
        </div>

        {/* Right Access Console */}
        <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-center bg-[#0B0E17]">
          {vaultMode === null && !statusError ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <p className="mt-3 font-mono text-xs">Verifying server security vault...</p>
            </div>
          ) : statusError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span>Vault Connection Error</span>
              </div>
              <p className="text-xs text-red-200/80">{statusError}</p>
              <button
                type="button"
                onClick={fetchVaultStatus}
                className="rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500/30 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="max-w-md w-full mx-auto">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#243047] bg-[#111623] text-cyan-400">
                  {isSetup ? <KeyRound className="h-5 w-5 text-amber-400" /> : <Lock className="h-5 w-5 text-cyan-400" />}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    {isSetup ? 'Claim Master Password' : 'Unlock Astra Studio'}
                  </h2>
                  <p className="font-mono text-[11px] text-slate-400">
                    {isSetup
                      ? 'First-run security setup · Minimum 8 characters'
                      : vaultMode === 'env-configured'
                      ? 'Server Secret Configured · Enter Master Password'
                      : 'Session Passcode Active · Enter Password'}
                  </p>
                </div>
              </div>

              {sessionNotice && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{sessionNotice}</span>
                </div>
              )}

              {formError && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={isSetup ? handleSetupSubmit : handleLoginSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="vault-password" className="block text-xs font-medium text-slate-300">
                    {isSetup ? 'Create Studio Master Password' : 'Master Password'}
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="vault-password"
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      minLength={isSetup ? 8 : 1}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSetup ? 'At least 8 characters' : 'Enter studio password'}
                      className="w-full rounded-xl border border-[#243047] bg-[#07090F] py-3 pl-4 pr-11 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {isSetup && (
                    <div className="mt-2.5 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#111623]">
                        <div
                          className={`h-full transition-all duration-300 ${strength.barColor}`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                      <p className="font-mono text-[11px] text-slate-400">{strength.label}</p>
                    </div>
                  )}
                </div>

                {isSetup && (
                  <div>
                    <label htmlFor="vault-confirm-password" className="block text-xs font-medium text-slate-300">
                      Confirm Master Password
                    </label>
                    <input
                      id="vault-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter master password"
                      className="mt-1.5 w-full rounded-xl border border-[#243047] bg-[#07090F] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold py-3 text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>{isSetup ? 'Set Password & Enter Studio' : 'Unlock Astra Studio'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-xl border border-[#1A2233] bg-[#07090F]/80 p-3.5 text-[11px] text-slate-400 leading-relaxed">
                {isSetup ? (
                  <span>
                    এটি প্রথমবার চালানোর নিরাপত্তা সেটআপ। আপনার পাসওয়ার্ডটি এনক্রিপ্টেড (Scrypt Hash) অবস্থায় সার্ভার মেমোরিতে থাকবে এবং সব API ও লাইভ ওয়েবসকেট চ্যানেল প্রটেক্ট করবে। স্থায়ী পাসওয়ার্ডের জন্য <span className="font-mono text-slate-200">ASTRA_MASTER_PASSWORD</span> এনভায়রনমেন্ট ভেরিয়েবল ব্যবহার করতে পারেন।
                  </span>
                ) : (
                  <span>
                    Protection active across AI terminal, live voice uplink, music studio, and operations console. After 5 incorrect attempts, access pauses temporarily to prevent brute-force guessing.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultLockScreen;
