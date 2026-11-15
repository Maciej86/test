-- name składa baza z imienia i nazwiska, więc belka, historia zmian i logowanie dalej czytają name.
ALTER TABLE users MODIFY COLUMN name VARCHAR(150) AS (CONCAT_WS(' ', NULLIF(first_name, ''), last_name)) STORED;
