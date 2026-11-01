-- TRACE // ZERO — D1 SQLite Database Schema
-- High-precision hardware telemetry and evasion forensic records

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  secret_phrase TEXT NOT NULL,
  alias TEXT,
  composite_hash TEXT NOT NULL,
  primary_hardware_hash TEXT NOT NULL,
  canvas_hash TEXT NOT NULL,
  webgl_hash TEXT NOT NULL,
  audio_hash TEXT NOT NULL,
  hardware_hash TEXT NOT NULL,
  environment_hash TEXT NOT NULL,
  font_hash TEXT NOT NULL,
  entropy_total_bits REAL DEFAULT 0,
  execution_time_ms REAL DEFAULT 0,
  ip_address TEXT,
  asn TEXT,
  as_organization TEXT,
  country TEXT,
  city TEXT,
  colo TEXT,
  user_agent TEXT,
  diagnostics_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reg_composite ON registrations(composite_hash);
CREATE INDEX IF NOT EXISTS idx_reg_hardware ON registrations(primary_hardware_hash);
CREATE INDEX IF NOT EXISTS idx_reg_canvas ON registrations(canvas_hash);
CREATE INDEX IF NOT EXISTS idx_reg_webgl ON registrations(webgl_hash);
CREATE INDEX IF NOT EXISTS idx_reg_audio ON registrations(audio_hash);
CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at DESC);

CREATE TABLE IF NOT EXISTS evasion_attempts (
  id TEXT PRIMARY KEY,
  registration_id TEXT,
  match_type TEXT NOT NULL, -- 'EXACT_COMPOSITE', 'HARDWARE_SILICON_MATCH', 'HIGH_CONFIDENCE_HEURISTIC', 'NO_MATCH'
  confidence_score REAL NOT NULL,
  secret_phrase_revealed TEXT,
  composite_hash TEXT NOT NULL,
  primary_hardware_hash TEXT NOT NULL,
  canvas_hash TEXT NOT NULL,
  webgl_hash TEXT NOT NULL,
  audio_hash TEXT NOT NULL,
  hardware_hash TEXT NOT NULL,
  environment_hash TEXT NOT NULL,
  font_hash TEXT NOT NULL,
  ip_address TEXT,
  asn TEXT,
  country TEXT,
  city TEXT,
  colo TEXT,
  is_vpn_detected INTEGER DEFAULT 0,
  diagnostics_json TEXT NOT NULL,
  diff_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (registration_id) REFERENCES registrations(id)
);

CREATE INDEX IF NOT EXISTS idx_evasion_created ON evasion_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evasion_reg_id ON evasion_attempts(registration_id);
