import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  AstraProject,
  AstraUserProfile,
  ChatMessage,
  MusicComposition,
  WorkspaceFileUpdate,
} from '../types/astra';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function toSafeFirestoreId(raw: string): string {
  const sanitized = String(raw || 'item')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return sanitized || `id_${Date.now()}`;
}

export async function syncUserProfileToFirestore(
  user: User,
  overrides?: Partial<AstraUserProfile>
): Promise<AstraUserProfile> {
  const profilePath = `users/${user.uid}/profile/main`;
  const nowIso = new Date().toISOString();

  try {
    const ref = doc(db, 'users', user.uid, 'profile', 'main');
    const existingSnap = await getDoc(ref);
    const existing = existingSnap.exists() ? (existingSnap.data() as AstraUserProfile) : null;

    const payload: AstraUserProfile = {
      uid: user.uid,
      email: (user.email || existing?.email || 'user@astra-gravity.app').slice(0, 254),
      displayName: (
        overrides?.displayName ||
        user.displayName ||
        existing?.displayName ||
        user.email?.split('@')[0] ||
        'Astra User'
      ).slice(0, 120),
      organization: (
        overrides?.organization ??
        existing?.organization ??
        'Red Bird International'
      ).slice(0, 160),
      photoURL: (user.photoURL || existing?.photoURL || '').slice(0, 512),
      createdAt: existing?.createdAt || nowIso,
      lastLoginAt: nowIso,
      preferredLanguage: overrides?.preferredLanguage || existing?.preferredLanguage || 'bn',
    };

    await setDoc(ref, payload, { merge: existingSnap.exists() });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

export async function loadUserProjectsFromFirestore(userId: string): Promise<AstraProject[]> {
  const path = `users/${userId}/projects`;
  try {
    const q = query(collection(db, 'users', userId, 'projects'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AstraProject);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveUserProjectToFirestore(
  userId: string,
  project: AstraProject
): Promise<void> {
  const safeProjectId = toSafeFirestoreId(project.id);
  const path = `users/${userId}/projects/${safeProjectId}`;
  try {
    const nowIso = new Date().toISOString();
    const payload: AstraProject = {
      id: safeProjectId,
      userId,
      name: String(project.name || 'Untitled Project').slice(0, 160),
      category: String(project.category || 'General').slice(0, 80),
      description: String(project.description || '').slice(0, 1000),
      color: String(project.color || '#06b6d4').slice(0, 32),
      createdAt: project.createdAt || nowIso,
      updatedAt: project.updatedAt || nowIso,
      fileCount: Number(project.fileCount || 0),
      messageCount: Number(project.messageCount || 0),
      isDefault: Boolean(project.isDefault),
    };
    await setDoc(doc(db, 'users', userId, 'projects', safeProjectId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserProjectFromFirestore(
  userId: string,
  projectId: string
): Promise<void> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const path = `users/${userId}/projects/${safeProjectId}`;
  try {
    const [docsSnap, msgsSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'projects', safeProjectId, 'documents')),
      getDocs(collection(db, 'users', userId, 'projects', safeProjectId, 'messages')),
    ]);
    await Promise.all([
      ...docsSnap.docs.map((d) => deleteDoc(d.ref)),
      ...msgsSnap.docs.map((m) => deleteDoc(m.ref)),
    ]);
    await deleteDoc(doc(db, 'users', userId, 'projects', safeProjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadProjectDocumentsFromFirestore(
  userId: string,
  projectId: string
): Promise<WorkspaceFileUpdate[]> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const path = `users/${userId}/projects/${safeProjectId}/documents`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'projects', safeProjectId, 'documents'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        filename: String(data.filename || d.id),
        language: String(data.language || 'markdown'),
        content: String(data.content || ''),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProjectDocumentToFirestore(
  userId: string,
  projectId: string,
  file: WorkspaceFileUpdate
): Promise<void> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const safeDocId = toSafeFirestoreId(file.filename);
  const path = `users/${userId}/projects/${safeProjectId}/documents/${safeDocId}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'projects', safeProjectId, 'documents', safeDocId),
      {
        docId: safeDocId,
        projectId: safeProjectId,
        userId,
        filename: String(file.filename).slice(0, 200),
        language: String(file.language || 'text').slice(0, 64),
        content: String(file.content || '').slice(0, 400000),
        updatedAt: new Date().toISOString(),
        versionCount: file.versions?.length || 1,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadProjectMessagesFromFirestore(
  userId: string,
  projectId: string
): Promise<ChatMessage[]> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const path = `users/${userId}/projects/${safeProjectId}/messages`;
  try {
    const q = query(
      collection(db, 'users', userId, 'projects', safeProjectId, 'messages'),
      orderBy('createdAtMs', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        role: (data.role as ChatMessage['role']) || 'agent',
        content: String(data.content || ''),
        timestamp: String(data.timestamp || ''),
        projectId: String(data.projectId || safeProjectId),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProjectMessageToFirestore(
  userId: string,
  projectId: string,
  msg: ChatMessage
): Promise<void> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const safeMsgId = toSafeFirestoreId(msg.id);
  const path = `users/${userId}/projects/${safeProjectId}/messages/${safeMsgId}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'projects', safeProjectId, 'messages', safeMsgId),
      {
        id: safeMsgId,
        projectId: safeProjectId,
        userId,
        role: msg.role,
        content: String(msg.content || '').slice(0, 50000),
        timestamp: String(msg.timestamp || '').slice(0, 64),
        createdAtMs: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearProjectMessagesInFirestore(
  userId: string,
  projectId: string,
  messageIds: string[]
): Promise<void> {
  const safeProjectId = toSafeFirestoreId(projectId);
  const path = `users/${userId}/projects/${safeProjectId}/messages`;
  try {
    await Promise.all(
      messageIds.map((id) =>
        deleteDoc(doc(db, 'users', userId, 'projects', safeProjectId, 'messages', toSafeFirestoreId(id)))
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadUserMusicTracksFromFirestore(userId: string): Promise<MusicComposition[]> {
  const path = `users/${userId}/music_tracks`;
  try {
    const q = query(collection(db, 'users', userId, 'music_tracks'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MusicComposition);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveUserMusicTrackToFirestore(
  userId: string,
  track: MusicComposition
): Promise<void> {
  const safeTrackId = toSafeFirestoreId(track.id);
  const path = `users/${userId}/music_tracks/${safeTrackId}`;
  try {
    const payload: MusicComposition = {
      id: safeTrackId,
      userId,
      projectId: String(track.projectId || '').slice(0, 128),
      title: String(track.title || 'Untitled Track').slice(0, 180),
      prompt: String(track.prompt || '').slice(0, 1000),
      genre: String(track.genre || 'Cinematic Pop').slice(0, 64),
      mood: String(track.mood || 'Uplifting').slice(0, 64),
      language: String(track.language || 'Bengali').slice(0, 40),
      bpm: Math.max(40, Math.min(220, Number(track.bpm) || 96)),
      musicalKey: String(track.musicalKey || 'C Major').slice(0, 32),
      timeSignature: String(track.timeSignature || '4/4').slice(0, 16),
      durationSeconds: Math.max(5, Math.min(600, Number(track.durationSeconds) || 45)),
      styleNotes: String(track.styleNotes || '').slice(0, 1200),
      instruments: (track.instruments || []).slice(0, 24),
      chordProgression: (track.chordProgression || []).slice(0, 128),
      melodyNotes: (track.melodyNotes || []).slice(0, 512),
      bassPattern: (track.bassPattern || []).slice(0, 256),
      drumPattern: track.drumPattern || { kick: [0, 4, 8, 12], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14] },
      lyricsSections: (track.lyricsSections || []).slice(0, 32),
      fullLyricsText: String(track.fullLyricsText || '').slice(0, 20000),
      createdAt: track.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'music_tracks', safeTrackId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserMusicTrackFromFirestore(
  userId: string,
  trackId: string
): Promise<void> {
  const safeTrackId = toSafeFirestoreId(trackId);
  const path = `users/${userId}/music_tracks/${safeTrackId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'music_tracks', safeTrackId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
