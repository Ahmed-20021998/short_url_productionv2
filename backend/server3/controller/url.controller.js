const urlService = require('../service/url.service');

async function shorten(req, res, next) {
  try {
    const { long_url } = req.body;
    const row = await urlService.shortenUrl({ long_url, user_id: req.user ? req.user.id : null });
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      short_code: row.short_code,
      short_url: `${base}/${row.short_code}`,
      long_url: row.long_url,
    });
  } catch (e) {
    next(e);
  }
}

async function redirect(req, res, next) {
  try {
    const { code } = req.params;
    const meta = {
      device: /mobile/i.test(req.headers['user-agent'] || '') ? 'mobile' : 'desktop',
      country: req.headers['x-country'] || 'Unknown',
    };
    const { long_url, source } = await urlService.resolveShortCode(code, meta);
    res.set('X-Cache', source);
    return res.redirect(302, long_url);
  } catch (e) {
    next(e);
  }
}

async function myUrls(req, res, next) {
  try {
    const rows = await urlService.listUserUrls(req.user.id);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

module.exports = { shorten, redirect, myUrls };
