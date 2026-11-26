export type ConnectionState = 'offline' | 'connecting' | 'connected' | 'error';

export type SpeakerMode = 'idle' | 'user' | 'agent';

export interface AstraUserProfile {
  uid: string;
  email: string;
  displayName: string;
  organization?: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  preferredLanguage?: 'bn' | 'en' | 'auto';
}

export interface FileVersion {
  id: string;
  versionNumber: number;
  timestamp: string;
  relativeTime: string;
  author: 'Astra Agent' | 'Sumon Hossain' | 'System Baseline' | string;
  summary: string;
  content: string;
  language: string;
  lineCount: number;
  charCount: number;
  diffStats?: {
    addedLines: number;
    removedLines: number;
  };
}

export interface WorkspaceFileUpdate {
  filename: string;
  language: string;
  content: string;
  versions?: FileVersion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  projectId?: string;
  toolCalls?: WorkspaceFileUpdate[];
  audioBase64?: string;
  imagePreview?: string;
}

export interface AstraProject {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  messageCount: number;
  isDefault?: boolean;
  userId?: string;
}

export interface SwarmMetricSnapshot {
  time: string;
  nlpCpu: number;
  nlpMem: number;
  redbirdCpu: number;
  redbirdMem: number;
  devopsCpu: number;
  devopsMem: number;
  dreamhouseCpu: number;
  dreamhouseMem: number;
  visionCpu: number;
  visionMem: number;
}

export interface MusicChordStep {
  chordName: string;
  notes: string[];
  durationBeats: number;
}

export interface MusicMelodyNote {
  note: string;
  beat: number;
  durationBeats: number;
  velocity?: number;
}

export interface MusicLyricsSection {
  section: string;
  lines: string[];
}

export interface MusicDrumPattern {
  kick: number[];
  snare: number[];
  hihat: number[];
  perc?: number[];
}

export interface MusicComposition {
  id: string;
  userId?: string;
  projectId?: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  language: string;
  bpm: number;
  musicalKey: string;
  timeSignature: string;
  durationSeconds: number;
  styleNotes: string;
  instruments: string[];
  chordProgression: MusicChordStep[];
  melodyNotes: MusicMelodyNote[];
  bassPattern: MusicMelodyNote[];
  drumPattern: MusicDrumPattern;
  lyricsSections: MusicLyricsSection[];
  fullLyricsText: string;
  createdAt: string;
}
