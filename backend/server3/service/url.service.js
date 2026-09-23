/**
 * url.service.js — business logic layer.
 * Controllers call services; services call repositories. Services never
 * touch req/res and repositories never contain business rules.
 */
const { nanoid } = require('nanoid');
const urlRepository = require('../repository/url.repository');
const { pushAnalyticsEvent } = require('../../../infra/queue');

const SHORT_CODE_LENGTH = 7;

async function shortenUrl({ long_url, user_id }) {
  if (!long_url || !/^https?:\/\//i.test(long_url)) {
    const err = new Error('long_url must be a valid absolute URL (http:// or https://)');
    err.status = 400;
    throw err;
  }

  const short_code = nanoid(SHORT_CODE_LENGTH);
  const row = await urlRepository.create({ short_code, long_url, user_id });
  return row;
}

async function resolveShortCode(short_code, meta = {}) {
  const { long_url, source } = await urlRepository.findByShortCode(short_code);

  if (!long_url) {
    const err = new Error('short url not found');
    err.status = 404;
    throw err;
  }

  // fire-and-forget: don't block the redirect on analytics
  urlRepository.incrementClicks(short_code).catch(() => {});
  pushAnalyticsEvent({
    short_code,
    timestamp: new Date().toISOString(),
    country: meta.country || 'Unknown',
    device: meta.device || 'Unknown',
  }).catch(() => {});

  return { long_url, source };
}

async function listUserUrls(user_id) {
  return urlRepository.findAllByUser(user_id);
}

module.exports = { shortenUrl, resolveShortCode, listUserUrls };
