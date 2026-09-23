/**
 * infra/queue.js
 * Message Queue abstraction for the background analytics path:
 *   Server -> Message Queue -> Analytics Worker -> Analytics DB
 *
 * Implemented with a Redis list (LPUSH/BRPOP) so no extra broker is
 * required to run the project locally. In production swap this out for
 * BullMQ / RabbitMQ / SQS by only touching this file — nothing else in
 * the app depends on the transport.
 */
const path = require('path');
const fs = require('fs');

const QUEUE_KEY = 'queue:analytics_events';

let redisClient = null;
if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL);
}

// File-backed fallback queue (no Redis configured). A plain in-memory array
// would NOT work here because the server process and the worker process
// (infra/worker.js) are two separate Node processes — they don't share
// memory. A small JSON file under /shared acts as the queue instead, so the
// whole project still runs end-to-end with zero external services.
const QUEUE_FILE = path.join(__dirname, '../shared/DB/queue.json');

function readQueueFile() {
  if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]');
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}
function writeQueueFile(rows) {
  // write-to-temp-then-rename keeps this reasonably safe against a
  // server and the worker touching the file at close to the same time
  const tmp = `${QUEUE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, QUEUE_FILE);
}

async function pushAnalyticsEvent(event) {
  const payload = JSON.stringify(event);
  if (redisClient) {
    await redisClient.lpush(QUEUE_KEY, payload);
  } else {
    const rows = readQueueFile();
    rows.push(payload);
    writeQueueFile(rows);
  }
}

/**
 * Blocking-style consume, used by the worker.
 * onEvent(event) is called for every message popped off the queue.
 */
async function consume(onEvent) {
  if (redisClient) {
    const sub = new (require('ioredis'))(process.env.REDIS_URL);
    // simple polling BRPOP loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await sub.brpop(QUEUE_KEY, 5);
      if (res) {
        const [, payload] = res;
        try {
          await onEvent(JSON.parse(payload));
        } catch (e) {
          console.error('worker: failed to process event', e);
        }
      }
    }
  } else {
    // file-mode: poll the shared queue file
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = readQueueFile();
      if (rows.length) {
        const payload = rows.shift();
        writeQueueFile(rows);
        try {
          await onEvent(JSON.parse(payload));
        } catch (e) {
          console.error('worker: failed to process event', e);
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
}

module.exports = { pushAnalyticsEvent, consume };
