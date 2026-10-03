/*
# Create stock_fundamentals table

1. New Tables
- `stock_fundamentals` - Caches fundamental data for stocks to enable efficient screener filtering
  - `symbol` (text, PK) - Stock ticker symbol
  - `name` (text) - Company name
  - `sector` (text) - Industry sector
  - `industry` (text) - Industry classification
  - `market_cap` (numeric) - Market capitalization
  - `pe_ratio` (numeric) - Price-to-earnings ratio
  - `peg_ratio` (numeric) - PEG ratio
  - `dividend_yield` (numeric) - Dividend yield percentage
  - `revenue_growth` (numeric) - Revenue growth percentage
  - `eps_growth` (numeric) - EPS growth percentage
  - `price_performance_1y` (numeric) - 1-year price performance
  - `volume_avg` (numeric) - Average daily volume
  - `rsi_14` (numeric) - 14-day RSI
  - `sma_50` (numeric) - 50-day simple moving average
  - `sma_200` (numeric) - 200-day simple moving average
  - `analyst_rating` (text) - Overall analyst rating (strong_buy, buy, hold, sell, strong_sell)
  - `price_target` (numeric) - Mean analyst price target
  - `beta` (numeric) - Stock beta
  - `debt_equity` (numeric) - Debt to equity ratio
  - `roe` (numeric) - Return on equity
  - `updated_at` (timestamptz) - Last update timestamp

2. Security
- Enable RLS on `stock_fundamentals`.
- Allow public read access since this is market data (no auth required).
*/

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  symbol text PRIMARY KEY,
  name text DEFAULT '',
  sector text DEFAULT '',
  industry text DEFAULT '',
  market_cap numeric,
  pe_ratio numeric,
  peg_ratio numeric,
  dividend_yield numeric,
  revenue_growth numeric,
  eps_growth numeric,
  price_performance_1y numeric,
  volume_avg numeric,
  rsi_14 numeric,
  sma_50 numeric,
  sma_200 numeric,
  analyst_rating text DEFAULT '',
  price_target numeric,
  beta numeric,
  debt_equity numeric,
  roe numeric,
  updated_at timestamptz DEFAULT now()
);

-- Index for common screener filters
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_sector ON stock_fundamentals(sector);
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_market_cap ON stock_fundamentals(market_cap);
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_pe_ratio ON stock_fundamentals(pe_ratio);
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_analyst_rating ON stock_fundamentals(analyst_rating);

ALTER TABLE stock_fundamentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_fundamentals" ON stock_fundamentals;
CREATE POLICY "public_read_fundamentals" ON stock_fundamentals FOR SELECT
TO anon, authenticated USING (true);
