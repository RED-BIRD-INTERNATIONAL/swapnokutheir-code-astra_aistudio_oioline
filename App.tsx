import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Navbar, AppRoute } from './components/Navbar';
import { HomeShowcase } from './components/HomeShowcase';
import { VaultLockScreen } from './components/astra/VaultLockScreen';
import type { VaultAuthMode } from './src/services/vaultAuth';

const AdminPortal = lazy(() =>
  import('./components/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);
const AstraLiveAgentModule = lazy(() =>
  import('./components/AstraLiveAgentModule').then((m) => ({ default: m.AstraLiveAgentModule }))
);

function resolveRouteFromHash(): AppRoute {
  const hash = (window.location.hash || '').toLowerCase();
  if (hash === '#music') return 'music';
  if (hash === '#admin') return 'admin';
  if (hash === '#home') return 'home';
  if (hash === '#studio' || hash === '#astra' || hash === '#astra-gravity') return 'studio';
  return 'studio';
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRouteFromHash());

  // Session token kept strictly in React memory (never persisted to localStorage/sessionStorage)
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [vaultMode, setVaultMode] = useState<VaultAuthMode>('claimed');
  const [vaultExpiresAt, setVaultExpiresAt] = useState<number | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(resolveRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = useCallback((target: AppRoute) => {
    window.location.hash = `#${target}`;
    setRoute(target);
  }, []);

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
    setSessionNotice('Studio locked. Enter your master password to resume.');
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch {
        // Ignore network errors on explicit lock
      }
    }
  }, [vaultToken]);

  const handleSessionExpired = useCallback(() => {
    setVaultToken(null);
    setVaultExpiresAt(null);
    setSessionNotice('Your studio security session expired or was revoked. Please unlock again.');
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
    <div className="min-h-screen bg-[#07090F] text-slate-100 flex flex-col">
      <Navbar
        currentRoute={route}
        onNavigate={handleNavigate}
        onLockVault={handleLockVault}
      />

      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex min-h-[65vh] items-center justify-center font-mono text-xs text-slate-400">
              Loading Studio Module...
            </div>
          }
        >
          {(route === 'studio' || route === 'music') && (
            <div className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-3 sm:px-5 sm:py-4">
              <AstraLiveAgentModule
                vaultToken={vaultToken}
                vaultMode={vaultMode}
                vaultExpiresAt={vaultExpiresAt}
                onLockVault={handleLockVault}
                onTokenRotated={handleUnlocked}
                onSessionExpired={handleSessionExpired}
                initialTab={route === 'music' ? 'music' : 'terminal'}
              />
            </div>
          )}
          {route === 'admin' && (
            <AdminPortal
              vaultToken={vaultToken}
              vaultMode={vaultMode}
              vaultExpiresAt={vaultExpiresAt}
              onLockVault={handleLockVault}
              onTokenRotated={handleUnlocked}
              onSessionExpired={handleSessionExpired}
            />
          )}
          {route === 'home' && <HomeShowcase onNavigate={handleNavigate} />}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
