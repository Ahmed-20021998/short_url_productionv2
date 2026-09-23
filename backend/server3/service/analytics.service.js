const analyticsRepository = require('../repository/analytics.repository');
const urlRepository = require('../repository/url.repository');

async function getAnalyticsForUser(user_id) {
  const urls = await urlRepository.findAllByUser(user_id);
  const all = await analyticsRepository.findAll(1000);
  const codes = new Set(urls.map((u) => u.short_code));
  return all.filter((e) => codes.has(e.short_code));
}

async function getAnalyticsForCode(short_code) {
  return analyticsRepository.findByShortCode(short_code);
}

module.exports = { getAnalyticsForUser, getAnalyticsForCode };
