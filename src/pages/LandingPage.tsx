import { useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Brain, Shield, Zap, ChevronRight, Activity, Search, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { useBatchQuotes, useMarketNews } from '../hooks/useStockData';
import { POPULAR_US_SYMBOLS } from '../lib/finnhub';

interface LandingPageProps {
  onNavigate: (page: string, symbol?: string) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

export default function LandingPage({ onNavigate, onAuthClick }: LandingPageProps) {
  const { quotes, loading, lastUpdate, isLive } = useBatchQuotes(POPULAR_US_SYMBOLS);
  const { news, loading: newsLoading } = useMarketNews('general');

  const allStocks = useMemo(() => {
    return POPULAR_US_SYMBOLS.map(symbol => ({
      symbol,
      quote: quotes.get(symbol) ?? null,
    })).filter(s => s.quote !== null);
  }, [quotes]);

  const topMovers = useMemo(() => {
    return [...allStocks].sort((a, b) => Math.abs(b.quote?.dp ?? 0) - Math.abs(a.quote?.dp ?? 0)).slice(0, 5);
  }, [allStocks]);

  const gainers = useMemo(() => {
    return [...allStocks].filter(s => (s.quote?.dp ?? 0) > 0).sort((a, b) => (b.quote?.dp ?? 0) - (a.quote?.dp ?? 0)).slice(0, 5);
  }, [allStocks]);

  const losers = useMemo(() => {
    return [...allStocks].filter(s => (s.quote?.dp ?? 0) < 0).sort((a, b) => (a.quote?.dp ?? 0) - (b.quote?.dp ?? 0)).slice(0, 5);
  }, [allStocks]);

  const mostActive = useMemo(() => {
    return [...allStocks].slice(0, 8);
  }, [allStocks]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
                <Zap size={12} className="text-yellow-400" />
                Real-time US Market Data
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Professional Stock
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Analysis Platform
                </span>
              </h1>

              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Access real-time US stock data across NASDAQ, NYSE, and AMEX. Professional screening tools, interactive charts, and AI-powered predictions—all in one powerful platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => onAuthClick('signup')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                >
                  Start Free Trial <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('screener')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all"
                >
                  <Search size={16} /> Explore Stocks
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>Live Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-blue-400" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-yellow-400" />
                  <span>AI Predictions</span>
                </div>
              </div>
            </div>

            {/* Live Market Overview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl pointer-events-none" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Market Overview</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {isLive ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span>Live</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span>Connecting...</span>
                      </>
                    )}
                    {lastUpdate && (
                      <span className="text-gray-500 ml-1">
                        {lastUpdate.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 skeleton rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    topMovers.slice(0, 5).map((s, i) => (
                      <button
                        key={s.symbol}
                        onClick={() => onNavigate('stock', s.symbol)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors group"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center font-bold text-sm text-gray-300 group-hover:from-blue-900/50 group-hover:to-blue-800/50 group-hover:text-blue-400 transition-all">
                          {s.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-white text-sm">{s.symbol}</div>
                          <div className="text-xs text-gray-500">${(s.quote?.c ?? 0).toFixed(2)}</div>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {(s.quote?.dp ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={() => onNavigate('screener')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All Stocks <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-12 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'US Stocks', value: '8,000+', subtext: 'All exchanges' },
              { label: 'Real-time Data', value: '<3s', subtext: 'Update latency' },
              { label: 'AI Accuracy', value: '94%', subtext: 'Prediction rate' },
              { label: 'Free Forever', value: '$0', subtext: 'Basic plan' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-gray-400">{stat.label}</div>
                <div className="text-xs text-gray-600">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Invest Smarter
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Professional-grade tools powered by real-time data from Finnhub.io
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart2,
                title: 'Advanced Screener',
                desc: 'Search and analyze any US stock from NASDAQ, NYSE, and AMEX. Sort by performance, sector, or market cap.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: Brain,
                title: 'AI Predictions',
                desc: 'AI-powered trend analysis with probability scores and 30-day price range forecasts for every stock.',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                icon: Activity,
                title: 'Interactive Charts',
                desc: 'Candlestick & line charts with multiple timeframes. Real-time updates with OHLC data points.',
                gradient: 'from-green-500 to-emerald-500',
              },
              {
                icon: Zap,
                title: 'Real-time Updates',
                desc: 'Live prices updated every 3 seconds via Finnhub API. No delays, no stale data.',
                gradient: 'from-yellow-500 to-orange-500',
              },
              {
                icon: Shield,
                title: 'Secure Platform',
                desc: 'Supabase-powered authentication with row-level security. Your watchlist stays private.',
                gradient: 'from-red-500 to-rose-500',
              },
              {
                icon: Search,
                title: 'Instant Search',
                desc: 'Search any stock by symbol or company name. Results update as you type across all US exchanges.',
                gradient: 'from-indigo-500 to-violet-500',
              },
            ].map(({ icon: Icon, title, desc, gradient }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Movers Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Today's Market Movers</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={12} />
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Gainers */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" />
                <h3 className="font-semibold text-white">Top Gainers</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton" />) : gainers.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-sm text-white">{s.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">${(s.quote?.c ?? 0).toFixed(2)}</div>
                      <div className="text-green-400 text-xs font-semibold">+{(s.quote?.dp ?? 0).toFixed(2)}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-400" />
                <h3 className="font-semibold text-white">Top Losers</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton" />) : losers.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-sm text-white">{s.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">${(s.quote?.c ?? 0).toFixed(2)}</div>
                      <div className="text-red-400 text-xs font-semibold">{(s.quote?.dp ?? 0).toFixed(2)}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Most Active */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                <h3 className="font-semibold text-white">Most Popular</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton" />) : mostActive.slice(0, 5).map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onNavigate('stock', s.symbol)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {s.symbol.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-sm text-white">{s.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">${(s.quote?.c ?? 0).toFixed(2)}</div>
                      <div className={`text-xs font-semibold ${(s.quote?.dp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(s.quote?.dp ?? 0) >= 0 ? '+' : ''}{(s.quote?.dp ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Latest Market News</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsLoading ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-xl" />
            )) : news.slice(0, 6).map(n => (
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
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-400">{n.source}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 blur-3xl pointer-events-none" />
            <div className="relative bg-gray-900/80 border border-gray-800 rounded-3xl p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Invest with Confidence?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Create a free account to save your watchlist, get AI predictions, and access your personalized dashboard.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => onAuthClick('signup')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
                >
                  Create Free Account <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onAuthClick('signin')}
                  className="px-8 py-4 border border-gray-700 hover:border-gray-600 text-gray-300 font-semibold rounded-xl transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">InvestPredictor</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Data provided by Finnhub.io. For informational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
