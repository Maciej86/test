-- Powiadomienia w aplikacji (moduł Powiadomienia): dzwonek w belce. Odbiorca user_id; tekst powstaje na ekranie
-- z type + params (JSON). actor_name to kopia imienia i nazwiska osoby, która wykonała czynność (bez klucza obcego,
-- zostaje po usunięciu tej osoby). Przeczytane starsze niż 90 dni usuwa serwer przy tworzeniu nowych.
CREATE TABLE notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  params JSON NOT NULL,
  actor_name VARCHAR(141) NULL,
  link VARCHAR(255) NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
