# Stan projektu: test

**Wersja stepkit:** 0.1.44

**Następny krok:** Moduł Moje konto (makieta).

## Start aplikacji

- [x] 1. Sprawdzenie komputera
- [x] 2. Szkielet i repo
- [x] 3. Opis
- [x] 4. Wywiad
- [x] 5. Podsumowanie
- [x] 6. Makieta ogólna
- [x] 7. Spec ogólny
- [x] 8. Plik stanu

## Moduły

| # | Moduł | Folder | Status | Etap | Zależy od |
|---|---|---|---|---|---|
| 1 | Wygląd | appearance | zrobiony | zamknięcie | — |
| 2 | Logowanie | login | zrobiony | zamknięcie | appearance |
| 3 | Pracownicy | employees | zrobiony | zamknięcie | login |
| 4 | Typy urlopów | leave-types | zrobiony | zamknięcie | login |
| 5 | E-mail | email | zrobiony | zamknięcie | login |
| 6 | Powiadomienia | notifications | zrobiony | zamknięcie | login |
| 7 | Typy umów | contract-types | zrobiony | zamknięcie | employees |
| 8 | Moje urlopy | my-leave | zrobiony | zamknięcie | employees, leave-types, email, notifications |
| 9 | Wnioski urlopowe | leave-requests | zrobiony | zamknięcie | my-leave |
| 10 | Zadania | tasks | zrobiony | zamknięcie | employees, notifications |
| 11 | Historia zmian | activity-log | zrobiony | zamknięcie | employees, my-leave, leave-requests, tasks |
| 12 | Archiwum | archive | zrobiony | zamknięcie | employees, tasks |
| 13 | Moje konto | my-account | czeka | makieta | login |
| 14 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 15 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, contract-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-20: Moduł Archiwum gotowy (użytkownik potwierdził testy: „działa”). Wspólne `ConfirmByNameModal` (common) i `useEmptyLaterPage` (core), `apiErrorStatus` w kliencie API, „Otwórz w archiwum” w Historii zmian.
- 2026-11-20: Archiwum: próby nadużyć na prawdziwej bazie odparte, przeklikane w przeglądarce (administrator, pracownik, telefon); poprawiona odmiana w oknach usuwania; 59 testów e2e zielonych.
- 2026-11-20: Archiwum: zbudowane (kroki 0–13), przegląd kodu z poprawkami (blokada przy przywracaniu konta, powrót z pustej strony 2+ wspólnym hookiem, podgląd z klawiatury, dymek przy wyszarzonym „Usuń na stałe”); `npm run check` i 53 testy e2e zielone.
- 2026-11-20: Archiwum: spec zaakceptowany; napisane `PLAN.md` (14 kroków, wydzielenie okna „usuń po wpisaniu nazwy” do `common/`) i `TESTS.md`.
- 2026-11-20: Archiwum: odpowiedzi 1a–8a (konto z wnioskami urlopowymi nie do usunięcia, usunięcie konta po wpisaniu imienia i nazwiska, zadanie wraca na koniec swojej kolumny, podgląd zadania tylko do oglądania, wyszukiwarka i projekt, nic nie znika samo, pojedynczo, przy osobie liczba wniosków i zadań); panel pytań usunięty; napisany `SPEC.md`.
- 2026-11-20: Archiwum: makieta (zakładki Pracownicy i Zadania, przywracanie i usuwanie na stałe w oknach, osoba z wnioskami urlopowymi bez „Usuń na stałe”, podgląd zadania tylko do oglądania z komentarzami, wyszukiwarka i projekt, telefon); 8 pytań.
- 2026-11-20: Poprawka: niestabilne testy e2e. Przyczyną było przeciążenie komputera przez 10 przeglądarek naraz (serwer odpowiadał, ale za późno), a nie błąd aplikacji; teraz `workers: 4` w `e2e/playwright.config.ts` (ten sam czas, ok. 3 min). Test powiadomień idzie pierwszy i sam (projekt `notifications`), bo inne testy dokładają administratorowi e2e powiadomień, i czeka, aż okienko dzwonka zniknie. Dwa pełne przebiegi 48/48 zielone. Uwaga: kilka przebiegów e2e w ciągu 15 minut włącza blokadę „Za dużo prób logowania” (testy celowo wpisują złe hasła).
- 2026-11-20: Moduł Historia zmian gotowy (użytkownik potwierdził testy). Wspólne `groupByDay` w shared, `useListParams` odporne na spóźnione wyszukiwanie, stałe adresów ekranów w shared.
- 2026-11-20: Historia zmian: odpowiedzi 1a–9a (dziennik po dniach, rozwijany wpis z „Otwórz”, filtry z datami, wpisy usuniętych rekordów zostają z dopiskiem, trzymane zawsze, bez zmian kolejności w kolumnie, dochodzą typy urlopów i umów, logowania do pomysłów, historia tylko na tym ekranie).
- 2026-11-19: Historia zmian: makieta (dziennik pogrupowany po dniach, wpis rozwija się z „przed → po” i przyciskiem „Otwórz”, filtry: wyszukiwarka, obszar, kto zmienił, daty od–do, wpis usuniętego projektu, telefon); 9 pytań.
- 2026-11-19: Poprawka: klik w wiersz Wniosków urlopowych zaraz po wyszukaniu gubił wyszukiwanie (router zmienia adres przed przerysowaniem ekranu); filtry czytane w chwili kliknięcia (`useCurrentSearch`).
- 2026-11-19: Moduł Zadania zrobiony (część 2, komentarze, potwierdzona przez użytkownika: „działa”).
- 2026-11-19: Zadania, część 2: 9 prób nadużyć (prawdziwa baza) odpartych, sprawdzenie w przeglądarce trzech ról i telefonu; `npm run check` i 43 testy e2e zielone.
