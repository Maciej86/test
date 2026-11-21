-- Kalendarz, część 2: wniosek typu bez zatwierdzania zapisuje się od razu jako zatwierdzony (bez decided_by).
ALTER TABLE leave_requests ADD COLUMN auto_approved BOOLEAN NOT NULL DEFAULT FALSE AFTER status;
