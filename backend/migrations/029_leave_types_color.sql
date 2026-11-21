-- Moduł Kalendarz: kolor typu urlopu (paski w kalendarzu). Jeden z LEAVE_TYPE_COLORS (shared/src/constants/leaveTypes.ts).
ALTER TABLE leave_types ADD COLUMN color VARCHAR(10) NOT NULL DEFAULT 'green' AFTER yearly_limit;
