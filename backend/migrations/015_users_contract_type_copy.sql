-- Przepisanie dotychczasowych umów na typy z seedu (po nazwie). NULL zostaje NULL.
UPDATE users u
JOIN contract_types c ON c.name = CASE u.contract_type
  WHEN 'employment' THEN 'Umowa o pracę'
  WHEN 'mandate' THEN 'Umowa zlecenie'
  WHEN 'specific_work' THEN 'Umowa o dzieło'
  WHEN 'b2b' THEN 'B2B'
END
SET u.contract_type_id = c.id
WHERE u.contract_type IS NOT NULL;
