-- Istniejące konta: ostatni wyraz to nazwisko, reszta to imię (jeden wyraz: całość do nazwiska).
UPDATE users
SET last_name = SUBSTRING_INDEX(TRIM(name), ' ', -1),
    first_name = TRIM(LEFT(TRIM(name), CHAR_LENGTH(TRIM(name)) - CHAR_LENGTH(SUBSTRING_INDEX(TRIM(name), ' ', -1))));
