const router = require('express').Router();
const urlController = require('../controller/url.controller');
const { requireAuth, optionalAuth } = require('../middelware');

router.post('/api/url/shorten', optionalAuth, urlController.shorten);
router.get('/api/url/mine', requireAuth, urlController.myUrls);
router.get('/:code', urlController.redirect); // top-level redirect route, e.g. GET /abc123

module.exports = router;
