const router = require('express').Router();
const analyticsController = require('../controller/analytics.controller');
const { requireAuth } = require('../middelware');

router.get('/api/analytics/mine', requireAuth, analyticsController.myAnalytics);
router.get('/api/analytics/:code', requireAuth, analyticsController.analyticsForCode);

module.exports = router;
