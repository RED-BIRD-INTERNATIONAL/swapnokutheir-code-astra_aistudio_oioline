import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Square,
  Download,
  Repeat,
  Sliders,
  Loader2,
  Copy,
  Check,
  FilePlus2,
  Trash2,
  Volume2,
  Sparkles,
  Library,
} from 'lucide-react';
import { AstraProject, MusicComposition, WorkspaceFileUpdate } from '../../src/types/astra';
import {
  AstraMusicEngine,
  StemLevels,
  renderCompositionToWavBlob,
} from '../../src/utils/musicSynth';
import { playWavBase64 } from '../../src/utils/audio';

interface MusicStudioProps {
  activeProject: AstraProject;
  savedTracks: MusicComposition[];
  onSaveTrack: (track: MusicComposition) => void;
  onDeleteTrack: (trackId: string) => void;
  onSaveLyricsToWorkspace: (file: WorkspaceFileUpdate) => void;
  vaultToken?: string | null;
  onSessionExpired?: () => void;
}

const GENRES = [
  'Lo-Fi Synth Pop',
  'Bengali Folk Fusion',
  'Cinematic Orchestral',
  'Acoustic Indie Ballad',
  'Cyber Synthwave',
  'Ambient Chillout',
];

const MOODS = ['Uplifting', 'Romantic', 'Melancholic', 'Energetic', 'Dreamy', 'Epic'];
const KEYS = ['C Major', 'A Minor', 'G Major', 'D Minor', 'F Major', 'E Minor'];
const LANGUAGES = ['Bengali', 'English', 'Bilingual (Bn + En)', 'Instrumental'];
const INSTRUMENT_CHOICES = [
  'Warm Electric Piano',
  'Acoustic Guitar',
  'Bansuri Flute',
  'Sub Bass',
  'Analog Synth Lead',
  'Tabla & Lo-Fi Drums',
  'Orchestral Strings',
];

const PRESETS = [
  {
    label: 'বৃষ্টিভেজা সন্ধ্যা (Lo-Fi)',
    title: 'বৃষ্টিভেজা শহরের গান',
    prompt: 'বৃষ্টিভেজা সন্ধ্যায় জানালার পাশে বসে পুরনো স্মৃতি আর শান্ত অনুভূতি নিয়ে একটি সুরেলা গান',
    genre: 'Lo-Fi Synth Pop',
    mood: 'Romantic',
    language: 'Bengali',
    bpm: 84,
    musicalKey: 'F Major',
  },
  {
    label: 'স্বপ্নজয়ের যাত্রা (Anthem)',
    title: 'সীমানা ছাড়িয়ে',
    prompt: 'নতুন উদ্যম, কঠোর পরিশ্রম আর বিশ্বজয়ের স্বপ্ন নিয়ে একটি শক্তিশালী মোটিভেশনাল গান',
    genre: 'Cinematic Orchestral',
    mood: 'Epic',
    language: 'Bengali',
    bpm: 112,
    musicalKey: 'C Major',
  },
  {
    label: 'Dhaka Midnight Drive',
    title: 'Neon Monsoon Skyline',
    prompt: 'Late night drive across illuminated city bridges with crisp synth arpeggios and deep bass',
    genre: 'Cyber Synthwave',
    mood: 'Dreamy',
    language: 'English',
    bpm: 104,
    musicalKey: 'A Minor',
  },
];

