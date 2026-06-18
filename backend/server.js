import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import agentsRouter from './routes/agents.js';
import orchestratorRouter from './routes/orchestrator.js';
import { MODEL_ID } from './config/model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// FIX M1: When deployed behind a reverse proxy (Render, Cloudflare, etc.),
// req.ip otherwise resolves to the proxy IP and every client shares one
// rate-limit bucket. trust proxy = 1 honours the first X-Forwarded-For hop.
app.set('trust proxy', 1);

// FIX L5: Whitelist known origins instead of allowing all. In production
// FRONTEND_URL env var should be set to the deployed frontend address.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json({ limit: '10mb' }));

// FIX L6: Simple in-memory rate limiter — no external dependency required.
// Tracks request counts per IP per minute. Resets each window.
// Limits: agent/orchestrate endpoints 15 req/min, auth-check 5 req/min.
const rateLimitWindows = new Map(); // ip -> { count, windowStart }

function makeRateLimiter(maxPerMinute) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitWindows.get(ip) || { count: 0, windowStart: now };

    // Reset window if older than 60 seconds
    if (now - entry.windowStart >= 60000) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;
    rateLimitWindows.set(ip, entry);

    if (entry.count > maxPerMinute) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests. Please wait 1 minute.' });
    }
    next();
  };
}

// Purge stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, entry] of rateLimitWindows.entries()) {
    if (entry.windowStart < cutoff) rateLimitWindows.delete(ip);
  }
}, 300000);

// API routes
app.use('/api/agent', makeRateLimiter(15), agentsRouter);
app.use('/api/orchestrate', makeRateLimiter(15), orchestratorRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Sentinel by Octave', version: '1.0.0' }));

// Lightweight key-validation endpoint. Issues a 1-token ping to Anthropic so
// we can distinguish "valid key" from "network down / backend broken" without
// spending real tokens on a detection agent.
app.post('/api/auth-check', makeRateLimiter(5), async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required.' });
  try {
    const client = new Anthropic({ apiKey });
    // FIX H-A: Apply 10-second timeout so a hanging Anthropic connection doesn't
    // block the endpoint indefinitely and exhaust the server's connection pool.
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('Auth-check timeout'), { code: 'ETIMEOUT' })), 10000)
    );
    await Promise.race([
      client.messages.create({
        model: MODEL_ID,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
      timeoutPromise,
    ]);
    res.json({ valid: true });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: 'Invalid API key.' });
    if (err.status === 429) return res.status(429).json({ error: 'Rate limit reached.' });
    if (err.code === 'ETIMEOUT') return res.status(504).json({ error: 'Key check timed out. Backend may be under load — retry.' });
    console.error('Auth-check error:', err.message);
    res.status(502).json({ error: 'Could not verify key with Anthropic.' });
  }
});

// Serve sample data files for download
const sampleDataDir = path.join(__dirname, '..', 'sample-data');
app.use('/sample-data', express.static(sampleDataDir));

// Serve React frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sentinel backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
