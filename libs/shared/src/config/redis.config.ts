// config/redis.config.ts
import { RedisStore } from 'connect-redis';
import { Redis } from 'ioredis';

export const redisClient = new Redis({
  host: 'redis-12581.c293.eu-central-1-1.ec2.redns.redis-cloud.com',
  password: 'MBiKb2gclhYp8xaJhET6kYQsqemBPPSj',
  port: 12581,
  // Ek yapılandırma seçenekleri
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'myapp:', // opsiyonel prefix
});

export const sessionConfig = {
  store: redisStore,
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  name: 'session_id',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 gün
  },
};
