import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  Bot,
  Context,
  InputFile,
  nodeFrameworkWebhook,
  type Message,
  type NodeLikeRequest,
  type NodeLikeResponse,
  type Update,
} from 'node-telegram-bot-api';
import {
  runAstraGravityCore,
  type AstraCoreAttachment,
  type AstraCoreHistoryItem,
  type AstraCoreInput,
  type AstraCoreResult,
} from './astraCore.ts';

export interface TelegramSenderIdentity {
  senderId: number;
  chatId: number;
  chatType: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  languageCode?: string;
  isAuthorized: boolean;
}

export interface TelegramFilePayload {
  kind: 'document' | 'photo' | 'audio' | 'voice' | 'video';
  fileId: string;
  filename: string;
  mimeType: string;
  fileSize?: number;
  inlineAttachment?: AstraCoreAttachment;
  extractedText?: string;
}

export type AstraCoreRouterFn = (input: AstraCoreInput) => Promise<AstraCoreResult>;

export interface TelegramBotConfig {
  token?: string;
  webhookSecret?: string;
  allowedUserIds?: number[];
  astraCoreHandler?: AstraCoreRouterFn;
  fastAck?: boolean;
  workspaceRoot?: string;
}

export interface WorkspaceArtifact {
  filename: string;
  content: string;
  updatedAt: string;
}

export interface SenderSession {
  language: 'bn' | 'en';
  history: AstraCoreHistoryItem[];
  workspaceFiles: Map<string, WorkspaceArtifact>;
  lastActiveAt: number;
}

export interface AgentRuntimeState {
  status: 'standby' | 'awake';
  wakeCount: number;
  lastWakeAt: string | null;
  lastWokenBy: string | null;
  lastTaskSummary: string | null;
}

export interface TelegramCommandExecutionContext {
  bot: Bot;
  token: string;
  ctx: Context;
  sender: TelegramSenderIdentity;
  session: SenderSession;
  rawText: string;
  matchedTrigger: string;
  args: string;
  coreHandler: AstraCoreRouterFn;
  agentState: AgentRuntimeState;
  workspaceRoot: string;
}

export interface TelegramCommandDefinition {
  id: string;
  triggers: string[];
  description: string;
  usage?: string;
  matchMode?: 'exact_or_args' | 'prefix';
  handler: (cmdCtx: TelegramCommandExecutionContext) => Promise<void>;
}

export interface TelegramCommandMatch {
  command: TelegramCommandDefinition;
  matchedTrigger: string;
  args: string;
}

const MAX_TELEGRAM_FILE_BYTES = 10 * 1024 * 1024; // 10 MB guard
const TELEGRAM_MESSAGE_CHUNK_SIZE = 3900;
const UPDATE_DEDUPE_TTL_MS = 5 * 60 * 1000;

const BLOCKED_PATH_SEGMENTS = new Set(['node_modules', '.git', '.next']);
const BLOCKED_FILE_PATTERNS = [
  /^\.env(\.(?!example$).*)?$/i,
  /\.(pem|key|p12|pfx|crt)$/i,
  /firebase-adminsdk/i,
  /credentials\.json$/i,
  /\.secret$/i,
];

const senderSessions = new Map<number, SenderSession>();
const seenUpdates = new Map<number, number>();
const agentRuntimeState: AgentRuntimeState = {
  status: 'standby',
  wakeCount: 0,
  lastWakeAt: null,
  lastWokenBy: null,
  lastTaskSummary: null,
};

