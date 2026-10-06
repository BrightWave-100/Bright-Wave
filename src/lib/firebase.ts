import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SimulationResult } from '../engine/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(
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

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export function sanitizeValidId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'id_default';
}

export async function syncAuthenticatedUserToFirestore(
  user: User,
  anonymousPlayerId: string
): Promise<void> {
  if (!user.emailVerified) return;

  const uid = sanitizeValidId(user.uid);
  const displayName = (user.displayName || 'Arena Challenger')
    .trim()
    .slice(0, 60);
  const cleanAnonId = sanitizeValidId(anonymousPlayerId);

  const userPublicPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName: displayName || 'Arena Challenger',
        AnonymousPlayerId: cleanAnonId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: displayName || 'Arena Challenger',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPublicPath);
  }

  if (user.email) {
    const userPrivatePath = `users/${uid}/private/info`;
    const privRef = doc(db, 'users', uid, 'private', 'info');
    try {
      const existingPriv = await getDoc(privRef);
      if (!existingPriv.exists()) {
        await setDoc(privRef, {
          uid,
          email: user.email.trim().slice(0, 254),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privRef, {
          email: user.email.trim().slice(0, 254),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPrivatePath);
    }
  }
}

export async function signInWithGoogle(
  anonymousPlayerId: string
): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  await syncAuthenticatedUserToFirestore(credential.user, anonymousPlayerId);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function saveResultToFirestoreVault(
  result: SimulationResult,
  user: User,
  anonymousPlayerId: string
): Promise<void> {
  if (!user.emailVerified) return;
  await syncAuthenticatedUserToFirestore(user, anonymousPlayerId);

  const resultId = sanitizeValidId(result.id);
  const path = `results/${resultId}`;
  const resultRef = doc(db, 'results', resultId);
  try {
    const existingResult = await getDoc(resultRef);
    if (existingResult.exists()) {
      return;
    }
    await setDoc(resultRef, {
      id: resultId,
      sessionId: sanitizeValidId(result.sessionId),
      ownerUid: sanitizeValidId(user.uid),
      challengeId: sanitizeValidId(result.challengeId),
      challengeTitle: result.challengeTitle.trim().slice(0, 120),
      score: Math.max(0, Math.min(100, Math.round(result.score))),
      archetype: result.archetype.trim().slice(0, 80),
      shareToken: sanitizeValidId(result.shareToken),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserSavedResultsFromFirestore(
  user: User
): Promise<
  Array<{
    id: string;
    challengeId: string;
    challengeTitle: string;
    score: number;
    archetype: string;
    shareToken: string;
  }>
> {
  if (!user.emailVerified) return [];
  const path = 'results';
  try {
    const q = query(
      collection(db, 'results'),
      where('ownerUid', '==', sanitizeValidId(user.uid))
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        challengeId: String(data.challengeId || ''),
        challengeTitle: String(data.challengeTitle || ''),
        score: Number(data.score || 0),
        archetype: String(data.archetype || ''),
        shareToken: String(data.shareToken || ''),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export { onAuthStateChanged };
export type { User };
