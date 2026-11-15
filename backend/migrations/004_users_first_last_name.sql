-- Imię i nazwisko osobno (moduł Pracownicy, zmiana 2026-11-15). Wypełnia je 005, a name składa z nich 006.
ALTER TABLE users
  ADD COLUMN first_name VARCHAR(60) NOT NULL DEFAULT '' AFTER name,
  ADD COLUMN last_name VARCHAR(80) NOT NULL DEFAULT '' AFTER first_name;
