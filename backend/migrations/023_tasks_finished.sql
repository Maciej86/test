-- Znacznik „Zakończone” (zmiana 2026-11-19): karta zostaje w swojej kolumnie, wyszarzona. Kto i kiedy: historia zmian.
ALTER TABLE tasks ADD COLUMN finished_at DATETIME NULL AFTER completed_at;
