import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Input validation
function validateEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  if (!sanitized) throw new Error('Email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  if (sanitized.length > 254) throw new Error('Email too long');
  return sanitized;
}

function validatePassword(password: string): string {
  if (!password) throw new Error('Password is required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (password.length > 128) throw new Error('Password too long');
  // Require at least one uppercase, lowercase, number, and special char
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) throw new Error('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Password must contain at least one special character');
  return password;
}

function validateFullName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) throw new Error('Full name is required');
  if (sanitized.length < 2) throw new Error('Name must be at least 2 characters');
  if (sanitized.length > 100) throw new Error('Name too long');
  if (!/^[a-zA-Z\s\-'\.]+$/.test(sanitized)) {
    throw new Error('Name contains invalid characters');
  }
  return sanitized;
}

function validateSymbol(symbol: string): string {
  const sanitized = symbol.trim().toUpperCase();
  if (!sanitized) throw new Error('Symbol is required');
  if (!/^[A-Z0-9.\-^]{1,10}$/.test(sanitized)) {
    throw new Error('Invalid symbol format');
  }
  return sanitized;
}

function sanitizeError(error: unknown): string {
  if (error instanceof AuthError) {
    // Map Supabase auth errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email address',
      'User already registered': 'An account with this email already exists',
      'Weak password': 'Password does not meet requirements',
      'Invalid email': 'Invalid email format',
      'Signup disabled': 'Sign up is currently disabled',
      'Email rate limit exceeded': 'Too many attempts. Please wait before trying again',
    };
    return errorMap[error.message] || 'Authentication failed. Please try again.';
  }
  if (error instanceof Error) {
    // Don't expose internal errors
    const safeMessages = ['is required', 'must be', 'too long', 'invalid', 'format'];
    if (safeMessages.some(m => error.message.toLowerCase().includes(m))) {
      return error.message;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  watchlist: string[];
  addToWatchlist: (symbol: string, name: string) => Promise<{ error: string | null }>;
  removeFromWatchlist: (symbol: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[Auth] Session error:', error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) loadWatchlist(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWatchlist(session.user.id).catch(err => {
          console.error('[Auth] Watchlist load failed:', err);
        });
      } else {
        setWatchlist([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadWatchlist(userId: string) {
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('symbol')
        .eq('user_id', userId);
      
      if (error) throw error;
      setWatchlist((data ?? []).map(r => r.symbol));
    } catch (err) {
      console.error('[Auth] Watchlist load failed:', err);
      setWatchlist([]);
    }
  }

  async function signUp(email: string, password: string, fullName: string): Promise<{ error: string | null }> {
    try {
      // Validate inputs
      const validEmail = validateEmail(email);
      const validPassword = validatePassword(password);
      const validName = validateFullName(fullName);

      const { data, error } = await supabase.auth.signUp({ 
        email: validEmail, 
        password: validPassword,
        options: {
          data: { full_name: validName },
        }
      });
      
      if (error) {
        console.warn('[Auth] Sign up failed:', error.message);
        return { error: sanitizeError(error) };
      }
      
      if (data.user) {
        try {
          await supabase.from('profiles').insert({ 
            id: data.user.id, 
            full_name: validName 
          });
        } catch (profileErr) {
          console.error('[Auth] Profile creation failed:', profileErr);
          // Don't fail signup if profile creation fails
        }
      }
      
      return { error: null };
    } catch (err) {
      console.error('[Auth] Sign up error:', err);
      return { error: sanitizeError(err) };
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const validEmail = validateEmail(email);
      // Don't validate password format on login - just check not empty
      if (!password) throw new Error('Password is required');
      
      const { error } = await supabase.auth.signInWithPassword({ 
        email: validEmail, 
        password 
      });
      
      if (error) {
        console.warn('[Auth] Sign in failed:', error.message);
        return { error: sanitizeError(error) };
      }
      
      return { error: null };
    } catch (err) {
      console.error('[Auth] Sign in error:', err);
      return { error: sanitizeError(err) };
    }
  }

  async function signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('[Auth] Sign out failed:', error.message);
        return { error: sanitizeError(error) };
      }
      return { error: null };
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      return { error: sanitizeError(err) };
    }
  }

  async function addToWatchlist(symbol: string, name: string): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not authenticated' };
    
    try {
      const validSymbol = validateSymbol(symbol);
      const sanitizedName = name.trim().substring(0, 100);
      if (!sanitizedName) throw new Error('Company name is required');
      
      const { error } = await supabase
        .from('watchlists')
        .upsert({ user_id: user.id, symbol: validSymbol, company_name: sanitizedName }, {
          onConflict: 'user_id,symbol'
        });
      
      if (error) throw error;
      
      setWatchlist(prev => {
        if (prev.includes(validSymbol)) return prev;
        return [...prev, validSymbol];
      });
      
      return { error: null };
    } catch (err) {
      console.error('[Auth] Add to watchlist failed:', err);
      return { error: sanitizeError(err) };
    }
  }

  async function removeFromWatchlist(symbol: string): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not authenticated' };
    
    try {
      const validSymbol = validateSymbol(symbol);
      
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', validSymbol);
      
      if (error) throw error;
      
      setWatchlist(prev => prev.filter(s => s !== validSymbol));
      
      return { error: null };
    } catch (err) {
      console.error('[Auth] Remove from watchlist failed:', err);
      return { error: sanitizeError(err) };
    }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      watchlist, 
      addToWatchlist, 
      removeFromWatchlist 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}