# 🚀 Vercel-Only Deployment Guide

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL DEPLOYMENT                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite)     │  API (Serverless Functions)   │
│  ─────────────────────────  │  ───────────────────────────── │
│  • Static assets (dist/)   │  • 13 endpoints in /api/       │
│  • Edge CDN                │  • Vercel KV (Redis)           │
│  • Auto HTTPS              │  • Rate limiting (30/s)        │
│  • Preview deployments     │  • Caching (KV)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Pre-Deployment Checklist

### 1. Repository Setup
```bash
# Verify git status
git status
# Should show:
# - api/ (new directory)
# - vercel.json (new)
# - Modified: src/lib/finnhub.ts, package.json, .env.example
# - NO .env files tracked
```

### 2. Required Environment Variables (Set in Vercel Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | ✅ Yes | Your Finnhub API key |
| `ALLOWED_ORIGINS` | ⚠️ Recommended | Comma-separated: `https://your-app.vercel.app,https://your-custom-domain.com` |

### 3. Vercel KV (Redis) Setup
1. Go to Vercel Dashboard → **Storage** → **Create Database** → **KV**
2. Select region (same as your functions: `iad1` for US East)
3. Copy connection string (auto-injected as `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.)

---

## 🚀 Deployment Steps

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
cd "C:\Users\riznasabith\Desktop\imf technology\stock new updated\project"
vercel --prod

# Follow prompts:
# - Link to existing project? N (first time)
# - Project name: investpredictor
# - Directory: ./
# - Override settings? N
```

### Option 2: Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables (see table above)
5. Click **Deploy**

---

## 🔧 Vercel Configuration Details

### vercel.json (Already Created)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": { "maxDuration": 30, "memory": 1024 }
  },
  "headers": [
    { "source": "/api/(.*)", "headers": [CORS, Security Headers] },
    { "source": "/(.*)", "headers": [Security Headers] }
  ]
}
```

### API Endpoints (13 Functions)
| Endpoint | Path | Cache TTL |
|----------|------|-----------|
| Quote | `/api/market/quote` | 10s (no cache) |
| Profile | `/api/market/profile` | 60s |
| Financials | `/api/market/financials` | 60s |
| Candles | `/api/market/candles` | 60s |
| Market News | `/api/market/news` | 10s |
| Company News | `/api/market/company-news` | 10s |
| Search | `/api/market/search` | 60s |
| Price Target | `/api/market/price-target` | 60s |
| Recommendations | `/api/market/recommendations` | 60s |
| Peers | `/api/market/peers` | 60s |
| News Sentiment | `/api/market/news-sentiment` | 60s |
| Symbols | `/api/market/symbols` | 60s |
| Indices | `/api/market/indices` | No cache |
| Sectors | `/api/market/sectors` | 60s |
| Health | `/api/health` | No cache |

---

## 🔐 Security Features Implemented

| Feature | Implementation |
|---------|----------------|
| **API Key Protection** | `FINNHUB_API_KEY` only in Vercel env vars, never in client bundle |
| **Rate Limiting** | 30 req/s per IP via Vercel KV (sliding window) |
| **CORS** | Explicit origins via `ALLOWED_ORIGINS` env var |
| **Security Headers** | CSP, HSTS, X-Frame-Options, nosniff, etc. |
| **Input Validation** | All params validated (symbol format, dates, ranges) |
| **Error Sanitization** | No stack traces in production |
| **Input Sanitization** | Symbol format, date validation, range limits |

---

## 🧪 Testing After Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/health
# Expected: {"status":"ok","kv":"connected",...}
```

### 2. API Endpoints
```bash
# Quote
curl "https://your-app.vercel.app/api/market/quote?symbol=AAPL"

# Search
curl "https://your-app.vercel.app/api/market/search?q=AAPL"

# Market News
curl "https://your-app.vercel.app/api/market/news?category=general"

# Indices
curl "https://your-app.vercel.app/api/market/indices"
```

### 3. Rate Limit Headers
```bash
curl -I "https://your-app.vercel.app/api/market/quote?symbol=AAPL"
# Should include:
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 29
# X-RateLimit-Reset: <timestamp>
```

### 4. Security Headers
```bash
curl -I "https://your-app.vercel.app/"
# Should include:
# Content-Security-Policy: ...
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

---

## 💰 Cost Estimate

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Vercel** | ✅ Unlimited personal | 100GB bandwidth, 100GB storage |
| **Vercel KV** | ✅ 30M requests/mo | 256MB storage |
| **Total** | **$0/month** | Production-ready |

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Function timeout** | Increase `maxDuration` in vercel.json (max 30s on Pro) |
| **KV connection fails** | Verify KV integration is linked in Vercel Dashboard |
| **CORS errors** | Check `ALLOWED_ORIGINS` matches exact frontend URL |
| **Rate limit too strict** | Increase `RATE_LIMIT_REQUESTS` in env vars |
| **Cache not working** | Verify KV integration; check `kvHealthy` in `/api/health` |
| **Build fails** | Run `npm run build` locally first; check TypeScript errors |

---

## 📝 Post-Deployment Checklist

- [ ] Frontend loads at `https://your-app.vercel.app`
- [ ] `/api/health` returns `kv: "connected"`
- [ ] Quote endpoint returns real data for AAPL
- [ ] Search returns results for "AAPL"
- [ ] Market news loads
- [ ] CORS headers present on API responses
- [ ] Rate limit headers present
- [ ] Security headers present on all responses
- [ ] No API keys in browser DevTools → Network → Response
- [ ] Custom domain configured (optional)
- [ ] Supabase Auth redirect URLs updated to new Vercel URL

---

## 🔄 Rollback Plan

If issues arise:
```bash
# Vercel Dashboard → Deployments → Click "..." → "Rollback"
# Or CLI:
vercel rollback <deployment-url>
```

---

## 📚 Key Files Reference

```
├── api/
│   ├── health.ts                 # Health check
│   ├── _lib/
│   │   ├── finnhub.ts            # Finnhub client + KV cache + rate limit
│   │   └── response.ts           # Standardized responses + security headers
│   └── market/
│       ├── quote.ts              # Real-time quotes (10s cache)
│       ├── profile.ts            # Company profile (60s cache)
│       ├── financials.ts         # Financial metrics (60s cache)
│       ├── candles.ts            # OHLCV data (60s cache)
│       ├── news.ts               # Market news (10s cache)
│       ├── company-news.ts       # Company-specific news (10s)
│       ├── search.ts             # Symbol search (60s cache)
│       ├── price-target.ts       # Analyst targets (60s)
│       ├── recommendations.ts    # Analyst ratings (60s)
│       ├── peers.ts              # Competitors (60s)
│       ├── news-sentiment.ts     # News sentiment (60s)
│       ├── symbols.ts            # Exchange symbols (60s)
│       ├── indices.ts            # Market indices (no cache)
│       └── sectors.ts            # Sector performance (60s)
├── vercel.json                   # Vercel configuration
├── src/lib/finnhub.ts            # Frontend API client (relative paths)
├── .env.example                  # Frontend env template
└── package.json                  # Dependencies
```

---

## ✅ Migration Complete

The application is now **100% Vercel-native** with:
- ✅ Zero API keys in client bundle
- ✅ Serverless functions with KV caching
- ✅ Rate limiting via Vercel KV
- ✅ Security headers on all responses
- ✅ Input validation on all endpoints
- ✅ Error sanitization in production
- ✅ CORS with explicit origins
- ✅ Build passes, no secrets in bundle

**Ready for production deployment!** 🎉