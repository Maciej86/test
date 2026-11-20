-- Historia zmian: nazwy wpisów rekordów usuniętych przed migracją 025 (np. konta tymczasowe z testów),
-- z danych zapisanych w samych wpisach. Tylko dane; dotyka wyłącznie wpisów z pustą nazwą.

-- Konto: imię i nazwisko z wpisu utworzenia konta.
UPDATE activity_log a
  JOIN activity_log c ON c.entity_type = 'users' AND c.entity_id = a.entity_id AND c.action = 'create'
SET a.entity_name = COALESCE(
  JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.name.after')),
  CONCAT_WS(' ', JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.first_name.after')), JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.last_name.after')))
)
WHERE a.entity_type IN ('users', 'leave_pools') AND a.entity_name = '';

-- Wniosek: osoba, która go złożyła, i dane z wpisu złożenia.
UPDATE activity_log a
  JOIN activity_log c ON c.entity_type = 'leave_requests' AND c.entity_id = a.entity_id AND c.action = 'create'
SET a.entity_name = c.user_name,
    a.entity_context = JSON_OBJECT(
      'leaveType', JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.leave_type.after')),
      'from', JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.date_from.after')),
      'to', JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.date_to.after')),
      'days', JSON_EXTRACT(c.changes, '$.working_days.after'))
WHERE a.entity_type = 'leave_requests' AND a.entity_name = '';
