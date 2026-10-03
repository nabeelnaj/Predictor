import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import StockDetail from './pages/StockDetail';
import MarketOverview from './pages/MarketOverview';
import Calculators from './pages/Calculators';
import Portfolio from './pages/Portfolio';

type Page = 'landing' | 'dashboard' | 'screener' | 'stock' | 'market' | 'calculators' | 'portfolio';

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('landing');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({ open: false, mode: 'signin' });

  function handleNavigate(p: string, symbol?: string) {
    if ((p === 'dashboard' || p === 'portfolio') && !user) {
      setAuthModal({ open: true, mode: 'signin' });
      return;
    }
    if (symbol) setSelectedSymbol(symbol);
    setPage(p as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAuthClick(mode: 'signin' | 'signup') {
    setAuthModal({ open: true, mode });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading InvestPredictor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar
        currentPage={page}
        onNavigate={handleNavigate}
        onAuthClick={handleAuthClick}
      />

      {page === 'landing' && (
        <LandingPage onNavigate={handleNavigate} onAuthClick={handleAuthClick} />
      )}
      {page === 'dashboard' && user && (
        <Dashboard onNavigate={handleNavigate} />
      )}
      {page === 'screener' && (
        <Screener onNavigate={handleNavigate} onAuthClick={handleAuthClick} />
      )}
      {page === 'market' && (
        <MarketOverview onNavigate={handleNavigate} />
      )}
      {page === 'stock' && (
        <StockDetail symbol={selectedSymbol} onNavigate={handleNavigate} onAuthClick={handleAuthClick} />
      )}
      {page === 'calculators' && (
        <Calculators />
      )}
      {page === 'portfolio' && user && (
        <Portfolio onNavigate={handleNavigate} onAuthClick={handleAuthClick} />
      )}

      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          onClose={() => setAuthModal(prev => ({ ...prev, open: false }))}
          onSwitchMode={mode => setAuthModal({ open: true, mode })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
