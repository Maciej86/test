-- Historia zmian: nazwa i opis dla wpisów zapisanych przed migracjami 025 i 026, z obecnych tabel.
-- Tylko dane (bez zmiany struktury); dotyka wyłącznie wpisów z pustą nazwą.

-- Pracownicy i pule dni: imię i nazwisko osoby.
UPDATE activity_log a JOIN users u ON u.id = a.entity_id
SET a.entity_name = u.name
WHERE a.entity_type IN ('users', 'leave_pools') AND a.entity_name = '';

-- Nowe konto: rola; pula dni: rok (z utworzenia puli albo z zamknięcia roku).
UPDATE activity_log
SET entity_context = JSON_OBJECT('role', JSON_UNQUOTE(JSON_EXTRACT(changes, '$.role.after')))
WHERE entity_type = 'users' AND action = 'create' AND entity_context IS NULL
  AND JSON_EXTRACT(changes, '$.role.after') IS NOT NULL;

UPDATE activity_log
SET entity_context = JSON_OBJECT('year', COALESCE(JSON_EXTRACT(changes, '$.closed_year.after'), JSON_EXTRACT(changes, '$.year.after')))
WHERE entity_type = 'leave_pools' AND entity_context IS NULL
  AND COALESCE(JSON_EXTRACT(changes, '$.closed_year.after'), JSON_EXTRACT(changes, '$.year.after')) IS NOT NULL;

-- Wnioski urlopowe (nie są usuwane): osoba, typ, termin i dni.
UPDATE activity_log a
  JOIN leave_requests r ON r.id = a.entity_id
  JOIN users u ON u.id = r.user_id
  JOIN leave_types lt ON lt.id = r.leave_type_id
SET a.entity_name = u.name,
    a.entity_context = JSON_OBJECT('leaveType', lt.name, 'from', DATE_FORMAT(r.date_from, '%Y-%m-%d'),
                                   'to', DATE_FORMAT(r.date_to, '%Y-%m-%d'), 'days', r.working_days)
WHERE a.entity_type = 'leave_requests' AND a.entity_name = '';

-- Zadania: tytuł i projekt.
UPDATE activity_log a
  JOIN tasks t ON t.id = a.entity_id
  JOIN projects p ON p.id = t.project_id
SET a.entity_name = t.title, a.entity_context = JSON_OBJECT('project', p.name)
WHERE a.entity_type = 'tasks' AND a.entity_name = '';

-- Projekty: obecna nazwa.
UPDATE activity_log a JOIN projects p ON p.id = a.entity_id
SET a.entity_name = p.name
WHERE a.entity_type = 'projects' AND a.entity_name = '';

-- Rekordy już usunięte: nazwa z zapisanej zmiany (projekt: nazwa przed usunięciem, zadanie: tytuł z utworzenia).
UPDATE activity_log
SET entity_name = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(changes, '$.name.before')), JSON_UNQUOTE(JSON_EXTRACT(changes, '$.name.after')))
WHERE entity_type = 'projects' AND entity_name = ''
  AND COALESCE(JSON_EXTRACT(changes, '$.name.before'), JSON_EXTRACT(changes, '$.name.after')) IS NOT NULL;

UPDATE activity_log a
  JOIN activity_log c ON c.entity_type = 'tasks' AND c.entity_id = a.entity_id AND c.action = 'create'
SET a.entity_name = JSON_UNQUOTE(JSON_EXTRACT(c.changes, '$.title.after'))
WHERE a.entity_type = 'tasks' AND a.entity_name = '' AND JSON_EXTRACT(c.changes, '$.title.after') IS NOT NULL;
