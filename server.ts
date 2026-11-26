import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Type,
  Modality,
} from '@google/genai';
import type {
  LiveServerMessage,
} from '@google/genai';
import {
  getGeminiClient,
  getGeminiBetaClient,
  updateWorkspaceDeclaration,
  runAstraGravityCore,
} from './src/services/astraCore.ts';
import {
  initializeTelegramBot,
  handleTelegramWebhook,
  getTelegramBotStatus,
} from './src/services/telegramBot.ts';
import {
  getVaultMode,
  claimMasterPassword,
  rotateClaimedPassword,
  verifyMasterPassword,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  issueSessionToken,
  verifySessionToken,
  revokeSessionToken,
  extractBearerToken,
  requireVaultAuth,
} from './src/services/vaultAuth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Simple in-memory rate limiter per route bucket
function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = hits.get(ip);
    if (!record || now > record.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait briefly and try again.' });
    }
    record.count += 1;
    next();
  };
}

function buildAlgorithmicMusicFallback(params: {
  title?: string;
  prompt: string;
  genre: string;
  mood: string;
  language: string;
  bpm: number;
  musicalKey: string;
  durationSeconds: number;
  instruments: string[];
}) {
  const keyRoot = (params.musicalKey || 'C Major').split(' ')[0] || 'C';
  const isMinor = /minor|sad|melanchol|dark|emotional/i.test(`${params.musicalKey} ${params.mood}`);

  const scaleMap: Record<string, string[]> = {
    C: isMinor ? ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'] : ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    D: isMinor ? ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5'] : ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'],
    E: isMinor ? ['E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'] : ['E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D#5', 'E5'],
    F: isMinor ? ['F4', 'G4', 'Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5'] : ['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5'],
    G: isMinor ? ['G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5'] : ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    A: isMinor ? ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'] : ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
  };

  const scale = scaleMap[keyRoot] || scaleMap.C;
  const chordProgression = [
    { chordName: `${keyRoot}${isMinor ? 'm7' : 'maj7'}`, notes: [scale[0], scale[2], scale[4], scale[6]], durationBeats: 4 },
    { chordName: isMinor ? 'VI' : 'vi', notes: [scale[5], scale[0].replace('4', '5'), scale[2].replace('4', '5'), scale[4]], durationBeats: 4 },
    { chordName: 'IV', notes: [scale[3], scale[5], scale[0].replace('4', '5'), scale[2]], durationBeats: 4 },
    { chordName: 'V', notes: [scale[4], scale[6], scale[1].replace('4', '5'), scale[3]], durationBeats: 4 },
  ];

  const melodyPatternIndices = [0, 2, 4, 3, 2, 4, 5, 4, 6, 5, 4, 2, 3, 2, 1, 0];
  const melodyNotes = melodyPatternIndices.map((sIdx, idx) => ({
    note: scale[sIdx % scale.length],
    beat: idx * 1,
    durationBeats: idx % 4 === 3 ? 1.5 : 0.85,
    velocity: idx % 4 === 0 ? 0.92 : 0.78,
  }));

  const bassPattern = chordProgression.flatMap((c, barIdx) => [
    { note: c.notes[0].replace(/\d/, '2'), beat: barIdx * 4, durationBeats: 1.5, velocity: 0.9 },
    { note: c.notes[0].replace(/\d/, '2'), beat: barIdx * 4 + 2, durationBeats: 1.5, velocity: 0.82 },
  ]);

  const isAcoustic = /acoustic|folk|baul|ambient|lofi/i.test(params.genre);
  const drumPattern = {
    kick: isAcoustic ? [0, 6, 8, 14] : [0, 4, 8, 12],
    snare: [4, 12],
    hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    perc: [3, 7, 11, 15],
  };

  const isBengali = /bengali|bangla/i.test(params.language);
  const isInstrumental = /instrumental/i.test(params.language);
  const themePhrase = params.prompt.trim() || 'নতুন দিনের স্বপ্ন ও পথচলা';

  const lyricsSections = isInstrumental
    ? [
        { section: 'Instrumental Arrangement', lines: [`[Instrumental Theme — ${params.genre} in ${params.musicalKey} at ${params.bpm} BPM]`, `Focus: ${themePhrase}`] },
      ]
    : isBengali
    ? [
        {
          section: 'Intro',
          lines: [
            `(${params.instruments.slice(0, 2).join(' ও ')} মৃদু আবহ — ${params.bpm} BPM)`,
            `ভোরের আকাশে রঙের মেলা, সুরের ডানায় ভাসে বেলা...`,
          ],
        },
        {
          section: 'Verse 1',
          lines: [
            `${themePhrase} — বুকের ভেতর জাগে নতুন গান,`,
            `আলোর পথে ছুটছে হৃদয়, মুছে ফেলে সব অভিমান।`,
            `শহরের ব্যস্ত রাস্তায় বাজে আশার প্রতিধ্বনি,`,
            `সময়ের স্রোতে লিখি আমরা নিজেদের জয়ের কাহিনি।`,
          ],
        },
        {
          section: 'Chorus',
          lines: [
            `ওরে মন, উড়ে চল সীমানা পেরিয়ে দূরে,`,
            `স্বপ্নগুলো সব সত্যি হবে এই মধুর সুরে!`,
            `থেমে না থেকে এগিয়ে যাই, হাত রেখে হাতে,`,
            `নতুন সকাল আসবেই এই অন্ধকার রাতের শেষে।`,
          ],
        },
        {
          section: 'Bridge',
          lines: [
            `যতই আসুক ঝড়, যতই আসুক কঠিন বাধা,`,
            `সুরের শক্তিতেই বাঁধা রবে আমাদের মন-বাঁধা।`,
          ],
        },
        {
          section: 'Outro',
          lines: [
            `ধীরে ধীরে মিলিয়ে যায় গিটারের শেষ টান...`,
            `রয়ে যায় মনে এক অনন্ত ভালোবাসার গান।`,
          ],
        },
      ]
    : [
        {
          section: 'Intro',
          lines: [`(${params.instruments.slice(0, 2).join(' & ')} atmospheric intro at ${params.bpm} BPM)`],
        },
        {
          section: 'Verse 1',
          lines: [
            `Shadows fade beneath the rising skyline glow,`,
            `Carrying the story of ${themePhrase.slice(0, 60)},`,
            `Every step is rhythm, every heartbeat keeps the time,`,
            `Turning quiet moments into melodies that shine.`,
          ],
        },
        {
          section: 'Chorus',
          lines: [
            `Lift the signal higher, let the chorus break the night,`,
            `Chasing every horizon in a wave of golden light,`,
            `Nothing holds us grounded when the harmony aligns,`,
            `We are writing tomorrow across endless lines.`,
          ],
        },
        {
          section: 'Outro',
          lines: [`Fade out with warm chords and echoing percussion...`],
        },
      ];

  const fullLyricsText = lyricsSections
    .map((s) => `[${s.section}]\n${s.lines.join('\n')}`)
    .join('\n\n');

  return {
    title: params.title?.trim() || `${params.mood} ${params.genre} Session`,
    styleNotes: `${params.genre} arrangement in ${params.musicalKey} (${params.bpm} BPM), tailored for "${themePhrase}" with layered ${params.instruments.join(', ')}.`,
    timeSignature: '4/4',
    chordProgression,
    melodyNotes,
    bassPattern,
    drumPattern,
    lyricsSections,
    fullLyricsText,
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=()');
    next();
  });
  app.use(express.json({ limit: '8mb' }));

  const chatLimiter = createRateLimiter(35, 60_000);
  const ttsLimiter = createRateLimiter(30, 60_000);
  const musicLimiter = createRateLimiter(20, 60_000);
  const authLimiter = createRateLimiter(25, 60_000);

  initializeTelegramBot();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Master Password Security Gate Endpoints
  app.get('/api/auth/status', (_req, res) => {
    res.json({
      mode: getVaultMode(),
    });
  });

  app.post('/api/auth/setup', authLimiter, (req, res) => {
    const { password } = req.body || {};
    const result = claimMasterPassword(typeof password === 'string' ? password : '');
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    const session = issueSessionToken();
    return res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      mode: session.mode,
    });
  });

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const ip = req.ip || 'unknown';
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${rateCheck.retryAfterSeconds}s.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
    }

    if (getVaultMode() === 'setup-required') {
      return res.status(409).json({
        error: 'Master password has not been claimed yet. Complete first-run setup.',
        code: 'SETUP_REQUIRED',
      });
    }

    const { password } = req.body || {};
    const ok = verifyMasterPassword(typeof password === 'string' ? password : '');
    if (!ok) {
      const failure = recordLoginFailure(ip);
      if (failure.locked) {
        return res.status(429).json({
          error: `Too many failed attempts. Locked for ${failure.retryAfterSeconds}s.`,
          retryAfterSeconds: failure.retryAfterSeconds,
        });
      }
      return res.status(401).json({
        error: `Invalid password. ${failure.remainingAttempts} attempt(s) remaining before temporary lockout.`,
        remainingAttempts: failure.remainingAttempts,
      });
    }

    clearLoginFailures(ip);
    const session = issueSessionToken();
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      mode: session.mode,
    });
  });

  app.get('/api/auth/verify', requireVaultAuth, (req, res) => {
    const session = (req as express.Request & { vaultSession?: { exp: number; mode: string } }).vaultSession;
    res.json({
      valid: true,
      mode: session?.mode || getVaultMode(),
      expiresAt: session?.exp,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      revokeSessionToken(token);
    }
    res.json({ ok: true });
  });

  app.post('/api/auth/change-password', requireVaultAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const result = rotateClaimedPassword(
      typeof currentPassword === 'string' ? currentPassword : '',
      typeof newPassword === 'string' ? newPassword : ''
    );
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    const oldToken = extractBearerToken(req.headers.authorization);
    if (oldToken) {
      revokeSessionToken(oldToken);
    }
    const nextSession = issueSessionToken();
    return res.json({
      ok: true,
      token: nextSession.token,
      expiresAt: nextSession.expiresAt,
      mode: nextSession.mode,
    });
  });

  // Telegram Bot Webhook & Diagnostics
  app.get('/api/telegram/status', requireVaultAuth, (_req, res) => {
    res.json(getTelegramBotStatus());
  });

  app.post('/api/telegram/webhook', async (req, res) => {
    await handleTelegramWebhook(req, res);
  });

  // 1. Autonomous Chat + Workspace Tool Endpoint
  app.post('/api/chat', requireVaultAuth, chatLimiter, async (req, res) => {
    try {
      const { prompt, history = [], image, voiceResponse = false, language = 'bn' } = req.body || {};
      const cleanPrompt = String(prompt || '').slice(0, 16000);
      if (!cleanPrompt.trim() && !image?.data) {
        return res.status(400).json({ error: 'Prompt or image attachment is required' });
      }
      const safeHistory = Array.isArray(history) ? history.slice(-12) : [];

      const coreResult = await runAstraGravityCore({
        prompt: cleanPrompt,
        history: safeHistory,
        image:
          image?.data && image?.mimeType
            ? { mimeType: String(image.mimeType), dataBase64: String(image.data) }
            : undefined,
        language,
      });

      const { text, toolCalls } = coreResult;
      const aiBeta = getGeminiBetaClient();

      let audio: string | undefined;
      if (aiBeta && voiceResponse && text) {
        try {
          const cleanTtsText = text.replace(/[*#_`~]/g, '').trim().slice(0, 450);
          if (cleanTtsText) {
            const ttsRes = await aiBeta.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [{ role: 'user', parts: [{ text: cleanTtsText }] }],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
              },
            });
            audio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          }
        } catch (ttsErr) {
          console.warn('Optional TTS skip:', ttsErr);
        }
      }

      res.json({ text, toolCalls, audio });
    } catch (err: unknown) {
      console.error('/api/chat error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Chat error' });
    }
  });

  // 2. Text-to-Speech Endpoint (returns WAV base64)
  const ALLOWED_TTS_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);
  app.post('/api/tts', requireVaultAuth, ttsLimiter, async (req, res) => {
    try {
      const { text, voice = 'Kore', style } = req.body || {};
      const cleanText = typeof text === 'string' ? text.replace(/[*#_`~]/g, '').trim().slice(0, 1200) : '';
      if (!cleanText) return res.status(400).json({ error: 'Text is required' });

      const aiBeta = getGeminiBetaClient();
      if (!aiBeta) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

      const safeVoice = ALLOWED_TTS_VOICES.has(String(voice)) ? String(voice) : 'Kore';

      const response = await aiBeta.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                ...(style ? { speechMetadata: { style: String(style) } } : {}),
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audio) return res.status(502).json({ error: 'No audio generated' });
      res.json({ audio });
    } catch (err: unknown) {
      console.error('/api/tts error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'TTS failure' });
    }
  });

  // 3. Music Composition & Structured Lyrics Arranger Endpoint
  app.post('/api/music/compose', requireVaultAuth, musicLimiter, async (req, res) => {
    const {
      title = '',
      prompt = 'Uplifting modern song',
      genre = 'Lo-Fi Synth Pop',
      mood = 'Inspiring',
      language = 'Bengali',
      bpm = 96,
      musicalKey = 'C Major',
      durationSeconds = 45,
      instruments = ['Warm Electric Piano', 'Sub Bass', 'Synth Lead', 'Acoustic Drums'],
    } = req.body || {};

    const safeBpm = Math.max(50, Math.min(180, Number(bpm) || 96));
    const safeDur = Math.max(15, Math.min(180, Number(durationSeconds) || 45));
    const safeInstruments = Array.isArray(instruments) && instruments.length > 0
      ? instruments.map(String).slice(0, 8)
      : ['Warm Electric Piano', 'Sub Bass', 'Synth Lead', 'Drums'];

    const fallback = buildAlgorithmicMusicFallback({
      title,
      prompt: String(prompt),
      genre: String(genre),
      mood: String(mood),
      language: String(language),
      bpm: safeBpm,
      musicalKey: String(musicalKey),
      durationSeconds: safeDur,
      instruments: safeInstruments,
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        ...fallback,
        bpm: safeBpm,
        musicalKey: String(musicalKey),
        durationSeconds: safeDur,
        genre: String(genre),
        mood: String(mood),
        language: String(language),
        instruments: safeInstruments,
        source: 'algorithmic-studio',
      });
    }

    try {
      const musicSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          styleNotes: { type: Type.STRING },
          timeSignature: { type: Type.STRING },
          chordProgression: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chordName: { type: Type.STRING },
                notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                durationBeats: { type: Type.NUMBER },
              },
              required: ['chordName', 'notes', 'durationBeats'],
            },
          },
          melodyNotes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                note: { type: Type.STRING },
                beat: { type: Type.NUMBER },
                durationBeats: { type: Type.NUMBER },
                velocity: { type: Type.NUMBER },
              },
              required: ['note', 'beat', 'durationBeats'],
            },
          },
          bassPattern: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                note: { type: Type.STRING },
                beat: { type: Type.NUMBER },
                durationBeats: { type: Type.NUMBER },
                velocity: { type: Type.NUMBER },
              },
              required: ['note', 'beat', 'durationBeats'],
            },
          },
          drumPattern: {
            type: Type.OBJECT,
            properties: {
              kick: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              snare: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              hihat: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              perc: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            },
            required: ['kick', 'snare', 'hihat'],
          },
          lyricsSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section: { type: Type.STRING },
                lines: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['section', 'lines'],
            },
          },
        },
        required: [
          'title',
          'styleNotes',
          'timeSignature',
          'chordProgression',
          'melodyNotes',
          'bassPattern',
          'drumPattern',
          'lyricsSections',
        ],
      };

      const compositionPrompt = `Compose a complete multi-track musical arrangement and beautifully structured lyrics.
User Request / Theme: "${prompt}"
Custom Title (if provided): "${title || 'Choose a poetic title'}"
Genre: ${genre}
Mood: ${mood}
Lyrics Language: ${language} (Write natural, rhythmic, poetic lines in ${language}; if Instrumental, provide performance direction notes inside a single Instrumental section).
Musical Key: ${musicalKey}
Tempo: ${safeBpm} BPM
Instruments: ${safeInstruments.join(', ')}

Music theory formatting requirements:
- Use standard scientific pitch notation (e.g., "C4", "Eb4", "G#4", "F2") for all notes.
- Provide 4 to 8 rich chords in chordProgression with 3 to 4 notes each (octave 3-4) and durationBeats (usually 4).
- Provide 16 to 32 expressive melodyNotes across beats 0..16 or 0..32 (octave 4-5) fitting the scale of ${musicalKey}.
- Provide 8 to 16 groovy bassPattern notes (octave 2-3) locked to the chord roots.
- Provide drumPattern arrays using 16-step bar indices (integers 0 to 15).
- Provide beautifully arranged lyricsSections: Intro, Verse 1, Chorus, Verse 2, Bridge, Outro with 2 to 4 vivid rhythmic lines per section.`;

      let aiResp;
      try {
        aiResp = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: compositionPrompt,
          config: {
            systemInstruction:
              'You are a world-class music composer, arranger, and lyricist in Bengali and English.',
            responseMimeType: 'application/json',
            responseSchema: musicSchema,
          },
        });
      } catch (primaryErr) {
        console.warn('Music compose fallback to gemini-2.5-flash:', primaryErr);
        aiResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: compositionPrompt,
          config: {
            systemInstruction:
              'You are a world-class music composer, arranger, and lyricist in Bengali and English.',
            responseMimeType: 'application/json',
            responseSchema: musicSchema,
          },
        });
      }

      const raw = (aiResp.text || '').trim();
      const parsed = JSON.parse(raw);

      const chordProgression =
        Array.isArray(parsed.chordProgression) && parsed.chordProgression.length > 0
          ? parsed.chordProgression
          : fallback.chordProgression;
      const melodyNotes =
        Array.isArray(parsed.melodyNotes) && parsed.melodyNotes.length > 0
          ? parsed.melodyNotes
          : fallback.melodyNotes;
      const bassPattern =
        Array.isArray(parsed.bassPattern) && parsed.bassPattern.length > 0
          ? parsed.bassPattern
          : fallback.bassPattern;
      const drumPattern = parsed.drumPattern?.kick
        ? parsed.drumPattern
        : fallback.drumPattern;
      const lyricsSections =
        Array.isArray(parsed.lyricsSections) && parsed.lyricsSections.length > 0
          ? parsed.lyricsSections
          : fallback.lyricsSections;

      const fullLyricsText = lyricsSections
        .map((s: { section: string; lines: string[] }) => `[${s.section}]\n${(s.lines || []).join('\n')}`)
        .join('\n\n');

      return res.json({
        title: title.trim() || parsed.title || fallback.title,
        prompt: String(prompt),
        genre: String(genre),
        mood: String(mood),
        language: String(language),
        bpm: safeBpm,
        musicalKey: String(musicalKey),
        timeSignature: parsed.timeSignature || '4/4',
        durationSeconds: safeDur,
        styleNotes: parsed.styleNotes || fallback.styleNotes,
        instruments: safeInstruments,
        chordProgression,
        melodyNotes,
        bassPattern,
        drumPattern,
        lyricsSections,
        fullLyricsText,
        source: 'gemini-2.5-pro',
      });
    } catch (err) {
      console.warn('/api/music/compose error, serving algorithmic score:', err);
      return res.json({
        ...fallback,
        prompt: String(prompt),
        genre: String(genre),
        mood: String(mood),
        language: String(language),
        bpm: safeBpm,
        musicalKey: String(musicalKey),
        durationSeconds: safeDur,
        instruments: safeInstruments,
        source: 'algorithmic-studio',
      });
    }
  });

  // Setup Vite Dev Middleware or Static Production Dist
  let viteMounted = false;
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      viteMounted = true;
    } catch (viteErr) {
      console.warn('Vite dev middleware unavailable, serving static dist/:', viteErr);
    }
  }

  if (!viteMounted) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // Live API WebSocket Bridge (/live) — requires Bearer auth handshake before Gemini Live connect
  const wss = new WebSocketServer({ server, path: '/live' });
  wss.on('connection', (clientWs: WebSocket) => {
    let isAuthenticated = false;
    let liveSession: Awaited<ReturnType<NonNullable<ReturnType<typeof getGeminiClient>>['live']['connect']>> | null = null;

    const authTimeout = setTimeout(() => {
      if (!isAuthenticated && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            payload: { message: 'Authentication timeout on /live uplink' },
          })
        );
        clientWs.close(4001, 'Unauthorized');
      }
    }, 5000);

    const initGeminiLiveSession = async (): Promise<boolean> => {
      const aiBeta = getGeminiBetaClient();
      if (!aiBeta) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            payload: { message: 'GEMINI_API_KEY not configured on server' },
          })
        );
        clientWs.close();
        return false;
      }

      try {
        liveSession = await aiBeta.live.connect({
          model: 'gemini-2.5-flash-native-audio-latest',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [{ functionDeclarations: [updateWorkspaceDeclaration] }],
            systemInstruction:
              'You are ASTRA-GRAVITY, a calm, executive bilingual (Bengali & English) AI operations assistant for Sumon Hossain and Red Bird International. Keep spoken responses helpful and crisp.',
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;
              const sc = message.serverContent;
              if (sc?.inputTranscription?.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'inputTranscription',
                    payload: { text: sc.inputTranscription.text },
                  })
                );
              }
              if (sc?.outputTranscription?.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'outputTranscription',
                    payload: { text: sc.outputTranscription.text },
                  })
                );
              }
              for (const part of sc?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      payload: { data: part.inlineData.data },
                    })
                  );
                }
              }
              if (sc?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete' }));
              }
              if (sc?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }
              for (const call of message.toolCall?.functionCalls ?? []) {
                clientWs.send(
                  JSON.stringify({
                    type: 'toolCall',
                    payload: { name: call.name, args: call.args },
                  })
                );
                liveSession?.sendToolResponse({
                  functionResponses: [
                    {
                      id: call.id || 'tool-1',
                      name: call.name || 'update_workspace',
                      response: { result: 'Workspace updated successfully' },
                    },
                  ],
                });
              }
            },
            onerror: (err: unknown) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'error',
                    payload: { message: err instanceof Error ? err.message : 'Live API error' },
                  })
                );
              }
            },
          },
        });
        return true;
      } catch (connectErr: unknown) {
        console.error('Gemini Live connect failed:', connectErr);
        const message =
          connectErr instanceof Error && connectErr.message
            ? connectErr.message
            : 'Failed to connect to Gemini Live Uplink';
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'error',
              payload: { message },
            })
          );
          clientWs.close();
        }
        return false;
      }
    };

    clientWs.on('message', async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        if (!isAuthenticated) {
          if (msg.type === 'auth' && typeof msg.token === 'string') {
            const session = verifySessionToken(msg.token);
            if (!session) {
              clearTimeout(authTimeout);
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  payload: { message: 'Invalid or expired studio session token' },
                })
              );
              clientWs.close(4001, 'Unauthorized');
              return;
            }
            isAuthenticated = true;
            clearTimeout(authTimeout);
            const liveReady = await initGeminiLiveSession();
            if (liveReady && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'authOk' }));
            }
            return;
          }
          clientWs.close(4001, 'Authentication required');
          return;
        }

        if (!liveSession) return;
        if (msg.type === 'audio' && msg.payload?.data) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.payload.data, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.type === 'image' && msg.payload?.data) {
          liveSession.sendRealtimeInput({
            video: { data: msg.payload.data, mimeType: msg.payload.mimeType || 'image/jpeg' },
          });
        }
      } catch (e) {
        console.warn('Invalid WebSocket payload from client:', e);
      }
    });

    clientWs.on('close', () => {
      clearTimeout(authTimeout);
      try {
        liveSession?.close();
      } catch {
        // ignore cleanup error
      }
      liveSession = null;
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Astra-Gravity Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
