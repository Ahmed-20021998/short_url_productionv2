const analyticsService = require('../service/analytics.service');

async function myAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getAnalyticsForUser(req.user.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function analyticsForCode(req, res, next) {
  try {
    const data = await analyticsService.getAnalyticsForCode(req.params.code);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

module.exports = { myAnalytics, analyticsForCode };
