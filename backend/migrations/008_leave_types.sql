-- Słownik typów urlopów (moduł Typy urlopów). Typów się nie usuwa, tylko ukrywa (hidden_at).
-- position: kolejność w formularzu wniosku. Porównanie utf8mb4_polish_ci nie rozróżnia wielkości liter,
-- więc unikalny indeks pilnuje też „szkoleniowy” = „Szkoleniowy”.
CREATE TABLE leave_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  deducts_pool BOOLEAN NOT NULL DEFAULT TRUE,
  yearly_limit SMALLINT UNSIGNED NULL,
  position INT UNSIGNED NOT NULL,
  hidden_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leave_types_name (name),
  INDEX idx_leave_types_hidden_position (hidden_at, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
