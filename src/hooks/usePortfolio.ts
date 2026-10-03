import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useBatchQuotes } from './useStockData';
import { getQuote, type Quote } from '../lib/finnhub';

export interface Holding {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface HoldingWithMarket extends Holding {
  currentPrice: number | null;
  marketValue: number | null;
  totalCost: number;
  unrealizedPL: number | null;
  unrealizedPLPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  quote: Quote | null;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPct: number;
  dayChange: number;
  dayChangePct: number;
  allocation: { symbol: string; value: number; pct: number }[];
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);
  const { quotes, loading: quotesLoading, lastUpdate, isLive, refetch } = useBatchQuotes(symbols);

  const loadHoldings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
    } else {
      setHoldings(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  const addHolding = useCallback(async (
    symbol: string,
    quantity: number,
    buyPrice: number,
    buyDate?: string,
    notes?: string
  ): Promise<{ error: string | null }> => {
    const { error: dbError } = await supabase
      .from('portfolio_holdings')
      .insert({
        symbol: symbol.toUpperCase(),
        quantity,
        buy_price: buyPrice,
        buy_date: buyDate || null,
        notes: notes || '',
      });

    if (dbError) {
      return { error: dbError.message };
    }

    await loadHoldings();
    return { error: null };
  }, [loadHoldings]);

  const updateHolding = useCallback(async (
    id: string,
    updates: { quantity?: number; buy_price?: number; buy_date?: string; notes?: string }
  ): Promise<{ error: string | null }> => {
    const { error: dbError } = await supabase
      .from('portfolio_holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (dbError) {
      return { error: dbError.message };
    }

    await loadHoldings();
    return { error: null };
  }, [loadHoldings]);

  const deleteHolding = useCallback(async (id: string): Promise<{ error: string | null }> => {
    const { error: dbError } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', id);

    if (dbError) {
      return { error: dbError.message };
    }

    await loadHoldings();
    return { error: null };
  }, [loadHoldings]);

  // Enrich holdings with market data
  const holdingsWithMarket: HoldingWithMarket[] = useMemo(() => {
    return holdings.map(h => {
      const quote = quotes.get(h.symbol) ?? null;
      const currentPrice = quote?.c ?? null;
      const totalCost = h.quantity * h.buy_price;
      const marketValue = currentPrice !== null ? h.quantity * currentPrice : null;
      const unrealizedPL = marketValue !== null ? marketValue - totalCost : null;
      const unrealizedPLPct = unrealizedPL !== null && totalCost > 0 ? (unrealizedPL / totalCost) * 100 : null;
      const dayChange = quote?.d !== undefined && currentPrice !== null ? quote.d * h.quantity : null;
      const dayChangePct = quote?.dp ?? null;

      return {
        ...h,
        currentPrice,
        marketValue,
        totalCost,
        unrealizedPL,
        unrealizedPLPct,
        dayChange,
        dayChangePct,
        quote,
      };
    });
  }, [holdings, quotes]);

  // Portfolio summary
  const summary: PortfolioSummary = useMemo(() => {
    const totalValue = holdingsWithMarket.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
    const totalCost = holdingsWithMarket.reduce((sum, h) => sum + h.totalCost, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const dayChange = holdingsWithMarket.reduce((sum, h) => sum + (h.dayChange ?? 0), 0);
    const previousDayValue = totalValue - dayChange;
    const dayChangePct = previousDayValue !== 0 ? (dayChange / previousDayValue) * 100 : 0;

    const allocation = holdingsWithMarket
      .map(h => ({ symbol: h.symbol, value: h.marketValue ?? 0, pct: 0 }))
      .filter(a => a.value > 0);

    const totalAlloc = allocation.reduce((sum, a) => sum + a.value, 0);
    allocation.forEach(a => {
      a.pct = totalAlloc > 0 ? (a.value / totalAlloc) * 100 : 0;
    });
    allocation.sort((a, b) => b.value - a.value);

    return { totalValue, totalCost, totalPL, totalPLPct, dayChange, dayChangePct, allocation };
  }, [holdingsWithMarket]);

  // Fetch a single quote on demand (for add holding form preview)
  const fetchQuote = useCallback(async (symbol: string): Promise<Quote | null> => {
    return await getQuote(symbol);
  }, []);

  return {
    holdings: holdingsWithMarket,
    rawHoldings: holdings,
    summary,
    loading: loading || quotesLoading,
    error,
    isLive,
    lastUpdate,
    refetch,
    addHolding,
    updateHolding,
    deleteHolding,
    fetchQuote,
  };
}
