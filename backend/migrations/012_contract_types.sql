-- Słownik typów umów (moduł Typy umów). Typów się nie usuwa, tylko ukrywa (hidden_at).
-- position: kolejność w oknie pracownika. Porównanie utf8mb4_polish_ci nie rozróżnia wielkości liter,
-- więc unikalny indeks pilnuje też „b2b” = „B2B”.
CREATE TABLE contract_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  position INT UNSIGNED NOT NULL,
  hidden_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contract_types_name (name),
  INDEX idx_contract_types_hidden_position (hidden_at, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
