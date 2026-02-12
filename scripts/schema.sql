-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(20) PRIMARY KEY,
  client_name VARCHAR(255),
  project_name VARCHAR(255),
  pages INTEGER NOT NULL DEFAULT 5,
  include_design BOOLEAN DEFAULT true,
  include_dev BOOLEAN DEFAULT true,
  include_copy BOOLEAN DEFAULT false,
  is_landing_page BOOLEAN DEFAULT false,
  add_blog BOOLEAN DEFAULT false,
  add_shop BOOLEAN DEFAULT false,
  custom_post_types JSONB DEFAULT '[]'::jsonb,
  plugins JSONB DEFAULT '[]'::jsonb,
  include_pm BOOLEAN DEFAULT true,
  include_contingency BOOLEAN DEFAULT true,
  discount_type VARCHAR(20) DEFAULT 'percent',
  discount_value NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row for single user)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  rate NUMERIC(10,2) DEFAULT 175,
  min_project NUMERIC(10,2) DEFAULT 1750,
  landing_page_price NUMERIC(10,2) DEFAULT 700,
  show_internal_costs BOOLEAN DEFAULT false,
  theme VARCHAR(10) DEFAULT 'dark',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize settings with defaults
INSERT INTO settings (id, rate, min_project, landing_page_price, show_internal_costs, theme)
VALUES (1, 175, 1750, 700, false, 'dark')
ON CONFLICT (id) DO NOTHING;
