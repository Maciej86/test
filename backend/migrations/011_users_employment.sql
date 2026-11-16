-- Pracownicy: data zatrudnienia i rodzaj umowy (oba nieobowiązkowe).
-- contract_type: employment (umowa o pracę), mandate (zlecenie), specific_work (o dzieło), b2b.
ALTER TABLE users
  ADD COLUMN hired_on DATE NULL AFTER role,
  ADD COLUMN contract_type ENUM('employment', 'mandate', 'specific_work', 'b2b') NULL AFTER hired_on;
