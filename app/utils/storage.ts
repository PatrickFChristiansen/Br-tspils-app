import * as SecureStore from 'expo-secure-store';

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function loadJSON<T>(key: string): Promise<T | undefined> {
  const item = await SecureStore.getItemAsync(key);
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
  await SecureStore.deleteItemAsync(key);
}
