/*
# Create portfolio_holdings table

1. New Tables
- `portfolio_holdings` - User stock holdings for portfolio tracking
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users, NOT NULL DEFAULT auth.uid())
  - `symbol` (text, NOT NULL) - Stock ticker
  - `quantity` (numeric, NOT NULL) - Number of shares
  - `buy_price` (numeric, NOT NULL) - Average purchase price per share
  - `buy_date` (date) - Date of purchase
  - `notes` (text) - Optional user notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `portfolio_holdings`.
- Owner-scoped CRUD: each authenticated user can only access their own holdings.
- UNIQUE constraint on (user_id, symbol) to prevent duplicate entries per symbol.
*/

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  buy_price numeric NOT NULL CHECK (buy_price >= 0),
  buy_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_holdings" ON portfolio_holdings;
CREATE POLICY "select_own_holdings" ON portfolio_holdings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_holdings" ON portfolio_holdings;
CREATE POLICY "insert_own_holdings" ON portfolio_holdings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_holdings" ON portfolio_holdings;
CREATE POLICY "update_own_holdings" ON portfolio_holdings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_holdings" ON portfolio_holdings;
CREATE POLICY "delete_own_holdings" ON portfolio_holdings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
