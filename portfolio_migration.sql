-- Portfolio holdings migration
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  shares REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  exchange TEXT NOT NULL DEFAULT 'sh',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial holdings (based on current hardcoded data)
INSERT OR REPLACE INTO portfolio_holdings (code, name, shares, cost_price, exchange) VALUES
  ('510300', '沪深300ETF', 3200, 3.85, 'sh'),
  ('600519', '贵州茅台', 50, 1680, 'sh'),
  ('000858', '五粮液', 300, 145, 'sz'),
  ('300750', '宁德时代', 180, 210, 'sz'),
  ('00700', '腾讯控股', 70, 380, 'hk'),
  ('688981', '中芯国际', 260, 52, 'sh');

-- Portfolio history table (daily snapshots)
CREATE TABLE IF NOT EXISTS portfolio_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL UNIQUE,
  total_value REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
