import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

class RedisService {
  private client: Redis | null = null;

  constructor() {
    if (REDIS_ENABLED && REDIS_URL && REDIS_TOKEN) {
      try {
        this.client = new Redis({
          url: REDIS_URL,
          token: REDIS_TOKEN,
        });
        console.log('Upstash Redis service initialized');
      } catch (err) {
        console.error('Failed to initialize Upstash Redis client:', err);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      // @upstash/redis handles JSON parsing automatically if the data was stored as an object
      return await this.client.get<T>(key);
    } catch (err) {
      console.error(`Error getting key ${key} from Redis:`, err);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.error(`Error setting key ${key} in Redis:`, err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Error deleting key ${key} from Redis:`, err);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      // Note: keys() can be slow on large databases, but fine for typical user-scoped patterns
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      console.error(`Error deleting pattern ${pattern} from Redis:`, err);
    }
  }

  generateKey(userId: string, resource: string): string {
    return `user:${userId}:${resource}`;
  }
}

export const redisService = new RedisService();
