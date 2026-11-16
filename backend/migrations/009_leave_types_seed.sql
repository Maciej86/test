-- Typy urlopów na start: propozycja, administrator zmienia ją na ekranie „Typy urlopów”.
-- Limity jak w Kodeksie pracy: 4 dni na żądanie, 2 dni opieki nad dzieckiem.
INSERT INTO leave_types (position, name, deducts_pool, yearly_limit) VALUES
  (1, 'Wypoczynkowy', TRUE, NULL),
  (2, 'Na żądanie', TRUE, 4),
  (3, 'Okolicznościowy', FALSE, NULL),
  (4, 'Bezpłatny', FALSE, NULL),
  (5, 'Opieka nad dzieckiem', FALSE, 2);
