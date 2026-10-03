/**
 * InvestPredictor - Finnhub API Proxy Server
 * Production-ready with security hardening
 * 
 * Security Features:
 * - Environment validation at startup (fail-fast)
 * - CORS with explicit allowed origins
 * - Helmet security headers (CSP, HSTS, etc.)
 * - Rate limiting with configurable thresholds
 * - Input validation & sanitization
 * - No stack traces in production
 * - Structured logging with secret redaction
 * - Graceful shutdown handling
 */

const express = require('express');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// ============================================================================
// ENVIRONMENT VALIDATION (Fail-Fast)
// ============================================================================
function validateEnvironment() {
  const required = ['FINNHUB_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('[FATAL] Missing required environment variables:', missing.join(', '));
    console.error('[FATAL] Check server/.env.example for required variables');
    process.exit(1);
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!validEnvs.includes(nodeEnv)) {
    console.warn('[WARN] Invalid NODE_ENV, defaulting to development');
    process.env.NODE_ENV = 'development';
  }

  // Parse CORS origins
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  
  if (origins.length === 0) {
    console.error('[FATAL] ALLOWED_ORIGINS must contain at least one origin');
    process.exit(1);
  }

  return {
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: nodeEnv,
    ALLOWED_ORIGINS: origins,
    RATE_LIMIT_REQUESTS: parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000', 10),
    CACHE_TTL_QUOTE: parseInt(process.env.CACHE_TTL_QUOTE || '10', 10),
    CACHE_TTL_STATIC: parseInt(process.env.CACHE_TTL_STATIC || '60', 10),
    CACHE_TTL_NEWS: parseInt(process.env.CACHE_TTL_NEWS || '10', 10),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };
}

const config = validateEnvironment();

// ============================================================================
// SECURE LOGGER (Redacts Secrets)
// ============================================================================
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[config.LOG_LEVEL.toLowerCase()] ?? 1;

const SECRET_PATTERNS = [
  /token=[^&\s]+/gi,
  /api[_-]?key[=:][^&\s]+/gi,
  /authorization:\s*[^&\s]+/gi,
  /password[=:][^&\s]+/gi,
  /secret[=:][^&\s]+/gi,
];

function redactSecrets(obj) {
  if (typeof obj === 'string') {
    let str = obj;
    SECRET_PATTERNS.forEach(p => { str = str.replace(p, (m) => m.split('=')[0] + '=***REDACTED***'); });
    return str;
  }
  if (Array.isArray(obj)) return obj.map(redactSecrets);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || 
          k.toLowerCase().includes('token') || k.toLowerCase().includes('password')) {
        result[k] = '***REDACTED***';
      } else {
        result[k] = redactSecrets(v);
      }
    }
    return result;
  }
  return obj;
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLogLevel) return;
  const timestamp = new Date().toISOString();
  const safeMeta = redactSecrets(meta);
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, JSON.stringify(safeMeta));
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

// ============================================================================
// EXPRESS APP WITH SECURITY HARDENING
// ============================================================================
const app = express();
const PORT = config.PORT;
const BASE_URL = 'https://finnhub.io/api/v1';

// Trust proxy for correct IP behind load balancers
app.set('trust proxy', 1);

// ============================================================================
// HELMET - Security Headers
// ============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // React needs unsafe-inline for dev
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.VITE_PROXY_URL || 'http://localhost:3001'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some APIs
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

// Debug: Log that helmet is applied
app.use((req, res, next) => {
  logger.debug('Helmet applied', { 
    csp: res.getHeader('content-security-policy'),
    hsts: res.getHeader('strict-transport-security'),
    xfo: res.getHeader('x-frame-options'),
    xcto: res.getHeader('x-content-type-options'),
    rp: res.getHeader('referrer-policy'),
  });
  next();
});

// ============================================================================
// CORS - Explicit Origins Only (using official cors package)
// ============================================================================
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin) like server-to-server
    if (!origin) return callback(null, true);
    
    if (config.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    logger.warn('CORS blocked request', { origin, allowed: config.ALLOWED_ORIGINS });
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
});

app.use(corsMiddleware);

// Handle preflight requests explicitly
app.options('*', corsMiddleware);

// ============================================================================
// BODY PARSING WITH LIMITS
// ============================================================================
app.use(express.json({ limit: '10kb' })); // Prevent large payload DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================================================
// REQUEST LOGGING
// ============================================================================
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  
  logger.debug('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });
  
  next();
});

// ============================================================================
// RATE LIMITING - Enhanced with Redis-ready structure
// ============================================================================
const rateLimitMap = new Map();
const RATE_LIMIT = config.RATE_LIMIT_REQUESTS;
const RATE_WINDOW = config.RATE_LIMIT_WINDOW_MS;

