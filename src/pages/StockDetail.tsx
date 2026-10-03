import { useState } from 'react';
import { ArrowLeft, Star, TrendingUp, TrendingDown, BarChart2, DollarSign, Activity, AlertCircle, ExternalLink, Zap, Target, Users, BarChart3, PieChart, Calendar } from 'lucide-react';
import { useStockData, useAIPrediction, useCompanyNews } from '../hooks/useStockData';
import { formatMarketCap, formatDateTime } from '../lib/finnhub';
import StockChart from '../components/StockChart';
import AIPredictionCard from '../components/AIPredictionCard';
import { useAuth } from '../contexts/AuthContext';

interface StockDetailProps {
  symbol: string;
  onNavigate: (page: string, symbol?: string) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

export default function StockDetail({ symbol, onNavigate, onAuthClick }: StockDetailProps) {
  const { user, watchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'news' | 'analysis'>('overview');

  const { quote, profile, financials, priceTarget, recommendations, peers, loading, error, lastUpdate } = useStockData(symbol);
  const prediction = useAIPrediction(symbol, quote, financials);
  const { news: companyNews } = useCompanyNews(symbol);

  const inWatchlist = watchlist.includes(symbol);

  function handleWatchlist() {
    if (!user) { onAuthClick('signin'); return; }
    if (inWatchlist) removeFromWatchlist(symbol);
    else addToWatchlist(symbol, profile?.name ?? symbol);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-14 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading {symbol}...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-14">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button onClick={() => onNavigate('screener')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Screener
          </button>
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h1 className="text-xl font-bold mb-2 text-white">{symbol} not found</h1>
            <p className="text-gray-500 text-sm mb-6">{error ?? 'Unable to load stock data'}</p>
            <button onClick={() => onNavigate('screener')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
              Browse Stocks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPrice = quote.c;
  const change = quote.d;
  const changePct = quote.dp;
  const marketCap = financials?.metric?.marketCapitalization;
  const peRatio = financials?.metric?.peTTM ?? financials?.metric?.peAnnual;
  const eps = financials?.metric?.epsExclExtraItemsTTM ?? financials?.metric?.epsBasicExclExtraItemsTTM;
  const divYield = financials?.metric?.currentDividendYieldTTM ?? financials?.metric?.dividendYieldIndicatedAnnual;
  const pbRatio = financials?.metric?.pbTTM ?? financials?.metric?.pbAnnual;
  const roe = financials?.metric?.returnOnEquityTTM ?? financials?.metric?.returnOnEquityAnnual;
  const debtEquity = financials?.metric?.totalDebtToEquityRatioQuarterly ?? financials?.metric?.totalDebtToEquityRatioAnnual;
  const week52High = financials?.metric?.['52WeekHigh'];
  const week52Low = financials?.metric?.['52WeekLow'];
  const beta = financials?.metric?.beta;
  const priceToSales = financials?.metric?.psTTM ?? financials?.metric?.psAnnual;

  const isPositive = changePct >= 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <button onClick={() => onNavigate('screener')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Screener
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
          {/* Company Info */}
          <div className="flex items-start gap-4 flex-1">
            {profile?.logo ? (
              <img src={profile.logo} alt={profile.name} className="w-14 h-14 rounded-2xl object-contain bg-gray-800 p-1 border border-gray-700" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center font-bold text-blue-400 text-lg shrink-0">
                {symbol.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-white">{profile?.ticker ?? symbol}</span>
                {profile?.exchange && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-800 text-xs text-gray-400">{profile.exchange}</span>
                )}
              </div>
              <p className="text-gray-400 text-sm truncate">{profile?.name ?? symbol}</p>
              {profile?.finnhubIndustry && (
                <p className="text-gray-500 text-xs mt-1">{profile.finnhubIndustry}</p>
              )}
            </div>
          </div>

          {/* Price Info */}
          <div className="lg:text-right">
            <div className="flex items-center gap-2 lg:justify-end mb-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Zap size={10} className="text-green-400" />
                <span>LIVE</span>
                {lastUpdate && (
                  <span className="text-gray-600">• {lastUpdate.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-3 lg:justify-end">
              <span className="text-4xl font-bold text-white">${currentPrice.toFixed(2)}</span>
            </div>
            <div className={`flex items-center gap-2 lg:justify-end mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <span className="text-lg font-semibold">
                {isPositive ? '+' : ''}${change.toFixed(2)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWatchlist}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                inWatchlist
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                  : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white'
              }`}
            >
              <Star size={14} fill={inWatchlist ? 'currentColor' : 'none'} />
              {inWatchlist ? 'Watching' : 'Watch'}
            </button>
            {profile?.weburl && (
              <a
                href={profile.weburl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white text-sm transition-all"
              >
                <ExternalLink size={14} /> Website
              </a>
            )}
          </div>
        </div>

        {/* Price Target & Recommendations */}
        {priceTarget && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Analyst Target</div>
              <div className="text-lg font-bold text-blue-400">${priceTarget.targetMean?.toFixed(2) ?? 'N/A'}</div>
              <div className="text-xs text-gray-500 mt-1">{priceTarget.numberOfAnalysts ?? 0} analysts</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">High Target</div>
              <div className="text-lg font-bold text-green-400">${priceTarget.targetHigh?.toFixed(2) ?? 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Low Target</div>
              <div className="text-lg font-bold text-red-400">${priceTarget.targetLow?.toFixed(2) ?? 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">52W Range</div>
              <div className="text-sm font-semibold text-white">
                ${week52Low?.toFixed(2) ?? '—'} - ${week52High?.toFixed(2) ?? '—'}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {(['overview', 'financials', 'news', 'analysis'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Chart */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <h2 className="font-semibold text-white text-sm mb-4">Price Chart</h2>
                <StockChart
                  symbol={symbol}
                  currentPrice={currentPrice}
                  predictionLow={prediction?.predictedLow}
                  predictionHigh={prediction?.predictedHigh}
                />
              </div>

              {/* Key Stats */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  Key Statistics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Open', value: `$${quote.o.toFixed(2)}` },
                    { label: 'High', value: `$${quote.h.toFixed(2)}`, color: 'text-green-400' },
                    { label: 'Low', value: `$${quote.l.toFixed(2)}`, color: 'text-red-400' },
                    { label: 'Prev Close', value: `$${quote.pc.toFixed(2)}` },
                    { label: 'Market Cap', value: formatMarketCap(marketCap) },
                    { label: 'P/E Ratio', value: peRatio != null ? peRatio.toFixed(1) : 'N/A' },
                    { label: 'EPS (TTM)', value: eps != null ? `$${eps.toFixed(2)}` : 'N/A' },
                    { label: 'Div Yield', value: divYield != null && divYield > 0 ? `${divYield.toFixed(2)}%` : '—' },
                    { label: 'P/B Ratio', value: pbRatio != null ? pbRatio.toFixed(1) : 'N/A' },
                    { label: 'ROE', value: roe != null ? `${roe.toFixed(1)}%` : 'N/A' },
                    { label: 'Debt/Eq', value: debtEquity != null ? debtEquity.toFixed(2) : 'N/A' },
                    { label: 'Beta', value: beta != null ? beta.toFixed(2) : 'N/A' },
                  ].map(m => (
                    <div key={m.label} className="p-3 bg-gray-800/50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-0.5">{m.label}</div>
                      <div className={`text-sm font-semibold ${m.color ?? 'text-white'}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 52 Week Range Visual */}
              {week52High && week52Low && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                    <BarChart2 size={14} className="text-blue-400" />
                    52-Week Range
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Low: ${week52Low.toFixed(2)}</span>
                      <span className="text-white font-semibold">Current: ${currentPrice.toFixed(2)}</span>
                      <span>High: ${week52High.toFixed(2)}</span>
                    </div>
                    <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((currentPrice - week52Low) / (week52High - week52Low)) * 100)}%`
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full shadow-lg"
                        style={{
                          left: `${Math.min(98, ((currentPrice - week52Low) / (week52High - week52Low)) * 100)}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Lows</span>
                      <span>Mids</span>
                      <span>Highs</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <AIPredictionCard prediction={prediction} />

              {/* Peers */}
              {peers.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                    <Users size={14} className="text-blue-400" />
                    Similar Companies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {peers.slice(0, 8).map(p => (
                      <button
                        key={p}
                        onClick={() => onNavigate('stock', p)}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-semibold text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                    <Target size={14} className="text-blue-400" />
                    Analyst Ratings
                  </h3>
                  <div className="space-y-2">
                    {recommendations.slice(0, 3).map((r) => {
                      const total = r.buy + r.hold + r.sell + r.strongBuy + r.strongSell;
                      const buyPct = ((r.buy + r.strongBuy) / total * 100).toFixed(0);
                      return (
                        <div key={r.period} className="p-3 bg-gray-800/50 rounded-xl">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{r.period}</span>
                            <span className="text-white font-semibold">{buyPct}% Buy</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: `${(r.strongBuy + r.buy) / total * 100}%` }} />
                            <div className="bg-yellow-500 h-full" style={{ width: `${r.hold / total * 100}%` }} />
                            <div className="bg-red-500 h-full" style={{ width: `${(r.strongSell + r.sell) / total * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <DollarSign size={14} className="text-blue-400" />
                <h3 className="font-semibold text-white text-sm">Valuation Metrics</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {[
                  ['Market Cap', formatMarketCap(marketCap)],
                  ['P/E (TTM)', peRatio != null ? peRatio.toFixed(1) : 'N/A'],
                  ['P/B (TTM)', pbRatio != null ? pbRatio.toFixed(2) : 'N/A'],
                  ['P/S (TTM)', priceToSales != null ? priceToSales.toFixed(2) : 'N/A'],
                  ['EPS (TTM)', eps != null ? `$${eps.toFixed(2)}` : 'N/A'],
                  ['Dividend Yield', divYield != null && divYield > 0 ? `${divYield.toFixed(2)}%` : '—'],
                  ['Beta', beta != null ? beta.toFixed(2) : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <PieChart size={14} className="text-blue-400" />
                <h3 className="font-semibold text-white text-sm">Financial Health</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {[
                  ['ROE', roe != null ? `${roe.toFixed(1)}%` : 'N/A'],
                  ['Debt/Equity', debtEquity != null ? debtEquity.toFixed(2) : 'N/A'],
                  ['52W High', week52High ? `$${week52High.toFixed(2)}` : 'N/A'],
                  ['52W Low', week52Low ? `$${week52Low.toFixed(2)}` : 'N/A'],
                  ['Shares Out.', financials?.metric?.shareOutstanding ? `${(financials.metric.shareOutstanding).toFixed(0)}M` : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="max-w-3xl space-y-3">
            {companyNews.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No recent news for {symbol}</div>
            ) : (
              companyNews.slice(0, 10).map(n => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200 leading-snug mb-2 group-hover:text-white transition-colors">
                      {n.headline}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-400">{n.source}</span>
                      <span>•</span>
                      <span>{formatDateTime(n.datetime)}</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-gray-600 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
                </a>
              ))
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-400" />
                Technical Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Trend Direction</span>
                    <span className={`font-semibold ${prediction?.trendDirection === 'bullish' ? 'text-green-400' : prediction?.trendDirection === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {prediction?.trendDirection?.toUpperCase() ?? 'NEUTRAL'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">AI Confidence</span>
                    <span className="font-semibold text-blue-400">{prediction?.confidence ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${prediction?.confidence ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Trend Probability</span>
                    <span className="font-semibold text-purple-400">{prediction?.trendProbability ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${prediction?.trendProbability ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" />
                Price Forecast (30-Day)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Bullish Target</div>
                  <div className="text-xl font-bold text-green-400">
                    ${prediction?.predictedHigh?.toFixed(2) ?? '—'}
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    +{prediction?.predictedHighPct ?? 0}% from current
                  </div>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Bearish Target</div>
                  <div className="text-xl font-bold text-red-400">
                    ${prediction?.predictedLow?.toFixed(2) ?? '—'}
                  </div>
                  <div className="text-xs text-red-400 mt-1">
                    {prediction?.predictedLowPct ?? 0}% from current
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                {prediction?.summary ?? 'AI analysis based on historical patterns and market momentum.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
