import crypto from 'node:crypto';
import type express from 'express';

export type VaultAuthMode = 'env-configured' | 'claimed' | 'setup-required';

interface SaltedPasswordRecord {
  salt: string;
  hashHex: string;
  sourceValue?: string;
}

interface SessionTokenPayload {
  jti: string;
  iat: number;
  exp: number;
  mode: VaultAuthMode;
}

interface AttemptRecord {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_LOGIN_FAILURES = 5;
const FAILURE_WINDOW_MS = 5 * 60 * 1000;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

const SESSION_SECRET =
  (process.env.ASTRA_SESSION_SECRET || '').trim() ||
  crypto.randomBytes(32).toString('hex');

let claimedRecord: SaltedPasswordRecord | null = null;
let envCachedRecord: SaltedPasswordRecord | null = null;

const revokedJtis = new Map<string, number>();
const loginAttempts = new Map<string, AttemptRecord>();

function deriveScryptHash(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
}

function createSaltedRecord(password: string, sourceValue?: string): SaltedPasswordRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashHex = deriveScryptHash(password, salt).toString('hex');
  return { salt, hashHex, sourceValue };
}

function verifyAgainstRecord(password: string, record: SaltedPasswordRecord): boolean {
  if (!password || typeof password !== 'string') return false;
  const candidate = deriveScryptHash(password, record.salt);
  const expected = Buffer.from(record.hashHex, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function getEnvMasterPassword(): string {
  return (process.env.ASTRA_MASTER_PASSWORD || '').trim();
}

function getActivePasswordRecord(): SaltedPasswordRecord | null {
  const envPass = getEnvMasterPassword();
  if (envPass.length > 0) {
    if (!envCachedRecord || envCachedRecord.sourceValue !== envPass) {
      envCachedRecord = createSaltedRecord(envPass, envPass);
    }
    return envCachedRecord;
  }
  return claimedRecord;
}

export function getVaultMode(): VaultAuthMode {
  if (getEnvMasterPassword().length > 0) {
    return 'env-configured';
  }
  if (claimedRecord !== null) {
    return 'claimed';
  }
  return 'setup-required';
}

export function isSetupAvailable(): boolean {
  return getVaultMode() === 'setup-required';
}

export function claimMasterPassword(password: string): { ok: true } | { ok: false; error: string; status: number } {
  if (getVaultMode() !== 'setup-required') {
    return { ok: false, error: 'Studio password has already been configured.', status: 409 };
  }
  const trimmed = typeof password === 'string' ? password : '';
  if (trimmed.length < 8 || trimmed.length > 128) {
    return {
      ok: false,
      error: 'Password must be between 8 and 128 characters.',
      status: 400,
    };
  }
  claimedRecord = createSaltedRecord(trimmed);
  return { ok: true };
}

export function rotateClaimedPassword(
  currentPassword: string,
  newPassword: string
): { ok: true } | { ok: false; error: string; status: number } {
  const mode = getVaultMode();
  if (mode === 'env-configured') {
    return {
      ok: false,
      error: 'Master password is managed by server environment configuration (ASTRA_MASTER_PASSWORD).',
      status: 403,
    };
  }
  if (mode !== 'claimed' || !claimedRecord) {
    return { ok: false, error: 'Studio password is not claimed yet.', status: 400 };
  }
  if (!verifyAgainstRecord(currentPassword, claimedRecord)) {
    return { ok: false, error: 'Current password is incorrect.', status: 401 };
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return {
      ok: false,
      error: 'New password must be between 8 and 128 characters.',
      status: 400,
    };
  }
  claimedRecord = createSaltedRecord(newPassword);
  return { ok: true };
}

export function checkLoginRateLimit(ip: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec) return { allowed: true };

  if (rec.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((rec.lockedUntil - now) / 1000)),
    };
  }

  if (now - rec.windowStart > FAILURE_WINDOW_MS) {
    loginAttempts.delete(ip);
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): { locked: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = loginAttempts.get(ip);
  if (!existing || now - existing.windowStart > FAILURE_WINDOW_MS) {
    loginAttempts.set(ip, { failures: 1, windowStart: now, lockedUntil: 0 });
    return { locked: false, remainingAttempts: MAX_LOGIN_FAILURES - 1 };
  }

  existing.failures += 1;
  if (existing.failures >= MAX_LOGIN_FAILURES) {
    existing.lockedUntil = now + LOCKOUT_DURATION_MS;
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  return { locked: false, remainingAttempts: MAX_LOGIN_FAILURES - existing.failures };
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

export function verifyMasterPassword(password: string): boolean {
  const record = getActivePasswordRecord();
  if (!record) return false;
  return verifyAgainstRecord(password, record);
}

function pruneRevokedTokens(): void {
  const now = Date.now();
  for (const [jti, exp] of revokedJtis.entries()) {
    if (exp <= now) {
      revokedJtis.delete(jti);
    }
  }
}

export function issueSessionToken(): { token: string; expiresAt: number; mode: VaultAuthMode } {
  pruneRevokedTokens();
  const now = Date.now();
  const mode = getVaultMode();
  const payload: SessionTokenPayload = {
    jti: crypto.randomBytes(16).toString('hex'),
    iat: now,
    exp: now + SESSION_TTL_MS,
    mode,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${sigB64}`,
    expiresAt: payload.exp,
    mode,
  };
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const actualBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (!parsed || typeof parsed.jti !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp <= Date.now()) {
      return null;
    }
    if (revokedJtis.has(parsed.jti)) {
      return null;
    }
    // If setup-required (e.g. server reset before env configured), invalidate stale tokens
    if (getVaultMode() === 'setup-required') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string): void {
  const payload = verifySessionToken(token);
  if (payload) {
    revokedJtis.set(payload.jti, payload.exp);
  }
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function requireVaultAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    res.status(401).json({
      error: 'Authentication required. Please unlock Astra Studio with your password.',
      code: 'VAULT_UNAUTHORIZED',
    });
    return;
  }
  (req as express.Request & { vaultSession?: SessionTokenPayload }).vaultSession = payload;
  next();
}
