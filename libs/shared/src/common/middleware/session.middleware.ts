// import * as session from 'express-session';
// import { randomUUID } from 'crypto';
// import { CookieOptions } from 'express';
// import { createClient } from 'redis';
// import Redis from 'ioredis';
// import { RedisStore } from 'connect-redis';

// export const SESSION_SECRET = 'secret';
// export const SESSION_PREFIX = 'StudentCompass:';
// export const COOKIE_NAME = 'mami_token';
// export const COOKIE_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 15 days

// const isProd = true;

// export const cookieOptions: CookieOptions = {
//   // sameSite: isProd ? 'none' : 'strict',
//   secure: isProd,
//   httpOnly: true,
//   // signed: true,
// };

// const sessionMiddleware = (redisClient: Redis) => {
//   return session({
//     store: new RedisStore({
//       client: redisClient,
//       prefix: SESSION_PREFIX,
//       ttl: 86400 * 7, // 7 gün (saniye cinsinden)
//     }),
//     // name: COOKIE_NAME,
//     secret: SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     // genid: () => randomUUID(),
//     cookie: {
//       ...cookieOptions,
//       maxAge: COOKIE_EXPIRATION,
//     },
//   });
// };

// export { sessionMiddleware as session };
