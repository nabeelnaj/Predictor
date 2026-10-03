import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, CreditCard as Edit3, X, Loader2, Zap, TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight, Search, RefreshCw, ChevronRight, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useAuth } from '../contexts/AuthContext';
import { searchSymbols, formatPrice, type SymbolSearchResult } from '../lib/finnhub';
import { DonutChart, AreaChart } from '../components/calculators/CalculatorLayout';

interface PortfolioProps {
  onNavigate: (page: string, symbol?: string) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

const ALLOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#22c55e', '#a855f7'];

export default function Portfolio({ onNavigate, onAuthClick }: PortfolioProps) {
  const { user } = useAuth();
  const {
    holdings, summary, loading, error, isLive, lastUpdate, refetch,
    addHolding, updateHolding, deleteHolding, fetchQuote,
  } = usePortfolio();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [notes, setNotes] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search symbols with debounce
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchSymbols(searchQuery);
      setSearchResults(results.slice(0, 6));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleSymbolSelect(sym: string) {
    setSelectedSymbol(sym);
    setSearchQuery(sym);
    setSearchResults([]);
    setFormError(null);
    try {
      const quote = await fetchQuote(sym);
      if (quote?.c) {
        setLivePrice(quote.c);
        if (!buyPrice) setBuyPrice(quote.c.toString());
      } else {
        setFormError('Could not fetch live price for this symbol');
      }
    } catch {
      setFormError('Failed to fetch quote. Please try again.');
    }
  }

  function resetForm() {
    setSearchQuery('');
    setSelectedSymbol('');
    setQuantity('');
    setBuyPrice('');
    setBuyDate('');
    setNotes('');
    setLivePrice(null);
    setFormError(null);
    setEditingId(null);
  }

  function openEdit(holding: typeof holdings[0]) {
    setEditingId(holding.id);
    setSelectedSymbol(holding.symbol);
    setSearchQuery(holding.symbol);
    setQuantity(holding.quantity.toString());
    setBuyPrice(holding.buy_price.toString());
    setBuyDate(holding.buy_date ?? '');
    setNotes(holding.notes ?? '');
    setLivePrice(holding.currentPrice);
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedSymbol) { setFormError('Please select a stock symbol'); return; }
    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);
    if (!qty || qty <= 0) { setFormError('Enter a valid quantity'); return; }
    if (!price || price <= 0) { setFormError('Enter a valid buy price'); return; }

    setSubmitting(true);
    if (editingId) {
      const { error: err } = await updateHolding(editingId, {
        quantity: qty,
        buy_price: price,
        buy_date: buyDate || undefined,
        notes,
      });
      if (err) setFormError(err);
      else { setShowAddForm(false); resetForm(); }
    } else {
      const { error: err } = await addHolding(selectedSymbol, qty, price, buyDate, notes);
      if (err) setFormError(err);
      else { setShowAddForm(false); resetForm(); }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await deleteHolding(id);
  }

