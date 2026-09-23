/**
 * analytics.repository.js
 * Reads from the Analytics DB that the background worker writes to:
 *   Server -> Message Queue -> Analytics Worker -> Analytics DB
 * This repository only READS (the worker owns the writes).
 */
const { ANALYTICS_JSON_PATH, readJsonDb, USE_JSON_FALLBACK, readPool } = require('../config/db');

async function findByShortCode(short_code) {
  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(ANALYTICS_JSON_PATH);
    return rows.filter((r) => r.short_code === short_code);
  }
  const { rows } = await readPool.query(`SELECT * FROM analytics WHERE short_code = $1 ORDER BY timestamp DESC`, [short_code]);
  return rows;
}

async function findAll(limit = 200) {
  if (USE_JSON_FALLBACK) {
    const rows = readJsonDb(ANALYTICS_JSON_PATH);
    return rows.slice(-limit).reverse();
  }
  const { rows } = await readPool.query(`SELECT * FROM analytics ORDER BY timestamp DESC LIMIT $1`, [limit]);
  return rows;
}

module.exports = { findByShortCode, findAll };
