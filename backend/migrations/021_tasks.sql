-- Zadania na tablicy projektu. position: kolejność w kolumnie (liczy serwer), completed_at: wejście do
-- „Zrealizowane” (liczy serwer). „Usuń” na tablicy = archiwum (archived_at). Usunięcie projektu usuwa zadania.
-- created_by_name to kopia imienia i nazwiska autora.
CREATE TABLE tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  due_date DATE NULL,
  column_key ENUM('draft','in_progress','done') NOT NULL,
  position INT UNSIGNED NOT NULL,
  completed_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_by_name VARCHAR(141) NOT NULL,
  archived_at DATETIME NULL,
  archived_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_board (project_id, archived_at, column_key, position),
  INDEX idx_tasks_created_by (created_by),
  INDEX idx_tasks_archived_by (archived_by),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_archived_by FOREIGN KEY (archived_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
