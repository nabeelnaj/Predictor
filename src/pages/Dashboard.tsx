import { useState, useMemo } from 'react';
import { Star, TrendingUp, TrendingDown, BarChart2, Bell, Trash2, Loader2, Zap, Plus, Search, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBatchQuotes, useMarketNews } from '../hooks/useStockData';
import { POPULAR_US_SYMBOLS } from '../lib/finnhub';

interface DashboardProps {
  onNavigate: (page: string, symbol?: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, watchlist, removeFromWatchlist } = useAuth();
  const [activeView, setActiveView] = useState<'watchlist' | 'market' | 'news'>('watchlist');

  const { quotes, loading, lastUpdate, isLive } = useBatchQuotes(POPULAR_US_SYMBOLS);
  const { news, loading: newsLoading } = useMarketNews('general');

  const allStocks = useMemo(() => {
    return POPULAR_US_SYMBOLS.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
    })).filter(s => s.quote !== null);
  }, [quotes]);

  const watchlistStocks = useMemo(() => {
    return allStocks.filter(s => watchlist.includes(s.symbol));
  }, [allStocks, watchlist]);

  const topMovers = useMemo(() => {
    return [...allStocks].sort((a, b) => Math.abs(b.quote?.dp ?? 0) - Math.abs(a.quote?.dp ?? 0)).slice(0, 4);
  }, [allStocks]);

  const gainers = useMemo(() => {
    return [...allStocks].filter(s => (s.quote?.dp ?? 0) > 0).sort((a, b) => (b.quote?.dp ?? 0) - (a.quote?.dp ?? 0)).slice(0, 5);
  }, [allStocks]);

  const losers = useMemo(() => {
    return [...allStocks].filter(s => (s.quote?.dp ?? 0) < 0).sort((a, b) => (a.quote?.dp ?? 0) - (b.quote?.dp ?? 0)).slice(0, 5);
  }, [allStocks]);

  const marketStats = useMemo(() => {
    const avgChange = allStocks.reduce((sum, s) => sum + (s.quote?.dp ?? 0), 0) / allStocks.length;
    const advancers = allStocks.filter(s => (s.quote?.dp ?? 0) > 0).length;
    const decliners = allStocks.filter(s => (s.quote?.dp ?? 0) < 0).length;
    return { avgChange, advancers, decliners, total: allStocks.length };
  }, [allStocks]);

  function getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Zap size={10} className="text-green-400" />
            <span>LIVE</span>
            {lastUpdate && (
              <span className="text-gray-600">• Updated {lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Good {getTimeOfDay()}, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-500">Here's your personalized market overview</p>
        </div>

        {loading && allStocks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <Star size={18} className="text-yellow-400" />
                  <span className="text-xs text-gray-500">{watchlist.length} stocks</span>
                </div>
                <div className="text-2xl font-bold text-white">{watchlist.length}</div>
                <div className="text-xs text-gray-500 mt-1">Watchlist</div>
              </div>

              <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp size={18} className="text-green-400" />
                  <span className={`text-xs ${marketStats.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">{marketStats.advancers}</div>
                <div className="text-xs text-gray-500 mt-1">Advancing</div>
              </div>

              <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <TrendingDown size={18} className="text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white">{marketStats.decliners}</div>
                <div className="text-xs text-gray-500 mt-1">Declining</div>
              </div>

              <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <Activity size={18} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{marketStats.total}</div>
                <div className="text-xs text-gray-500 mt-1">Tracked</div>
              </div>
            </div>

            {/* Top Movers */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Top Movers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {topMovers.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all group text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:from-blue-900/50 group-hover:to-blue-800/50 group-hover:text-blue-400 transition-all">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <span className={`text-xs font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm">{s.symbol}</div>
                    <div className="text-xs text-gray-500">${(s.quote?.c ?? 0).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-800">
                    {[
                      { key: 'watchlist', label: 'Watchlist', icon: Star },
                      { key: 'market', label: 'Market', icon: BarChart2 },
                      { key: 'news', label: 'News', icon: Bell },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveView(key as 'watchlist' | 'market' | 'news')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                          activeView === key
                            ? 'text-blue-400 bg-blue-500/5 border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                    {activeView === 'watchlist' && (
                      <div>
                        {watchlistStocks.length === 0 ? (
                          <div className="py-16 text-center">
                            <Star size={32} className="mx-auto text-gray-700 mb-3" />
                            <p className="text-gray-400 text-sm mb-3">Your watchlist is empty</p>
                            <button
                              onClick={() => onNavigate('screener')}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Plus size={14} /> Add Stocks
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-800">
                            {watchlistStocks.map(s => (
                              <div key={s.symbol} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                                <button
                                  onClick={() => onNavigate('stock', s.symbol)}
                                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center font-bold text-sm text-gray-400 shrink-0">
                                    {s.symbol.slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white text-sm">{s.symbol}</div>
                                    <div className="text-xs text-gray-500">${(s.quote?.c ?? 0).toFixed(2)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-white text-sm">${(s.quote?.c ?? 0).toFixed(2)}</div>
                                    <div className={`text-xs font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                                    </div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => removeFromWatchlist(s.symbol)}
                                  className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeView === 'market' && (
                      <div className="divide-y divide-gray-800">
                        {allStocks.slice(0, 20).map(s => (
                          <button
                            key={s.symbol}
                            onClick={() => onNavigate('stock', s.symbol)}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/30 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                              {s.symbol.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-sm text-white flex-1">{s.symbol}</span>
                            <div className="text-right">
                              <div className="text-sm text-white">${(s.quote?.c ?? 0).toFixed(2)}</div>
                              <div className={`text-xs font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeView === 'news' && (
                      <div>
                        {newsLoading ? (
                          <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
                        ) : news.length === 0 ? (
                          <div className="py-8 text-center text-gray-400 text-sm">No news available</div>
                        ) : (
                          <div className="divide-y divide-gray-800">
                            {news.slice(0, 10).map(n => (
                              <a
                                key={n.id}
                                href={n.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors"
                              >
                                <div className={`w-1 h-1 rounded-full mt-2 shrink-0 ${isLive ? 'bg-blue-500' : 'bg-gray-600'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-300 leading-snug mb-1 line-clamp-2">{n.headline}</p>
                                  <span className="text-xs text-gray-500 font-medium">{n.source}</span>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Gainers */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-400" />
                    <h3 className="font-semibold text-white text-sm">Top Gainers</h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {gainers.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => onNavigate('stock', s.symbol)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {s.symbol.slice(0, 2)}
                          </div>
                          <span className="font-medium text-sm text-white">{s.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">${(s.quote?.c ?? 0).toFixed(2)}</div>
                          <span className="text-green-400 font-semibold text-xs">+{(s.quote?.dp ?? 0).toFixed(2)}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Losers */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-400" />
                    <h3 className="font-semibold text-white text-sm">Top Losers</h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {losers.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => onNavigate('stock', s.symbol)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {s.symbol.slice(0, 2)}
                          </div>
                          <span className="font-medium text-sm text-white">{s.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">${(s.quote?.c ?? 0).toFixed(2)}</div>
                          <span className="text-red-400 font-semibold text-xs">{(s.quote?.dp ?? 0).toFixed(2)}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => onNavigate('screener')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left"
                    >
                      <Search size={16} className="text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">Search Stocks</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
