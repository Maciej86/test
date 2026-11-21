-- Kalendarz, część 2: typ „Chorobowe” na start (propozycja; administrator zmienia go w Typach urlopów). Dni
-- kalendarzowe, bez zatwierdzania (zwolnienie wystawił lekarz), nie odejmuje dni z puli, fioletowy, na końcu listy.
-- Tylko gdy nie ma typu o tej nazwie (także ukrytego; porównanie bez wielkości liter); istniejącego nie zmienia.
INSERT INTO leave_types (position, name, deducts_pool, yearly_limit, color, day_count, requires_approval)
SELECT COALESCE(MAX(position), 0) + 1, 'Chorobowe', FALSE, NULL, 'grape', 'calendar', FALSE FROM leave_types
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE name = 'Chorobowe');
