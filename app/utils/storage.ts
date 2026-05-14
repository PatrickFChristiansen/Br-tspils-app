import { isAvailableAsync, deleteItemAsync as secureDeleteItemAsync, getItemAsync as secureGetItemAsync, setItemAsync as secureSetItemAsync } from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const webBackend = {
  async setItemAsync(key: string, value: string) {
    window.localStorage.setItem(key, value);
  },
  async getItemAsync(key: string) {
    return window.localStorage.getItem(key);
  },
  async deleteItemAsync(key: string) {
    window.localStorage.removeItem(key);
  },
};

const fallbackStorage = (globalThis as any).__BRAETSPIILS_APP_STORAGE__ ||= {};
const fallbackBackend = {
  async setItemAsync(key: string, value: string) {
    fallbackStorage[key] = value;
  },
  async getItemAsync(key: string) {
    return fallbackStorage[key] ?? null;
  },
  async deleteItemAsync(key: string) {
    delete fallbackStorage[key];
  },
};

const nativeBackend = {
  setItemAsync: secureSetItemAsync,
  getItemAsync: secureGetItemAsync,
  deleteItemAsync: secureDeleteItemAsync,
};

let secureStoreAvailable: boolean | null = null;

async function getStorageBackend() {
  if (isWeb) {
    return webBackend;
  }

  if (secureStoreAvailable === null) {
    secureStoreAvailable = await isAvailableAsync().catch(() => false);
  }

  if (secureStoreAvailable) {
    return nativeBackend;
  }

  console.warn('SecureStore is not available on this device. Falling back to in-memory storage.');
  return fallbackBackend;
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  const backend = await getStorageBackend();
  await backend.setItemAsync(key, JSON.stringify(value));
}

export async function loadJSON<T>(key: string): Promise<T | undefined> {
  const backend = await getStorageBackend();
  const item = await backend.getItemAsync(key);
  if (!item) {
    return undefined;
  }

  try {
    return JSON.parse(item) as T;
  } catch {
    return undefined;
  }
}

export async function removeItem(key: string): Promise<void> {
  const backend = await getStorageBackend();
  await backend.deleteItemAsync(key);
}
