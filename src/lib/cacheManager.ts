// Implementação simples de cache baseada em AsyncStorage.
// Pode ser trocada por MMKV depois mantendo a mesma interface.

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clearByPrefix(prefix: string): Promise<void>;
}

async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("CacheManager.get error", e);
    return null;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("CacheManager.set error", e);
  }
}

async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn("CacheManager.remove error", e);
  }
}

async function clearByPrefix(prefix: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(prefix));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.warn("CacheManager.clearByPrefix error", e);
  }
}

export const cacheManager: CacheManager = {
  get,
  set,
  remove,
  clearByPrefix,
};
