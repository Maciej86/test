-- Historia zmian: czego dotyczy wpis (osoba, tytuł zadania, nazwa projektu lub typu), zapamiętane w chwili zmiany,
-- żeby wpis był czytelny także po usunięciu rekordu na stałe.
ALTER TABLE activity_log ADD COLUMN entity_name VARCHAR(255) NOT NULL DEFAULT '' AFTER entity_id;
