-- Projekty zadań (moduł Zadania). Tworzy i usuwa tylko administrator; usunięcie jest na stałe razem z zadaniami
-- (bez archiwum). position: kolejność w menu „Zadania”. Porównanie utf8mb4_polish_ci nie rozróżnia wielkości liter,
-- więc unikalny indeks pilnuje też „marketing” = „Marketing”.
CREATE TABLE projects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  position INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_projects_name (name),
  INDEX idx_projects_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
