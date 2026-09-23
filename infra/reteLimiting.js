/**
 * infra/reteLimiting.js
 * Rate limiting to protect the system from DDoS attacks (per diagram note),
 * sitting logically in front of the load balancer. It's shared by all 3
 * backend servers so the limit is consistent no matter which server a
 * request lands on.
 *
 * Uses Redis (if configured) so the counter is shared across server1/2/3,
 * otherwise falls back to a local in-memory counter per process.
 */
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000); // 1 minute
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 100); // per IP per window

const memoryBuckets = new Map();

// Independent Redis connection (same REDIS_URL as the servers use) so the
// rate-limit counters are shared across server1/2/3. Falls back to an
// in-memory counter per process when REDIS_URL isn't set.
let redisClient = null;
if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL);
}

function keyFor(ip) {
  const windowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  return `ratelimit:${ip}:${windowStart}`;
}

async function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const key = keyFor(ip);

  let count;
  if (redisClient) {
    count = (await redisClient.incr(key)) || 1;
    if (count === 1) await redisClient.expire(key, Math.ceil(WINDOW_MS / 1000));
  } else {
    count = (memoryBuckets.get(key) || 0) + 1;
    memoryBuckets.set(key, count);
    const t = setTimeout(() => memoryBuckets.delete(key), WINDOW_MS);
    t.unref?.();
  }

  res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.set('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - count)));

  if (count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'too many requests, slow down' });
  }
  next();
}

module.exports = { rateLimiter };
