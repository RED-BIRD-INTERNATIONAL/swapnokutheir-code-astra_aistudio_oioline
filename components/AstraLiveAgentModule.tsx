import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Laptop,
  Terminal,
  Infinity as InfinityIcon,
  Volume2,
  VolumeX,
  Activity,
  ShieldCheck,
  BarChart3,
  Music,
  Cloud,
  KeyRound,
  Lock,
  X,
} from 'lucide-react';
import { TelemetryPanel } from './astra/TelemetryPanel';
import { AudioTerminal } from './astra/AudioTerminal';
import { AutonomousWorkspace } from './astra/AutonomousWorkspace';
import { ActionNotification } from './astra/ActionNotification';
import { InfoModal } from './astra/InfoModal';
import { DailySummaryModal } from './astra/DailySummaryModal';
import { ProjectSelector } from './astra/ProjectSelector';
import { ProjectManagerModal, CreateProjectPayload } from './astra/ProjectManagerModal';
import { AstraAuthGate } from './astra/AstraAuthGate';
import { AstraUserAccountModal } from './astra/AstraUserAccountModal';
import { VaultSecurityModal } from './astra/VaultSecurityModal';
import { MusicStudio } from './astra/MusicStudio';
import { TerminalTelemetry } from './astra/TerminalTelemetry';
import {
  AstraProject,
  AstraUserProfile,
  ChatMessage,
  ConnectionState,
  SpeakerMode,
  WorkspaceFileUpdate,
  FileVersion,
  SwarmMetricSnapshot,
  MusicComposition,
} from '../src/types/astra';
import {
  DEFAULT_ASTRA_PROJECTS,
  INITIAL_PROJECT_FILES,
  INITIAL_PROJECT_MESSAGES,
  TEMPLATE_SEED_FILES,
} from '../src/config/astraProjectsData';
import { auth } from '../src/firebase';
import {
  User,
  onAuthStateChanged,
  signOut,
  getRedirectResult,
} from 'firebase/auth';
import {
  syncUserProfileToFirestore,
  loadUserProjectsFromFirestore,
  saveUserProjectToFirestore,
  deleteUserProjectFromFirestore,
  loadProjectDocumentsFromFirestore,
  saveProjectDocumentToFirestore,
  loadProjectMessagesFromFirestore,
  saveProjectMessageToFirestore,
  clearProjectMessagesInFirestore,
  loadUserMusicTracksFromFirestore,
  saveUserMusicTrackToFirestore,
  deleteUserMusicTrackFromFirestore,
} from '../src/services/astraFirestoreSync';
import {
  WORKLET_CODE,
  float32ToPcmBase64,
  decodePcmToAudioBuffer,
  playWavBase64,
} from '../src/utils/audio';
import type { VaultAuthMode } from '../src/services/vaultAuth';

export type StudioTab = 'terminal' | 'workspace' | 'music' | 'telemetry';

interface AstraLiveAgentModuleProps {
  vaultToken?: string | null;
  vaultMode?: VaultAuthMode;
  vaultExpiresAt?: number | null;
  onLockVault?: () => void;
  onTokenRotated?: (payload: { token: string; expiresAt: number; mode: VaultAuthMode }) => void;
  onSessionExpired?: () => void;
  initialTab?: StudioTab;
  onNavigateTab?: (tab: string) => void;
  shipments?: unknown[];
  className?: string;
  initialQuery?: string;
}

const LOCAL_STUDIO_PREFIX = 'astra_studio_local_v1';

const MODE_LABELS: Record<StudioTab, string> = {
  terminal: 'Voice & Terminal',
  workspace: 'Autonomous Workspace',
  music: 'Music & Lyrics Lab',
  telemetry: 'Host Telemetry',
};

