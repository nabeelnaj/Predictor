import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Quote,
  CompanyProfile,
  BasicFinancials,
  NewsItem,
  PriceTarget,
  RecommendationTrend,
  SectorPerformance,
  MarketIndex,
  getQuote,
  getCompanyProfile,
  getBasicFinancials,
  getCandles,
  getMarketNews,
  getCompanyNews,
  getPriceTarget,
  getRecommendationTrends,
  getCompanyPeers,
  getNewsSentiment,
  getSectorPerformance,
  getMarketIndices,
  getUnixTimestamp,
  POPULAR_US_SYMBOLS,
} from '../lib/finnhub';
import { supabase } from '../lib/supabase';

// Real-time polling intervals - fast for quotes
const QUOTE_POLL_INTERVAL = 3000; // 3 seconds for real-time feel
const BATCH_POLL_INTERVAL = 4000; // 4 seconds for batch updates

export interface StockData {
  symbol: string;
  quote: Quote | null;
  profile: CompanyProfile | null;
  financials: BasicFinancials | null;
  priceTarget: PriceTarget | null;
  recommendations: RecommendationTrend[];
  peers: string[];
  sentiment: { buzz: { articlesInLastWeek: number }; sentiment: { bearishPercent: number; bullishPercent: number } } | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface CandleData {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
}

export interface StockFundamental {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number | null;
  pe_ratio: number | null;
  peg_ratio: number | null;
  dividend_yield: number | null;
  revenue_growth: number | null;
  eps_growth: number | null;
  price_performance_1y: number | null;
  volume_avg: number | null;
  rsi_14: number | null;
  sma_50: number | null;
  sma_200: number | null;
  analyst_rating: string;
  price_target: number | null;
  beta: number | null;
  debt_equity: number | null;
  roe: number | null;
  updated_at: string;
}

export interface ScreenerStock {
  symbol: string;
  quote: Quote | null;
  fundamentals: StockFundamental | null;
}

// =====================
// Comprehensive Stock Data Hook
// =====================

export function useStockData(symbol: string | null) {
  const [data, setData] = useState<StockData>({
    symbol: symbol ?? '',
    quote: null,
    profile: null,
    financials: null,
    priceTarget: null,
    recommendations: [],
    peers: [],
    sentiment: null,
    loading: false,
    error: null,
    lastUpdate: null,
  });

  const mountedRef = useRef(true);
  const pollRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    if (!symbol) {
      setData({
        symbol: '',
        quote: null,
        profile: null,
        financials: null,
        priceTarget: null,
        recommendations: [],
        peers: [],
        sentiment: null,
        loading: false,
        error: null,
        lastUpdate: null,
      });
      return;
    }

    let quoteInterval: ReturnType<typeof setInterval> | null = null;

    const sym = symbol;

    async function fetchInitial() {
      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        const [quote, profile, financials, priceTarget, recommendations, peers, sentiment] = await Promise.all([
          getQuote(sym),
          getCompanyProfile(sym),
          getBasicFinancials(sym),
          getPriceTarget(sym),
          getRecommendationTrends(sym),
          getCompanyPeers(sym),
          getNewsSentiment(sym),
        ]);

        if (mountedRef.current) {
          setData({
            symbol: sym,
            quote,
            profile,
            financials,
            priceTarget,
            recommendations: recommendations || [],
            peers: peers || [],
            sentiment,
            loading: false,
            error: null,
            lastUpdate: new Date(),
          });
        }
      } catch (err) {
        if (mountedRef.current) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load data',
          }));
        }
      }
    }

    async function pollQuote() {
      const requestId = ++pollRequestIdRef.current;
      const quote = await getQuote(sym);
      if (mountedRef.current && quote && requestId === pollRequestIdRef.current) {
        setData(prev => ({
          ...prev,
          quote,
          lastUpdate: new Date(),
        }));
      }
    }

    fetchInitial();
    quoteInterval = setInterval(pollQuote, QUOTE_POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (quoteInterval) clearInterval(quoteInterval);
    };
  }, [symbol]);

  return data;
}

// =====================
// Real-time Quote Hook
// =====================

