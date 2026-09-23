/**
 * url.repository.js
 * This is the ONLY layer that talks to storage (DB + cache).
 * Flow implemented here (matches the diagram):
 *
 *  WRITE (create short url):
 *    -> write to primary DB
 *    -> also warm the cache: cache[long_url] = short_url   (redirect-lookup cache)
 *
 *  READ (redirect a short code):
 *    -> check cache first
 *        HIT  -> return long_url immediately (fast path)
 *        MISS -> read from 2nd DB (read replica) -> save result in cache -> return
 */
const { primaryPool, readPool, USE_JSON_FALLBACK, JSON_DB_PATH, readJsonDb, writeJsonDb } = require('../config/db');
const { redis } = require('../config/redis');
const UrlModel = require('../model/url.model');

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h
const cacheKey = (short_code) => `url:short:${short_code}`;

async function create({ short_code, long_url, user_id }) {
  let row;

  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(JSON_DB_PATH);
    row = new UrlModel({ id: rows.length + 1, short_code, long_url, user_id });
    rows.push(row);
    writeJsonDb(JSON_DB_PATH, rows);
  } else {
    const { rows: dbRows } = await primaryPool.query(
      `INSERT INTO urls (short_code, long_url, user_id) VALUES ($1, $2, $3) RETURNING *`,
      [short_code, long_url, user_id]
    );
    row = new UrlModel(dbRows[0]);
  }

  // warm cache immediately so the very next redirect is a cache hit
  await redis.set(cacheKey(short_code), long_url, CACHE_TTL_SECONDS);

  return row;
}

async function findByShortCode(short_code) {
  // 1) try cache
  const cached = await redis.get(cacheKey(short_code));
  if (cached) {
    return { long_url: cached, source: 'cache-hit' };
  }

  // 2) cache miss -> read replica ("2nd DB for read")
  let long_url = null;

  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(JSON_DB_PATH);
    const found = rows.find((r) => r.short_code === short_code);
    long_url = found ? found.long_url : null;
  } else {
    const { rows } = await readPool.query(`SELECT long_url FROM urls WHERE short_code = $1`, [short_code]);
    long_url = rows[0] ? rows[0].long_url : null;
  }

  if (!long_url) return { long_url: null, source: 'not-found' };

  // 3) save in cache for next time
  await redis.set(cacheKey(short_code), long_url, CACHE_TTL_SECONDS);

  return { long_url, source: 'cache-miss' };
}

async function incrementClicks(short_code) {
  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(JSON_DB_PATH);
    const found = rows.find((r) => r.short_code === short_code);
    if (found) {
      found.clicks = (found.clicks || 0) + 1;
      writeJsonDb(JSON_DB_PATH, rows);
    }
  } else {
    await primaryPool.query(`UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1`, [short_code]);
  }
}

async function findAllByUser(user_id) {
  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(JSON_DB_PATH);
    return rows.filter((r) => r.user_id === user_id);
  }
  const { rows } = await readPool.query(`SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC`, [user_id]);
  return rows;
}

module.exports = { create, findByShortCode, incrementClicks, findAllByUser };
