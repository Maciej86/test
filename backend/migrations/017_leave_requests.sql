-- Wnioski urlopowe (moduł Moje urlopy; decyzje dopisze moduł Wnioski urlopowe). Dni robocze, podział na zaległe
-- i pulę roczną oraz pool_year liczy serwer przy złożeniu. Wniosków się nie usuwa (statusy), więc konto i typ urlopu
-- z wnioskami mają RESTRICT. decided_by_name to kopia imienia i nazwiska osoby, która zdecydowała.
CREATE TABLE leave_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  working_days SMALLINT UNSIGNED NOT NULL,
  days_from_carried SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  days_from_annual SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  pool_year SMALLINT UNSIGNED NOT NULL,
  comment VARCHAR(500) NULL,
  status ENUM('pending','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(500) NULL,
  decided_by INT UNSIGNED NULL,
  decided_by_name VARCHAR(141) NULL,
  decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leave_requests_user_year (user_id, pool_year),
  INDEX idx_leave_requests_user_from (user_id, date_from),
  INDEX idx_leave_requests_type (leave_type_id),
  INDEX idx_leave_requests_status (status),
  INDEX idx_leave_requests_decided_by (decided_by),
  CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_requests_type FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_requests_decided_by FOREIGN KEY (decided_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