export const AstraLiveAgentModule: React.FC<AstraLiveAgentModuleProps> = ({
  vaultToken = null,
  vaultMode = 'claimed',
  vaultExpiresAt = null,
  onLockVault,
  onTokenRotated,
  onSessionExpired,
  initialTab = 'terminal',
  className = '',
  initialQuery,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [mobileTab, setMobileTab] = useState<StudioTab>(initialTab);
  const [hasWorkspaceUnread, setHasWorkspaceUnread] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [cloudAuthModalOpen, setCloudAuthModalOpen] = useState(false);

  // Sync external initialTab route switches (e.g. Navbar Studio vs Music Lab)
  useEffect(() => {
    setActiveTab(initialTab);
    setMobileTab(initialTab);
  }, [initialTab]);

  // Optional Firebase Cloud Sync User State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AstraUserProfile | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Saved Music Library (hydrated from local cache or Firestore)
  const [savedMusicTracks, setSavedMusicTracks] = useState<MusicComposition[]>(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STUDIO_PREFIX}_music`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Live Uplink & Voice States
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>('idle');
  const [speakerText, setSpeakerText] = useState('SYSTEM OFFLINE');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState<'bn' | 'en' | 'auto'>('bn');

  // Swarm Agent States
  const [swarmState, setSwarmState] = useState<{
    nlp: 'standby' | 'online' | 'active';
    redbird: 'standby' | 'online' | 'active';
    devops: 'standby' | 'online' | 'active';
    dreamhouse: 'standby' | 'online' | 'active';
    vision: 'standby' | 'online' | 'active';
  }>({
    nlp: 'standby',
    redbird: 'online',
    devops: 'online',
    dreamhouse: 'online',
    vision: 'standby',
  });

  const [swarmHistory, setSwarmHistory] = useState<SwarmMetricSnapshot[]>(() => {
    const points: SwarmMetricSnapshot[] = [];
    const now = Date.now();
    for (let i = 18; i >= 0; i--) {
      const t = new Date(now - i * 1500).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      points.push({
        time: t,
        nlpCpu: Math.floor(14 + Math.random() * 8),
        nlpMem: Math.floor(220 + Math.random() * 25),
        redbirdCpu: Math.floor(18 + Math.random() * 10),
        redbirdMem: Math.floor(310 + Math.random() * 30),
        devopsCpu: Math.floor(12 + Math.random() * 8),
        devopsMem: Math.floor(180 + Math.random() * 20),
        dreamhouseCpu: Math.floor(10 + Math.random() * 6),
        dreamhouseMem: Math.floor(135 + Math.random() * 15),
        visionCpu: Math.floor(8 + Math.random() * 6),
        visionMem: Math.floor(240 + Math.random() * 25),
      });
    }
    return points;
  });

  const [metrics, setMetrics] = useState({
    audioChunksSent: 0,
    visionFramesSent: 0,
    latencyMs: 32,
  });

  // Projects & Workspaces State (hydrated immediately from local device cache or defaults)
  const [projects, setProjects] = useState<AstraProject[]>(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STUDIO_PREFIX}_projects`);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ASTRA_PROJECTS;
    } catch {
      return DEFAULT_ASTRA_PROJECTS;
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(`${LOCAL_STUDIO_PREFIX}_active`) || DEFAULT_ASTRA_PROJECTS[0].id;
    } catch {
      return DEFAULT_ASTRA_PROJECTS[0].id;
    }
  });

  const [projectWorkspaces, setProjectWorkspaces] = useState<Record<string, WorkspaceFileUpdate[]>>(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STUDIO_PREFIX}_workspaces`);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : INITIAL_PROJECT_FILES;
    } catch {
      return INITIAL_PROJECT_FILES;
    }
  });

  const [projectChatHistories, setProjectChatHistories] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STUDIO_PREFIX}_chats`);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : INITIAL_PROJECT_MESSAGES;
    } catch {
      return INITIAL_PROJECT_MESSAGES;
    }
  });

  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return projectChatHistories[activeProjectId] || INITIAL_PROJECT_MESSAGES[activeProjectId] || [];
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileUpdate[]>(() => {
    return projectWorkspaces[activeProjectId] || INITIAL_PROJECT_FILES[activeProjectId] || [];
  });
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_ASTRA_PROJECTS[0];
  }, [projects, activeProjectId]);

  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const [isVisionActive, setIsVisionActive] = useState(false);
  const [visionSource, setVisionSource] = useState<'screen' | 'camera'>('screen');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const transcriptInputBufRef = useRef('');
  const transcriptOutputBufRef = useRef('');
  const authUserRef = useRef<User | null>(null);
  const activeProjectIdRef = useRef<string>(activeProjectId);
  const workspaceFilesRef = useRef<WorkspaceFileUpdate[]>(workspaceFiles);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    workspaceFilesRef.current = workspaceFiles;
  }, [workspaceFiles]);

  // Continuous Swarm CPU & Memory real-time telemetry ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSwarmHistory((prev) => {
        const now = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const nlpSurge = swarmState.nlp === 'active' || isProcessing || speakerMode === 'agent';
        const redbirdSurge = swarmState.redbird === 'active';
        const devopsSurge = swarmState.devops === 'active';
        const dreamSurge = swarmState.dreamhouse === 'active';
        const visionSurge = isVisionActive || swarmState.vision === 'active';

        const newPoint: SwarmMetricSnapshot = {
          time: now,
          nlpCpu: Math.floor(nlpSurge ? 68 + Math.random() * 22 : 14 + Math.random() * 8),
          nlpMem: Math.floor(nlpSurge ? 340 + Math.random() * 40 : 220 + Math.random() * 20),
          redbirdCpu: Math.floor(redbirdSurge ? 75 + Math.random() * 18 : 18 + Math.random() * 9),
          redbirdMem: Math.floor(redbirdSurge ? 420 + Math.random() * 50 : 310 + Math.random() * 25),
          devopsCpu: Math.floor(devopsSurge ? 70 + Math.random() * 20 : 12 + Math.random() * 7),
          devopsMem: Math.floor(devopsSurge ? 280 + Math.random() * 30 : 185 + Math.random() * 15),
          dreamhouseCpu: Math.floor(dreamSurge ? 58 + Math.random() * 22 : 9 + Math.random() * 6),
          dreamhouseMem: Math.floor(dreamSurge ? 190 + Math.random() * 25 : 135 + Math.random() * 10),
          visionCpu: Math.floor(visionSurge ? 64 + Math.random() * 24 : 7 + Math.random() * 5),
          visionMem: Math.floor(visionSurge ? 380 + Math.random() * 45 : 240 + Math.random() * 20),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [swarmState, isProcessing, speakerMode, isVisionActive]);

  const triggerNotification = useCallback((title: string, message: string) => {
    setNotification({ visible: true, title, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
    }, 4500);
  }, []);

  // Hydrate authenticated Firebase user's profile, projects, workspace documents, chat histories, and music tracks
  const hydrateUserAccount = useCallback(async (user: User) => {
    const uid = user.uid;
    setIsCloudSyncing(true);
    try {
      const profile = await syncUserProfileToFirestore(user);
      setUserProfile(profile);

      let remoteProjects = await loadUserProjectsFromFirestore(uid);
      if (remoteProjects.length === 0) {
        const seededProjects = DEFAULT_ASTRA_PROJECTS.map((p) => ({ ...p, userId: uid }));
        remoteProjects = seededProjects;
        await Promise.all(
          seededProjects.map(async (proj) => {
            await saveUserProjectToFirestore(uid, proj);
            const seedFiles = INITIAL_PROJECT_FILES[proj.id] || [];
            await Promise.all(seedFiles.map((f) => saveProjectDocumentToFirestore(uid, proj.id, f)));
            const seedMsgs = INITIAL_PROJECT_MESSAGES[proj.id] || [];
            await Promise.all(seedMsgs.map((m) => saveProjectMessageToFirestore(uid, proj.id, m)));
          })
        );
      }

      setProjects(remoteProjects);
      const cachedActiveId = localStorage.getItem(`astra_active_project_u_${uid}`);
      const targetActiveId =
        cachedActiveId && remoteProjects.some((p) => p.id === cachedActiveId)
          ? cachedActiveId
          : remoteProjects[0].id;
      setActiveProjectId(targetActiveId);

      const [remoteDocs, remoteMsgs, remoteTracks] = await Promise.all([
        loadProjectDocumentsFromFirestore(uid, targetActiveId),
        loadProjectMessagesFromFirestore(uid, targetActiveId),
        loadUserMusicTracksFromFirestore(uid),
      ]);

      const resolvedFiles =
        remoteDocs.length > 0 ? remoteDocs : INITIAL_PROJECT_FILES[targetActiveId] || [];
      const resolvedMsgs =
        remoteMsgs.length > 0 ? remoteMsgs : INITIAL_PROJECT_MESSAGES[targetActiveId] || [];

      setWorkspaceFiles(resolvedFiles);
      setActiveFileIndex(0);
      setMessages(resolvedMsgs);
      setProjectWorkspaces((prev) => ({ ...prev, [targetActiveId]: resolvedFiles }));
      setProjectChatHistories((prev) => ({ ...prev, [targetActiveId]: resolvedMsgs }));
      if (remoteTracks.length > 0) {
        setSavedMusicTracks(remoteTracks);
      }
    } catch (err) {
      console.warn('Account cloud sync warning:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  }, []);

  // Optional Firebase Auth Listener
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        setAuthUser(user);
        setCloudAuthModalOpen(false);
        hydrateUserAccount(user);
      } else {
        setAuthUser(null);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [hydrateUserAccount]);

  // Persist non-sensitive project documents/messages locally (never auth tokens!)
  useEffect(() => {
    try {
      const prefix = authUser ? `astra_u_${authUser.uid}` : LOCAL_STUDIO_PREFIX;
      localStorage.setItem(`${prefix}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${prefix}_active`, activeProjectId);
      localStorage.setItem(`${prefix}_workspaces`, JSON.stringify(projectWorkspaces));
      localStorage.setItem(`${prefix}_chats`, JSON.stringify(projectChatHistories));
      localStorage.setItem(`${prefix}_music`, JSON.stringify(savedMusicTracks));
      if (authUser) {
        localStorage.setItem(`astra_active_project_u_${authUser.uid}`, activeProjectId);
      }
    } catch (e) {
      console.warn('Workspace local cache error:', e);
    }
  }, [authUser, projects, activeProjectId, projectWorkspaces, projectChatHistories, savedMusicTracks]);

  // Sync active project file/message counts
  useEffect(() => {
    setProjectWorkspaces((prev) => ({
      ...prev,
      [activeProjectId]: workspaceFiles,
    }));
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, fileCount: workspaceFiles.length, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, [workspaceFiles, activeProjectId]);

  useEffect(() => {
    setProjectChatHistories((prev) => ({
      ...prev,
      [activeProjectId]: messages,
    }));
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, messageCount: messages.length, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, [messages, activeProjectId]);

  const stopVisionStream = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVisionActive(false);
    setSwarmState((prev) => ({ ...prev, vision: 'standby' }));
  }, []);

  const disconnectUplink = useCallback(() => {
    setConnectionState('offline');
    setSpeakerMode('idle');
    setSpeakerText('SYSTEM OFFLINE');
    setSwarmState((prev) => ({ ...prev, nlp: 'standby' }));
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore close error
      }
      wsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch {
        // ignore close error
      }
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch {
        // ignore close error
      }
      outputAudioCtxRef.current = null;
    }
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore stop error
      }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    stopVisionStream();
  }, [stopVisionStream]);

  // Cleanup live voice & vision on unmount
  useEffect(() => {
    return () => {
      disconnectUplink();
    };
  }, [disconnectUplink]);

  const handleSelectProject = useCallback(
    async (newProjectId: string) => {
      if (newProjectId === activeProjectId) return;
      const targetProject = projects.find((p) => p.id === newProjectId);
      if (!targetProject) return;

      setProjectWorkspaces((prev) => ({
        ...prev,
        [activeProjectId]: workspaceFiles,
      }));
      setProjectChatHistories((prev) => ({
        ...prev,
        [activeProjectId]: messages,
      }));

      setActiveProjectId(newProjectId);

      const targetFiles = projectWorkspaces[newProjectId] || INITIAL_PROJECT_FILES[newProjectId] || [];
      const targetMessages = projectChatHistories[newProjectId] || INITIAL_PROJECT_MESSAGES[newProjectId] || [];

      setWorkspaceFiles(targetFiles);
      setActiveFileIndex(0);
      setMessages(targetMessages);

      if (authUser) {
        try {
          const [remoteDocs, remoteMsgs] = await Promise.all([
            loadProjectDocumentsFromFirestore(authUser.uid, newProjectId),
            loadProjectMessagesFromFirestore(authUser.uid, newProjectId),
          ]);
          if (remoteDocs.length > 0) {
            setWorkspaceFiles(remoteDocs);
            setProjectWorkspaces((prev) => ({ ...prev, [newProjectId]: remoteDocs }));
          }
          if (remoteMsgs.length > 0) {
            setMessages(remoteMsgs);
            setProjectChatHistories((prev) => ({ ...prev, [newProjectId]: remoteMsgs }));
          }
        } catch (err) {
          console.warn('Cloud project switch sync warning:', err);
        }
      }

      triggerNotification('PROJECT SWITCHED', `সক্রিয় প্রজেক্ট: ${targetProject.name}`);
    },
    [activeProjectId, projects, workspaceFiles, messages, projectWorkspaces, projectChatHistories, authUser, triggerNotification]
  );

  const handleCreateProject = useCallback(
    (payload: CreateProjectPayload) => {
      const newId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      const seedFiles = TEMPLATE_SEED_FILES[payload.template] || [];
      const userName = userProfile?.displayName || authUser?.displayName || 'Studio Principal';
      const seedMessages: ChatMessage[] = [
        {
          id: `msg-sys-${Date.now()}`,
          role: 'system',
          content: `Workspace initialized for: ${payload.name} (${payload.category})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          projectId: newId,
        },
        {
          id: `msg-agent-${Date.now()}`,
          role: 'agent',
          content: `${userName}, '${payload.name}' প্রজেক্টের জন্য ডেডিকেটেড ওয়ার্কস্পেস ও চ্যাট প্রস্তুত করা হয়েছে। লাইভ অডিও বা নিচের কমান্ডের মাধ্যমে কাজ শুরু করুন।`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          projectId: newId,
        },
      ];

      const newProject: AstraProject = {
        id: newId,
        name: payload.name,
        category: payload.category,
        description: payload.description,
        color: payload.color,
        createdAt: nowIso,
        updatedAt: nowIso,
        fileCount: seedFiles.length,
        messageCount: seedMessages.length,
        userId: authUser?.uid,
      };

      setProjectWorkspaces((prev) => ({
        ...prev,
        [activeProjectId]: workspaceFiles,
        [newId]: seedFiles,
      }));
      setProjectChatHistories((prev) => ({
        ...prev,
        [activeProjectId]: messages,
        [newId]: seedMessages,
      }));

      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(newId);
      setWorkspaceFiles(seedFiles);
      setActiveFileIndex(0);
      setMessages(seedMessages);

      if (authUser) {
        saveUserProjectToFirestore(authUser.uid, newProject).catch(() => {});
        seedFiles.forEach((f) => saveProjectDocumentToFirestore(authUser.uid, newId, f).catch(() => {}));
        seedMessages.forEach((m) => saveProjectMessageToFirestore(authUser.uid, newId, m).catch(() => {}));
      }

      triggerNotification('NEW PROJECT CREATED', `প্রজেক্ট তৈরি সম্পন্ন: ${newProject.name}`);
    },
    [activeProjectId, workspaceFiles, messages, authUser, userProfile, triggerNotification]
  );

  const handleUpdateProject = useCallback(
    (id: string, updates: Partial<AstraProject>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
            if (authUser) {
              saveUserProjectToFirestore(authUser.uid, updated).catch(() => {});
            }
            return updated;
          }
          return p;
        })
      );
      triggerNotification('PROJECT UPDATED', 'প্রজেক্টের তথ্য সফলভাবে আপডেট করা হয়েছে');
    },
    [authUser, triggerNotification]
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      if (projects.length <= 1) {
        triggerNotification('CANNOT DELETE', 'সর্বনিম্ন একটি সক্রিয় প্রজেক্ট থাকা আবশ্যক।');
        return;
      }

      const remaining = projects.filter((p) => p.id !== id);
      const targetToDelete = projects.find((p) => p.id === id);

      setProjects(remaining);

      if (activeProjectId === id) {
        const nextActive = remaining[0];
        setActiveProjectId(nextActive.id);
        const nextFiles = projectWorkspaces[nextActive.id] || INITIAL_PROJECT_FILES[nextActive.id] || [];
        const nextMessages = projectChatHistories[nextActive.id] || INITIAL_PROJECT_MESSAGES[nextActive.id] || [];
        setWorkspaceFiles(nextFiles);
        setActiveFileIndex(0);
        setMessages(nextMessages);
      }

      setProjectWorkspaces((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setProjectChatHistories((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (authUser) {
        deleteUserProjectFromFirestore(authUser.uid, id).catch(() => {});
      }

      triggerNotification('PROJECT REMOVED', `ডিলিট সম্পন্ন: ${targetToDelete?.name || ''}`);
    },
    [projects, activeProjectId, projectWorkspaces, projectChatHistories, authUser, triggerNotification]
  );

  const handleDuplicateProject = useCallback(
    (id: string) => {
      const src = projects.find((p) => p.id === id);
      if (!src) return;

      const newId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      const srcFiles = projectWorkspaces[id] || workspaceFiles;
      const clonedFiles: WorkspaceFileUpdate[] = JSON.parse(JSON.stringify(srcFiles));

      const clonedProject: AstraProject = {
        ...src,
        id: newId,
        name: `${src.name} (Copy)`,
        createdAt: nowIso,
        updatedAt: nowIso,
        fileCount: clonedFiles.length,
        messageCount: 1,
        isDefault: false,
        userId: authUser?.uid,
      };

      const initialCloneMsg: ChatMessage[] = [
        {
          id: `msg-clone-${Date.now()}`,
          role: 'system',
          content: `Cloned workspace from: ${src.name}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          projectId: newId,
        },
      ];

      setProjects((prev) => [clonedProject, ...prev]);
      setProjectWorkspaces((prev) => ({
        ...prev,
        [newId]: clonedFiles,
      }));
      setProjectChatHistories((prev) => ({
        ...prev,
        [newId]: initialCloneMsg,
      }));

      if (authUser) {
        saveUserProjectToFirestore(authUser.uid, clonedProject).catch(() => {});
        clonedFiles.forEach((f) => saveProjectDocumentToFirestore(authUser.uid, newId, f).catch(() => {}));
        initialCloneMsg.forEach((m) => saveProjectMessageToFirestore(authUser.uid, newId, m).catch(() => {}));
      }

      handleSelectProject(newId);
      triggerNotification('PROJECT DUPLICATED', `'${src.name}' প্রজেক্টের প্রতিলিপি তৈরি হয়েছে`);
    },
    [projects, projectWorkspaces, workspaceFiles, authUser, handleSelectProject, triggerNotification]
  );

  const handleSaveMusicTrack = useCallback(
    (track: MusicComposition) => {
      const enriched: MusicComposition = { ...track, userId: authUser?.uid };
      setSavedMusicTracks((prev) => [enriched, ...prev.filter((t) => t.id !== enriched.id)]);
      if (authUser) {
        saveUserMusicTrackToFirestore(authUser.uid, enriched).catch(() => {});
      }
      triggerNotification('TRACK MASTERED', `তৈরি সম্পন্ন: ${track.title}`);
    },
    [authUser, triggerNotification]
  );

  const handleDeleteMusicTrack = useCallback(
    (trackId: string) => {
      setSavedMusicTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (authUser) {
        deleteUserMusicTrackFromFirestore(authUser.uid, trackId).catch(() => {});
      }
      triggerNotification('TRACK REMOVED', 'মিউজিক ট্র্যাক লাইব্রেরি থেকে সরানো হয়েছে');
    },
    [authUser, triggerNotification]
  );

  const handleClearActiveTranscript = useCallback(() => {
    const oldIds = messages.map((m) => m.id);
    setMessages([]);
    if (authUser && oldIds.length > 0) {
      clearProjectMessagesInFirestore(authUser.uid, activeProjectId, oldIds).catch(() => {});
    }
  }, [messages, authUser, activeProjectId]);

  const handleCloudSignOut = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
    setAuthUser(null);
    setUserProfile(null);
    triggerNotification('CLOUD SYNC PAUSED', 'ফায়ারবেস ক্লাউড অ্যাকাউন্ট থেকে সাইন আউট সম্পন্ন');
  }, [triggerNotification]);

  const handleUpdateWorkspace = useCallback(
    (file: WorkspaceFileUpdate) => {
      if (file.filename.includes('invoice') || file.filename.includes('packing') || file.filename.includes('red_bird')) {
        setSwarmState((prev) => ({ ...prev, redbird: 'active' }));
      } else if (file.filename.includes('deploy') || file.filename.includes('gitlab') || file.filename.includes('vercel')) {
        setSwarmState((prev) => ({ ...prev, devops: 'active' }));
      } else if (file.filename.includes('dream') || file.filename.includes('iot')) {
        setSwarmState((prev) => ({ ...prev, dreamhouse: 'active' }));
      } else {
        setSwarmState((prev) => ({ ...prev, nlp: 'active' }));
      }

      triggerNotification('AUTONOMOUS AGENT ACTION', `ফাইল আপডেট সম্পন্ন: ${file.filename}`);

      const currentFiles = workspaceFilesRef.current;
      const existingIdx = currentFiles.findIndex((f) => f.filename === file.filename);
      const now = new Date();
      const timestamp =
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lines = file.content.split('\n').length;

      let persistedFile: WorkspaceFileUpdate;
      let nextFiles: WorkspaceFileUpdate[];
      let targetIdx: number;

      if (existingIdx >= 0) {
        const existing = currentFiles[existingIdx];
        const prevVersions = existing.versions || [];
        const nextVersionNum = prevVersions.length > 0 ? prevVersions[0].versionNumber + 1 : 2;
        const newVersion: FileVersion = {
          id: `v${nextVersionNum}-${Date.now()}`,
          versionNumber: nextVersionNum,
          timestamp,
          relativeTime: 'Just now',
          author: 'Astra Agent',
          summary: `Astra-Gravity স্বয়ংক্রিয় আপডেট (${file.language})`,
          content: file.content,
          language: file.language,
          lineCount: lines,
          charCount: file.content.length,
          diffStats: {
            addedLines: Math.abs(lines - existing.content.split('\n').length),
            removedLines: 0,
          },
        };
        persistedFile = { ...file, versions: [newVersion, ...prevVersions] };
        nextFiles = [...currentFiles];
        nextFiles[existingIdx] = persistedFile;
        targetIdx = existingIdx;
      } else {
        const newVersion: FileVersion = {
          id: `v1-${Date.now()}`,
          versionNumber: 1,
          timestamp,
          relativeTime: 'Just now',
          author: 'Astra Agent',
          summary: 'Astra-Gravity নতুন ফাইল তৈরি',
          content: file.content,
          language: file.language,
          lineCount: lines,
          charCount: file.content.length,
          diffStats: { addedLines: lines, removedLines: 0 },
        };
        persistedFile = { ...file, versions: [newVersion] };
        nextFiles = [...currentFiles, persistedFile];
        targetIdx = currentFiles.length;
      }

      setWorkspaceFiles(nextFiles);
      setActiveFileIndex(targetIdx);
      setHasWorkspaceUnread(true);

      const currentUser = authUserRef.current;
      const currentProjId = activeProjectIdRef.current;
      if (currentUser && currentProjId) {
        saveProjectDocumentToFirestore(currentUser.uid, currentProjId, persistedFile).catch(() => {});
      }

      setTimeout(() => {
        setSwarmState((prev) => ({
          ...prev,
          nlp: 'online',
          redbird: 'online',
          devops: 'online',
          dreamhouse: 'online',
        }));
      }, 2500);
    },
    [triggerNotification]
  );

  const handleUpdateFileContent = useCallback(
    (fileIndex: number, newContent: string) => {
      const currentFiles = workspaceFilesRef.current;
      if (fileIndex < 0 || fileIndex >= currentFiles.length) return;
      const target = currentFiles[fileIndex];
      const prevVersions = target.versions || [];
      const nextVersionNum = prevVersions.length > 0 ? prevVersions[0].versionNumber + 1 : 2;
      const now = new Date();
      const timestamp =
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lines = newContent.split('\n').length;

      const editEntry: FileVersion = {
        id: `v${nextVersionNum}-edit-${Date.now()}`,
        versionNumber: nextVersionNum,
        timestamp,
        relativeTime: 'Just now',
        author: userProfile?.displayName || 'Studio Editor',
        summary: 'ম্যানুয়াল কোড/ডকুমেন্ট এডিট',
        content: newContent,
        language: target.language,
        lineCount: lines,
        charCount: newContent.length,
      };

      const updatedFile: WorkspaceFileUpdate = {
        ...target,
        content: newContent,
        versions: [editEntry, ...prevVersions],
      };

      const nextFiles = [...currentFiles];
      nextFiles[fileIndex] = updatedFile;
      setWorkspaceFiles(nextFiles);

      const currentUser = authUserRef.current;
      const currentProjId = activeProjectIdRef.current;
      if (currentUser && currentProjId) {
        saveProjectDocumentToFirestore(currentUser.uid, currentProjId, updatedFile).catch(() => {});
      }

      triggerNotification('FILE SAVED', `${target.filename} (v${nextVersionNum}) সংরক্ষিত হয়েছে`);
    },
    [triggerNotification, userProfile]
  );

  const handleRevertFileVersion = useCallback(
    (fileIndex: number, version: FileVersion) => {
      const currentFiles = workspaceFilesRef.current;
      if (fileIndex < 0 || fileIndex >= currentFiles.length) return;
      const target = currentFiles[fileIndex];
      const prevVersions = target.versions || [];
      const nextVersionNum = prevVersions.length > 0 ? prevVersions[0].versionNumber + 1 : version.versionNumber + 1;
      const now = new Date();
      const timestamp =
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const revertEntry: FileVersion = {
        id: `v${nextVersionNum}-revert-${Date.now()}`,
        versionNumber: nextVersionNum,
        timestamp,
        relativeTime: 'Just now',
        author: userProfile?.displayName || 'Studio User',
        summary: `v${version.versionNumber} থেকে রিভার্ট (${version.summary})`,
        content: version.content,
        language: version.language,
        lineCount: version.lineCount,
        charCount: version.charCount,
      };

      const revertedFile: WorkspaceFileUpdate = {
        ...target,
        content: version.content,
        language: version.language,
        versions: [revertEntry, ...prevVersions],
      };

      const nextFiles = [...currentFiles];
      nextFiles[fileIndex] = revertedFile;
      setWorkspaceFiles(nextFiles);

      const currentUser = authUserRef.current;
      const currentProjId = activeProjectIdRef.current;
      if (currentUser && currentProjId) {
        saveProjectDocumentToFirestore(currentUser.uid, currentProjId, revertedFile).catch(() => {});
      }

      triggerNotification('VERSION REVERTED', `${target.filename} সফলভাবে v${version.versionNumber}-এ ফিরে গেছে`);
    },
    [triggerNotification, userProfile]
  );

  const handleSaveManualSnapshot = useCallback(
    (fileIndex: number, summary: string, author = 'Studio User') => {
      const currentFiles = workspaceFilesRef.current;
      if (fileIndex < 0 || fileIndex >= currentFiles.length) return;
      const target = currentFiles[fileIndex];
      const prevVersions = target.versions || [];
      const nextVersionNum = prevVersions.length > 0 ? prevVersions[0].versionNumber + 1 : 2;
      const now = new Date();
      const timestamp =
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lines = target.content.split('\n').length;

      const manualEntry: FileVersion = {
        id: `v${nextVersionNum}-manual-${Date.now()}`,
        versionNumber: nextVersionNum,
        timestamp,
        relativeTime: 'Just now',
        author: userProfile?.displayName || author,
        summary: summary || 'ম্যানুয়াল স্ন্যাপশট',
        content: target.content,
        language: target.language,
        lineCount: lines,
        charCount: target.content.length,
      };

      const snapFile: WorkspaceFileUpdate = {
        ...target,
        versions: [manualEntry, ...prevVersions],
      };

      const nextFiles = [...currentFiles];
      nextFiles[fileIndex] = snapFile;
      setWorkspaceFiles(nextFiles);

      const currentUser = authUserRef.current;
      const currentProjId = activeProjectIdRef.current;
      if (currentUser && currentProjId) {
        saveProjectDocumentToFirestore(currentUser.uid, currentProjId, snapFile).catch(() => {});
      }

      triggerNotification('SNAPSHOT RECORDED', 'ম্যানুয়াল চেকপয়েন্ট সফলভাবে সংরক্ষিত হয়েছে');
    },
    [triggerNotification, userProfile]
  );

  const handlePlaySpeech = useCallback(
    async (text: string, audioBase64?: string) => {
      const resetSpeaker = () => {
        setSpeakerMode(connectionState === 'connected' ? 'user' : 'idle');
        setSpeakerText(connectionState === 'connected' ? 'LISTENING TO MICROPHONE' : 'SYSTEM OFFLINE');
      };

      if (audioBase64) {
        setSpeakerMode('agent');
        setSpeakerText('ASTRA-GRAVITY SPEAKING');
        const audio = playWavBase64(audioBase64);
        audio.onended = resetSpeaker;
        audio.onerror = resetSpeaker;
        return;
      }
      try {
        setSpeakerMode('agent');
        setSpeakerText('ASTRA-GRAVITY SPEAKING');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (vaultToken) headers.Authorization = `Bearer ${vaultToken}`;

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice: 'Kore' }),
        });
        if (res.status === 401) {
          resetSpeaker();
          onSessionExpired?.();
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.audio) {
          throw new Error(data.error || 'Speech generation unavailable');
        }
        const audio = playWavBase64(data.audio);
        audio.onended = resetSpeaker;
        audio.onerror = resetSpeaker;
      } catch (err) {
        console.warn('TTS playback error:', err);
        resetSpeaker();
        triggerNotification(
          'VOICE SYNTHESIS ERROR',
          err instanceof Error ? err.message : 'TTS audio playback failed'
        );
      }
    },
    [connectionState, vaultToken, onSessionExpired, triggerNotification]
  );

  // Connect to Authenticated Live Neural Uplink (/live)
  const connectUplink = async () => {
    if (!vaultToken) {
      onSessionExpired?.();
      return;
    }
    try {
      setConnectionState('connecting');
      setSpeakerText('AUTHORIZING UPLINK...');

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      micStreamRef.current = micStream;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const startAudioStreaming = async () => {
        try {
          const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          await inputCtx.audioWorklet.addModule(blobUrl);
          const source = inputCtx.createMediaStreamSource(micStream);
          const workletNode = new AudioWorkletNode(inputCtx, 'astra-audio-recorder');
          workletNode.port.onmessage = (event) => {
            if (ws.readyState === WebSocket.OPEN) {
              const base64Pcm = float32ToPcmBase64(event.data);
              ws.send(JSON.stringify({ type: 'audio', payload: { data: base64Pcm } }));
              setMetrics((m) => ({ ...m, audioChunksSent: m.audioChunksSent + 1 }));
            }
          };
          source.connect(workletNode);
          workletNode.connect(inputCtx.destination);
        } catch (workletErr) {
          console.warn('AudioWorklet fallback to ScriptProcessor:', workletErr);
          const source = inputCtx.createMediaStreamSource(micStream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const base64Pcm = float32ToPcmBase64(inputData);
              ws.send(JSON.stringify({ type: 'audio', payload: { data: base64Pcm } }));
              setMetrics((m) => ({ ...m, audioChunksSent: m.audioChunksSent + 1 }));
            }
          };
          source.connect(processor);
          processor.connect(inputCtx.destination);
        }
      };

      ws.onopen = () => {
        // Send vault session token before sending any media streams
        ws.send(JSON.stringify({ type: 'auth', token: vaultToken }));
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'authOk') {
            setConnectionState('connected');
            setSpeakerMode('user');
            setSpeakerText('LISTENING TO MICROPHONE');
            setSwarmState((prev) => ({ ...prev, nlp: 'online' }));
            triggerNotification('NEURAL UPLINK ESTABLISHED', 'Astra-Gravity লাইভ অডিও সক্রিয়');
            await startAudioStreaming();
            return;
          }

          if (msg.type === 'toolCall' && msg.payload) {
            const { name, args } = msg.payload;
            if (name === 'update_workspace' && args) {
              handleUpdateWorkspace({
                filename: args.filename || 'generated_file.txt',
                language: args.language || 'markdown',
                content: args.content || '',
              });
            }
          }
          if (msg.type === 'outputTranscription' && msg.payload?.text) {
            transcriptOutputBufRef.current += msg.payload.text;
            setSwarmState((prev) => ({ ...prev, nlp: 'active' }));
          }
          if (msg.type === 'inputTranscription' && msg.payload?.text) {
            transcriptInputBufRef.current += msg.payload.text;
            setSwarmState((prev) => ({ ...prev, nlp: 'active' }));
          }
          if (msg.type === 'turnComplete') {
            const userInput = transcriptInputBufRef.current.trim();
            const agentReply = transcriptOutputBufRef.current.trim();
            const currentUser = authUserRef.current;
            const currentProjId = activeProjectIdRef.current;

            if (userInput) {
              const userMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: userInput,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                projectId: currentProjId,
              };
              setMessages((prev) => [...prev, userMsg]);
              if (currentUser && currentProjId) {
                saveProjectMessageToFirestore(currentUser.uid, currentProjId, userMsg).catch(() => {});
              }
              transcriptInputBufRef.current = '';
            }
            if (agentReply) {
              const agentMsg: ChatMessage = {
                id: `agent-${Date.now() + 1}`,
                role: 'agent',
                content: agentReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                projectId: currentProjId,
              };
              setMessages((prev) => [...prev, agentMsg]);
              if (currentUser && currentProjId) {
                saveProjectMessageToFirestore(currentUser.uid, currentProjId, agentMsg).catch(() => {});
              }
              transcriptOutputBufRef.current = '';
            }
            setSwarmState((prev) => ({ ...prev, nlp: 'online' }));
          }
          if (msg.type === 'audio' && msg.payload?.data && voiceOutputEnabled) {
            setSpeakerMode('agent');
            setSpeakerText('ASTRA-GRAVITY SPEAKING');
            if (outputCtx) {
              const audioBuffer = decodePcmToAudioBuffer(msg.payload.data, outputCtx, 24000);
              const sourceNode = outputCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(sourceNode);
              sourceNode.onended = () => {
                activeSourcesRef.current.delete(sourceNode);
                if (activeSourcesRef.current.size === 0) {
                  setSpeakerMode('user');
                  setSpeakerText('LISTENING TO MICROPHONE');
                }
              };
            }
          }
          if (msg.type === 'interrupted') {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // ignore stop
              }
            });
            activeSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setSpeakerMode('user');
            setSpeakerText('LISTENING TO MICROPHONE');
          }
          if (msg.type === 'error') {
            const errMessage = msg.payload?.message || 'Gemini Live uplink error';
            console.warn('[Live Uplink Warning]:', errMessage);
            triggerNotification('LIVE UPLINK ERROR', errMessage);
          }
        } catch (parseErr) {
          console.error('Error processing websocket message:', parseErr);
        }
      };

      ws.onerror = () => {
        disconnectUplink();
      };
      ws.onclose = (ev) => {
        disconnectUplink();
        if (ev.code === 4001) {
          onSessionExpired?.();
        }
      };
    } catch (err) {
      console.error('Neural Uplink Connection Failure:', err);
      setConnectionState('error');
      setSpeakerText('SYSTEM OFFLINE');
      triggerNotification('HARDWARE PERMISSION ERROR', 'মাইক্রোফোন সংযোগ চালু করা যায়নি। ব্রাউজার পারমিশন চেক করুন।');
      disconnectUplink();
    }
  };

  const toggleVisionStream = async (source: 'screen' | 'camera') => {
    if (isVisionActive && visionSource === source) {
      stopVisionStream();
      return;
    }
    if (isVisionActive) {
      stopVisionStream();
    }

    try {
      const stream =
        source === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({
              video: { frameRate: 1 } as MediaTrackConstraints,
              audio: false,
            })
          : await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 },
              audio: false,
            });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsVisionActive(true);
      setVisionSource(source);
      setSwarmState((prev) => ({ ...prev, vision: 'online' }));
      triggerNotification(
        'VISION TELEMETRY ONLINE',
        `${source === 'screen' ? 'স্ক্রিন শেয়ারিং' : 'ক্যামেরা লাইভ'} স্ট্রিমিং চালু`
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      visionIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !videoRef.current.videoWidth) return;
        canvas.width = Math.min(640, videoRef.current.videoWidth);
        canvas.height = (canvas.width / videoRef.current.videoWidth) * videoRef.current.videoHeight;
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const b64 = (reader.result as string).split(',')[1];
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        type: 'image',
                        payload: { data: b64, mimeType: 'image/jpeg' },
                      })
                    );
                    setMetrics((m) => ({ ...m, visionFramesSent: m.visionFramesSent + 1 }));
                  }
                };
                reader.readAsDataURL(blob);
              }
            },
            'image/jpeg',
            0.5
          );
        }
      }, 3000);

      stream.getVideoTracks()[0].onended = () => {
        stopVisionStream();
      };
    } catch {
      triggerNotification('VISION CANCELLED', 'স্ক্রিন শেয়ারিং বাতিল করা হয়েছে');
      stopVisionStream();
    }
  };

  const handleSendPromptMessage = useCallback(
    async (text: string, imageAttachment?: { data: string; mimeType: string }) => {
      if (!text && !imageAttachment) return;
      const currentUser = authUserRef.current;
      const currentProjId = activeProjectIdRef.current;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        projectId: currentProjId,
        imagePreview: imageAttachment ? `data:${imageAttachment.mimeType};base64,${imageAttachment.data}` : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      if (currentUser && currentProjId) {
        saveProjectMessageToFirestore(currentUser.uid, currentProjId, userMessage).catch(() => {});
      }

      setIsProcessing(true);
      setSwarmState((prev) => ({ ...prev, nlp: 'active' }));

      try {
        const historyPayload = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (vaultToken) headers.Authorization = `Bearer ${vaultToken}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: text,
            history: historyPayload,
            image: imageAttachment,
            voiceResponse: voiceOutputEnabled,
            language: preferredLanguage,
          }),
        });

        if (res.status === 401) {
          onSessionExpired?.();
          return;
        }

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const executedTools: WorkspaceFileUpdate[] = [];
        if (Array.isArray(data.toolCalls)) {
          for (const call of data.toolCalls) {
            if (call.name === 'update_workspace' && call.args) {
              const toolFile: WorkspaceFileUpdate = {
                filename: call.args.filename || 'generated_workspace.txt',
                language: call.args.language || 'text',
                content: call.args.content || '',
              };
              handleUpdateWorkspace(toolFile);
              executedTools.push(toolFile);
            }
          }
        }

        const agentMessage: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          role: 'agent',
          content: data.text || 'কাজটি সম্পন্ন করা হয়েছে।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          projectId: currentProjId,
          toolCalls: executedTools,
          audioBase64: data.audio,
        };

        setMessages((prev) => [...prev, agentMessage]);
        if (currentUser && currentProjId) {
          saveProjectMessageToFirestore(currentUser.uid, currentProjId, agentMessage).catch(() => {});
        }

        if (voiceOutputEnabled) {
          if (data.audio) {
            playWavBase64(data.audio);
          } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              const clean = (data.text || '').replace(/[*#_`~[\]]/g, '').slice(0, 350);
              const utter = new SpeechSynthesisUtterance(clean);
              utter.lang = preferredLanguage === 'bn' ? 'bn-BD' : 'en-US';
              utter.rate = 1.0;
              window.speechSynthesis.speak(utter);
            } catch {
              // ignore speech synthesis fallback error
            }
          }
        }
      } catch (err) {
        console.error('Chat request failure:', err);
        const fallbackReply =
          'সুমন ভাই, সার্ভারের রেট লিমিটের কারণে কিছুটা বিলম্ব হচ্ছে, তবে আমি আপনার সাথেই আছি। আপনার রিকুয়েস্টটি পুনরায় পাঠাতে পারেন অথবা অন্য যেকোনো কাজের নির্দেশ দিতে পারেন।';
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-fallback-${Date.now()}`,
            role: 'agent',
            content: fallbackReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsProcessing(false);
        setSwarmState((prev) => ({ ...prev, nlp: 'online' }));
      }
    },
    [messages, vaultToken, voiceOutputEnabled, preferredLanguage, onSessionExpired, handleUpdateWorkspace]
  );

  const handleCaptureFrameAsPrompt = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const b64 = dataUrl.split(',')[1];
      handleSendPromptMessage('এই স্ক্রিনের তথ্য পর্যালোচনা করে সমাধান দিন', {
        data: b64,
        mimeType: 'image/jpeg',
      });
    }
  };

  const handleOpenWorkspaceFile = useCallback(
    (filename: string) => {
      const idx = workspaceFilesRef.current.findIndex((f) => f.filename === filename);
      if (idx >= 0) {
        setActiveFileIndex(idx);
      }
      setActiveTab('workspace');
      setMobileTab('workspace');
      setHasWorkspaceUnread(false);
    },
    []
  );

  useEffect(() => {
    if (initialQuery) {
      handleSendPromptMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const railNavItems: { id: StudioTab; label: string; icon: React.ReactNode; accent: string }[] = [
    {
      id: 'terminal',
      label: 'Voice & Terminal',
      icon: <Terminal className="h-4 w-4 text-cyan-400" />,
      accent: 'border-cyan-400/50 bg-[#111623] text-white',
    },
    {
      id: 'workspace',
      label: 'Autonomous Workspace',
      icon: <Laptop className="h-4 w-4 text-cyan-300" />,
      accent: 'border-cyan-400/50 bg-[#111623] text-white',
    },
    {
      id: 'music',
      label: 'Music & Lyrics Lab',
      icon: <Music className="h-4 w-4 text-amber-400" />,
      accent: 'border-amber-400/50 bg-[#111623] text-white',
    },
    {
      id: 'telemetry',
      label: 'Host Telemetry',
      icon: <Activity className="h-4 w-4 text-emerald-400" />,
      accent: 'border-emerald-400/50 bg-[#111623] text-white',
    },
  ];

  return (
    <div
      className={`flex flex-col h-[calc(100vh-88px)] min-h-[620px] w-full bg-[#0B0E17] text-slate-100 rounded-2xl overflow-hidden relative border border-[#1A2233] shadow-2xl ${className}`}
    >
      {/* Action Notification */}
      <ActionNotification
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
      />

      {/* Info Modal */}
      <InfoModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} />

      {/* Daily Summary Modal */}
      <DailySummaryModal isOpen={dailySummaryOpen} onClose={() => setDailySummaryOpen(false)} />

      {/* Vault Security Modal */}
      {vaultToken && onLockVault && onTokenRotated && onSessionExpired && (
        <VaultSecurityModal
          isOpen={securityModalOpen}
          onClose={() => setSecurityModalOpen(false)}
          vaultToken={vaultToken}
          vaultMode={vaultMode}
          vaultExpiresAt={vaultExpiresAt}
          onLockVault={onLockVault}
          onTokenRotated={onTokenRotated}
          onSessionExpired={onSessionExpired}
        />
      )}

      {/* Optional Firebase Cloud Sync Modal (without blocking studio entry) */}
      {cloudAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-[#1E2738] bg-[#07090F] overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setCloudAuthModalOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-lg border border-[#243047] bg-[#0B0E17] p-2 text-slate-400 hover:text-white"
              aria-label="Close cloud sign in"
            >
              <X className="h-4 w-4" />
            </button>
            <AstraAuthGate onAuthSuccess={(u) => setAuthUser(u)} />
          </div>
        </div>
      )}

      {/* Contextual Studio Header Bar */}
      <header className="px-4 py-2.5 border-b border-[#1A2233] bg-[#090C14] flex flex-wrap justify-between items-center z-20 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <InfinityIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-display font-bold text-white truncate">
                {activeProject.name}
              </span>
              <span className="text-slate-600">/</span>
              <span className="font-mono text-cyan-300 truncate">{MODE_LABELS[activeTab]}</span>
            </div>
            <p className="font-mono text-[11px] text-slate-500 tabular-nums">
              {projects.length} projects · {workspaceFiles.length} files · {savedMusicTracks.length} tracks
              {isCloudSyncing ? ' · syncing cloud...' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Language Switch */}
          <div className="flex items-center bg-[#07090F] border border-[#1A2233] rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setPreferredLanguage('bn')}
              className={`px-2 py-1 rounded transition-colors font-semibold ${
                preferredLanguage === 'bn' ? 'bg-[#111623] text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setPreferredLanguage('en')}
              className={`px-2 py-1 rounded transition-colors font-semibold ${
                preferredLanguage === 'en' ? 'bg-[#111623] text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              ENG
            </button>
          </div>

          {/* Voice Output Toggle */}
          <button
            type="button"
            onClick={() => setVoiceOutputEnabled((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer text-[11px] ${
              voiceOutputEnabled
                ? 'bg-[#07090F] border-cyan-500/40 text-cyan-300'
                : 'bg-[#07090F] border-[#1A2233] text-slate-500'
            }`}
            title={voiceOutputEnabled ? 'Voice Output ON' : 'Voice Output MUTED'}
          >
            {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{voiceOutputEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          {/* Optional Cloud Sync Trigger */}
          <button
            type="button"
            onClick={() => (authUser ? setIsAccountModalOpen(true) : setCloudAuthModalOpen(true))}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E2738] bg-[#07090F] px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors cursor-pointer"
            title="Optional Firebase Cloud Backup & Sync"
          >
            <Cloud className={`h-3.5 w-3.5 ${authUser ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline max-w-[120px] truncate">
              {authUser ? userProfile?.displayName || 'Cloud Synced' : 'Cloud Sync'}
            </span>
          </button>

          {/* Security Vault Trigger */}
          {vaultToken && (
            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Security Vault & Master Password"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Vault</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Submenu Bar (< lg screens) */}
      <div className="lg:hidden flex flex-col border-b border-[#1A2233] bg-[#090C14]">
        <div className="px-3 py-2 border-b border-[#1A2233]/70">
          <ProjectSelector
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onOpenNewProjectModal={() => setIsCreateProjectModalOpen(true)}
            onOpenProjectManager={() => setIsProjectManagerOpen(true)}
            className="w-full"
          />
        </div>
        <div className="flex p-1.5 gap-1 font-mono text-xs overflow-x-auto">
          {railNavItems.map((item) => {
            const active = mobileTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileTab(item.id);
                  setActiveTab(item.id);
                  if (item.id === 'workspace') setHasWorkspaceUnread(false);
                }}
                className={`flex-1 whitespace-nowrap py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                  active ? item.accent : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Body: Left Studio Rail + Fluid Content Canvas */}
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop Studio Rail */}
        <aside className="hidden lg:flex w-[278px] shrink-0 flex-col border-r border-[#1A2233] bg-[#090C14] overflow-y-auto p-3 gap-3">
          {/* Project Switcher */}
          <div>
            <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Active Workspace
            </p>
            <ProjectSelector
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
              onOpenNewProjectModal={() => setIsCreateProjectModalOpen(true)}
              onOpenProjectManager={() => setIsProjectManagerOpen(true)}
            />
          </div>

          {/* Studio Mode Navigation */}
          <div className="space-y-1">
            <p className="mb-1 px-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Studio Modules
            </p>
            {railNavItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileTab(item.id);
                    if (item.id === 'workspace') setHasWorkspaceUnread(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? item.accent
                      : 'border-transparent text-slate-400 hover:bg-[#0B0E17] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'workspace' && hasWorkspaceUnread && (
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Voice, Vision & Swarm Telemetry */}
          <TelemetryPanel
            connectionState={connectionState}
            onConnect={connectUplink}
            onDisconnect={disconnectUplink}
            isVisionActive={isVisionActive}
            visionSource={visionSource}
            onToggleVision={toggleVisionStream}
            speakerMode={speakerMode}
            speakerText={speakerText}
            swarmState={swarmState}
            swarmHistory={swarmHistory}
            videoRef={videoRef}
            metrics={metrics}
            onOpenDailySummary={() => setDailySummaryOpen(true)}
          />

          {/* Rail Utility Footer */}
          <div className="mt-auto grid grid-cols-2 gap-1.5 border-t border-[#1A2233] pt-3">
            <button
              type="button"
              onClick={() => setDailySummaryOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1E2738] bg-[#07090F] py-2 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              <span>24H Log</span>
            </button>
            <button
              type="button"
              onClick={() => setInfoModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1E2738] bg-[#07090F] py-2 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Specs</span>
            </button>
          </div>
          {onLockVault && (
            <button
              type="button"
              onClick={onLockVault}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock Studio Session</span>
            </button>
          )}
        </aside>

        {/* Main Content Canvas */}
        <section className="flex-1 overflow-hidden relative bg-[#07090F]">
          {activeTab === 'terminal' ? (
            <AudioTerminal
              messages={messages}
              onSendMessage={handleSendPromptMessage}
              onClearTranscript={handleClearActiveTranscript}
              onPlaySpeech={handlePlaySpeech}
              connectionState={connectionState}
              isProcessing={isProcessing}
              onCaptureFrameAsPrompt={handleCaptureFrameAsPrompt}
              isVisionActive={isVisionActive}
              activeProject={activeProject}
              onOpenProjectManager={() => setIsProjectManagerOpen(true)}
              onOpenWorkspaceFile={handleOpenWorkspaceFile}
            />
          ) : activeTab === 'workspace' ? (
            <AutonomousWorkspace
              files={workspaceFiles}
              activeFileIndex={activeFileIndex}
              onSelectFile={setActiveFileIndex}
              onRevertFileVersion={handleRevertFileVersion}
              onSaveNewVersion={handleSaveManualSnapshot}
              onUpdateFileContent={handleUpdateFileContent}
              activeProject={activeProject}
              onOpenProjectManager={() => setIsProjectManagerOpen(true)}
            />
          ) : activeTab === 'telemetry' ? (
            <div className="h-full overflow-y-auto space-y-4">
              <TerminalTelemetry
                swarmHistory={swarmHistory}
                swarmState={swarmState}
                latencyMs={metrics.latencyMs}
                activeProjectName={activeProject.name}
              />
              <div className="lg:hidden px-4 pb-4">
                <TelemetryPanel
                  connectionState={connectionState}
                  onConnect={connectUplink}
                  onDisconnect={disconnectUplink}
                  isVisionActive={isVisionActive}
                  visionSource={visionSource}
                  onToggleVision={toggleVisionStream}
                  speakerMode={speakerMode}
                  speakerText={speakerText}
                  swarmState={swarmState}
                  swarmHistory={swarmHistory}
                  videoRef={videoRef}
                  metrics={metrics}
                  onOpenDailySummary={() => setDailySummaryOpen(true)}
                />
              </div>
            </div>
          ) : (
            <MusicStudio
              activeProject={activeProject}
              savedTracks={savedMusicTracks}
              onSaveTrack={handleSaveMusicTrack}
              onDeleteTrack={handleDeleteMusicTrack}
              onSaveLyricsToWorkspace={(file) => {
                handleUpdateWorkspace(file);
                setActiveTab('workspace');
                setMobileTab('workspace');
              }}
              vaultToken={vaultToken}
              onSessionExpired={onSessionExpired}
            />
          )}
        </section>
      </main>

      {/* Dedicated Astra Project Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectManagerOpen || isCreateProjectModalOpen}
        onClose={() => {
          setIsProjectManagerOpen(false);
          setIsCreateProjectModalOpen(false);
        }}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        initialCreateMode={isCreateProjectModalOpen}
      />

      {/* Optional Firebase Account Modal */}
      <AstraUserAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={authUser}
        profile={userProfile}
        projectCount={projects.length}
        musicTrackCount={savedMusicTracks.length}
        onProfileUpdated={setUserProfile}
        onLogout={handleCloudSignOut}
      />
    </div>
  );
};

export default AstraLiveAgentModule;
