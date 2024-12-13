// services/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IoRedis, { Redis } from 'ioredis';
import { redisClient } from '../config/redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis = redisClient;

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Session için özel metodlar
  async getSession(sessionId: string): Promise<any> {
    return this.get(`sess:${sessionId}`);
  }

  async setSession(sessionId: string, data: any, ttl: number): Promise<void> {
    await this.set(`sess:${sessionId}`, data, ttl);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
