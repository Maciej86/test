-- Pule dni urlopu na rok (moduł Pracownicy). Zaległe = niewykorzystane dni z poprzedniego roku, schodzą pierwsze.
-- closed_at ustawia „Zamknij rok”; rok otwarty = najmniejszy rok bez closed_at.
CREATE TABLE leave_pools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  annual_days SMALLINT UNSIGNED NOT NULL,
  carried_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leave_pools_user_year (user_id, year),
  INDEX idx_leave_pools_year (year),
  CONSTRAINT fk_leave_pools_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
