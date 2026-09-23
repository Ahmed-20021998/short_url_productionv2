/**
 * user.repository.js
 * Users are stored in the primary DB (JSON fallback: /shared/DB/url.json is
 * for urls only, so users get their own small JSON file next to it when
 * running without Postgres).
 */
const path = require('path');
const fs = require('fs');
const { primaryPool, USE_JSON_FALLBACK } = require('../config/db');
const UserModel = require('../model/user.model');

const USERS_JSON_PATH = path.join(__dirname, '../../../shared/DB/users.json');

function readUsers() {
  if (!fs.existsSync(USERS_JSON_PATH)) fs.writeFileSync(USERS_JSON_PATH, '[]');
  return JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf-8'));
}
function writeUsers(rows) {
  fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(rows, null, 2));
}

async function create({ email, password_hash }) {
  if (USE_JSON_FALLBACK) {
    const rows = readUsers();
    const row = new UserModel({ id: rows.length + 1, email, password_hash });
    rows.push(row);
    writeUsers(rows);
    return row;
  }
  const { rows } = await primaryPool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
    [email, password_hash]
  );
  return new UserModel(rows[0]);
}

async function findByEmail(email) {
  if (USE_JSON_FALLBACK) {
    const rows = readUsers();
    return rows.find((u) => u.email === email) || null;
  }
  const { rows } = await primaryPool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  if (USE_JSON_FALLBACK) {
    const rows = readUsers();
    return rows.find((u) => u.id === id) || null;
  }
  const { rows } = await primaryPool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

module.exports = { create, findByEmail, findById };
