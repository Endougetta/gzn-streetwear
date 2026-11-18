CREATE TABLE waitlist_entries (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  verification_sent_at INTEGER,
  confirmed_at INTEGER,
  confirmation_sent_at INTEGER,
  contacted_at INTEGER
);

CREATE TABLE waitlist_items (
  entry_id TEXT NOT NULL REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  PRIMARY KEY (entry_id, product_id, size)
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX waitlist_confirmed ON waitlist_entries(confirmed_at);
CREATE INDEX rate_expiration ON rate_limits(expires_at);
