-- Przebiegi kopii zapasowych (scripts/backup/backup.sh). Kopiowana do migrations/ w module „Publikacja”.
-- success = baza i pliki zrzucone, zaszyfrowane i wysłane do OVH z blokadą usunięcia.
CREATE TABLE backup_runs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  kind ENUM('intraday', 'daily', 'monthly') NOT NULL,
  status ENUM('success', 'failed', 'skipped') NOT NULL,
  dump_ok TINYINT(1) NULL,
  upload_ok TINYINT(1) NULL,
  size_bytes BIGINT UNSIGNED NULL,
  object_key VARCHAR(255) NULL,
  retain_until DATETIME NULL,
  error VARCHAR(500) NULL,
  INDEX idx_backup_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
