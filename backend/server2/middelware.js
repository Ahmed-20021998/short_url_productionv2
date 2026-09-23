/**
 * middelware.js
 * - requireAuth / optionalAuth: reads token from httpOnly cookie OR
 *   Authorization header, validates it against the shared Redis session
 *   cache (so login is shared across server1/2/3), attaches req.user.
 * - errorHandler: single place that turns thrown errors into JSON responses.
 */
const authService = require('./service/auth.service');
const { COOKIE_NAME } = require('./controller/auth.controller');

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    const user = await authService.verifySession(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    req.user = token ? await authService.verifySession(token) : null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'internal server error' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'not found' });
}

module.exports = { requireAuth, optionalAuth, errorHandler, notFound };
