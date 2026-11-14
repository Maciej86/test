-- Konta (moduł Logowanie). Login i e-mail są unikalne także wśród kont w archiwum.
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  login VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  archived_at DATETIME NULL,
  archived_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_login (login),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_archived_by (archived_by),
  CONSTRAINT fk_users_archived_by FOREIGN KEY (archived_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;