export const MusicStudio: React.FC<MusicStudioProps> = ({
  activeProject,
  savedTracks,
  onSaveTrack,
  onDeleteTrack,
  onSaveLyricsToWorkspace,
  vaultToken,
  onSessionExpired,
}) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [bpm, setBpm] = useState(96);
  const [musicalKey, setMusicalKey] = useState(KEYS[0]);
  const [durationSeconds, setDurationSeconds] = useState(45);
  const [instruments, setInstruments] = useState<string[]>([
    'Warm Electric Piano',
    'Sub Bass',
    'Analog Synth Lead',
    'Tabla & Lo-Fi Drums',
  ]);

  const [isComposing, setIsComposing] = useState(false);
  const [activeTrack, setActiveTrack] = useState<MusicComposition | null>(
    () => savedTracks[0] || null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [liveBpm, setLiveBpm] = useState(96);
  const [progress, setProgress] = useState({ elapsed: 0, total: 45 });
  const [stems, setStems] = useState<StemLevels>({
    melody: 0.9,
    chords: 0.8,
    bass: 0.85,
    drums: 0.85,
  });
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [isRecitingLyrics, setIsRecitingLyrics] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [subView, setSubView] = useState<'studio' | 'library'>('studio');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const engineRef = useRef<AstraMusicEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    engineRef.current = new AstraMusicEngine();
    return () => {
      engineRef.current?.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTrack) {
      setLiveBpm(activeTrack.bpm || 96);
      setProgress({ elapsed: 0, total: activeTrack.durationSeconds || 45 });
    }
  }, [activeTrack]);

  // Dual-accent Studio Spectrum Analyzer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const analyser = engineRef.current?.getAnalyser();
      const barCount = 48;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      if (analyser && isPlaying) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i % dataArray.length] / 255;
          const barHeight = Math.max(4, val * (height - 10));
          const x = i * (barWidth + gap);
          const y = height - barHeight;
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, '#F59E0B');
          grad.addColorStop(1, '#22D3EE');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap);
          const idleH = 4 + Math.sin(i * 0.4) * 2.5;
          ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
          ctx.fillRect(x, height - idleH, barWidth, idleH);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const toggleInstrument = (inst: string) => {
    setInstruments((prev) =>
      prev.includes(inst)
        ? prev.length > 1
          ? prev.filter((i) => i !== inst)
          : prev
        : [...prev, inst]
    );
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setTitle(preset.title);
    setPrompt(preset.prompt);
    setGenre(preset.genre);
    setMood(preset.mood);
    setLanguage(preset.language);
    setBpm(preset.bpm);
    setMusicalKey(preset.musicalKey);
  };

  const handleComposeMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !title.trim()) {
      setErrorMsg('অনুগ্রহ করে গানের থিম বা আইডিয়া লিখুন।');
      return;
    }
    setErrorMsg(null);
    setIsComposing(true);
    engineRef.current?.stop();
    setIsPlaying(false);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (vaultToken) headers.Authorization = `Bearer ${vaultToken}`;

      const res = await fetch('/api/music/compose', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          prompt: prompt.trim() || title.trim(),
          genre,
          mood,
          language,
          bpm,
          musicalKey,
          durationSeconds,
          instruments,
        }),
      });

      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Music generation failed');

      const composed: MusicComposition = {
        id: `trk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        projectId: activeProject.id,
        title: data.title || title || 'Untitled Track',
        prompt: data.prompt || prompt,
        genre: data.genre || genre,
        mood: data.mood || mood,
        language: data.language || language,
        bpm: Number(data.bpm) || bpm,
        musicalKey: data.musicalKey || musicalKey,
        timeSignature: data.timeSignature || '4/4',
        durationSeconds: Number(data.durationSeconds) || durationSeconds,
        styleNotes: data.styleNotes || '',
        instruments: data.instruments || instruments,
        chordProgression: data.chordProgression || [],
        melodyNotes: data.melodyNotes || [],
        bassPattern: data.bassPattern || [],
        drumPattern: data.drumPattern || { kick: [0, 4, 8, 12], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14] },
        lyricsSections: data.lyricsSections || [],
        fullLyricsText: data.fullLyricsText || '',
        createdAt: new Date().toISOString(),
      };

      setActiveTrack(composed);
      onSaveTrack(composed);
      setSubView('studio');

      await engineRef.current?.play(
        composed,
        composed.bpm,
        stems,
        loop,
        (elapsed, total) => setProgress({ elapsed, total }),
        () => setIsPlaying(false)
      );
      setIsPlaying(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate track');
    } finally {
      setIsComposing(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!activeTrack || !engineRef.current) return;
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      await engineRef.current.play(
        activeTrack,
        liveBpm,
        stems,
        loop,
        (elapsed, total) => setProgress({ elapsed, total }),
        () => setIsPlaying(false)
      );
      setIsPlaying(true);
    }
  };

  const handleDownloadWav = async () => {
    if (!activeTrack) return;
    setIsExportingWav(true);
    try {
      const wavBlob = await renderCompositionToWavBlob(activeTrack, liveBpm, stems);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTrack.title.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleCopyLyrics = async () => {
    if (!activeTrack?.fullLyricsText) return;
    await navigator.clipboard.writeText(activeTrack.fullLyricsText);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 1800);
  };

  const handleDownloadLyrics = () => {
    if (!activeTrack?.fullLyricsText) return;
    const blob = new Blob([`${activeTrack.title}\n${'='.repeat(30)}\n\n${activeTrack.fullLyricsText}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTrack.title.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, '_')}_lyrics.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReciteLyrics = async () => {
    if (!activeTrack?.fullLyricsText) return;
    setIsRecitingLyrics(true);
    try {
      const excerpt = activeTrack.fullLyricsText.slice(0, 500);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (vaultToken) headers.Authorization = `Bearer ${vaultToken}`;

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: excerpt,
          voice: 'Kore',
          style: 'Expressive poetic lyrical vocal delivery',
        }),
      });
      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }
      const data = await res.json();
      if (data.audio) {
        playWavBase64(data.audio);
      } else if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(excerpt);
        utter.lang = activeTrack.language.toLowerCase().includes('bengali') ? 'bn-BD' : 'en-US';
        window.speechSynthesis.speak(utter);
      }
    } catch {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(activeTrack.fullLyricsText.slice(0, 400));
        window.speechSynthesis.speak(utter);
      }
    } finally {
      setIsRecitingLyrics(false);
    }
  };

  const handleSaveToWorkspace = () => {
    if (!activeTrack) return;
    const safeSlug = activeTrack.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'song_composition';
    const content = `# ${activeTrack.title}
**Genre:** ${activeTrack.genre} · **Mood:** ${activeTrack.mood} · **Key:** ${activeTrack.musicalKey} · **Tempo:** ${activeTrack.bpm} BPM  
**Arrangement Notes:** ${activeTrack.styleNotes}

## Chord Progression
${activeTrack.chordProgression.map((c) => `- **${c.chordName}** (${c.notes.join(' - ')}) [${c.durationBeats} beats]`).join('\n')}

## Structured Lyrics
${activeTrack.lyricsSections.map((s) => `### [${s.section}]\n${s.lines.join('\n')}`).join('\n\n')}
`;
    onSaveLyricsToWorkspace({
      filename: `${safeSlug}_lyrics.md`,
      language: 'markdown',
      content,
    });
  };

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const progressPct = progress.total > 0 ? Math.min(100, (progress.elapsed / progress.total) * 100) : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#07090F] text-slate-100">
      {/* Studio Sub-navigation */}
      <div className="flex items-center justify-between border-b border-[#1A2233] bg-[#090C14] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-amber-400" />
          <span className="font-display text-xs font-bold text-white">Astra Music & Lyrics Lab</span>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
            · 4-Stem Mastering + WAV Export
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#1A2233] bg-[#07090F] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSubView('studio')}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              subView === 'studio' ? 'bg-[#111623] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Compose Desk
          </button>
          <button
            type="button"
            onClick={() => setSubView('library')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
              subView === 'library' ? 'bg-[#111623] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Library className="h-3.5 w-3.5 text-amber-400" />
            <span className="tabular-nums">Saved ({savedTracks.length})</span>
          </button>
        </div>
      </div>

      {subView === 'library' ? (
        <div className="flex-1 overflow-y-auto p-5">
          {savedTracks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Music className="h-10 w-10 text-slate-600" />
              <p className="mt-3 font-display text-sm font-semibold text-white">No saved music tracks yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Use Compose Desk to generate your first arrangement and lyrics sheet.
              </p>
              <button
                type="button"
                onClick={() => setSubView('studio')}
                className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300"
              >
                Open Compose Desk
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {savedTracks.map((trk) => (
                <div
                  key={trk.id}
                  className="flex flex-col justify-between rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-bold text-white">{trk.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {trk.genre} · {trk.mood} · {trk.musicalKey} · <span className="font-mono tabular-nums">{trk.bpm} BPM</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteTrack(trk.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                        title="Delete track"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-300">{trk.prompt}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#1A2233] pt-3">
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {trk.language} · {trk.durationSeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTrack(trk);
                        setSubView('studio');
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Load in Desk</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-5 xl:grid-cols-12">
            {/* Guided Composition Console */}
            <form
              onSubmit={handleComposeMusic}
              className="space-y-4 rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4 xl:col-span-5"
            >
              <div>
                <h3 className="font-display text-sm font-bold text-white">সহজ ফর্মে গান ও লিরিক্স তৈরি করুন</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  থিম ও মেজাজ দিন — রিয়েল-টাইম সুর, রিদম ও গোছানো লিরিক্স তৈরি হবে।
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-lg border border-[#243047] bg-[#07090F] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  গানের থিম / বর্ণনা (Theme & Prompt)
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="যেমন: বৃষ্টিভেজা বিকেলে এক কাপ চা আর পুরনো বন্ধুত্বের গল্প নিয়ে মেলোডি গান..."
                  className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  গানের শিরোনাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="খালি রাখলে AI সুন্দর নাম তৈরি করবে"
                  className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Lyrics Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Musical Key</label>
                  <select
                    value={musicalKey}
                    onChange={(e) => setMusicalKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">Tempo</span>
                    <span className="font-mono text-amber-300 tabular-nums">{bpm} BPM</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={160}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="mt-1.5 w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Duration</label>
                  <select
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#243047] bg-[#07090F] px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Instruments</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {INSTRUMENT_CHOICES.map((inst) => {
                    const active = instruments.includes(inst);
                    return (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => toggleInstrument(inst)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                          active
                            ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                            : 'bg-[#07090F] text-slate-400 border-[#1A2233] hover:text-slate-200'
                        }`}
                      >
                        {inst}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

              <button
                type="submit"
                disabled={isComposing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isComposing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Composing Music & Lyrics...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Music & Arrange Lyrics</span>
                  </>
                )}
              </button>
            </form>

            {/* Right Mastering Deck */}
            <div className="space-y-4 xl:col-span-7">
              {activeTrack ? (
                <>
                  <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-white">{activeTrack.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {activeTrack.genre} · {activeTrack.mood} · {activeTrack.musicalKey} ·{' '}
                          <span className="font-mono text-amber-300 tabular-nums">{liveBpm} BPM</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTogglePlay}
                          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                          }`}
                        >
                          {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          <span>{isPlaying ? 'Stop' : 'Play'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLoop((l) => !l)}
                          className={`rounded-xl border p-2 transition-colors ${
                            loop
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                              : 'border-[#243047] bg-[#07090F] text-slate-400 hover:text-white'
                          }`}
                          title="Toggle Loop"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={isExportingWav}
                          onClick={handleDownloadWav}
                          className="flex items-center gap-1.5 rounded-xl border border-[#243047] bg-[#07090F] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#111623] disabled:opacity-50"
                        >
                          {isExportingWav ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-amber-400" />
                          )}
                          <span>WAV</span>
                        </button>
                      </div>
                    </div>

                    <canvas
                      ref={canvasRef}
                      width={620}
                      height={76}
                      className="mt-3 h-20 w-full rounded-xl border border-[#1A2233] bg-[#07090F]"
                    />

                    {/* Scrubbable Progress Bar */}
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#111623]">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                      <span>{formatTime(progress.elapsed)}</span>
                      <span className="truncate max-w-md text-slate-500">
                        Chords: {activeTrack.chordProgression.map((c) => c.chordName).join(' -> ')}
                      </span>
                      <span>{formatTime(progress.total)}</span>
                    </div>

                    {/* 4-Stem Mixer */}
                    <div className="mt-4 grid gap-3 border-t border-[#1A2233] pt-3 sm:grid-cols-5">
                      {(['melody', 'chords', 'bass', 'drums'] as (keyof StemLevels)[]).map((stem) => (
                        <div key={stem} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="capitalize text-slate-300">{stem}</span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {Math.round(stems[stem] * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={stems[stem]}
                            onChange={(e) =>
                              setStems((prev) => ({ ...prev, [stem]: Number(e.target.value) }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>
                      ))}

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Sliders className="h-3 w-3 text-cyan-400" />
                            Tempo
                          </span>
                          <span className="font-mono text-cyan-300 tabular-nums">{liveBpm}</span>
                        </div>
                        <input
                          type="range"
                          min={55}
                          max={175}
                          value={liveBpm}
                          onChange={(e) => setLiveBpm(Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lyrics Sheet */}
                  <div className="rounded-xl border border-[#1A2233] bg-[#0B0E17] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2233] pb-3">
                      <div>
                        <h4 className="font-display text-sm font-bold text-white">সুন্দরভাবে সাজানো লিরিক্স (Lyrics Sheet)</h4>
                        <p className="text-xs text-slate-400">{activeTrack.styleNotes}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isRecitingLyrics}
                          onClick={handleReciteLyrics}
                          className="flex items-center gap-1 rounded-lg border border-[#243047] bg-[#07090F] px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-[#111623]"
                        >
                          {isRecitingLyrics ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                          <span>Recite</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyLyrics}
                          className="flex items-center gap-1 rounded-lg border border-[#243047] bg-[#07090F] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#111623]"
                        >
                          {copiedLyrics ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedLyrics ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadLyrics}
                          className="flex items-center gap-1 rounded-lg border border-[#243047] bg-[#07090F] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#111623]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>.TXT</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveToWorkspace}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
                        >
                          <FilePlus2 className="h-3.5 w-3.5" />
                          <span>Save to Project</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {activeTrack.lyricsSections.map((sec, idx) => (
                        <div key={idx} className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3.5">
                          <h5 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                            [{sec.section}]
                          </h5>
                          <div className="mt-1.5 space-y-1 text-sm leading-relaxed text-slate-200">
                            {sec.lines.map((line, lIdx) => (
                              <p key={lIdx}>{line}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-[#1E2738] bg-[#0B0E17]/60 p-8 text-center">
                  <Music className="h-10 w-10 text-amber-400/75" />
                  <h3 className="mt-3 font-display text-base font-bold text-white">Music Mastering Desk Ready</h3>
                  <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
                    বাম পাশের সহজ ফর্মে আপনার গানের থিম লিখুন বা একটি প্রিসেট বাছাই করে "Generate Music & Arrange Lyrics" বাটনে ক্লিক করুন।
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
