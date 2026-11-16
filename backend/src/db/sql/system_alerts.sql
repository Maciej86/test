-- Kiedy ostatnio wysłano alarm (np. o kopiach), żeby restart backendu nie wysłał tego samego maila drugi raz.
-- Kopiowana do migrations/ w module „Publikacja”, razem z backup_runs.sql.
CREATE TABLE system_alerts (
  alert_key VARCHAR(64) NOT NULL PRIMARY KEY,
  last_sent_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