function createRateLimiter(maxRequests, windowMs, prefix = 'global') {
  const store = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!store.has(key)) {
      store.set(key, []);
    }
    
    const requests = store.get(key).filter(t => t > windowStart);
    
    if (requests.length >= maxRequests) {
      logger.warn('Rate limit exceeded', { ip, key, count: requests.length });
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    requests.push(now);
    store.set(key, requests);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests.length));
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
    
    next();
  };
}

// Apply different limits for different endpoint types
app.use(createRateLimiter(RATE_LIMIT, RATE_WINDOW, 'api'));

// Stricter limits for auth-like endpoints (if any)
const authRateLimiter = createRateLimiter(5, 60000, 'auth'); // 5 per minute

// ============================================================================
// CACHING LAYER
// ============================================================================
const quoteCache = new NodeCache({ 
  stdTTL: config.CACHE_TTL_QUOTE, 
  checkperiod: Math.max(5, Math.floor(config.CACHE_TTL_QUOTE / 2)) 
});
const staticCache = new NodeCache({ 
  stdTTL: config.CACHE_TTL_STATIC, 
  checkperiod: Math.max(5, Math.floor(config.CACHE_TTL_STATIC / 2)) 
});
const newsCache = new NodeCache({ 
  stdTTL: config.CACHE_TTL_NEWS, 
  checkperiod: Math.max(5, Math.floor(config.CACHE_TTL_NEWS / 2)) 
});

// Cache statistics endpoint
app.get('/admin/cache/stats', (req, res) => {
  res.json({
    quoteCache: { keys: quoteCache.keys().length, stats: quoteCache.getStats() },
    staticCache: { keys: staticCache.keys().length, stats: staticCache.getStats() },
    newsCache: { keys: newsCache.keys().length, stats: newsCache.getStats() },
  });
});

// ============================================================================
// INPUT VALIDATION HELPERS
// ============================================================================
function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  // Only allow alphanumeric, dots, dashes, carets (for indices like ^GSPC)
  return /^[A-Za-z0-9.\-^]{1,10}$/.test(symbol.trim());
}

function validateCategory(category) {
  const valid = ['general', 'forex', 'crypto', 'merger'];
  return valid.includes(category);
}

function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

function validateResolution(resolution) {
  const valid = ['1', '5', '15', '30', '60', 'D', 'W', 'M'];
  return valid.includes(resolution);
}

function sanitizeQueryParams(params, schema) {
  const result = {};
  for (const [key, validator] of Object.entries(schema)) {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      if (validator.required) {
        throw new Error(`Missing required parameter: ${key}`);
      }
      continue;
    }
    if (validator.validate && !validator.validate(value)) {
      throw new Error(`Invalid value for ${key}: ${value}`);
    }
    result[key] = validator.sanitize ? validator.sanitize(value) : value;
  }
  return result;
}

// ============================================================================
// FINNHUB FETCH HELPER
// ============================================================================
async function fetchFromFinnhub(endpoint, cacheInstance = null) {
  const cache = cacheInstance;
  const cacheKey = endpoint;
  
  if (cache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { endpoint });
      return cached;
    }
  }
  
  // Build URL with token in query (Finnhub requirement)
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${config.FINNHUB_API_KEY}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'InvestPredictor/1.0',
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      // Don't log the full URL with token
      const safeUrl = url.replace(/token=[^&]+/, 'token=***REDACTED***');
      logger.error('Finnhub API error', { 
        status: response.status, 
        statusText: response.statusText,
        endpoint: endpoint.replace(/token=[^&]+/, 'token=***')
      });
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (cache) {
      cache.set(cacheKey, data);
    }
    
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.error('Finnhub request timeout', { endpoint });
      throw new Error('Upstream request timeout');
    }
    logger.error('Finnhub fetch failed', { endpoint, error: err.message });
    throw err;
  }
}

// ============================================================================
// PROXY ENDPOINTS WITH VALIDATION
// ============================================================================

