/**
 * Finnhub API Client for Vercel Serverless Functions
 * Uses Vercel KV for caching and rate limiting
 */

import { kv } from '@vercel/kv';

// Finnhub API Configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

if (!FINNHUB_API_KEY) {
  console.error('[Finnhub] FINNHUB_API_KEY not configured');
}

// Cache TTLs (seconds)
const CACHE_TTL = {
  quote: 10,
  static: 60,
  news: 10,
};

// Rate limiting
const RATE_LIMIT = {
  requests: 30,
  windowMs: 1000,
};

// =====================
// Type Definitions
// =====================

export interface Quote {
  c: number; d: number; dp: number; h: number; l: number;
  o: number; pc: number; t: number; v?: number;
}

export interface CompanyProfile {
  country: string; currency: string; exchange: string;
  finnhubIndustry: string; ipo: string; logo: string;
  marketCapitalization: number; name: string; phone: string;
  shareOutstanding: number; symbol: string; weburl: string; ticker: string;
}

export interface BasicFinancials {
  metric: Record<string, number>; series: unknown;
}

export interface Candle {
  t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[]; s: string;
}

export interface NewsItem {
  id: number; category: string; datetime: number; headline: string;
  image: string; related: string; source: string; summary: string; url: string;
}

export interface SymbolSearchResult {
  symbol: string; description: string; displaySymbol: string; type: string;
}

export interface PriceTarget {
  targetHigh: number; targetLow: number; targetMean: number;
  targetMedian: number; numberOfAnalysts: number;
}

export interface RecommendationTrend {
  period: string; buy: number; hold: number; sell: number;
  strongBuy: number; strongSell: number;
}

export interface SectorPerformance {
  sector: string; changePercentage: number;
}

export interface MarketIndex {
  symbol: string; name: string; displaySymbol: string; quote: Quote | null;
}

// =====================
// Rate Limiting (Vercel KV)
// =====================

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;

  try {
    // Use sorted set for sliding window
    const keyZset = `ratelimit:zset:${ip}`;
    
    // Remove old entries
    await kv.zremrangebyscore(keyZset, 0, windowStart);
    
    // Count current requests
    const count = await kv.zcard(keyZset);
    
    if (count >= RATE_LIMIT.requests) {
      const oldest = await kv.zrange(keyZset, 0, 0, { withScores: true });
      const resetTime = oldest.length > 0 ? oldest[0].score + RATE_LIMIT.windowMs : now + RATE_LIMIT.windowMs;
      return { allowed: false, remaining: 0, reset: Math.ceil(resetTime / 1000) };
    }
    
    // Add current request
    await kv.zadd(keyZset, { score: now, value: `${now}:${Math.random()}` });
    await kv.expire(keyZset, Math.ceil(RATE_LIMIT.windowMs / 1000) + 1);
    
    return { allowed: true, remaining: RATE_LIMIT.requests - count - 1, reset: Math.ceil((now + RATE_LIMIT.windowMs) / 1000) };
  } catch (err) {
    console.error('[RateLimit] Error:', err);
    // Fail open - allow request if KV is down
    return { allowed: true, remaining: RATE_LIMIT.requests, reset: Math.ceil((now + RATE_LIMIT.windowMs) / 1000) };
  }
}

// =====================
// Caching (Vercel KV)
// =====================

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await kv.get(key);
    return data as T | null;
  } catch (err) {
    console.error('[Cache] Get error:', err);
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    await kv.set(key, data, { ex: ttl });
  } catch (err) {
    console.error('[Cache] Set error:', err);
  }
}

// =====================
// Finnhub API Fetch
// =====================

