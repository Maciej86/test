# Poprawki do zrobienia

Poprawki już ustalone, odłożone na po bieżącym module: błąd, którego nie dało się naprawić od razu, drobna zmiana
zgłoszona w trakcie modułu, porządki w kodzie. `/stepkit:dalej` czyta ten plik na starcie każdej rozmowy i robi
otwarte poprawki **przed następnym modułem**. Pomysły „na kiedyś” są w `IDEAS.md`, nie tutaj.

Rodzaje: `błąd` · `zmiana` · `porządki`. Statusy: `czeka` · `zrobione RRRR-MM-DD`.

| Data | Rodzaj | Co | Moduł | Status |
|---|---|---|---|---|
| 2026-11-19 | błąd | Test e2e Wniosków urlopowych czasem (raz na kilka przebiegów) otwiera szczegóły wniosku bez `?search=` w adresie po kliknięciu wiersza zaraz po wyszukaniu; zbadać, czy to wyścig w aplikacji (lista zostaje na ekranie w trakcie wyszukiwania) czy w teście | leave-requests | zrobione 2026-11-19 |
| 2026-11-20 | błąd | Pełne testy e2e (`npm run test:e2e`) czasem nie przechodzą przy dodawaniu pracownika: „Zapisz” zostaje wyszarzony ponad 30 s, a serwer nie zgłasza błędu. Zdarzyło się w 3 z 7 przebiegów 2026-11-20, w tych dłuższych (3–4 min zamiast 2,5). Pojedynczo te testy zawsze przechodzą. Raz `employees.spec` trafił też na `/login?reason=expired`. Zbadać: kolejka bcrypt albo puli połączeń pod obciążeniem, czy błąd był już przed modułem Historia zmian | employees | czeka |
