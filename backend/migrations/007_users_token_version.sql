-- Numer wersji sesji: każda zmiana hasła go podnosi, więc stare ciasteczka logowania przestają działać.
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