let activeBot: Bot | null = null;
let activeToken: string | null = null;
let activeWebhookHandler: ((req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void>) | null = null;
let activeCoreHandler: AstraCoreRouterFn = runAstraGravityCore;
let configuredAllowlist: number[] | null = null;
let configuredWorkspaceRoot: string = path.resolve(process.cwd());

function parseAllowedUserIds(raw?: string): number[] | null {
  if (!raw || !raw.trim()) return null;
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : null;
}

function getOrCreateSession(senderId: number, languageCode?: string): SenderSession {
  const existing = senderSessions.get(senderId);
  if (existing) {
    existing.lastActiveAt = Date.now();
    return existing;
  }
  const initialLang: 'bn' | 'en' = languageCode?.startsWith('en') ? 'en' : 'bn';
  const created: SenderSession = {
    language: initialLang,
    history: [],
    workspaceFiles: new Map(),
    lastActiveAt: Date.now(),
  };
  senderSessions.set(senderId, created);
  return created;
}

function isDuplicateUpdate(updateId: number): boolean {
  const now = Date.now();
  for (const [id, seenAt] of seenUpdates.entries()) {
    if (now - seenAt > UPDATE_DEDUPE_TTL_MS) {
      seenUpdates.delete(id);
    }
  }
  if (seenUpdates.has(updateId)) {
    return true;
  }
  seenUpdates.set(updateId, now);
  return false;
}

export function identifyTelegramSender(
  ctxOrMessage: Context | Message,
  allowlist: number[] | null = configuredAllowlist
): TelegramSenderIdentity | null {
  const from = 'update' in ctxOrMessage ? ctxOrMessage.from : ctxOrMessage.from;
  const chat = 'update' in ctxOrMessage ? ctxOrMessage.chat : ctxOrMessage.chat;

  if (!from || !chat) return null;

  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ').trim();
  const displayName =
    fullName || (from.username ? `@${from.username}` : `TelegramUser-${from.id}`);

  const isAuthorized =
    !allowlist || allowlist.length === 0 || allowlist.includes(from.id);

  return {
    senderId: from.id,
    chatId: chat.id,
    chatType: chat.type,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    displayName,
    languageCode: from.language_code,
    isAuthorized,
  };
}

function splitTelegramReply(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= TELEGRAM_MESSAGE_CHUNK_SIZE) {
    return [trimmed];
  }
  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MESSAGE_CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf('\n', TELEGRAM_MESSAGE_CHUNK_SIZE);
    if (cut < TELEGRAM_MESSAGE_CHUNK_SIZE * 0.5) {
      cut = TELEGRAM_MESSAGE_CHUNK_SIZE;
    }
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return chunks;
}

function isTextLikeMime(mimeType: string, filename: string): boolean {
  if (mimeType.startsWith('text/')) return true;
  if (mimeType === 'application/json' || mimeType === 'application/xml') return true;
  return /\.(txt|md|csv|json|ts|tsx|js|jsx|py|yaml|yml|xml|log|sql|env|example)$/i.test(filename);
}

function isGeminiBinaryMime(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf'
  );
}

function normalizeTrigger(trigger: string): string {
  return trigger.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeIncomingTextForMatch(rawText: string): { normalized: string; originalTrimmed: string } {
  const originalTrimmed = rawText.trim();
  if (!originalTrimmed) {
    return { normalized: '', originalTrimmed: '' };
  }

  // Strip @bot_username from leading slash commands (e.g. /status@my_bot -> /status)
  let cleaned = originalTrimmed;
  if (cleaned.startsWith('/')) {
    const firstSpace = cleaned.search(/\s/);
    const head = firstSpace === -1 ? cleaned : cleaned.slice(0, firstSpace);
    const tail = firstSpace === -1 ? '' : cleaned.slice(firstSpace);
    const strippedHead = head.replace(/@[A-Za-z0-9_]+$/, '');
    cleaned = strippedHead + tail;
  }

  return {
    normalized: cleaned.toLowerCase().replace(/\s+/g, ' '),
    originalTrimmed: cleaned,
  };
}

function extractTriggerAndArgs(
  rawText: string,
  trigger: string
): { matched: boolean; args: string } {
  const { normalized, originalTrimmed } = normalizeIncomingTextForMatch(rawText);
  const normTrigger = normalizeTrigger(trigger);

  if (!normalized || !normTrigger) {
    return { matched: false, args: '' };
  }

  if (normalized === normTrigger) {
    return { matched: true, args: '' };
  }

  const startsWithTriggerSpace =
    normalized.startsWith(`${normTrigger} `) || normalized.startsWith(`${normTrigger}:`);
  if (!startsWithTriggerSpace) {
    return { matched: false, args: '' };
  }

  // Locate trigger boundary in originalTrimmed preserving argument casing/paths
  const triggerTokens = normTrigger.split(' ');
  const pattern = triggerTokens
    .map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const regex = new RegExp(`^${pattern}(?:\\s*:\\s*|\\s+)([\\s\\S]*)$`, 'i');
  const m = originalTrimmed.match(regex);
  if (!m) {
    return { matched: false, args: '' };
  }

  return { matched: true, args: (m[1] || '').trim() };
}

export class TelegramCommandRegistry {
  private readonly commands = new Map<string, TelegramCommandDefinition>();

  register(definition: TelegramCommandDefinition): void {
    if (!definition.id.trim()) {
      throw new Error('Command definition id cannot be empty.');
    }
    if (!Array.isArray(definition.triggers) || definition.triggers.length === 0) {
      throw new Error(`Command "${definition.id}" must declare at least one trigger.`);
    }
    this.commands.set(definition.id, {
      ...definition,
      triggers: [...definition.triggers],
    });
  }

  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  get(id: string): TelegramCommandDefinition | undefined {
    return this.commands.get(id);
  }

  list(): TelegramCommandDefinition[] {
    return Array.from(this.commands.values());
  }

  resolve(rawText: string): TelegramCommandMatch | null {
    const trimmed = rawText.trim();
    if (!trimmed) return null;

    // Sort candidate (command, trigger) pairs longest-trigger-first so
    // multi-word triggers like "status report" or "wake up agent" win over "status" or "wake".
    const candidates: Array<{ command: TelegramCommandDefinition; trigger: string }> = [];
    for (const command of this.commands.values()) {
      for (const trigger of command.triggers) {
        candidates.push({ command, trigger });
      }
    }

    candidates.sort(
      (a, b) => normalizeTrigger(b.trigger).length - normalizeTrigger(a.trigger).length
    );

    for (const candidate of candidates) {
      const { matched, args } = extractTriggerAndArgs(trimmed, candidate.trigger);
      if (matched) {
        return {
          command: candidate.command,
          matchedTrigger: candidate.trigger,
          args,
        };
      }
    }

    return null;
  }

  async dispatch(
    rawText: string,
    baseCtx: Omit<TelegramCommandExecutionContext, 'rawText' | 'matchedTrigger' | 'args'>
  ): Promise<TelegramCommandMatch | null> {
    const match = this.resolve(rawText);
    if (!match) return null;

    await match.command.handler({
      ...baseCtx,
      rawText,
      matchedTrigger: match.matchedTrigger,
      args: match.args,
    });
    return match;
  }
}

export const telegramCommandRegistry = new TelegramCommandRegistry();

export function registerTelegramCommand(definition: TelegramCommandDefinition): void {
  telegramCommandRegistry.register(definition);
}

export function unregisterTelegramCommand(id: string): boolean {
  return telegramCommandRegistry.unregister(id);
}

export function getRegisteredTelegramCommands(): TelegramCommandDefinition[] {
  return telegramCommandRegistry.list();
}

export function resolveTelegramCommand(rawText: string): TelegramCommandMatch | null {
  return telegramCommandRegistry.resolve(rawText);
}

export function getAgentRuntimeState(): AgentRuntimeState {
  return { ...agentRuntimeState };
}

function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function isBlockedWorkspacePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return false;
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (BLOCKED_PATH_SEGMENTS.has(seg)) return true;
  }
  const baseName = segments[segments.length - 1] || '';
  return BLOCKED_FILE_PATTERNS.some((pattern) => pattern.test(baseName));
}

