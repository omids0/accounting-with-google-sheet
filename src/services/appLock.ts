import { isLocalhost } from '../utils/localDev';
import { getUserEmail, getUserName } from './auth';
import {
  clearAppLockFromSheet,
  fetchAppLockFromSheet,
  saveAppLockToSheet,
} from './appLockSync';
import { getSettings } from './settings';
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage';
import type {
  AppLockAccountConfig,
  AppLockConfig,
  AppLockDeviceConfig,
} from '../types';

const PIN_MIN_LENGTH = 4;
const PBKDF2_ITERATIONS = 100_000;

export const APP_LOCK_CHANGED_EVENT = 'accounting-app-lock-changed';

function migrateLegacyConfig(): void {
  const legacy = getItem<AppLockConfig>(STORAGE_KEYS.APP_LOCK);
  if (!legacy?.pinHash || !legacy?.pinSalt) return;

  const existingDevice = getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE);
  if (!existingDevice && (legacy.biometricEnabled || legacy.credentialId)) {
    setItem(STORAGE_KEYS.APP_LOCK_DEVICE, {
      biometricEnabled: legacy.biometricEnabled,
      credentialId: legacy.credentialId,
    });
  }

  const account: AppLockAccountConfig = {
    enabled: legacy.enabled,
    pinHash: legacy.pinHash,
    pinSalt: legacy.pinSalt,
  };
  setItem(STORAGE_KEYS.APP_LOCK, account);
}

function getAccountConfig(): AppLockAccountConfig | null {
  migrateLegacyConfig();
  return getItem<AppLockAccountConfig>(STORAGE_KEYS.APP_LOCK);
}

function getDeviceConfig(): AppLockDeviceConfig | null {
  return getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE);
}

function saveAccountConfig(config: AppLockAccountConfig): void {
  setItem(STORAGE_KEYS.APP_LOCK, config);
  window.dispatchEvent(
    new CustomEvent(APP_LOCK_CHANGED_EVENT, {
      detail: { enabled: !!(config.enabled && config.pinHash && config.pinSalt) },
    })
  );
}

function saveDeviceConfig(config: AppLockDeviceConfig): void {
  setItem(STORAGE_KEYS.APP_LOCK_DEVICE, config);
}

function getSpreadsheetId(): string | null {
  return getSettings()?.spreadsheetId || null;
}

async function syncAccountToSheet(config: AppLockAccountConfig): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return;
  if (config.enabled && config.pinHash && config.pinSalt) {
    await saveAppLockToSheet(spreadsheetId, config);
  } else {
    await clearAppLockFromSheet(spreadsheetId);
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bufferToBase64(bits);
}

export function isAppLockEnabled(): boolean {
  if (isLocalhost()) return false;
  const config = getAccountConfig();
  return !!(config?.enabled && config.pinHash && config.pinSalt);
}

export function getAppLockConfig(): AppLockConfig | null {
  const account = getAccountConfig();
  if (!account) return null;
  const device = getDeviceConfig();
  return { ...account, ...device };
}

export function validatePinFormat(pin: string): string | null {
  if (pin.length < PIN_MIN_LENGTH) {
    return `رمز باید حداقل ${PIN_MIN_LENGTH} رقم باشد`;
  }
  if (!/^\d+$/.test(pin)) {
    return 'رمز فقط باید عدد باشد';
  }
  return null;
}

export async function syncAppLockFromSheet(): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return;

  const remote = await fetchAppLockFromSheet(spreadsheetId);
  const local = getAccountConfig();

  if (!remote) {
    if (local?.enabled && local.pinHash && local.pinSalt) {
      await saveAppLockToSheet(spreadsheetId, local);
    }
    return;
  }

  if (!remote.enabled || !remote.pinHash || !remote.pinSalt) {
    if (local?.enabled) {
      removeItem(STORAGE_KEYS.APP_LOCK);
      window.dispatchEvent(
        new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } })
      );
    }
    return;
  }

  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
  const localTime = local?.updatedAt ? Date.parse(local.updatedAt) : 0;

  if (!local || remoteTime >= localTime) {
    saveAccountConfig(remote);
  } else if (local.enabled) {
    await saveAppLockToSheet(spreadsheetId, local);
  }
}

export async function setupAppLock(
  pin: string,
  enableBiometric = false
): Promise<void> {
  const formatError = validatePinFormat(pin);
  if (formatError) throw new Error(formatError);

  const salt = randomSalt();
  const pinHash = await hashPin(pin, salt);

  const config: AppLockAccountConfig = {
    enabled: true,
    pinHash,
    pinSalt: bufferToBase64(salt.buffer as ArrayBuffer),
    updatedAt: new Date().toISOString(),
  };

  saveAccountConfig(config);
  await syncAccountToSheet(config);

  if (enableBiometric) {
    const credentialId = await registerBiometricCredential();
    saveDeviceConfig({ biometricEnabled: true, credentialId });
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = getAccountConfig();
  if (!config?.pinHash || !config.pinSalt) return false;

  const salt = new Uint8Array(base64ToBuffer(config.pinSalt));
  const hash = await hashPin(pin, salt);
  return hash === config.pinHash;
}

export async function disableAppLock(pin: string): Promise<void> {
  const valid = await verifyPin(pin);
  if (!valid) throw new Error('رمز اشتباه است');

  removeItem(STORAGE_KEYS.APP_LOCK);
  removeItem(STORAGE_KEYS.APP_LOCK_DEVICE);
  await syncAccountToSheet({ enabled: false, pinHash: '', pinSalt: '' });

  window.dispatchEvent(
    new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } })
  );
}

export async function changePin(currentPin: string, newPin: string): Promise<void> {
  const valid = await verifyPin(currentPin);
  if (!valid) throw new Error('رمز فعلی اشتباه است');

  const formatError = validatePinFormat(newPin);
  if (formatError) throw new Error(formatError);

  const config = getAccountConfig();
  if (!config) throw new Error('قفل اپ فعال نیست');

  const salt = randomSalt();
  const pinHash = await hashPin(newPin, salt);

  const updated: AppLockAccountConfig = {
    ...config,
    pinHash,
    pinSalt: bufferToBase64(salt.buffer as ArrayBuffer),
    updatedAt: new Date().toISOString(),
  };

  saveAccountConfig(updated);
  await syncAccountToSheet(updated);
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  if (!isAppLockEnabled()) return false;
  const device = getDeviceConfig();
  return !!(device?.biometricEnabled && device.credentialId);
}

async function registerBiometricCredential(): Promise<string> {
  const email = getUserEmail();
  if (!email) throw new Error('ابتدا وارد حساب شوید');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'حسابداری شخصی',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: email,
        displayName: getUserName() || email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('ثبت اثر انگشت لغو شد');
  return bufferToBase64(credential.rawId);
}

export async function enableBiometric(): Promise<void> {
  if (!isAppLockEnabled()) throw new Error('ابتدا قفل اپ را فعال کنید');

  const credentialId = await registerBiometricCredential();
  saveDeviceConfig({ biometricEnabled: true, credentialId });
}

export async function disableBiometric(pin: string): Promise<void> {
  const valid = await verifyPin(pin);
  if (!valid) throw new Error('رمز اشتباه است');

  saveDeviceConfig({ biometricEnabled: false, credentialId: undefined });
}

export async function verifyBiometric(): Promise<boolean> {
  const device = getDeviceConfig();
  if (!device?.credentialId) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64ToBuffer(device.credentialId),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!credential;
  } catch {
    return false;
  }
}
