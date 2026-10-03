import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Newspaper, BarChart3, RefreshCw, ChevronRight, Globe,
  Layers, Flame
} from 'lucide-react';
import { useBatchQuotes, useMarketNews, useMarketOverview } from '../hooks/useStockData';
import { POPULAR_US_SYMBOLS, formatPrice, formatVolume } from '../lib/finnhub';

interface MarketOverviewProps {
  onNavigate: (page: string, symbol?: string) => void;
}

export default function MarketOverview({ onNavigate }: MarketOverviewProps) {
  const { quotes, loading: quotesLoading, lastUpdate, refetch } = useBatchQuotes(POPULAR_US_SYMBOLS);
  const { news, loading: newsLoading } = useMarketNews('general');
  const { indices, sectors, loading: overviewLoading } = useMarketOverview();

  const allStocks = useMemo(() => {
    return POPULAR_US_SYMBOLS.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
    })).filter(s => s.quote !== null);
  }, [quotes]);

  const topGainers = useMemo(() => {
    return [...allStocks]
      .filter(s => (s.quote?.dp ?? 0) > 0)
      .sort((a, b) => (b.quote?.dp ?? 0) - (a.quote?.dp ?? 0))
      .slice(0, 10);
  }, [allStocks]);

  const topLosers = useMemo(() => {
    return [...allStocks]
      .filter(s => (s.quote?.dp ?? 0) < 0)
      .sort((a, b) => (a.quote?.dp ?? 0) - (b.quote?.dp ?? 0))
      .slice(0, 10);
  }, [allStocks]);

  const mostActive = useMemo(() => {
    return [...allStocks]
      .sort((a, b) => (b.quote?.v ?? 0) - (a.quote?.v ?? 0))
      .slice(0, 10);
  }, [allStocks]);

  const trending = useMemo(() => {
    return [...allStocks]
      .sort((a, b) => Math.abs(b.quote?.dp ?? 0) - Math.abs(a.quote?.dp ?? 0))
      .slice(0, 10);
  }, [allStocks]);

  const marketBreadth = useMemo(() => {
    const advancers = allStocks.filter(s => (s.quote?.dp ?? 0) > 0).length;
    const decliners = allStocks.filter(s => (s.quote?.dp ?? 0) < 0).length;
    const unchanged = allStocks.filter(s => (s.quote?.dp ?? 0) === 0).length;
    const total = allStocks.length;
    return { advancers, decliners, unchanged, total };
  }, [allStocks]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Zap size={10} className="text-green-400" />
              <span>LIVE</span>
              {lastUpdate && (
                <span className="text-gray-600">• {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Market Overview</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time U.S. market data and insights</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Major Indices */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Major U.S. Indices</h2>
          </div>
          {overviewLoading && indices.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {indices.map(idx => {
                const isPos = (idx.quote?.dp ?? 0) >= 0;
                return (
                  <button
                    key={idx.symbol}
                    onClick={() => onNavigate('stock', idx.displaySymbol)}
                    className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400">{idx.displaySymbol}</span>
                      {isPos ? (
                        <ArrowUpRight size={14} className="text-green-400" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="text-xl font-bold text-white">
                      {idx.quote ? formatPrice(idx.quote.c) : '—'}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                      {isPos ? '+' : ''}{idx.quote?.d?.toFixed(2) ?? '—'} ({isPos ? '+' : ''}{idx.quote?.dp?.toFixed(2) ?? '—'}%)
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{idx.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Market Breadth & Sector Performance */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Market Breadth */}
          <div className="lg:col-span-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Market Breadth</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Advancing</span>
                  <span className="text-white font-semibold">{marketBreadth.advancers}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${marketBreadth.total > 0 ? (marketBreadth.advancers / marketBreadth.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400">Declining</span>
                  <span className="text-white font-semibold">{marketBreadth.decliners}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${marketBreadth.total > 0 ? (marketBreadth.decliners / marketBreadth.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Unchanged</span>
                  <span className="text-white font-semibold">{marketBreadth.unchanged}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-500 rounded-full transition-all"
                    style={{ width: `${marketBreadth.total > 0 ? (marketBreadth.unchanged / marketBreadth.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Tracked</span>
                  <span className="text-white font-bold">{marketBreadth.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Performance */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Sector Performance</h3>
            </div>
            {overviewLoading && sectors.length === 0 ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 skeleton rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {sectors.map(sector => {
                  const isPos = sector.changePercentage >= 0;
                  return (
                    <div
                      key={sector.sector}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-white">{sector.sector}</span>
                      </div>
                      <span className={`text-sm font-semibold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                        {isPos ? '+' : ''}{(sector.changePercentage ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Movers Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Gainers */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              <h3 className="font-semibold text-white">Top Gainers</h3>
              <span className="ml-auto text-xs text-gray-500">{topGainers.length} stocks</span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto scrollbar-thin">
              {quotesLoading && topGainers.length === 0 ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton" />)
              ) : topGainers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No gainers today</div>
              ) : (
                topGainers.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">{s.symbol}</div>
                        <div className="text-xs text-gray-500">{formatPrice(s.quote?.c)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-400 font-semibold text-sm">
                      <ArrowUpRight size={14} />
                      +{s.quote?.dp?.toFixed(2)}%
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-400" />
              <h3 className="font-semibold text-white">Top Losers</h3>
              <span className="ml-auto text-xs text-gray-500">{topLosers.length} stocks</span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto scrollbar-thin">
              {quotesLoading && topLosers.length === 0 ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton" />)
              ) : topLosers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No losers today</div>
              ) : (
                topLosers.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">{s.symbol}</div>
                        <div className="text-xs text-gray-500">{formatPrice(s.quote?.c)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-red-400 font-semibold text-sm">
                      <ArrowDownRight size={14} />
                      {s.quote?.dp?.toFixed(2)}%
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Most Active & Trending */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Most Active */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              <h3 className="font-semibold text-white">Most Active</h3>
              <span className="ml-auto text-xs text-gray-500">By volume</span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto scrollbar-thin">
              {quotesLoading && mostActive.length === 0 ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton" />)
              ) : mostActive.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                mostActive.map((s, i) => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">{s.symbol}</div>
                        <div className="text-xs text-gray-500">Vol: {formatVolume(s.quote?.v)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">{formatPrice(s.quote?.c)}</div>
                      <div className={`text-xs font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{s.quote?.dp?.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Trending */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <Flame size={16} className="text-orange-400" />
              <h3 className="font-semibold text-white">Trending Stocks</h3>
              <span className="ml-auto text-xs text-gray-500">Highest volatility</span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto scrollbar-thin">
              {quotesLoading && trending.length === 0 ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton" />)
              ) : trending.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                trending.map((s, i) => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">{s.symbol}</div>
                        <div className="text-xs text-gray-500">{formatPrice(s.quote?.c)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{s.quote?.dp?.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500">Vol: {formatVolume(s.quote?.v)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Market News */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Market News</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-32 skeleton rounded-xl" />
              ))
            ) : news.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-400 text-sm">No news available</div>
            ) : (
              news.slice(0, 9).map(n => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group"
                >
                  <p className="text-sm text-gray-300 leading-snug mb-3 line-clamp-2 group-hover:text-white transition-colors">
                    {n.headline}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">{n.source}</span>
                    <ChevronRight size={12} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </a>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pt-4 border-t border-gray-800/50">
          Data provided by Finnhub.io. Prices updated every 3 seconds. Not financial advice.
        </div>
      </div>
    </div>
  );
}
