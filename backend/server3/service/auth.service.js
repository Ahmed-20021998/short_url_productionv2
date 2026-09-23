/**
 * auth.service.js
 * Register / login business logic.
 * Token flow (per your spec):
 *   1) generate JWT for the user
 *   2) store it in Redis (shared session cache -> works across server1/2/3)
 *   3) the controller also sets it as an httpOnly cookie
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repository/user.repository');
const { redis } = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const sessionKey = (token) => `session:${token}`;

async function register({ email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    const err = new Error('email already registered');
    err.status = 409;
    throw err;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await userRepository.create({ email, password_hash });
  return issueSession(user);
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const err = new Error('invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error('invalid credentials');
    err.status = 401;
    throw err;
  }
  return issueSession(user);
}

async function issueSession(user) {
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

  // shared session cache -> any of the 3 servers can validate this token
  // without hitting the DB, and staying logged in survives load-balancer
  // routing you to a different server on the next request.
  await redis.set(sessionKey(token), String(user.id), TOKEN_TTL_SECONDS);

  return { token, user: { id: user.id, email: user.email } };
}

async function verifySession(token) {
  if (!token) return null;
  const userId = await redis.get(sessionKey(token));
  if (userId) return { id: Number(userId) };

  // fallback: cache expired/missing but JWT itself may still be valid
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub };
  } catch {
    return null;
  }
}

async function logout(token) {
  await redis.del(sessionKey(token));
}

module.exports = { register, login, verifySession, logout, TOKEN_TTL_SECONDS };
