CREATE TABLE IF NOT EXISTS view_data (
  session_id TEXT NOT NULL,
  view_key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, view_key)
);