// GET /api/market/quote?symbol=AAPL
app.get('/api/market/quote', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/quote?symbol=${encodeURIComponent(symbol)}`, false);
    res.json(data);
  } catch (err) {
    logger.error('Quote endpoint error', { error: err.message, query: req.query });
    res.status(err.message.includes('required') || err.message.includes('Invalid') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch quote' : err.message });
  }
});

// GET /api/market/profile?symbol=AAPL
app.get('/api/market/profile', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Profile endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch profile' : err.message });
  }
});

// GET /api/market/financials?symbol=AAPL
app.get('/api/market/financials', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Financials endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch financials' : err.message });
  }
});

// GET /api/market/candles?symbol=AAPL&resolution=D&from=123&to=456
app.get('/api/market/candles', async (req, res) => {
  try {
    const params = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() },
      resolution: { required: true, validate: validateResolution, sanitize: s => s },
      from: { required: true, validate: v => /^\d+$/.test(v), sanitize: s => s },
      to: { required: true, validate: v => /^\d+$/.test(v), sanitize: s => s },
    });
    
    const data = await fetchFromFinnhub(
      `/stock/candle?symbol=${encodeURIComponent(params.symbol)}&resolution=${params.resolution}&from=${params.from}&to=${params.to}`,
      staticCache
    );
    res.json(data);
  } catch (err) {
    logger.error('Candles endpoint error', { error: err.message });
    res.status(err.message.includes('required') || err.message.includes('Invalid') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch candles' : err.message });
  }
});

// GET /api/market/news?category=general
app.get('/api/market/news', async (req, res) => {
  try {
    const params = sanitizeQueryParams(req.query, {
      category: { required: false, validate: validateCategory, sanitize: s => s || 'general' }
    });
    const data = await fetchFromFinnhub(`/news?category=${params.category}`, newsCache);
    res.json(data);
  } catch (err) {
    logger.error('News endpoint error', { error: err.message });
    res.status(err.message.includes('Invalid') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch news' : err.message });
  }
});

// GET /api/market/company-news?symbol=AAPL&from=2024-01-01&to=2024-01-31
app.get('/api/market/company-news', async (req, res) => {
  try {
    const params = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() },
      from: { required: true, validate: validateDate, sanitize: s => s },
      to: { required: true, validate: validateDate, sanitize: s => s },
    });
    
    // Validate date range
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'from date must be before to date' });
    }
    const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days max
    if (toDate - fromDate > maxRange) {
      return res.status(400).json({ error: 'Date range exceeds maximum of 30 days' });
    }
    
    const data = await fetchFromFinnhub(
      `/company-news?symbol=${encodeURIComponent(params.symbol)}&from=${params.from}&to=${params.to}`,
      newsCache
    );
    res.json(data);
  } catch (err) {
    logger.error('Company news endpoint error', { error: err.message });
    res.status(err.message.includes('required') || err.message.includes('Invalid') || err.message.includes('date') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch company news' : err.message });
  }
});

// GET /api/market/search?q=AAPL
app.get('/api/market/search', async (req, res) => {
  try {
    const params = sanitizeQueryParams(req.query, {
      q: { required: true, validate: v => typeof v === 'string' && v.length >= 1 && v.length <= 50, sanitize: s => s.trim() }
    });
    
    if (!params.q || params.q.length < 1) {
      return res.json({ count: 0, result: [] });
    }
    
    const data = await fetchFromFinnhub(`/search?q=${encodeURIComponent(params.q)}`, staticCache);
    
    // Filter for stocks only
    if (data.result) {
      data.result = data.result.filter(r => 
        r.type === 'Common Stock' || r.type === 'ADR' || r.type === 'ETF'
      );
    }
    res.json(data);
  } catch (err) {
    logger.error('Search endpoint error', { error: err.message });
    res.status(err.message.includes('required') || err.message.includes('Invalid') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to search symbols' : err.message });
  }
});

// GET /api/market/price-target?symbol=AAPL
app.get('/api/market/price-target', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/stock/price-target?symbol=${encodeURIComponent(symbol)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Price target endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch price target' : err.message });
  }
});

// GET /api/market/recommendations?symbol=AAPL
app.get('/api/market/recommendations', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/stock/recommendation?symbol=${encodeURIComponent(symbol)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Recommendations endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch recommendations' : err.message });
  }
});

// GET /api/market/peers?symbol=AAPL
app.get('/api/market/peers', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/stock/peers?symbol=${encodeURIComponent(symbol)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Peers endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch peers' : err.message });
  }
});

// GET /api/market/news-sentiment?symbol=AAPL
app.get('/api/market/news-sentiment', async (req, res) => {
  try {
    const { symbol } = sanitizeQueryParams(req.query, {
      symbol: { required: true, validate: validateSymbol, sanitize: s => s.trim().toUpperCase() }
    });
    const data = await fetchFromFinnhub(`/news-sentiment?symbol=${encodeURIComponent(symbol)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('News sentiment endpoint error', { error: err.message });
    res.status(err.message.includes('required') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch news sentiment' : err.message });
  }
});