async function fetchFromFinnhub<T>(endpoint: string, useCache: boolean, cacheTtl: number): Promise<T> {
  const cacheKey = `finnhub:${endpoint}`;
  
  // Try cache first
  if (useCache) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${FINNHUB_API_KEY}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'InvestPredictor/1.0' }
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error(`Finnhub API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json() as T;
    
    if (useCache) {
      await setCache(cacheKey, data, cacheTtl);
    }
    
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Upstream request timeout');
    }
    throw err;
  }
}

// =====================
// Input Validation
// =====================

export function validateSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') throw new Error('Symbol is required');
  const sanitized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^]{1,10}$/.test(sanitized)) throw new Error('Invalid symbol format');
  return sanitized;
}

export function validateCategory(category: string): 'general' | 'forex' | 'crypto' | 'merger' {
  const valid = ['general', 'forex', 'crypto', 'merger'] as const;
  if (!valid.includes(category as any)) throw new Error('Invalid category');
  return category as 'general' | 'forex' | 'crypto' | 'merger';
}

export function validateDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') throw new Error('Date is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('Date must be YYYY-MM-DD');
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error('Invalid date');
  return dateStr;
}

export function validateResolution(resolution: string): string {
  const valid = ['1', '5', '15', '30', '60', 'D', 'W', 'M'];
  if (!valid.includes(resolution)) throw new Error('Invalid resolution');
  return resolution;
}

// =====================
// API Functions
// =====================

export async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<Quote>(`/quote?symbol=${encodeURIComponent(validSymbol)}`, false, 0);
  } catch {
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<CompanyProfile>(`/stock/profile2?symbol=${encodeURIComponent(validSymbol)}`, true, CACHE_TTL.static);
  } catch {
    return null;
  }
}

export async function getBasicFinancials(symbol: string): Promise<BasicFinancials | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<BasicFinancials>(`/stock/metric?symbol=${encodeURIComponent(validSymbol)}&metric=all`, true, CACHE_TTL.static);
  } catch {
    return null;
  }
}

export async function getCandles(
  symbol: string, resolution: string, from: number, to: number
): Promise<{ o: number[]; h: number[]; l: number[]; c: number[]; v: number[]; t: number[] } | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    validateResolution(resolution);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to) throw new Error('Invalid time range');
    
    const data = await fetchFromFinnhub<Candle>(
      `/stock/candle?symbol=${encodeURIComponent(validSymbol)}&resolution=${resolution}&from=${from}&to=${to}`,
      true, CACHE_TTL.static
    );
    if (data.s !== 'ok' || !data.c?.length) return null;
    return { o: data.o, h: data.h, l: data.l, c: data.c, v: data.v, t: data.t };
  } catch {
    return null;
  }
}

export async function getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<NewsItem[]> {
  try {
    const validCategory = validateCategory(category);
    return await fetchFromFinnhub<NewsItem[]>(`/news?category=${validCategory}`, true, CACHE_TTL.news);
  } catch {
    return [];
  }
}

export async function getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]> {
  try {
    const validSymbol = validateSymbol(symbol);
    const validFrom = validateDate(from);
    const validTo = validateDate(to);
    
    const fromDate = new Date(validFrom);
    const toDate = new Date(validTo);
    if (fromDate > toDate) throw new Error('from date must be before to date');
    if (toDate.getTime() - fromDate.getTime() > 30 * 24 * 60 * 60 * 1000) throw new Error('Date range exceeds 30 days');
    
    return await fetchFromFinnhub<NewsItem[]>(
      `/company-news?symbol=${encodeURIComponent(validSymbol)}&from=${validFrom}&to=${validTo}`,
      true, CACHE_TTL.news
    );
  } catch {
    return [];
  }
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query || query.length < 1) return [];
  if (query.length > 50) throw new Error('Query too long');
  
  try {
    const sanitized = query.trim();
    const data = await fetchFromFinnhub<{ count: number; result: SymbolSearchResult[] }>(
      `/search?q=${encodeURIComponent(sanitized)}`, true, CACHE_TTL.static
    );
    return (data.result || []).filter(r => 
      r.type === 'Common Stock' || r.type === 'ADR' || r.type === 'ETF'
    );
  } catch {
    return [];
  }
}

export async function getPriceTarget(symbol: string): Promise<{ targetHigh: number; targetLow: number; targetMean: number; targetMedian: number; numberOfAnalysts: number } | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<{ targetHigh: number; targetLow: number; targetMean: number; targetMedian: number; numberOfAnalysts: number }>(
      `/stock/price-target?symbol=${encodeURIComponent(validSymbol)}`, true, CACHE_TTL.static
    );
  } catch {
    return null;
  }
}

export async function getRecommendationTrends(symbol: string): Promise<RecommendationTrend[]> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<RecommendationTrend[]>(`/stock/recommendation?symbol=${encodeURIComponent(validSymbol)}`, true, CACHE_TTL.static);
  } catch {
    return [];
  }
}

export async function getCompanyPeers(symbol: string): Promise<string[]> {
  try {
    const validSymbol = validateSymbol(symbol);
    const data = await fetchFromFinnhub<{ peers: string[] }>(`/stock/peers?symbol=${encodeURIComponent(validSymbol)}`, true, CACHE_TTL.static);
    return data?.peers || [];
  } catch {
    return [];
  }
}

export async function getNewsSentiment(symbol: string): Promise<{
  buzz: { articlesInLastWeek: number; weeklyAverage: number };
  sentiment: { bearishPercent: number; bullishPercent: number };
} | null> {
  try {
    const validSymbol = validateSymbol(symbol);
    return await fetchFromFinnhub<{
      buzz: { articlesInLastWeek: number; weeklyAverage: number };
      sentiment: { bearishPercent: number; bullishPercent: number };
    }>(`/news-sentiment?symbol=${encodeURIComponent(validSymbol)}`, true, CACHE_TTL.static);
  } catch {
    return null;
  }
}

export async function getStockSymbols(exchange: string): Promise<{ symbol: string; description: string; type: string; displaySymbol: string }[]> {
  try {
    if (!exchange || exchange.length > 10) throw new Error('Invalid exchange');
    return await fetchFromFinnhub<{ symbol: string; description: string; type: string; displaySymbol: string }[]>(
      `/stock/symbol?exchange=${encodeURIComponent(exchange)}`, true, CACHE_TTL.static
    );
  } catch {
    return [];
  }
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
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
        const quote = await fetchFromFinnhub<Quote>(`/quote?symbol=${encodeURIComponent(idx.symbol)}`, false, 0);
        if (quote && quote.error) return { ...idx, quote: null };
        return { ...idx, quote };
      } catch {
        return { ...idx, quote: null };
      }
    })
  );
  return results;
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  const sectorETFs = {
    Technology: 'XLK', Healthcare: 'XLV', Financial: 'XLF',
    'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP', Energy: 'XLE',
    Industrial: 'XLI', Materials: 'XLB', 'Real Estate': 'XLRE',
    Utilities: 'XLU', Communication: 'XLC',
  };
  
  const results = await Promise.all(
    Object.entries(sectorETFs).map(async ([sector, etf]) => {
      try {
        const quote = await fetchFromFinnhub<Quote>(`/quote?symbol=${encodeURIComponent(etf)}`, false, 0);
        if (quote) return { sector, changePercentage: quote.dp };
      } catch { /* skip */ }
      return null;
    })
  );
  
  return results.filter(Boolean).sort((a, b) => (b?.changePercentage || 0) - (a?.changePercentage || 0)) as SectorPerformance[];
}