// =====================
// Finnhub API Client (Vercel Serverless Functions)
// =====================
// All requests go through Vercel Serverless Functions on the same domain
// No API key exposure, server-side caching/rate limiting via Vercel KV

// Minimal client-side cache for static data (fallback if API unavailable)
const staticCache = new Map<string, { data: unknown; timestamp: number }>();
const STATIC_CACHE_TTL = 300_000; // 5 minutes

// Rate limiting on client side (backup)
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 50; // 50ms between calls

// Structured error types
export class ProxyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

async function fetchFromProxy<T>(endpoint: string, useStaticCache = false, signal?: AbortSignal): Promise<T> {
  // Client-side rate limiting (backup)
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_CALL_INTERVAL - timeSinceLastCall));
  }
  lastCallTime = Date.now();

  // Static cache for non-realtime data (fallback)
  if (useStaticCache) {
    const cached = staticCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < STATIC_CACHE_TTL) {
      return cached.data as T;
    }
  }

  // Use relative URL - API is on same domain (Vercel)
  const url = `${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // For cookie-based auth if needed
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new ProxyError(
        `API error: ${res.status}`,
        res.status,
        endpoint
      );
    }
    
    const data = await res.json();
    
    if (useStaticCache) {
      staticCache.set(endpoint, { data, timestamp: Date.now() });
    }
    
    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ProxyError) throw err;
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ProxyError('Request timeout', 408, endpoint);
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new ProxyError('Network error - API unavailable', 0, endpoint);
    }
    throw new ProxyError(
      err instanceof Error ? err.message : 'Unknown error',
      0,
      endpoint
    );
  }
}

// =====================
// Types
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
// Real-time API Functions (via Vercel Serverless)
// =====================

export async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<Quote>(`/api/market/quote?symbol=${encodeURIComponent(validSymbol)}`, false);
  } catch {
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<CompanyProfile>(`/api/market/profile?symbol=${encodeURIComponent(validSymbol)}`, true);
  } catch {
    return null;
  }
}

export async function getBasicFinancials(symbol: string): Promise<BasicFinancials | null> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<BasicFinancials>(`/api/market/financials?symbol=${encodeURIComponent(validSymbol)}`, true);
  } catch {
    return null;
  }
}

export async function getCandles(
  symbol: string, resolution: string, from: number, to: number
): Promise<{ o: number[]; h: number[]; l: number[]; c: number[]; v: number[]; t: number[] } | null> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    
    const validResolutions = ['1', '5', '15', '30', '60', 'D', 'W', 'M'];
    if (!validResolutions.includes(resolution)) throw new ValidationError('Invalid resolution', 'resolution');
    if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to) throw new ValidationError('Invalid time range', 'from/to');
    
    const data = await fetchFromProxy<Candle>(
      `/api/market/candles?symbol=${encodeURIComponent(validSymbol)}&resolution=${resolution}&from=${from}&to=${to}`,
      true
    );
    if (data.s !== 'ok' || !data.c?.length) return null;
    return { o: data.o, h: data.h, l: data.l, c: data.c, v: data.v, t: data.t };
  } catch {
    return null;
  }
}

export async function getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<NewsItem[]> {
  try {
    const validCategories = ['general', 'forex', 'crypto', 'merger'] as const;
    if (!validCategories.includes(category as any)) throw new ValidationError('Invalid category', 'category');
    return await fetchFromProxy<NewsItem[]>(`/api/market/news?category=${category}`, true);
  } catch {
    return [];
  }
}

export async function getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    
    if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new ValidationError('Invalid from date', 'from');
    if (!to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new ValidationError('Invalid to date', 'to');
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) throw new ValidationError('from date must be before to date', 'from');
    if (toDate.getTime() - fromDate.getTime() > 30 * 24 * 60 * 60 * 1000) throw new ValidationError('Date range exceeds 30 days', 'dateRange');
    
    return await fetchFromProxy<NewsItem[]>(
      `/api/market/company-news?symbol=${encodeURIComponent(validSymbol)}&from=${from}&to=${to}`,
      true
    );
  } catch {
    return [];
  }
}

export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SymbolSearchResult[]> {
  if (!query || query.length < 1) return [];
  if (query.length > 50) throw new ValidationError('Query too long', 'query');
  
  try {
    const sanitized = query.trim();
    const data = await fetchFromProxy<{ count: number; result: SymbolSearchResult[] }>(
      `/api/market/search?q=${encodeURIComponent(sanitized)}`,
      true,
      signal
    );
    return (data.result || []).filter(r =>
      r.type === 'Common Stock' || r.type === 'ADR' || r.type === 'ETF'
    );
  } catch {
    return [];
  }
}

export async function getPriceTarget(symbol: string): Promise<PriceTarget | null> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<PriceTarget>(`/api/market/price-target?symbol=${encodeURIComponent(validSymbol)}`, true);
  } catch {
    return null;
  }
}

export async function getRecommendationTrends(symbol: string): Promise<RecommendationTrend[]> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<RecommendationTrend[]>(`/api/market/recommendations?symbol=${encodeURIComponent(validSymbol)}`, true);
  } catch {
    return [];
  }
}

export async function getCompanyPeers(symbol: string): Promise<string[]> {
  try {
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    const data = await fetchFromProxy<{ peers: string[] }>(`/api/market/peers?symbol=${encodeURIComponent(validSymbol)}`, true);
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
    if (!symbol) throw new ValidationError('Symbol is required', 'symbol');
    const validSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,10}$/.test(validSymbol)) throw new ValidationError('Invalid symbol format', 'symbol');
    return await fetchFromProxy<{
      buzz: { articlesInLastWeek: number; weeklyAverage: number };
      sentiment: { bearishPercent: number; bullishPercent: number };
    }>(`/api/market/news-sentiment?symbol=${encodeURIComponent(validSymbol)}`, true);
  } catch {
    return null;
  }
}

export async function getStockSymbols(exchange: string): Promise<{ symbol: string; description: string; type: string; displaySymbol: string }[]> {
  try {
    if (!exchange || exchange.length > 10) throw new ValidationError('Invalid exchange', 'exchange');
    return await fetchFromProxy<{ symbol: string; description: string; type: string; displaySymbol: string }[]>(
      `/api/market/symbols?exchange=${encodeURIComponent(exchange)}`, true
    );
  } catch {
    return [];
  }
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  try {
    return await fetchFromProxy<SectorPerformance[]>(`/api/market/sectors`, true);
  } catch {
    return [];
  }
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  try {
    return await fetchFromProxy<MarketIndex[]>(`/api/market/indices`, false);
  } catch {
    return [];
  }
}

// =====================
// Technical Analysis Functions
// =====================

function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0; let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

export async function getTechnicalIndicators(symbol: string): Promise<{
  rsi14: number | null; sma50: number | null; sma200: number | null; pricePerformance1Y: number | null;
} | null> {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 400 * 24 * 60 * 60;
    const data = await getCandles(symbol, 'D', from, to);
    if (!data || data.c.length < 50) return null;

    const closes = data.c;
    const rsi14 = calculateRSI(closes, 14);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const pricePerformance1Y = closes.length > 252
      ? ((closes[closes.length - 1] - closes[closes.length - 253]) / closes[closes.length - 253]) * 100
      : closes.length > 1
        ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
        : null;

    return { rsi14, sma50, sma200, pricePerformance1Y };
  } catch {
    return null;
  }
}

// =====================
// Helper Utilities
// =====================

export function formatMarketCap(value: number | null | undefined): string {
  if (!value) return 'N/A';
  const val = value * 1_000_000;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

export function formatVolume(value: number | null | undefined): string {
  if (!value) return 'N/A';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getUnixTimestamp(daysAgo: number): number {
  return Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
}

export function getUnixTimestampFromHours(hoursAgo: number): number {
  return Math.floor(Date.now() / 1000) - hoursAgo * 60 * 60;
}

export const POPULAR_US_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ',
  'WMT', 'UNH', 'HD', 'MA', 'PG', 'DIS', 'BAC', 'KO', 'PEP', 'CSCO',
  'NFLX', 'ADBE', 'CRM', 'AMD', 'INTC', 'PYPL', 'ABT', 'NKE', 'MRK', 'ORCL',
  'CVX', 'XOM', 'ABBV', 'COST', 'TMO', 'ACN', 'LLY', 'DHR', 'MDT', 'QCOM',
];

export const MARKET_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', displaySymbol: 'SPX' },
  { symbol: '^DJI', name: 'Dow Jones', displaySymbol: 'DJI' },
  { symbol: '^IXIC', name: 'NASDAQ', displaySymbol: 'NDQ' },
];

export const SECTORS = [
  'Technology', 'Healthcare', 'Financial', 'Consumer Discretionary', 'Consumer Staples',
  'Energy', 'Industrial', 'Materials', 'Real Estate', 'Utilities', 'Communication'
];

export const ANALYST_RATINGS = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];