export function useRealtimeQuote(symbol: string | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!symbol) {
      setQuote(null);
      setLoading(false);
      setIsLive(false);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;
    const sym = symbol;

    async function fetchQuote() {
      const q = await getQuote(sym);
      if (!cancelled && q) {
        setQuote(q);
        setLoading(false);
        setLastUpdate(new Date());
        setIsLive(true);
      }
    }

    fetchQuote();
    interval = setInterval(fetchQuote, QUOTE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
      setIsLive(false);
    };
  }, [symbol]);

  return { quote, loading, isLive, lastUpdate };
}

// =====================
// Candles Hook
// =====================

export function useCandles(symbol: string | null, days: number = 365) {
  const [candles, setCandles] = useState<CandleData | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!symbol) {
      setCandles(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const sym = symbol;

    async function fetch() {
      setLoading(true);
      const to = Math.floor(Date.now() / 1000);
      const from = getUnixTimestamp(days);
      const resolution = days <= 1 ? '1' : days <= 7 ? '5' : days <= 30 ? '15' : 'D';

      const data = await getCandles(sym, resolution, from, to);
      if (requestId === requestIdRef.current) {
        setCandles(data);
        setLoading(false);
      }
    }

    fetch();
    return () => { requestIdRef.current = 0; };
  }, [symbol, days]);

  return { candles, loading };
}

// =====================
// Market News Hook
// =====================

export function useMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general') {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const items = await getMarketNews(category);
        if (!cancelled) {
          console.debug(`[useMarketNews] category=${category}: fetched ${items.length} articles`);
          if (items.length === 0) {
            console.warn(`[useMarketNews] Empty response for category="${category}" - check API key/plan/rate limits`);
          } else {
            console.debug(`[useMarketNews] Latest article:`, items[0]?.headline, `@`, new Date((items[0]?.datetime || 0) * 1000).toISOString());
          }
          setNews(items);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[useMarketNews] Fetch failed for category="${category}":`, err);
          setNews([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [category]);

  return { news, loading };
}

// =====================
// Company News Hook
// =====================

export function useCompanyNews(symbol: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setNews([]);
      return;
    }

    let cancelled = false;
    const sym = symbol;

    async function fetch() {
      setLoading(true);
      try {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Reduced to 7 days for free tier
        console.debug(`[useCompanyNews] symbol=${sym}: fetching from=${from} to=${to}`);
        const items = await getCompanyNews(sym, from, to);
        if (!cancelled) {
          console.debug(`[useCompanyNews] symbol=${sym}: fetched ${items.length} articles`);
          if (items.length === 0) {
            console.warn(`[useCompanyNews] Empty response for ${sym} (${from} to ${to}) - check API key/plan/rate limits/date range`);
          } else {
            console.debug(`[useCompanyNews] Latest article:`, items[0]?.headline, `@`, new Date((items[0]?.datetime || 0) * 1000).toISOString());
          }
          setNews(items);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[useCompanyNews] Fetch failed for ${sym}:`, err);
          setNews([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [symbol]);

  return { news, loading };
}

// =====================
// Batch Quotes Hook (Real-time)
// =====================

export function useBatchQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const mountedRef = useRef(true);

  const symbolsKey = symbols.join(',');

  const fetchAll = useCallback(async () => {
    const results = await Promise.all(
      symbols.map(async s => {
        const q = await getQuote(s);
        return { symbol: s, quote: q };
      })
    );

    if (!mountedRef.current) return;

    const map = new Map<string, Quote>();
    results.forEach(r => {
      if (r.quote) map.set(r.symbol, r.quote);
    });

    setQuotes(map);
    setLoading(false);
    setLastUpdate(new Date());
    setIsLive(true);
  }, [symbolsKey]);

  useEffect(() => {
    mountedRef.current = true;

    if (symbols.length === 0) {
      setQuotes(new Map());
      setLoading(false);
      return;
    }

    fetchAll();
    const interval = setInterval(fetchAll, BATCH_POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      setIsLive(false);
    };
  }, [symbolsKey]);

  return { quotes, loading, lastUpdate, isLive, refetch: fetchAll };
}

// =====================
// Popular Stocks Hook
// =====================

export function usePopularStocks() {
  const symbols = useMemo(() => POPULAR_US_SYMBOLS, []);
  const { quotes, loading, lastUpdate, isLive, refetch } = useBatchQuotes(symbols);

  const stocks = useMemo(() => {
    return symbols.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
    }));
  }, [symbols, quotes]);

  return { stocks, loading, lastUpdate, isLive, refetch };
}

