import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { AdminPortal } from './components/AdminPortal';
import { VaultLockScreen } from './components/astra/VaultLockScreen';
import type { VaultAuthMode } from './src/services/vaultAuth';

const ProtectedAdminEntry: React.FC = () => {
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [vaultMode, setVaultMode] = useState<VaultAuthMode>('claimed');
  const [vaultExpiresAt, setVaultExpiresAt] = useState<number | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const handleUnlocked = useCallback(
    (payload: { token: string; expiresAt: number; mode: VaultAuthMode }) => {
      setVaultToken(payload.token);
      setVaultMode(payload.mode);
      setVaultExpiresAt(payload.expiresAt);
      setSessionNotice(null);
    },
    []
  );

  const handleLockVault = useCallback(async () => {
    const activeToken = vaultToken;
    setVaultToken(null);
    setVaultExpiresAt(null);
    setSessionNotice('Portal locked. Enter your master password to resume.');
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch {
        // ignore network error
      }
    }
  }, [vaultToken]);

  const handleSessionExpired = useCallback(() => {
    setVaultToken(null);
    setVaultExpiresAt(null);
    setSessionNotice('Your studio session expired. Please unlock again.');
  }, []);

  if (!vaultToken) {
    return (
      <VaultLockScreen
        onUnlocked={handleUnlocked}
        sessionNotice={sessionNotice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-slate-100">
      <AdminPortal
        vaultToken={vaultToken}
        vaultMode={vaultMode}
        vaultExpiresAt={vaultExpiresAt}
        onLockVault={handleLockVault}
        onTokenRotated={handleUnlocked}
        onSessionExpired={handleSessionExpired}
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ProtectedAdminEntry />
  </React.StrictMode>
);
