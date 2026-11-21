-- Kalendarz, część 2: jak liczyć dni wniosku tego typu. working = bez weekendów i świąt, calendar = wszystkie dni
-- (np. urlop ojcowski, chorobowe). Wartości jak LEAVE_DAY_COUNTS (shared/src/constants/leaveTypes.ts).
ALTER TABLE leave_types ADD COLUMN day_count ENUM('working','calendar') NOT NULL DEFAULT 'working' AFTER color;
