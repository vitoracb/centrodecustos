// Implementação de cache com criptografia automática para dados sensíveis
// Pode ser trocada por MMKV depois mantendo a mesma interface.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptSensitiveData, decryptSensitiveData, shouldEncryptData } from "./security";

export interface CacheManager {
  get<T>(key: string, userId?: string): Promise<T | null>;
  set<T>(key: string, value: T, userId?: string): Promise<void>;
  remove(key: string): Promise<void>;
  clearByPrefix(prefix: string): Promise<void>;
}

async function get<T>(key: string, userId?: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    // Se é dado sensível e temos userId, descriptografar
    if (shouldEncryptData(key) && userId) {
      const decrypted = decryptSensitiveData<T>(raw, userId);
      if (decrypted === null) {
        // Se falhou a descriptografia, pode ser dado não-criptografado antigo
        console.warn("[CacheManager] Falha na descriptografia para chave:", key);
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      }
      return decrypted;
    }

    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("CacheManager.get error", e);
    return null;
  }
}

async function set<T>(key: string, value: T, userId?: string): Promise<void> {
  try {
    let dataToStore: string;

    // Se é dado sensível e temos userId, criptografar
    if (shouldEncryptData(key) && userId) {
      dataToStore = encryptSensitiveData(value, userId);
      if (!dataToStore) {
        console.warn("[CacheManager] Falha na criptografia para chave:", key);
        dataToStore = JSON.stringify(value); // Fallback para não-criptografado
      }
    } else {
      dataToStore = JSON.stringify(value);
    }

    await AsyncStorage.setItem(key, dataToStore);
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
