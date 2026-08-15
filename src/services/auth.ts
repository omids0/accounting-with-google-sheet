import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';
import type { GoogleSession } from '../types';

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

export async function fetchUserProfile(accessToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('دریافت اطلاعات کاربر ناموفق بود');
  const data = (await res.json()) as {
    email?: string;
    name?: string;
    picture?: string;
  };
  return {
    email: data.email ?? '',
    name: data.name || data.email || '',
    picture: data.picture,
  };
}

export function createSession(
  accessToken: string,
  profile: { email: string; name: string; picture?: string },
  expiresIn = 3600
): GoogleSession {
  return {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    accessToken,
    tokenExpiry: Date.now() + expiresIn * 1000,
  };
}

export function logout(): void {
  removeItem(STORAGE_KEYS.SESSION);
}
