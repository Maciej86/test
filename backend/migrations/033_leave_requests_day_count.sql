-- Kalendarz, część 2: wniosek zapamiętuje sposób liczenia dni z typu w chwili złożenia (zmiana typu dotyczy tylko
-- nowych wniosków). Stare wnioski: dni robocze. Kolumna working_days zostaje pod starą nazwą, ale znaczy teraz
-- „dni wniosku” liczone sposobem z day_count.
ALTER TABLE leave_requests
  ADD COLUMN day_count ENUM('working','calendar') NOT NULL DEFAULT 'working' AFTER date_to,
  MODIFY COLUMN working_days SMALLINT UNSIGNED NOT NULL COMMENT 'Dni wniosku liczone sposobem z day_count (robocze albo kalendarzowe)';
