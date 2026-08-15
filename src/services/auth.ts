import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import type { GoogleSession } from '../types';
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';
import { getFirebaseAuth, getGoogleProvider } from './firebase';

export function saveSession(session: GoogleSession): void {
  setItem(STORAGE_KEYS.SESSION, session);
}

export function getSession(): GoogleSession | null {
  return getItem<GoogleSession>(STORAGE_KEYS.SESSION);
}

export function isTokenValid(): boolean {
  const session = getSession();
  if (!session?.accessToken || !session?.tokenExpiry) return false;
  return Date.now() < session.tokenExpiry - 60_000;
}

export function getAccessToken(): string {
  const session = getSession();
  if (!session?.accessToken || !isTokenValid()) {
    throw new Error('نشست منقضی شده. دوباره وارد شوید');
  }
  return session.accessToken;
}

export function getUserName(): string | null {
  const session = getSession();
  return session?.name || session?.email || null;
}

export function getUserEmail(): string | null {
  return getSession()?.email ?? null;
}

export function getUserPicture(): string | null {
  return getSession()?.picture ?? null;
}

function sessionFromFirebaseUser(user: User, accessToken: string): GoogleSession {
  return {
    email: user.email ?? '',
    name: user.displayName || user.email || '',
    picture: user.photoURL ?? undefined,
    accessToken,
    tokenExpiry: Date.now() + 3600 * 1000,
    loggedInAt: Date.now(),
  };
}

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, getGoogleProvider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('دسترسی به گوگل شیت دریافت نشد. دوباره تلاش کنید');
  }

  saveSession(sessionFromFirebaseUser(result.user, accessToken));
}

export async function logout(): Promise<void> {
  removeItem(STORAGE_KEYS.SESSION);
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function subscribeToAuth(
  callback: (user: User | null, needsReauth: boolean) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      callback(null, false);
      return;
    }
    const session = getSession();
    const needsReauth =
      !session || session.email !== user.email || !isTokenValid();
    callback(user, needsReauth);
  });
}
