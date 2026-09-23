/**
 * user model
 * Postgres table shape:
 *
 * CREATE TABLE users (
 *   id            SERIAL PRIMARY KEY,
 *   email         VARCHAR(255) UNIQUE NOT NULL,
 *   password_hash TEXT NOT NULL,
 *   created_at    TIMESTAMP DEFAULT NOW()
 * );
 */
class UserModel {
  constructor({ id, email, password_hash, created_at = new Date().toISOString() }) {
    this.id = id;
    this.email = email;
    this.password_hash = password_hash;
    this.created_at = created_at;
  }
}

module.exports = UserModel;
