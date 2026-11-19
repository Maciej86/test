-- Komentarze do zadań (część 2 modułu Zadania). user_name to kopia imienia i nazwiska autora: komentarz zostaje po
-- usunięciu osoby na stałe. edited_at: ostatnia poprawka tekstu (dopisek „edytowany”). Usunięcie zadania usuwa komentarze.
CREATE TABLE task_comments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(141) NOT NULL,
  text TEXT NOT NULL,
  edited_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_comments_task (task_id, created_at),
  INDEX idx_task_comments_user (user_id),
  CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
