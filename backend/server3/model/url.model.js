/**
 * url model
 * Postgres table shape (see /shared/DB for the JSON-fallback equivalent):
 *
 * CREATE TABLE urls (
 *   id          SERIAL PRIMARY KEY,
 *   short_code  VARCHAR(12) UNIQUE NOT NULL,
 *   long_url    TEXT NOT NULL,
 *   user_id     INTEGER REFERENCES users(id),
 *   created_at  TIMESTAMP DEFAULT NOW(),
 *   clicks      INTEGER DEFAULT 0
 * );
 */
class UrlModel {
  constructor({ id, short_code, long_url, user_id = null, created_at = new Date().toISOString(), clicks = 0 }) {
    this.id = id;
    this.short_code = short_code;
    this.long_url = long_url;
    this.user_id = user_id;
    this.created_at = created_at;
    this.clicks = clicks;
  }
}

module.exports = UrlModel;
