const authService = require('../service/auth.service');

const COOKIE_NAME = 'auth_token';
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: authService.TOKEN_TTL_SECONDS * 1000,
});

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const { token, user } = await authService.register({ email, password });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json({ token, user });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login({ email, password });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ token, user });
  } catch (e) {
    next(e);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME] || (req.headers.authorization || '').replace('Bearer ', '');
    await authService.logout(token);
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, logout, me, COOKIE_NAME };
