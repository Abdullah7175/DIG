import { createClient, RedisClientType } from 'redis';
import { log } from '../utils/logger.js';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 5;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    // Skip if Redis URL is not configured (optional feature)
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      log('Redis not configured, caching disabled. Set REDIS_URL or REDIS_HOST to enable.', 'redis');
      return;
    }

    try {
      const redisConfig: any = {
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > this.maxConnectionAttempts) {
              log('Redis connection failed after max attempts, disabling cache', 'redis');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 100, 3000); // Exponential backoff, max 3s
          },
        },
      };

      // Support both REDIS_URL and individual config
      if (process.env.REDIS_URL) {
        redisConfig.url = process.env.REDIS_URL;
      } else {
        redisConfig.socket.host = process.env.REDIS_HOST || 'localhost';
        redisConfig.socket.port = parseInt(process.env.REDIS_PORT || '6379');
        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }
      }

      this.client = createClient(redisConfig);

      // Error handling
      this.client.on('error', (err) => {
        log(`Redis error: ${err.message}`, 'redis');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        log('Redis connecting...', 'redis');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        log('Redis connected successfully', 'redis');
      });

      this.client.on('reconnecting', () => {
        this.connectionAttempts++;
        log(`Redis reconnecting (attempt ${this.connectionAttempts})...`, 'redis');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        log('Redis connection closed', 'redis');
      });

      await this.client.connect();
    } catch (error: any) {
      log(`Failed to connect to Redis: ${error.message}. Caching disabled.`, 'redis');
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client!.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error: any) {
      log(`Redis GET error for key ${key}: ${error.message}`, 'redis');
      return null;
    }
  }

  /**
   * Set cached value with TTL (time to live in seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client!.setEx(key, ttlSeconds, serialized);
      return true;
    } catch (error: any) {
      log(`Redis SET error for key ${key}: ${error.message}`, 'redis');
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error: any) {
      log(`Redis DEL error for key ${key}: ${error.message}`, 'redis');
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.client!.del(keys);
      return keys.length;
    } catch (error: any) {
      log(`Redis DEL pattern error for ${pattern}: ${error.message}`, 'redis');
      return 0;
    }
  }

  /**
   * Invalidate cache for vehicle-related queries
   */
  async invalidateVehicles(): Promise<void> {
    await Promise.all([
      this.delPattern('vehicles:*'),
      this.delPattern('vehicle:*'),
      this.del('dashboard:stats'),
    ]);
  }

  /**
   * Invalidate cache for filter dropdowns
   */
  async invalidateFilters(): Promise<void> {
    await Promise.all([
      this.delPattern('vehicle-categories:*'),
      this.delPattern('fuel-types:*'),
      this.delPattern('terminals:*'),
      this.delPattern('tracker-companies:*'),
      this.delPattern('vehicle-types:*'),
      this.delPattern('routes:*'),
    ]);
  }

  /**
   * Invalidate cache for all entity lists
   */
  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidateVehicles(),
      this.invalidateFilters(),
      this.delPattern('users:*'),
      this.delPattern('owners:*'),
      this.delPattern('drivers:*'),
      this.delPattern('conductors:*'),
      this.del('dashboard:stats'),
    ]);
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      log('Redis disconnected', 'redis');
    }
  }

  /**
   * Generate cache key from parameters
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }
}

// Singleton instance
export const redisService = new RedisService();