  // Portfolio value trend: cost basis → current value progression
  const valueTrend = useMemo(() => {
    if (holdings.length === 0) return { data: [], labels: [] };
    const totalCost = summary.totalCost;
    const totalValue = summary.totalValue;
    // Show progression from initial investment to current value
    const data: number[] = [];
    const labels: string[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Linear interpolation from cost to current value
      data.push(totalCost + (totalValue - totalCost) * t);
      labels.push(i === 0 ? 'Invested' : i === steps ? 'Now' : '');
    }
    return { data, labels };
  }, [summary.totalCost, summary.totalValue, holdings.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-14 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Portfolio Management</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to track your holdings, monitor P/L, and analyze your asset allocation.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => onAuthClick('signin')} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Sign In
            </button>
            <button onClick={() => onAuthClick('signup')} className="px-5 py-2.5 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              {isLive && <Zap size={10} className="text-green-400" />}
              <span>{isLive ? 'LIVE' : 'LOADING'}</span>
              {lastUpdate && <span className="text-gray-600">• {lastUpdate.toLocaleTimeString()}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio</h1>
            <p className="text-gray-500 text-sm mt-1">Track holdings, P/L, allocation, and returns in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add Holding
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Portfolio Value"
            value={formatPrice(summary.totalValue)}
            sublabel={`${holdings.length} holdings`}
            icon={<Wallet size={16} />}
            color="#3b82f6"
          />
          <SummaryCard
            label="Total Invested"
            value={formatPrice(summary.totalCost)}
            sublabel="Cost basis"
            icon={<DollarSign size={16} />}
            color="#6b7280"
          />
          <SummaryCard
            label="Total P/L"
            value={`${summary.totalPL >= 0 ? '+' : ''}${formatPrice(summary.totalPL)}`}
            sublabel={`${summary.totalPLPct >= 0 ? '+' : ''}${summary.totalPLPct.toFixed(2)}%`}
            icon={summary.totalPL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            color={summary.totalPL >= 0 ? '#10b981' : '#ef4444'}
          />
          <SummaryCard
            label="Day Change"
            value={`${summary.dayChange >= 0 ? '+' : ''}${formatPrice(summary.dayChange)}`}
            sublabel={`${summary.dayChangePct >= 0 ? '+' : ''}${summary.dayChangePct.toFixed(2)}%`}
            icon={summary.dayChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            color={summary.dayChange >= 0 ? '#10b981' : '#ef4444'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Value Trend */}
          <div className="lg:col-span-2 p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Portfolio Value Trend</h3>
            </div>
            {valueTrend.data.length > 0 ? (
              <AreaChart data={valueTrend.data} labels={valueTrend.labels} color="#3b82f6" height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">Add holdings to see trend</div>
            )}
          </div>

          {/* Asset Allocation */}
          <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={14} className="text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Asset Allocation</h3>
            </div>
            {summary.allocation.length > 0 ? (
              <DonutChart
                segments={summary.allocation.slice(0, 8).map((a, i) => ({
                  label: a.symbol,
                  value: a.value,
                  color: ALLOC_COLORS[i % ALLOC_COLORS.length],
                }))}
                centerLabel="Total"
                centerValue={formatPrice(summary.totalValue)}
              />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">No holdings yet</div>
            )}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Holdings</h3>
            <span className="text-xs text-gray-500">{holdings.length} positions</span>
          </div>

          {loading && holdings.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : holdings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Wallet size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-400 text-sm mb-1">No holdings yet</p>
              <p className="text-gray-600 text-xs mb-4">Add your first stock holding to start tracking your portfolio</p>
              <button
                onClick={() => { resetForm(); setShowAddForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add First Holding
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-900/80 border-b border-gray-800 text-xs font-semibold text-gray-500">
                  <div className="col-span-2">Symbol</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Buy Price</div>
                  <div className="col-span-2 text-right">Current</div>
                  <div className="col-span-2 text-right">Market Value</div>
                  <div className="col-span-2 text-right">P/L</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-800">
                  {holdings.map(h => {
                    const isProfit = (h.unrealizedPL ?? 0) >= 0;
                    const isDayUp = (h.dayChange ?? 0) >= 0;
                    return (
                      <div key={h.id} className="grid grid-cols-12 gap-2 px-5 py-3 hover:bg-gray-800/30 transition-colors items-center group">
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                            {h.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <button onClick={() => onNavigate('stock', h.symbol)} className="font-semibold text-sm text-white hover:text-blue-400 transition-colors">
                              {h.symbol}
                            </button>
                            {h.dayChangePct !== null && (
                              <div className={`text-[10px] ${isDayUp ? 'text-green-400' : 'text-red-400'}`}>
                                {isDayUp ? '+' : ''}{h.dayChangePct.toFixed(2)}% today
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 text-right text-sm text-gray-300">{h.quantity}</div>
                        <div className="col-span-2 text-right text-sm text-gray-400">${h.buy_price.toFixed(2)}</div>
                        <div className="col-span-2 text-right text-sm text-white font-medium">
                          {h.currentPrice !== null ? `$${h.currentPrice.toFixed(2)}` : '—'}
                        </div>
                        <div className="col-span-2 text-right text-sm text-white font-semibold">
                          {h.marketValue !== null ? formatPrice(h.marketValue) : '—'}
                        </div>
                        <div className="col-span-2 text-right">
                          <div className={`text-sm font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{h.unrealizedPL !== null ? formatPrice(h.unrealizedPL) : '—'}
                          </div>
                          <div className={`text-[10px] ${isProfit ? 'text-green-400/70' : 'text-red-400/70'}`}>
                            {h.unrealizedPLPct !== null ? `${isProfit ? '+' : ''}${h.unrealizedPLPct.toFixed(2)}%` : ''}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(h)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          Portfolio data persists to your account. Prices update every 4 seconds via Finnhub. Not financial advice.
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddForm(false); resetForm(); }}>
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-semibold text-white">{editingId ? 'Edit Holding' : 'Add Holding'}</h3>
              <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Symbol Search */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Stock Symbol</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search stock (e.g. AAPL, MSFT)"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSelectedSymbol(''); setLivePrice(null); }}
                    disabled={!!editingId}
                    className="w-full pl-9 pr-3 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                      {searchResults.map(r => (
                        <button
                          key={r.symbol}
                          type="button"
                          onClick={() => handleSymbolSelect(r.displaySymbol)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 transition-colors text-left"
                        >
                          <div>
                            <span className="text-sm font-semibold text-white">{r.displaySymbol}</span>
                            <span className="text-xs text-gray-500 ml-2">{r.description}</span>
                          </div>
                          <ChevronRight size={12} className="text-gray-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {livePrice !== null && (
                  <p className="text-xs text-green-400 mt-1">Live price: ${livePrice.toFixed(2)}</p>
                )}
              </div>

              {/* Quantity & Buy Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Quantity (shares)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="100"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Buy Price ($)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="150.00"
                    value={buyPrice}
                    onChange={e => setBuyPrice(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Buy Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Buy Date (optional)</label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={e => setBuyDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Long-term hold"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Cost preview */}
              {parseFloat(quantity) > 0 && parseFloat(buyPrice) > 0 && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total Cost Basis</span>
                    <span className="text-white font-semibold">
                      ${(parseFloat(quantity) * parseFloat(buyPrice)).toFixed(2)}
                    </span>
                  </div>
                  {livePrice !== null && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">Current Value</span>
                      <span className="text-white font-semibold">
                        ${(parseFloat(quantity) * livePrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {editingId ? 'Update' : 'Add'} Holding
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); resetForm(); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sublabel, icon, color }: { label: string; value: string; sublabel: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-lg sm:text-xl font-bold text-white">{value}</p>
      <p className="text-xs mt-0.5" style={{ color }}>{sublabel}</p>
    </div>
  );
}