function resolveSafeWorkspacePath(
  workspaceRoot: string,
  requestedPath: string
): { resolved: string; relative: string } | null {
  const root = path.resolve(workspaceRoot);
  const sanitized = requestedPath.trim().replace(/^["']|["']$/g, '');
  if (!sanitized) return null;

  const resolved = path.resolve(root, sanitized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }

  const relative = path.relative(root, resolved).replace(/\\/g, '/');
  if (relative && isBlockedWorkspacePath(relative)) {
    return null;
  }

  return { resolved, relative: relative || '.' };
}

async function listSafeWorkspaceEntries(
  workspaceRoot: string,
  subDir = '.'
): Promise<string[]> {
  const target = resolveSafeWorkspacePath(workspaceRoot, subDir);
  if (!target) return [];

  const entries = await fs.readdir(target.resolved, { withFileTypes: true });
  return entries
    .filter((entry) => {
      const rel = target.relative === '.' ? entry.name : `${target.relative}/${entry.name}`;
      return !isBlockedWorkspacePath(rel) && !entry.name.startsWith('.git');
    })
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 40);
}

async function sendStatusReportTask(cmdCtx: TelegramCommandExecutionContext): Promise<void> {
  const { ctx, sender, session, args, coreHandler, agentState } = cmdCtx;
  const mem = process.memoryUsage();
  const rssMb = (mem.rss / (1024 * 1024)).toFixed(1);
  const heapUsedMb = (mem.heapUsed / (1024 * 1024)).toFixed(1);
  const geminiConnected = Boolean(process.env.GEMINI_API_KEY);

  const reportLines =
    session.language === 'en'
      ? [
          'ASTRA-GRAVITY CORE STATUS REPORT',
          `Agent State: ${agentState.status.toUpperCase()} (wakes: ${agentState.wakeCount})`,
          `Last Wake: ${agentState.lastWakeAt || 'Not woken yet'}`,
          `Gemini Engine: ${geminiConnected ? 'Connected' : 'API key missing'}`,
          `Server Uptime: ${formatUptime(process.uptime())}`,
          `Memory: ${heapUsedMb} MB heap / ${rssMb} MB RSS (${os.cpus().length} vCPU)`,
          `Sender: ${sender.displayName} (ID: ${sender.senderId})`,
          `Session Language: ${session.language.toUpperCase()} | Turns: ${Math.floor(session.history.length / 2)} | Cached Artifacts: ${session.workspaceFiles.size}`,
          `Registered Commands: ${telegramCommandRegistry.list().length}`,
        ]
      : [
          'ASTRA-GRAVITY কোর স্ট্যাটাস রিপোর্ট',
          `এজেন্ট অবস্থা: ${agentState.status === 'awake' ? 'AWAKE (সক্রিয়)' : 'STANDBY'} (Wake গণনা: ${agentState.wakeCount})`,
          `সর্বশেষ Wake: ${agentState.lastWakeAt || 'এখনও চালু করা হয়নি'}`,
          `Gemini ইঞ্জিন: ${geminiConnected ? 'সংযুক্ত' : 'API কী অনুপস্থিত'}`,
          `সার্ভার আপটাইম: ${formatUptime(process.uptime())}`,
          `মেমোরি ব্যবহার: ${heapUsedMb} MB হিপ / ${rssMb} MB RSS`,
          `প্রেরক: ${sender.displayName} (ID: ${sender.senderId})`,
          `সেশন ভাষা: ${session.language.toUpperCase()} | কথোপকথন: ${Math.floor(session.history.length / 2)} | ফাইল ক্যাশ: ${session.workspaceFiles.size}`,
          `রেজিস্টার্ড কমান্ড: ${telegramCommandRegistry.list().length}`,
        ];

  await ctx.reply(reportLines.join('\n'));

  if (args) {
    const detailed = await coreHandler({
      prompt: `Generate an executive status summary answering this status query: ${args}\nTelemetry snapshot:\n${reportLines.join('\n')}`,
      history: session.history,
      language: session.language,
      senderContext: `Telegram sender "${sender.displayName}" (userId=${sender.senderId})`,
    });
    await sendAstraResultToTelegram(ctx, session, detailed);
  }
}

async function agentWakeupTask(cmdCtx: TelegramCommandExecutionContext): Promise<void> {
  const { ctx, sender, session, args, coreHandler } = cmdCtx;
  const nowIso = new Date().toISOString();

  agentRuntimeState.status = 'awake';
  agentRuntimeState.wakeCount += 1;
  agentRuntimeState.lastWakeAt = nowIso;
  agentRuntimeState.lastWokenBy = `${sender.displayName} (${sender.senderId})`;

  if (args) {
    await ctx.api
      .sendChatAction({
        chat_id: sender.chatId,
        action: 'typing',
      })
      .catch(() => {});

    const result = await coreHandler({
      prompt: `Agent Wake-Up Directive from ${sender.displayName}: ${args}`,
      history: session.history,
      language: session.language,
      senderContext: `Telegram sender "${sender.displayName}" (userId=${sender.senderId}, wakeCount=${agentRuntimeState.wakeCount})`,
    });

    agentRuntimeState.lastTaskSummary = result.text.slice(0, 140);
    session.history.push({ role: 'user', content: `/wake ${args}` });
    session.history.push({ role: 'model', content: result.text });
    if (session.history.length > 16) {
      session.history = session.history.slice(-16);
    }

    await sendAstraResultToTelegram(ctx, session, result);
    return;
  }

  agentRuntimeState.lastTaskSummary = 'Agent awakened via Telegram command registry.';

  const message =
    session.language === 'en'
      ? [
          `Astra-Gravity Agent is AWAKE and ready for ${sender.displayName}.`,
          `Wake sequence #${agentRuntimeState.wakeCount} at ${nowIso}.`,
          'Send a command, prompt, or file to execute.',
        ].join('\n')
      : [
          `Astra-Gravity এজেন্ট এখন AWAKE এবং ${sender.displayName}-এর নির্দেশের জন্য প্রস্তুত।`,
          `Wake ক্রম #${agentRuntimeState.wakeCount} (${nowIso})।`,
          'কাজ শুরু করতে যেকোনো কমান্ড, প্রম্পট বা ফাইল পাঠান।',
        ].join('\n');

  await ctx.reply(message);
}

async function fileRetrievalTask(cmdCtx: TelegramCommandExecutionContext): Promise<void> {
  const { ctx, sender, session, args, workspaceRoot, matchedTrigger } = cmdCtx;
  const cleanedTarget = args.trim();
  const isListingTrigger =
    !cleanedTarget ||
    normalizeTrigger(matchedTrigger) === '/files' ||
    normalizeTrigger(matchedTrigger) === '/ls' ||
    normalizeTrigger(matchedTrigger) === 'list files';

  if (isListingTrigger && !cleanedTarget) {
    const sessionFiles = Array.from(session.workspaceFiles.keys());
    const diskEntries = await listSafeWorkspaceEntries(workspaceRoot);

    const lines: string[] = [];
    if (session.language === 'en') {
      lines.push('ASTRA-GRAVITY FILE RETRIEVAL');
      lines.push(
        sessionFiles.length > 0
          ? `Session Artifacts: ${sessionFiles.join(', ')}`
          : 'Session Artifacts: (none cached yet)'
      );
      lines.push(
        diskEntries.length > 0
          ? `Workspace Root Files:\n${diskEntries.map((e) => `- ${e}`).join('\n')}`
          : 'Workspace Root Files: (none)'
      );
      lines.push('\nUse `/file <path>` or `get file <path>` to retrieve a file.');
    } else {
      lines.push('ASTRA-GRAVITY ফাইল রিট্রিভাল');
      lines.push(
        sessionFiles.length > 0
          ? `সেশন আর্টিফ্যাক্ট: ${sessionFiles.join(', ')}`
          : 'সেশন আর্টিফ্যাক্ট: (এখনও কিছু ক্যাশ হয়নি)'
      );
      lines.push(
        diskEntries.length > 0
          ? `ওয়ার্কস্পেস রুট ফাইল:\n${diskEntries.map((e) => `- ${e}`).join('\n')}`
          : 'ওয়ার্কস্পেস ফাইল: (পাওয়া যায়নি)'
      );
      lines.push('\nফাইল পেতে লিখুন: `/file <path>` অথবা `get file <path>`');
    }

    for (const chunk of splitTelegramReply(lines.join('\n'))) {
      await ctx.reply(chunk);
    }
    return;
  }

  // 1. Check sender's cached Autonomous Workspace artifacts first
  const cachedArtifact =
    session.workspaceFiles.get(cleanedTarget) ||
    Array.from(session.workspaceFiles.values()).find(
      (f) => f.filename.toLowerCase() === cleanedTarget.toLowerCase()
    );

  if (cachedArtifact) {
    const bytes = new TextEncoder().encode(cachedArtifact.content);
    await ctx.api.sendDocument({
      chat_id: sender.chatId,
      document: new InputFile(bytes, {
        filename: cachedArtifact.filename,
        contentType: 'text/plain; charset=utf-8',
      }),
      caption: `Retrieved session workspace artifact: ${cachedArtifact.filename}`,
    });
    return;
  }

  // 2. Check safe workspace path on disk
  const safeTarget = resolveSafeWorkspacePath(workspaceRoot, cleanedTarget);
  if (!safeTarget) {
    await ctx.reply(
      session.language === 'en'
        ? `Access denied or invalid workspace path: "${cleanedTarget}".`
        : `নিরাপত্তাজনিত কারণে পাথটি অ্যাক্সেসযোগ্য নয় বা সঠিক নয়: "${cleanedTarget}"।`
    );
    return;
  }

  let stat;
  try {
    stat = await fs.stat(safeTarget.resolved);
  } catch {
    await ctx.reply(
      session.language === 'en'
        ? `File not found in workspace or session artifacts: "${cleanedTarget}".`
        : `ওয়ার্কস্পেস বা সেশন আর্টিফ্যাক্টে ফাইলটি পাওয়া যায়নি: "${cleanedTarget}"।`
    );
    return;
  }

  if (stat.isDirectory()) {
    const subEntries = await listSafeWorkspaceEntries(workspaceRoot, safeTarget.relative);
    const listText =
      subEntries.length > 0
        ? `Directory "${safeTarget.relative}/":\n${subEntries.map((e) => `- ${e}`).join('\n')}`
        : `Directory "${safeTarget.relative}/" is empty.`;
    for (const chunk of splitTelegramReply(listText)) {
      await ctx.reply(chunk);
    }
    return;
  }

  if (stat.size > MAX_TELEGRAM_FILE_BYTES) {
    await ctx.reply(
      `File "${safeTarget.relative}" (${(stat.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB Telegram transfer limit.`
    );
    return;
  }

  const fileBytes = await fs.readFile(safeTarget.resolved);
  const baseFilename = path.basename(safeTarget.resolved);
  await ctx.api.sendDocument({
    chat_id: sender.chatId,
    document: new InputFile(new Uint8Array(fileBytes), {
      filename: baseFilename,
      contentType: isTextLikeMime('', baseFilename)
        ? 'text/plain; charset=utf-8'
        : 'application/octet-stream',
    }),
    caption: `Retrieved workspace file: ${safeTarget.relative} (${stat.size} bytes)`,
  });
}

function registerDefaultCommands(): void {
  if (telegramCommandRegistry.list().length > 0) return;

  telegramCommandRegistry.register({
    id: 'help',
    triggers: ['/start', '/help', 'help', 'commands'],
    description: 'Show Astra-Gravity command registry and usage guide',
    usage: '/help | help',
    handler: async ({ ctx, sender, session }) => {
      const cmdLines = telegramCommandRegistry
        .list()
        .map((c) => `• ${c.usage || c.triggers[0]} — ${c.description}`);

      const header =
        session.language === 'en'
          ? `Hello ${sender.displayName}, Astra-Gravity Core is active.\n\nRegistered Tasks:`
          : `আসসালামু আলাইকুম ${sender.displayName}, Astra-Gravity কোর সক্রিয় রয়েছে।\n\nরেজিস্টার্ড টাস্কসমূহ:`;

      const footer =
        session.language === 'en'
          ? '\nYou can also send any natural prompt, image, voice note, or document.'
          : '\nযেকোনো স্বাভাবিক বার্তা, ছবি, ভয়েস নোট বা ডকুমেন্ট পাঠালেও Astra-Gravity প্রসেস করবে।';

      await ctx.reply([header, ...cmdLines, footer].join('\n'));
    },
  });

  telegramCommandRegistry.register({
    id: 'status_report',
    triggers: ['/status', '/report', 'status report', 'system status', 'health check', 'status'],
    description: 'Generate real-time Astra-Gravity core & server status report',
    usage: '/status [optional focus] | status report',
    handler: sendStatusReportTask,
  });

  telegramCommandRegistry.register({
    id: 'agent_wakeup',
    triggers: [
      '/wake',
      '/wakeup',
      '/ping',
      'wake up agent',
      'wake up',
      'wakeup',
      'start agent',
      'boot agent',
      'wake',
    ],
    description: 'Wake up the Astra-Gravity autonomous agent and optionally run a directive',
    usage: '/wake [optional task] | wake up',
    handler: agentWakeupTask,
  });

  telegramCommandRegistry.register({
    id: 'file_retrieval',
    triggers: [
      '/file',
      '/getfile',
      '/retrieve',
      '/read',
      '/files',
      '/ls',
      'retrieve file',
      'get file',
      'fetch file',
      'list files',
    ],
    description: 'List or retrieve files from session artifacts or workspace directory',
    usage: '/file <path> | /files | get file <path>',
    handler: fileRetrievalTask,
  });

  telegramCommandRegistry.register({
    id: 'language_switch',
    triggers: ['/lang', 'set language', 'language'],
    description: 'Switch response language between Bengali (bn) and English (en)',
    usage: '/lang bn | /lang en',
    handler: async ({ ctx, session, args }) => {
      const arg = args.trim().toLowerCase();
      if (arg === 'en' || arg === 'english') {
        session.language = 'en';
        await ctx.reply('Language set to English.');
        return;
      }
      if (arg === 'bn' || arg === 'bengali' || arg === 'bangla') {
        session.language = 'bn';
        await ctx.reply('ভাষা বাংলায় সেট করা হয়েছে।');
        return;
      }
      await ctx.reply('Usage: /lang bn OR /lang en');
    },
  });

  telegramCommandRegistry.register({
    id: 'session_reset',
    triggers: ['/reset', '/clear', 'reset session', 'clear history'],
    description: 'Clear conversation history and cached workspace artifacts for your session',
    usage: '/reset | reset session',
    handler: async ({ ctx, session }) => {
      session.history = [];
      session.workspaceFiles.clear();
      await ctx.reply(
        session.language === 'en'
          ? 'Your Astra-Gravity conversation history and cached artifacts have been cleared.'
          : 'আপনার Astra-Gravity চ্যাট মেমোরি ও সেশন ফাইল রিসেট করা হয়েছে।'
      );
    },
  });
}

registerDefaultCommands();

async function downloadTelegramFile(
  bot: Bot,
  token: string,
  msg: Message
): Promise<TelegramFilePayload | null> {
  let fileId: string | undefined;
  let filename = 'attachment.bin';
  let mimeType = 'application/octet-stream';
  let fileSize: number | undefined;
  let kind: TelegramFilePayload['kind'] = 'document';

  if (msg.document) {
    kind = 'document';
    fileId = msg.document.file_id;
    filename = msg.document.file_name || `document_${msg.document.file_unique_id}`;
    mimeType = msg.document.mime_type || 'application/octet-stream';
    fileSize = msg.document.file_size;
  } else if (msg.photo && msg.photo.length > 0) {
    kind = 'photo';
    const largest = msg.photo[msg.photo.length - 1];
    fileId = largest.file_id;
    filename = `photo_${largest.file_unique_id}.jpg`;
    mimeType = 'image/jpeg';
    fileSize = largest.file_size;
  } else if (msg.voice) {
    kind = 'voice';
    fileId = msg.voice.file_id;
    filename = `voice_${msg.voice.file_unique_id}.ogg`;
    mimeType = msg.voice.mime_type || 'audio/ogg';
    fileSize = msg.voice.file_size;
  } else if (msg.audio) {
    kind = 'audio';
    fileId = msg.audio.file_id;
    filename = msg.audio.file_name || `audio_${msg.audio.file_unique_id}.mp3`;
    mimeType = msg.audio.mime_type || 'audio/mpeg';
    fileSize = msg.audio.file_size;
  } else if (msg.video) {
    kind = 'video';
    fileId = msg.video.file_id;
    filename = msg.video.file_name || `video_${msg.video.file_unique_id}.mp4`;
    mimeType = msg.video.mime_type || 'video/mp4';
    fileSize = msg.video.file_size;
  }

  if (!fileId) return null;

  if (fileSize && fileSize > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error(`File "${filename}" exceeds the 10 MB Telegram bridge limit.`);
  }

  const fileInfo = await bot.api.getFile({ file_id: fileId });
  if (!fileInfo.file_path) {
    throw new Error(`Telegram did not return a downloadable path for ${filename}.`);
  }

  const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
  const resp = await fetch(fileUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Telegram file (${resp.status} ${resp.statusText}).`);
  }

  const arrayBuf = await resp.arrayBuffer();
  if (arrayBuf.byteLength > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error(`File "${filename}" exceeds the 10 MB Telegram bridge limit.`);
  }

  const bytes = new Uint8Array(arrayBuf);
  const payload: TelegramFilePayload = {
    kind,
    fileId,
    filename,
    mimeType,
    fileSize: bytes.byteLength,
  };

  if (isTextLikeMime(mimeType, filename)) {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    payload.extractedText = decoded.slice(0, 24000);
  } else if (isGeminiBinaryMime(mimeType)) {
    payload.inlineAttachment = {
      mimeType,
      dataBase64: Buffer.from(bytes).toString('base64'),
      filename,
    };
  }

  return payload;
}

async function sendAstraResultToTelegram(
  ctx: Context,
  session: SenderSession,
  result: AstraCoreResult
): Promise<void> {
  const replyText = result.text || 'Astra-Gravity processed your request.';
  const chunks = splitTelegramReply(replyText);

  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }

  for (const tc of result.toolCalls) {
    if (tc.name === 'update_workspace' && typeof tc.args?.content === 'string') {
      const filename = String(tc.args.filename || 'astra_output.txt');
      session.workspaceFiles.set(filename, {
        filename,
        content: tc.args.content,
        updatedAt: new Date().toISOString(),
      });

      const contentBytes = new TextEncoder().encode(tc.args.content);
      await ctx.api.sendDocument({
        chat_id: ctx.chatId!,
        document: new InputFile(contentBytes, {
          filename,
          contentType: 'text/plain; charset=utf-8',
        }),
        caption: `Workspace artifact: ${filename}`,
      });
    }
  }
}

async function routeMessageToAstra(
  bot: Bot,
  token: string,
  ctx: Context,
  sender: TelegramSenderIdentity,
  promptOverride?: string
): Promise<void> {
  const msg = ctx.message;
  if (!msg) return;

  const session = getOrCreateSession(sender.senderId, sender.languageCode);

  await ctx.api
    .sendChatAction({
      chat_id: sender.chatId,
      action: 'typing',
    })
    .catch(() => {});

  let filePayload: TelegramFilePayload | null = null;
  if (msg.document || msg.photo || msg.voice || msg.audio || msg.video) {
    filePayload = await downloadTelegramFile(bot, token, msg);
  }

  const rawText = (promptOverride ?? msg.text ?? msg.caption ?? '').trim();
  const promptParts: string[] = [];

  if (rawText) {
    promptParts.push(rawText);
  }

  if (filePayload) {
    if (filePayload.extractedText) {
      promptParts.push(
        `[Attached Telegram file: ${filePayload.filename} (${filePayload.mimeType})]\n\`\`\`\n${filePayload.extractedText}\n\`\`\``
      );
    } else if (filePayload.inlineAttachment) {
      if (!rawText) {
        promptParts.push(
          `Analyze this ${filePayload.kind} (${filePayload.filename}) sent via Telegram and summarize or act on it.`
        );
      }
    } else {
      promptParts.push(
        `[Attached Telegram ${filePayload.kind}: ${filePayload.filename}, mime=${filePayload.mimeType}, bytes=${filePayload.fileSize ?? 0}]`
      );
    }
  }

  const finalPrompt = promptParts.join('\n\n').trim();
  if (!finalPrompt && !filePayload?.inlineAttachment) {
    await ctx.reply(
      session.language === 'en'
        ? 'Send a message, command, document, or image for Astra-Gravity to process.'
        : 'Astra-Gravity-এর জন্য যেকোনো বার্তা, কমান্ড, ছবি বা ডকুমেন্ট পাঠান।'
    );
    return;
  }

  const senderContext = `Telegram sender "${sender.displayName}" (userId=${sender.senderId}, chatId=${sender.chatId}${sender.username ? `, @${sender.username}` : ''})`;

  const result = await activeCoreHandler({
    prompt: finalPrompt,
    history: session.history,
    attachments: filePayload?.inlineAttachment ? [filePayload.inlineAttachment] : undefined,
    language: session.language,
    senderContext,
  });

  session.history.push({ role: 'user', content: finalPrompt || `[${filePayload?.kind || 'file'}]` });
  session.history.push({ role: 'model', content: result.text });
  if (session.history.length > 16) {
    session.history = session.history.slice(-16);
  }

  await sendAstraResultToTelegram(ctx, session, result);
}

