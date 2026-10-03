import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Sun, Moon, Search, LogOut, LayoutDashboard, BarChart2, Menu, X, Zap, Globe, Calculator, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { searchSymbols, type SymbolSearchResult } from '../lib/finnhub';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, symbol?: string) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

export default function Navbar({ currentPage, onNavigate, onAuthClick }: NavbarProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        setSearchLoading(true);
        const results = await searchSymbols(searchQuery, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(results.slice(0, 8));
          setShowSearchResults(true);
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 150);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [searchQuery]);

  function handleStockSelect(symbol: string) {
    setSearchQuery('');
    setShowSearchResults(false);
    onNavigate('stock', symbol);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80">
      <div className="h-full max-w-7xl mx-auto px-4 lg:px-6 flex items-center gap-4">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white hidden sm:block">InvestPredictor</span>
        </button>

        <div className="flex-1 max-w-md relative hidden md:block" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search any US stock..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
          />
          {showSearchResults && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto scrollbar-thin">
              {searchLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => handleStockSelect(s.displaySymbol)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {s.displaySymbol.slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{s.displaySymbol}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{s.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1">
          <NavTab active={currentPage === 'market'} onClick={() => onNavigate('market')}>
            <Globe size={14} /> Market
          </NavTab>
          <NavTab active={currentPage === 'screener'} onClick={() => onNavigate('screener')}>
            <BarChart2 size={14} /> Screener
          </NavTab>
          <NavTab active={currentPage === 'calculators'} onClick={() => onNavigate('calculators')}>
            <Calculator size={14} /> Calculators
          </NavTab>
          {user && (
            <NavTab active={currentPage === 'portfolio'} onClick={() => onNavigate('portfolio')}>
              <Wallet size={14} /> Portfolio
            </NavTab>
          )}
          {user && (
            <NavTab active={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')}>
              <LayoutDashboard size={14} /> Dashboard
            </NavTab>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
            <Zap size={10} className="text-green-500" />
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">LIVE</span>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(v => !v)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user.email?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200 hidden lg:block max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { onNavigate('market'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Globe size={14} /> Market Overview
                    </button>
                    <button onClick={() => { onNavigate('screener'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <BarChart2 size={14} /> Screener
                    </button>
                    <button onClick={() => { onNavigate('calculators'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Calculator size={14} /> Calculators
                    </button>
                    <button onClick={() => { onNavigate('portfolio'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Wallet size={14} /> Portfolio
                    </button>
                    <button onClick={() => { onNavigate('dashboard'); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <LayoutDashboard size={14} /> Dashboard
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                    <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={() => onAuthClick('signin')} className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Sign In
              </button>
              <button onClick={() => onAuthClick('signup')} className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm hover:shadow">
                Get Started
              </button>
            </div>
          )}

          <button onClick={() => setMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-4 md:hidden z-40 shadow-lg">
          <div className="relative mb-4" ref={mobileSearchRef}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                {searchResults.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => { handleStockSelect(s.displaySymbol); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                  >
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{s.displaySymbol}</span>
                    <span className="text-xs text-gray-500">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1 mb-3">
            <button onClick={() => { onNavigate('market'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Globe size={14} /> Market Overview
            </button>
            <button onClick={() => { onNavigate('screener'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <BarChart2 size={14} /> Screener
            </button>
            <button onClick={() => { onNavigate('calculators'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Calculator size={14} /> Calculators
            </button>
            {user && (
              <button onClick={() => { onNavigate('portfolio'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Wallet size={14} /> Portfolio
              </button>
            )}
            {user && (
              <button onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <LayoutDashboard size={14} /> Dashboard
              </button>
            )}
          </div>
          {!user ? (
            <div className="flex gap-2">
              <button onClick={() => { onAuthClick('signin'); setMobileMenuOpen(false); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg">Sign In</button>
              <button onClick={() => { onAuthClick('signup'); setMobileMenuOpen(false); }} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">Get Started</button>
            </div>
          ) : (
            <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

function NavTab({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
