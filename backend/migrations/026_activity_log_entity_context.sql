-- Historia zmian: krótki opis rekordu w chwili zmiany (typ urlopu i termin wniosku, projekt zadania, rok puli, rola).
ALTER TABLE activity_log ADD COLUMN entity_context VARCHAR(255) NULL AFTER entity_name;
