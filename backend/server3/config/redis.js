/**
 * Redis connector.
 * Two logical caches per the diagram:
 *   - url cache      -> { long_url: short_url } style mapping used for fast redirect lookups
 *   - session cache  -> shared auth/session store so ALL 3 servers behind the
 *                       load balancer see the same logged-in session (stateless servers)
 *
 * If REDIS_URL is not set, an in-memory Map is used instead so the project
 * still runs locally without a real Redis instance.
 */
const USE_MEMORY_FALLBACK = !process.env.REDIS_URL;

let client;

if (USE_MEMORY_FALLBACK) {
  const store = new Map();
  client = {
    async get(key) {
      const v = store.get(key);
      if (!v) return null;
      if (v.expiresAt && Date.now() > v.expiresAt) {
        store.delete(key);
        return null;
      }
      return v.value;
    },
    async set(key, value, ttlSeconds) {
      store.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
      return 'OK';
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
} else {
  const Redis = require('ioredis');
  const raw = new Redis(process.env.REDIS_URL);
  client = {
    get: (key) => raw.get(key),
    set: (key, value, ttlSeconds) =>
      ttlSeconds ? raw.set(key, value, 'EX', ttlSeconds) : raw.set(key, value),
    del: (key) => raw.del(key),
  };
}

module.exports = { redis: client, USE_MEMORY_FALLBACK };
