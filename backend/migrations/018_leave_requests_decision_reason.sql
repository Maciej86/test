-- Moduł Wnioski urlopowe: jeden powód decyzji na wniosek, przy odrzuceniu albo anulowaniu (odrzuconego nie da się
-- anulować, więc wniosek nigdy nie ma dwóch powodów).
ALTER TABLE leave_requests RENAME COLUMN reject_reason TO decision_reason;
