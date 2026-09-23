/**
 * infra/worker.js — Analytics Worker
 * Consumes events pushed by any server (server1/2/3) via infra/queue.js
 * and persists them to the Analytics DB.
 *   { "short_code": "abc123", "timestamp": "...", "country": "Egypt", "device": "mobile" }
 *
 * Run with: node infra/worker.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { consume } = require('./queue');

const USE_JSON_FALLBACK = !process.env.DATABASE_URL_PRIMARY;
const ANALYTICS_JSON_PATH = path.join(__dirname, '../shared/DB/Analytics.json');

let pool = null;
if (!USE_JSON_FALLBACK) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL_PRIMARY });
}

function readAnalytics() {
  if (!fs.existsSync(ANALYTICS_JSON_PATH)) fs.writeFileSync(ANALYTICS_JSON_PATH, '[]');
  return JSON.parse(fs.readFileSync(ANALYTICS_JSON_PATH, 'utf-8'));
}
function writeAnalytics(rows) {
  fs.writeFileSync(ANALYTICS_JSON_PATH, JSON.stringify(rows, null, 2));
}

async function saveEvent(event) {
  if (USE_JSON_FALLBACK) {
    const rows = readAnalytics();
    rows.push(event);
    writeAnalytics(rows);
  } else {
    await pool.query(
      `INSERT INTO analytics (short_code, timestamp, country, device) VALUES ($1, $2, $3, $4)`,
      [event.short_code, event.timestamp, event.country, event.device]
    );
  }
  console.log('[analytics-worker] saved event:', event);
}

console.log('[analytics-worker] started, waiting for events...');
consume(saveEvent).catch((e) => {
  console.error('[analytics-worker] fatal error', e);
  process.exit(1);
});
