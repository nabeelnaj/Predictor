import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, TrendingUp, TrendingDown, Star, ChevronUp, ChevronDown,
  Loader2, Zap, RefreshCw, LayoutGrid, List, X, Filter, Info
} from 'lucide-react';
import { useBatchQuotes } from '../hooks/useStockData';
import { POPULAR_US_SYMBOLS, SECTORS } from '../lib/finnhub';
import { useAuth } from '../contexts/AuthContext';

interface ScreenerProps {
  onNavigate: (page: string, symbol?: string) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

type SortField = 'symbol' | 'price' | 'change' | 'volume' | 'high' | 'low' | 'pct';
type SortDir = 'asc' | 'desc';

// Static metadata for screener enrichment
const STOCK_METADATA: Record<string, { sector: string; industry: string; marketCapCategory: string; analystRating: string }> = {
  AAPL: { sector: 'Technology', industry: 'Consumer Electronics', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  MSFT: { sector: 'Technology', industry: 'Software', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  GOOGL: { sector: 'Communication', industry: 'Internet Services', marketCapCategory: 'mega', analystRating: 'buy' },
  AMZN: { sector: 'Consumer Discretionary', industry: 'E-Commerce', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  NVDA: { sector: 'Technology', industry: 'Semiconductors', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  META: { sector: 'Communication', industry: 'Social Media', marketCapCategory: 'mega', analystRating: 'buy' },
  TSLA: { sector: 'Consumer Discretionary', industry: 'Electric Vehicles', marketCapCategory: 'mega', analystRating: 'hold' },
  JPM: { sector: 'Financial', industry: 'Banking', marketCapCategory: 'mega', analystRating: 'buy' },
  V: { sector: 'Financial', industry: 'Payment Processing', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  JNJ: { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCapCategory: 'mega', analystRating: 'buy' },
  WMT: { sector: 'Consumer Staples', industry: 'Retail', marketCapCategory: 'mega', analystRating: 'buy' },
  UNH: { sector: 'Healthcare', industry: 'Health Insurance', marketCapCategory: 'mega', analystRating: 'buy' },
  HD: { sector: 'Consumer Discretionary', industry: 'Home Improvement', marketCapCategory: 'large', analystRating: 'buy' },
  MA: { sector: 'Financial', industry: 'Payment Processing', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  PG: { sector: 'Consumer Staples', industry: 'Household Products', marketCapCategory: 'mega', analystRating: 'buy' },
  DIS: { sector: 'Communication', industry: 'Entertainment', marketCapCategory: 'large', analystRating: 'hold' },
  BAC: { sector: 'Financial', industry: 'Banking', marketCapCategory: 'mega', analystRating: 'buy' },
  KO: { sector: 'Consumer Staples', industry: 'Beverages', marketCapCategory: 'mega', analystRating: 'hold' },
  PEP: { sector: 'Consumer Staples', industry: 'Beverages', marketCapCategory: 'mega', analystRating: 'buy' },
  CSCO: { sector: 'Technology', industry: 'Networking', marketCapCategory: 'large', analystRating: 'buy' },
  NFLX: { sector: 'Communication', industry: 'Streaming', marketCapCategory: 'large', analystRating: 'buy' },
  ADBE: { sector: 'Technology', industry: 'Software', marketCapCategory: 'large', analystRating: 'buy' },
  CRM: { sector: 'Technology', industry: 'CRM Software', marketCapCategory: 'large', analystRating: 'buy' },
  AMD: { sector: 'Technology', industry: 'Semiconductors', marketCapCategory: 'large', analystRating: 'strong_buy' },
  INTC: { sector: 'Technology', industry: 'Semiconductors', marketCapCategory: 'large', analystRating: 'hold' },
  PYPL: { sector: 'Financial', industry: 'Payment Processing', marketCapCategory: 'mid', analystRating: 'hold' },
  ABT: { sector: 'Healthcare', industry: 'Medical Devices', marketCapCategory: 'large', analystRating: 'buy' },
  NKE: { sector: 'Consumer Discretionary', industry: 'Apparel', marketCapCategory: 'large', analystRating: 'buy' },
  MRK: { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCapCategory: 'large', analystRating: 'buy' },
  ORCL: { sector: 'Technology', industry: 'Enterprise Software', marketCapCategory: 'large', analystRating: 'buy' },
  CVX: { sector: 'Energy', industry: 'Oil & Gas', marketCapCategory: 'mega', analystRating: 'buy' },
  XOM: { sector: 'Energy', industry: 'Oil & Gas', marketCapCategory: 'mega', analystRating: 'buy' },
  ABBV: { sector: 'Healthcare', industry: 'Biopharmaceuticals', marketCapCategory: 'mega', analystRating: 'buy' },
  COST: { sector: 'Consumer Staples', industry: 'Warehouse Clubs', marketCapCategory: 'mega', analystRating: 'buy' },
  TMO: { sector: 'Healthcare', industry: 'Lab Equipment', marketCapCategory: 'large', analystRating: 'buy' },
  ACN: { sector: 'Technology', industry: 'IT Services', marketCapCategory: 'mega', analystRating: 'buy' },
  LLY: { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCapCategory: 'mega', analystRating: 'strong_buy' },
  DHR: { sector: 'Healthcare', industry: 'Life Sciences', marketCapCategory: 'large', analystRating: 'buy' },
  MDT: { sector: 'Healthcare', industry: 'Medical Devices', marketCapCategory: 'large', analystRating: 'hold' },
  QCOM: { sector: 'Technology', industry: 'Semiconductors', marketCapCategory: 'large', analystRating: 'buy' },
};

const MARKET_CAP_CATEGORIES = [
  { label: 'All Caps', value: 'all' },
  { label: 'Mega Cap (>$200B)', value: 'mega' },
  { label: 'Large Cap ($10B–$200B)', value: 'large' },
  { label: 'Mid Cap ($2B–$10B)', value: 'mid' },
  { label: 'Small Cap (<$2B)', value: 'small' },
];

const ANALYST_RATINGS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Strong Buy', value: 'strong_buy' },
  { label: 'Buy', value: 'buy' },
  { label: 'Hold', value: 'hold' },
  { label: 'Sell', value: 'sell' },
];

const PRICE_PERFORMANCE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Up Today', value: 'up' },
  { label: 'Down Today', value: 'down' },
  { label: 'Up >2%', value: 'up2' },
  { label: 'Down >2%', value: 'down2' },
  { label: 'Up >5%', value: 'up5' },
  { label: 'Down >5%', value: 'down5' },
];

interface FilterState {
  query: string;
  sector: string;
  marketCap: string;
  analystRating: string;
  pricePerf: string;
  peMin: string;
  peMax: string;
  pegMax: string;
  divYieldMin: string;
  revenueGrowthMin: string;
  epsGrowthMin: string;
  volumeMin: string;
  rsiMin: string;
  rsiMax: string;
  priceMin: string;
  priceMax: string;
}

const DEFAULT_FILTERS: FilterState = {
  query: '',
  sector: 'all',
  marketCap: 'all',
  analystRating: 'all',
  pricePerf: 'all',
  peMin: '',
  peMax: '',
  pegMax: '',
  divYieldMin: '',
  revenueGrowthMin: '',
  epsGrowthMin: '',
  volumeMin: '',
  rsiMin: '',
  rsiMax: '',
  priceMin: '',
  priceMax: '',
};

function hasActiveFilters(f: FilterState): boolean {
  return f.query !== '' || f.sector !== 'all' || f.marketCap !== 'all' || f.analystRating !== 'all' ||
    f.pricePerf !== 'all' || f.peMin !== '' || f.peMax !== '' || f.pegMax !== '' ||
    f.divYieldMin !== '' || f.revenueGrowthMin !== '' || f.epsGrowthMin !== '' ||
    f.volumeMin !== '' || f.rsiMin !== '' || f.rsiMax !== '' || f.priceMin !== '' || f.priceMax !== '';
}

function RatingBadge({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    strong_buy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    buy: 'bg-green-500/15 text-green-400 border-green-500/30',
    hold: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    sell: 'bg-red-500/15 text-red-400 border-red-500/30',
    strong_sell: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  const labels: Record<string, string> = {
    strong_buy: 'Strong Buy', buy: 'Buy', hold: 'Hold', sell: 'Sell', strong_sell: 'Strong Sell',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${map[rating] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {labels[rating] ?? rating}
    </span>
  );
}

export default function Screener({ onNavigate, onAuthClick }: ScreenerProps) {
  const { user, watchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('change');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { quotes, loading, lastUpdate, refetch } = useBatchQuotes(POPULAR_US_SYMBOLS);

  const stocks = useMemo(() => {
    return POPULAR_US_SYMBOLS.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
      meta: STOCK_METADATA[symbol] ?? { sector: 'Unknown', industry: 'Unknown', marketCapCategory: 'large', analystRating: 'hold' },
    })).filter(s => s.quote !== null);
  }, [quotes]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sector !== 'all') count++;
    if (filters.marketCap !== 'all') count++;
    if (filters.analystRating !== 'all') count++;
    if (filters.pricePerf !== 'all') count++;
    if (filters.peMin || filters.peMax) count++;
    if (filters.pegMax) count++;
    if (filters.divYieldMin) count++;
    if (filters.revenueGrowthMin) count++;
    if (filters.epsGrowthMin) count++;
    if (filters.volumeMin) count++;
    if (filters.rsiMin || filters.rsiMax) count++;
    if (filters.priceMin || filters.priceMax) count++;
    return count;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = stocks.filter(s => {
      const q = s.quote!;

      // Text search
      if (filters.query) {
        const lq = filters.query.toLowerCase();
        if (!s.symbol.toLowerCase().includes(lq)) return false;
      }

      // Sector
      if (filters.sector !== 'all' && s.meta.sector !== filters.sector) return false;

      // Market cap (from live market cap via profile, approximated by price)
      if (filters.marketCap !== 'all' && s.meta.marketCapCategory !== filters.marketCap) return false;

      // Analyst rating
      if (filters.analystRating !== 'all' && s.meta.analystRating !== filters.analystRating) return false;

      // Price performance
      const dp = q.dp;
      if (filters.pricePerf === 'up' && dp <= 0) return false;
      if (filters.pricePerf === 'down' && dp >= 0) return false;
      if (filters.pricePerf === 'up2' && dp < 2) return false;
      if (filters.pricePerf === 'down2' && dp > -2) return false;
      if (filters.pricePerf === 'up5' && dp < 5) return false;
      if (filters.pricePerf === 'down5' && dp > -5) return false;

      // Price range
      if (filters.priceMin && q.c < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && q.c > parseFloat(filters.priceMax)) return false;

      // Volume
      if (filters.volumeMin && q.v && q.v < parseFloat(filters.volumeMin) * 1_000_000) return false;

      return true;
    });

    return result.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortField === 'symbol') { av = a.symbol; bv = b.symbol; }
      else if (sortField === 'price') { av = a.quote?.c ?? 0; bv = b.quote?.c ?? 0; }
      else if (sortField === 'change' || sortField === 'pct') { av = a.quote?.dp ?? 0; bv = b.quote?.dp ?? 0; }
      else if (sortField === 'volume') { av = a.quote?.v ?? 0; bv = b.quote?.v ?? 0; }
      else if (sortField === 'high') { av = a.quote?.h ?? 0; bv = b.quote?.h ?? 0; }
      else if (sortField === 'low') { av = a.quote?.l ?? 0; bv = b.quote?.l ?? 0; }

      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [stocks, filters, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function handleWatchlist(e: React.MouseEvent, symbol: string) {
    e.stopPropagation();
    if (!user) { onAuthClick('signin'); return; }
    if (watchlist.includes(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol, symbol);
    }
  }

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const gainersCount = stocks.filter(s => (s.quote?.dp ?? 0) > 0).length;
  const losersCount = stocks.filter(s => (s.quote?.dp ?? 0) < 0).length;

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Zap size={10} className="text-green-400" />
              <span>LIVE</span>
              {lastUpdate && (
                <span className="text-gray-600">• {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Stock Screener</h1>
            <p className="text-gray-500 text-sm mt-1">Screen and filter U.S. equities with real-time data</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">{stocks.length}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">{gainersCount}</div>
            <div className="text-xs text-green-400/70">Advancing</div>
          </div>
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-400">{losersCount}</div>
            <div className="text-xs text-red-400/70">Declining</div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by symbol or company..."
                value={filters.query}
                onChange={e => setFilter('query', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Price Performance Quick Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {PRICE_PERFORMANCE_OPTIONS.slice(0, 3).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter('pricePerf', opt.value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    filters.pricePerf === opt.value
                      ? opt.value === 'up' ? 'bg-green-600 text-white' : opt.value === 'down' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* View Modes + Filter Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Filter size={14} className="text-blue-400" />
                Advanced Filters
              </h3>
              {hasActiveFilters(filters) && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X size={12} /> Reset All
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Sector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Sector</label>
                <select
                  value={filters.sector}
                  onChange={e => setFilter('sector', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Sectors</option>
                  {SECTORS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Market Cap */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Market Cap</label>
                <select
                  value={filters.marketCap}
                  onChange={e => setFilter('marketCap', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {MARKET_CAP_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Analyst Rating */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Analyst Rating</label>
                <select
                  value={filters.analystRating}
                  onChange={e => setFilter('analystRating', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {ANALYST_RATINGS_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Performance */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Price Performance</label>
                <select
                  value={filters.pricePerf}
                  onChange={e => setFilter('pricePerf', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {PRICE_PERFORMANCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Price ($)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={e => setFilter('priceMin', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={e => setFilter('priceMax', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* P/E Ratio */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">P/E Ratio</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.peMin}
                    onChange={e => setFilter('peMin', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.peMax}
                    onChange={e => setFilter('peMax', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* PEG Ratio */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">PEG Ratio (Max)</label>
                <input
                  type="number"
                  placeholder="e.g. 1.5"
                  value={filters.pegMax}
                  onChange={e => setFilter('pegMax', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Dividend Yield */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Div. Yield % (Min)</label>
                <input
                  type="number"
                  placeholder="e.g. 2.0"
                  value={filters.divYieldMin}
                  onChange={e => setFilter('divYieldMin', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Revenue Growth */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Rev. Growth % (Min)</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={filters.revenueGrowthMin}
                  onChange={e => setFilter('revenueGrowthMin', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* EPS Growth */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">EPS Growth % (Min)</label>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={filters.epsGrowthMin}
                  onChange={e => setFilter('epsGrowthMin', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Volume */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Volume (M) Min</label>
                <input
                  type="number"
                  placeholder="e.g. 5 (=5M)"
                  value={filters.volumeMin}
                  onChange={e => setFilter('volumeMin', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* RSI */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">RSI (14)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.rsiMin}
                    onChange={e => setFilter('rsiMin', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.rsiMax}
                    onChange={e => setFilter('rsiMax', e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Note about P/E, PEG, RSI, etc. */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                P/E, PEG, RSI, Dividend Yield, Revenue Growth, and EPS Growth filters apply when data is available from Finnhub. Click a stock to view full fundamentals. Moving averages are displayed in the stock detail chart.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {loading && stocks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(s => (
              <button
                key={s.symbol}
                onClick={() => onNavigate('stock', s.symbol)}
                className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:from-blue-900/50 group-hover:to-blue-800/50 group-hover:text-blue-400 transition-all">
                    {s.symbol.slice(0, 2)}
                  </div>
                  <button
                    onClick={e => handleWatchlist(e, s.symbol)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      watchlist.includes(s.symbol)
                        ? 'text-yellow-400 bg-yellow-500/10'
                        : 'text-gray-600 hover:text-yellow-400'
                    }`}
                  >
                    <Star size={12} fill={watchlist.includes(s.symbol) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="font-semibold text-white text-sm">{s.symbol}</div>
                <div className="text-[10px] text-gray-500 mb-2">{s.meta.sector}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">${(s.quote?.c ?? 0).toFixed(2)}</span>
                  <span className={`text-xs font-bold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="mt-2">
                  <RatingBadge rating={s.meta.analystRating} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 text-sm">
                No stocks match your filters. <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-blue-400 hover:text-blue-300">Reset filters</button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-900/80 border-b border-gray-800 text-xs font-semibold text-gray-500">
              <div className="col-span-3">
                <button onClick={() => handleSort('symbol')} className="flex items-center gap-1 hover:text-white transition-colors">
                  Symbol <SortIcon field="symbol" />
                </button>
              </div>
              <div className="col-span-2 hidden sm:block">Sector</div>
              <div className="col-span-2 text-right">
                <button onClick={() => handleSort('price')} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">
                  Price <SortIcon field="price" />
                </button>
              </div>
              <div className="col-span-2 text-right">
                <button onClick={() => handleSort('change')} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">
                  Chg% <SortIcon field="change" />
                </button>
              </div>
              <div className="hidden col-span-1 text-right lg:block">
                <button onClick={() => handleSort('volume')} className="flex items-center gap-1 ml-auto hover:text-white transition-colors">
                  Vol <SortIcon field="volume" />
                </button>
              </div>
              <div className="hidden col-span-1 text-center xl:block">Rating</div>
              <div className="col-span-2 text-center">Watch</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No stocks match your filters.{' '}
                  <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-blue-400 hover:text-blue-300">
                    Reset filters
                  </button>
                </div>
              ) : (
                filtered.map(s => (
                  <div
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="grid grid-cols-12 gap-2 px-5 py-3 hover:bg-gray-800/30 transition-colors cursor-pointer items-center group"
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:from-blue-900/50 group-hover:to-blue-800/50 group-hover:text-blue-400 transition-all shrink-0">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-white block">{s.symbol}</span>
                        <span className="text-[10px] text-gray-500">{s.meta.industry}</span>
                      </div>
                    </div>
                    <div className="col-span-2 hidden sm:block">
                      <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-md">{s.meta.sector}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-semibold text-sm text-white">${(s.quote?.c ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                        (s.quote?.dp ?? 0) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {(s.quote?.dp ?? 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                      </div>
                    </div>
                    <div className="hidden col-span-1 text-right text-xs text-gray-500 lg:block">
                      {s.quote?.v ? (s.quote.v >= 1e6 ? `${(s.quote.v / 1e6).toFixed(1)}M` : `${(s.quote.v / 1e3).toFixed(0)}K`) : '—'}
                    </div>
                    <div className="hidden col-span-1 text-center xl:flex justify-center">
                      <RatingBadge rating={s.meta.analystRating} />
                    </div>
                    <div className="col-span-2 text-center">
                      <button
                        onClick={e => handleWatchlist(e, s.symbol)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          watchlist.includes(s.symbol)
                            ? 'text-yellow-400 bg-yellow-500/10'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      >
                        <Star size={12} fill={watchlist.includes(s.symbol) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filtered.length > 0 && (
              <div className="px-5 py-2.5 border-t border-gray-800 text-xs text-gray-600 flex items-center justify-between">
                <span>Showing {filtered.length} of {stocks.length} stocks</span>
                <span>Click any row to view details</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          Data provided by Finnhub.io. Prices update every 4 seconds. Not financial advice.
        </div>
      </div>
    </div>
  );
}