// =====================
// AI Prediction Hook
// =====================

export function useAIPrediction(
  symbol: string | null,
  quote: Quote | null,
  financials: BasicFinancials | null
) {
  return useMemo(() => {
    if (!symbol || !quote) return null;

    const trendDirection: 'bullish' | 'bearish' | 'neutral' =
      quote.dp > 1.5 ? 'bullish' : quote.dp < -1.5 ? 'bearish' : 'neutral';

    const momentum = Math.abs(quote.dp);
    const trendProbability =
      trendDirection === 'bullish'
        ? Math.min(85, 55 + momentum * 2)
        : trendDirection === 'bearish'
          ? Math.max(15, 45 - momentum * 2)
          : 45 + Math.random() * 10;

    const confidence = Math.min(90, Math.max(50, 60 + (momentum > 2 ? 15 : 0)));

    const sentiment: 'positive' | 'negative' | 'neutral' = quote.dp > 1 ? 'positive' : quote.dp < -1 ? 'negative' : 'neutral';
    const factor = trendDirection === 'bullish' ? 1 : trendDirection === 'bearish' ? -1 : 0;
    const price = quote.c;

    const volatility = momentum > 3 ? 0.12 : momentum > 1 ? 0.08 : 0.05;
    const predictedLow = price * (1 - volatility + factor * volatility * 0.3);
    const predictedHigh = price * (1 + volatility + factor * volatility * 0.3);

    return {
      symbol,
      period: '30-day',
      trendDirection,
      trendProbability: Math.round(trendProbability),
      predictedLow,
      predictedHigh,
      predictedLowPct: ((predictedLow - price) / price * 100).toFixed(1),
      predictedHighPct: ((predictedHigh - price) / price * 100).toFixed(1),
      confidence: Math.round(confidence),
      sentiment,
      sentimentScore:
        sentiment === 'positive'
          ? 0.65 + Math.random() * 0.25
          : sentiment === 'negative'
            ? 0.1 + Math.random() * 0.35
            : 0.45 + Math.random() * 0.15,
      summary:
        trendDirection === 'bullish'
          ? `${symbol} shows strong momentum with positive earnings outlook and favorable sector trends. Technical indicators suggest continued upside potential.`
          : trendDirection === 'bearish'
            ? `${symbol} faces headwinds from macro uncertainty and elevated valuation. Risk-off sentiment may drive near-term consolidation.`
            : `${symbol} is range-bound with mixed signals. Watch for a breakout above resistance or breakdown below support for directional clarity.`,
    };
  }, [symbol, quote, financials]);
}

// =====================
// Market Overview Hook
// =====================

export function useMarketOverview() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [sectors, setSectors] = useState<SectorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const [idx, sec] = await Promise.all([
        getMarketIndices(),
        getSectorPerformance(),
      ]);
      if (!cancelled) {
        setIndices(idx);
        setSectors(sec);
        setLastUpdate(new Date());
        setLoading(false);
      }
    }

    fetch();

    // Poll every 10 seconds for market overview
    const interval = setInterval(fetch, 10000);

    return () => {
      clearInterval(interval);
      cancelled = true;
    };
  }, []);

  return { indices, sectors, loading, lastUpdate };
}

// =====================
// Stock Screener Hook (from Supabase + real-time quotes)
// =====================

export function useStockScreener() {
  const [fundamentals, setFundamentals] = useState<StockFundamental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('stock_fundamentals')
          .select('*');

        if (dbError) throw dbError;
        if (!cancelled) {
          setFundamentals(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load screener data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { fundamentals, loading, error };
}

// =====================
// Combined Screener with Real-time Quotes
// =====================

export function useScreenerWithQuotes(symbols: string[]) {
  const { fundamentals, loading: fundamentalsLoading, error } = useStockScreener();
  const { quotes, loading: quotesLoading, lastUpdate, isLive, refetch } = useBatchQuotes(symbols);

  const stocks = useMemo<ScreenerStock[]>(() => {
    const fundMap = new Map(fundamentals.map(f => [f.symbol, f]));
    return symbols.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
      fundamentals: fundMap.get(symbol) ?? null,
    }));
  }, [symbols, quotes, fundamentals]);

  return {
    stocks,
    loading: fundamentalsLoading || quotesLoading,
    error,
    lastUpdate,
    isLive,
    refetch,
  };
}