// GET /api/market/symbols?exchange=US
app.get('/api/market/symbols', async (req, res) => {
  try {
    const params = sanitizeQueryParams(req.query, {
      exchange: { required: false, validate: v => typeof v === 'string' && v.length <= 10, sanitize: s => s || 'US' }
    });
    const data = await fetchFromFinnhub(`/stock/symbol?exchange=${encodeURIComponent(params.exchange)}`, staticCache);
    res.json(data);
  } catch (err) {
    logger.error('Symbols endpoint error', { error: err.message });
    res.status(err.message.includes('Invalid') ? 400 : 502)
       .json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch symbols' : err.message });
  }
});

// GET /api/market/indices
app.get('/api/market/indices', async (req, res) => {
  try {
    const indices = [
      { symbol: '^GSPC', name: 'S&P 500', displaySymbol: 'SPX' },
      { symbol: '^DJI', name: 'Dow Jones', displaySymbol: 'DJI' },
      { symbol: '^IXIC', name: 'NASDAQ', displaySymbol: 'NDQ' },
      { symbol: '^RUT', name: 'Russell 2000', displaySymbol: 'RUT' },
      { symbol: '^VIX', name: 'VIX', displaySymbol: 'VIX' },
    ];
    
    const results = await Promise.all(
      indices.map(async (idx) => {
        try {
          const quote = await fetchFromFinnhub(`/quote?symbol=${encodeURIComponent(idx.symbol)}`, false);
          if (quote && quote.error) {
            logger.warn(`Index ${idx.symbol} unavailable`, { error: quote.error });
            return { ...idx, quote: null };
          }
          return { ...idx, quote };
        } catch {
          return { ...idx, quote: null };
        }
      })
    );
    
    res.json(results);
  } catch (err) {
    logger.error('Indices endpoint error', { error: err.message });
    res.status(502).json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch indices' : err.message });
  }
});

// GET /api/market/sectors
app.get('/api/market/sectors', async (req, res) => {
  try {
    const sectorETFs = {
      Technology: 'XLK', Healthcare: 'XLV', Financial: 'XLF',
      'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP', Energy: 'XLE',
      Industrial: 'XLI', Materials: 'XLB', 'Real Estate': 'XLRE',
      Utilities: 'XLU', Communication: 'XLC',
    };
    
    const results = await Promise.all(
      Object.entries(sectorETFs).map(async ([sector, etf]) => {
        try {
          const quote = await fetchFromFinnhub(`/quote?symbol=${encodeURIComponent(etf)}`, false);
          if (quote) return { sector, changePercentage: quote.dp };
        } catch {
          // skip failed sectors
        }
        return null;
      })
    );
    
    const validResults = results.filter(Boolean).sort((a, b) => b.changePercentage - a.changePercentage);
    res.json(validResults);
  } catch (err) {
    logger.error('Sectors endpoint error', { error: err.message });
    res.status(502).json({ error: config.NODE_ENV === 'production' ? 'Failed to fetch sectors' : err.message });
  }
});

// Health check (no auth, no rate limit for monitoring)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    env: config.NODE_ENV
  });
});

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

// 404 Handler
app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.url, ip: req.ip });
  res.status(404).json({ error: 'Not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  // Log full error in development, sanitized in production
  if (config.NODE_ENV === 'production') {
    logger.error('Unhandled error', { 
      requestId, 
      message: err.message,
      stack: undefined, // Never expose stack in production
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.error('Unhandled error', { 
      requestId, 
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }
  
  // Don't expose internal errors in production
  if (config.NODE_ENV === 'production') {
    return res.status(500).json({ 
      error: 'Internal server error',
      requestId 
    });
  }
  
  res.status(500).json({ 
    error: err.message,
    requestId,
    stack: err.stack 
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
let server;
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close caches
    quoteCache.close();
    staticCache.close();
    newsCache.close();
    logger.info('Caches closed');
    
    // Clear rate limit store
    rateLimitMap.clear();
    logger.info('Rate limit store cleared');
    
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  // Don't exit immediately for unhandled rejections in development
  if (config.NODE_ENV === 'production') {
    gracefulShutdown('unhandledRejection');
  }
});

// ============================================================================
// START SERVER
// ============================================================================
server = app.listen(PORT, () => {
  logger.info(`Finnhub proxy server started`, {
    port: PORT,
    env: config.NODE_ENV,
    allowedOrigins: config.ALLOWED_ORIGINS,
    rateLimit: `${config.RATE_LIMIT_REQUESTS} req/${config.RATE_LIMIT_WINDOW_MS}ms`,
  });
});

module.exports = app;