function registerBotHandlers(bot: Bot, token: string): void {
  bot.catch((err, ctx) => {
    console.error('[TelegramBot] Error handling update:', ctx.update.update_id, err);
  });

  // Deduplication and sender identification gate
  bot.use(async (ctx, next) => {
    if (isDuplicateUpdate(ctx.update.update_id)) {
      return;
    }

    const sender = identifyTelegramSender(ctx);
    if (!sender) return;

    if (!sender.isAuthorized) {
      await ctx
        .reply(`Access denied for sender ${sender.displayName} (ID: ${sender.senderId}).`)
        .catch(() => {});
      return;
    }

    ctx.state.sender = sender;
    await next();
  });

  // Unified message dispatcher: checks Command Registry first for string commands,
  // then falls back to Astra-Gravity Core AI + file processing.
  bot.on('message', async (ctx) => {
    const sender = ctx.state.sender as TelegramSenderIdentity;
    const msg = ctx.message;
    if (!msg) return;

    const session = getOrCreateSession(sender.senderId, sender.languageCode);
    const hasMedia = Boolean(
      msg.document || msg.photo || msg.voice || msg.audio || msg.video
    );

    try {
      if (!hasMedia && typeof msg.text === 'string' && msg.text.trim()) {
        const matched = await telegramCommandRegistry.dispatch(msg.text, {
          bot,
          token,
          ctx,
          sender,
          session,
          coreHandler: activeCoreHandler,
          agentState: agentRuntimeState,
          workspaceRoot: configuredWorkspaceRoot,
        });
        if (matched) return;
      }

      await routeMessageToAstra(bot, token, ctx, sender);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to process message';
      console.error('[TelegramBot] Routing error:', err);
      await ctx.reply(`Error: ${errMsg}`).catch(() => {});
    }
  });
}

