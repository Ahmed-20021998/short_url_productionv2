/**
 * DB connector.
 * In production this connects to Postgres (primary = write, secondary = read replica),
 * matching the architecture diagram:
 *   primary DB  -> writes / deletes / updates
 *   2nd DB      -> read-only replica (read traffic is much higher than write traffic)
 *
 * For local development / demo (no Postgres available) it falls back to the
 * JSON files in /shared/DB so the whole app runs with zero external services.
 */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const USE_JSON_FALLBACK = !process.env.DATABASE_URL_PRIMARY;

const primaryPool = USE_JSON_FALLBACK
  ? null
  : new Pool({ connectionString: process.env.DATABASE_URL_PRIMARY });

const readPool = USE_JSON_FALLBACK
  ? null
  : new Pool({ connectionString: process.env.DATABASE_URL_READ || process.env.DATABASE_URL_PRIMARY });

const JSON_DB_PATH = path.join(__dirname, '../../../shared/DB/url.json');
const ANALYTICS_JSON_PATH = path.join(__dirname, '../../../shared/DB/Analytics.json');

function readJsonDb(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJsonDb(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  USE_JSON_FALLBACK,
  primaryPool,
  readPool,
  JSON_DB_PATH,
  ANALYTICS_JSON_PATH,
  readJsonDb,
  writeJsonDb,
};
