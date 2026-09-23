/**
 * app.js — express app wiring.
 * route -> controller -> service -> repository -> DB  (as you specified)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { errorHandler, notFound } = require('./middelware');
const { rateLimiter } = require('../../infra/reteLimiting');

const urlRoutes = require('./routes/url.routes');
const authRoutes = require('./routes/auth.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// "rate limiting to save system from DDOS Attack" — applied first, before anything else
app.use(rateLimiter);

app.get('/health', (req, res) =>
  res.json({ ok: true, server: process.env.SERVER_NAME || 'server' })
);

app.use(authRoutes);
app.use(analyticsRoutes);
app.use(urlRoutes); // keep last: it owns the catch-all GET /:code redirect

app.use(notFound);
app.use(errorHandler);

module.exports = app;
