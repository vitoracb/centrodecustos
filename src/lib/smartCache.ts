import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  ttl?: number; // Default TTL
  prefix?: string;
  maxSize?: number;
}

class SmartCache {
  private config: CacheConfig;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutos default
      prefix: 'smart_cache_',
      maxSize: 50, // Max 50 entries
      ...config,
    };
  }

  /**
   * 🧠 Cache inteligente com TTL e compressão
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.ttl!,
      };

      const serialized = JSON.stringify(entry);
      const fullKey = `${this.config.prefix}${key}`;

      await AsyncStorage.setItem(fullKey, serialized);

      // Limpar cache antigo periodicamente
      if (Math.random() < 0.1) { // 10% de chance
        this.cleanup();
      }
    } catch (error) {
      console.warn('[SmartCache] Erro ao salvar cache:', error);
    }
  }

  /**
   * 🔍 Buscar no cache com verificação de TTL
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = `${this.config.prefix}${key}`;
      const cached = await AsyncStorage.getItem(fullKey);

      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const isExpired = Date.now() - entry.timestamp > entry.ttl;

      if (isExpired) {
        // Cache expirado - remover
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('[SmartCache] Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * ❌ Remover item do cache
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = `${this.config.prefix}${key}`;
      await AsyncStorage.removeItem(fullKey);
    } catch (error) {
      console.warn('[SmartCache] Erro ao deletar cache:', error);
    }
  }

  /**
   * 🔥 Invalidar cache baseado em padrão
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(key =>
        key.startsWith(this.config.prefix!) &&
        key.includes(pattern)
      );

      await AsyncStorage.multiRemove(matchingKeys);
      console.log(`[SmartCache] 🗑️ Removidos ${matchingKeys.length} itens do padrão: ${pattern}`);
    } catch (error) {
      console.warn('[SmartCache] Erro ao invalidar padrão:', error);
    }
  }

  /**
   * 🧹 Limpeza automática de cache expirado
   */
  private async cleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.prefix!));

      let removed = 0;

      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (!cached) continue;

          const entry: CacheEntry<any> = JSON.parse(cached);
          const isExpired = Date.now() - entry.timestamp > entry.ttl;

          if (isExpired) {
            await AsyncStorage.removeItem(key);
            removed++;
          }
        } catch {
          // Item corrompido - remover
          await AsyncStorage.removeItem(key);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[SmartCache] 🧹 Limpeza automática: ${removed} itens removidos`);
      }
    } catch (error) {
      console.warn('[SmartCache] Erro na limpeza:', error);
    }
  }

  /**
   * 📊 Estatísticas do cache
   */
  async getStats(): Promise<{ total: number; size: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.prefix!));

      let totalSize = 0;
      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) totalSize += item.length;
      }

      return {
        total: cacheKeys.length,
        size: `${(totalSize / 1024).toFixed(1)} KB`
      };
    } catch {
      return { total: 0, size: '0 KB' };
    }
  }
}

// Instâncias específicas para diferentes tipos de dados
export const financialCache = new SmartCache({
  ttl: 3 * 60 * 1000, // 3 minutos para dados financeiros
  prefix: 'financial_',
});

export const equipmentCache = new SmartCache({
  ttl: 10 * 60 * 1000, // 10 minutos para equipamentos
  prefix: 'equipment_',
});

export const dashboardCache = new SmartCache({
  ttl: 2 * 60 * 1000, // 2 minutos para dashboard
  prefix: 'dashboard_',
});

export const staticCache = new SmartCache({
  ttl: 30 * 60 * 1000, // 30 minutos para dados estáticos
  prefix: 'static_',
});

export default SmartCache;