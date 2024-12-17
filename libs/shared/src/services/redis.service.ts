// services/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IoRedis, { Redis } from 'ioredis';
import { redisClient } from '../config/redis.config';
import { User } from '../schemas/user.schema';

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

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Session için özel metodlar
  async getSession(sessionId: string, userAgent: string): Promise<any> {
    const session = await this.get<{
      user: User;
      userAgent: string;
      loggedInAt: string;
    }>(`sess:${sessionId}`);
    // if (session.userAgent != userAgent) {
    //   throw new Error('Session device mismatch');
    // }
    return session;
  }

  async setSession(sessionId: string, data: any, ttl: number): Promise<void> {
    await this.set(`sess:${sessionId}`, data, ttl);
  }

  async logoutSession(sessionId: string): Promise<void> {
    await this.del(`sess:${sessionId}`);
  }
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
