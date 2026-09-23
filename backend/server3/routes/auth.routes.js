const router = require('express').Router();
const authController = require('../controller/auth.controller');
const { requireAuth } = require('../middelware');

router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/logout', requireAuth, authController.logout);
router.get('/api/auth/me', requireAuth, authController.me);

module.exports = router;
