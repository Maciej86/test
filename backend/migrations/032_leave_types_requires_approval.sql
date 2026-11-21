-- Kalendarz, część 2: czy wniosek tego typu czeka na decyzję administratora. FALSE (np. chorobowe): wniosek od razu
-- jest zatwierdzony, a administratorzy dostają powiadomienie. Dotychczasowe typy dalej wymagają zatwierdzenia.
ALTER TABLE leave_types ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT TRUE AFTER day_count;
