-- Rodzaj umowy pracownika jako typ ze słownika (zamiast stałej listy w users.contract_type).
-- RESTRICT: typów się nie usuwa, tylko ukrywa; pracownik nie straci umowy.
ALTER TABLE users
  ADD COLUMN contract_type_id INT UNSIGNED NULL AFTER contract_type,
  ADD CONSTRAINT fk_users_contract_type FOREIGN KEY (contract_type_id) REFERENCES contract_types (id) ON DELETE RESTRICT;
