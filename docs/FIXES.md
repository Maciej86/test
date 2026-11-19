# Poprawki do zrobienia

Poprawki już ustalone, odłożone na po bieżącym module: błąd, którego nie dało się naprawić od razu, drobna zmiana
zgłoszona w trakcie modułu, porządki w kodzie. `/stepkit:dalej` czyta ten plik na starcie każdej rozmowy i robi
otwarte poprawki **przed następnym modułem**. Pomysły „na kiedyś” są w `IDEAS.md`, nie tutaj.

Rodzaje: `błąd` · `zmiana` · `porządki`. Statusy: `czeka` · `zrobione RRRR-MM-DD`.

| Data | Rodzaj | Co | Moduł | Status |
|---|---|---|---|---|
| 2026-11-19 | błąd | Test e2e Wniosków urlopowych czasem (raz na kilka przebiegów) otwiera szczegóły wniosku bez `?search=` w adresie po kliknięciu wiersza zaraz po wyszukaniu; zbadać, czy to wyścig w aplikacji (lista zostaje na ekranie w trakcie wyszukiwania) czy w teście | leave-requests | zrobione 2026-11-19 |