export function initializeTelegramBot(config: TelegramBotConfig = {}): Bot | null {
  const token = (config.token ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!token) {
    console.info(
      '[TelegramBot] TELEGRAM_BOT_TOKEN is not set; Telegram webhook bridge is standing by.'
    );
    return null;
  }

  registerDefaultCommands();

  activeCoreHandler = config.astraCoreHandler ?? runAstraGravityCore;
  configuredAllowlist =
    config.allowedUserIds ?? parseAllowedUserIds(process.env.TELEGRAM_ALLOWED_USER_IDS);
  configuredWorkspaceRoot = path.resolve(config.workspaceRoot ?? process.cwd());

  if (!activeBot || activeToken !== token) {
    const bot = new Bot(token);
    registerBotHandlers(bot, token);
    activeBot = bot;
    activeToken = token;
  }

  const secretToken =
    (config.webhookSecret ?? process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim() || undefined;

  activeWebhookHandler = nodeFrameworkWebhook(activeBot, {
    secretToken,
    allowUnauthenticated: !secretToken,
    fastAck: config.fastAck ?? true,
  });

  console.info('[TelegramBot] Initialized node-telegram-bot-api webhook instance.');
  return activeBot;
}

export function getTelegramBot(): Bot | null {
  return activeBot;
}

export function getTelegramBotStatus() {
  return {
    configured: Boolean(activeBot),
    mode: 'webhook',
    secretProtected: Boolean((process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim()),
    restrictedToAllowlist: Boolean(configuredAllowlist && configuredAllowlist.length > 0),
    activeSenderSessions: senderSessions.size,
    agentState: getAgentRuntimeState(),
    registeredCommands: telegramCommandRegistry.list().map((c) => ({
      id: c.id,
      triggers: c.triggers,
      description: c.description,
    })),
  };
}

export async function handleTelegramWebhook(
  req: NodeLikeRequest,
  res: NodeLikeResponse
): Promise<void> {
  if (!activeBot || !activeWebhookHandler) {
    const initialized = initializeTelegramBot();
    if (!initialized || !activeWebhookHandler) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN on the server.',
        })
      );
      return;
    }
  }

  await activeWebhookHandler(req, res);
}

export async function processTelegramUpdate(update: Update): Promise<void> {
  if (!activeBot) {
    const initialized = initializeTelegramBot();
    if (!initialized) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
    }
  }
  await activeBot!.handleUpdate(update);
}

export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken?: string
): Promise<boolean> {
  if (!activeBot) {
    const initialized = initializeTelegramBot();
    if (!initialized) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
    }
  }
  const secret = (secretToken ?? process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim() || undefined;
  return activeBot!.api.setWebhook({
    url: webhookUrl,
    ...(secret ? { secret_token: secret } : {}),
  });
}
