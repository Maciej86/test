-- Moduł Kalendarz: typy startowe w różnych kolorach (po nazwie; administrator może je zmienić). Reszta zostaje zielona.
UPDATE leave_types SET color = CASE name
  WHEN 'Okolicznościowy' THEN 'teal'
  WHEN 'Bezpłatny' THEN 'orange'
  WHEN 'Opieka nad dzieckiem' THEN 'navy'
  ELSE color
END;
