# Stan projektu: test

**Wersja stepkit:** 0.1.36

**Następny krok:** Moduł Wnioski urlopowe: implementacja, krok 11 z `PLAN.md` (`/stepkit:dalej`).

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
| 9 | Wnioski urlopowe | leave-requests | w toku | implementacja (krok 11/17) | my-leave |
| 10 | Zadania | tasks | czeka | makieta | employees, notifications |
| 11 | Historia zmian | activity-log | czeka | makieta | employees, my-leave, leave-requests, tasks |
| 12 | Archiwum | archive | czeka | makieta | employees, tasks |
| 13 | Moje konto | my-account | czeka | makieta | login |
| 14 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 15 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, contract-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-17: Wnioski urlopowe: spec zaakceptowany (zatwierdzenie z oknem, powód odrzucenia i anulowania obowiązkowy, `reject_reason` → `decision_reason`, adres szczegółów `/admin/leave-requests/:id`, bez podziału na części).
- 2026-11-17: Wnioski urlopowe: odpowiedzi 2a–8a, zasady pól ok (pasek z zatwierdzonymi i czekającymi, powód odrzucenia i anulowania obowiązkowy 3–500 znaków, anulowanie każdego urlopu z niezamkniętego roku, miniony termin można rozpatrzyć, na start „Czekają”, link z e-maila otwiera szczegóły).
- 2026-11-17: Wnioski urlopowe: odpowiedź 1b, zatwierdzenie z oknem potwierdzenia „Zatwierdzić wniosek?”.
- 2026-11-17: Wnioski urlopowe: makieta listy (zakładki statusów, wyszukiwarka, filtr typu i roku, kolumna „Zostało w puli”, karty na telefonie), szczegółów z prawej (pasek „Kto jeszcze ma wtedy wolne”, pula, decyzja), okien odrzucenia i anulowania z powodem; 9 pytań.
- 2026-11-17: Poprawka (z `IDEAS.md`, potwierdzona: „działa”): dokończone porządki „wspólne zamiast kopii”: `notFound` i nowe `isDuplicateEntry` (`backend/src/db/errors.ts`) w serwerze, `currentYear` w `shared`, okno „Przywrócić konto?” na `ConfirmModal`, w makietach wspólne `ConfirmModal`, `PageHeader`, `EmptyState`, `ListPagination`.
- 2026-11-17: Moduł Moje urlopy zrobiony (część 2 potwierdzona przez użytkownika: „działa”): pula i limity, składanie i wycofywanie wniosków z blokadami, powiadomienia i e-mail, PDF zatwierdzonego wniosku w nowej karcie (wspólne `backend/src/pdf/` dla modułu 9), `npm run my-leave:approve-test`.
- 2026-11-17: Moje urlopy, część 2: zbudowane (kroki 0–7: `pdfmake`, wspólne `backend/src/pdf/` z `renderPdf` i `buildLeaveRequestPdf`, trasa `GET /api/my-leave/requests/:id/pdf`, przycisk „PDF”, `npm run my-leave:approve-test`), przegląd kodu z poprawkami, 9 prób nadużyć odpartych, sprawdzenie w przeglądarce, `npm run check` i 30 testów e2e zielone.
- 2026-11-17: Moje urlopy: plan części 2 zaakceptowany (8 kroków, od szkieletu testów do przeglądu kodu).
- 2026-11-17: Moje urlopy: spec części 2 zaakceptowany (`SPEC-2.md`: przycisk „PDF” przy zatwierdzonym wniosku otwiera PDF w nowej karcie, dokument we wspólnym `backend/src/pdf/` dla modułu 9, polecenie `npm run my-leave:approve-test` do sprawdzenia przed modułem 9).
- 2026-11-17: Moje urlopy, część 1 (wnioski i pula) gotowa, potwierdzona przez użytkownika („działa”).
- 2026-11-17: Moje urlopy, część 1: próby nadużyć (11, wszystkie odparte) jako testy, sprawdzenie w przeglądarce obu ról.
- 2026-11-17: Moje urlopy, część 1: zbudowane (kroki 0–14, przegląd kodu z poprawkami: blokada przy liczeniu czekających wniosków w „Zamknij rok”, odświeżenie po odmowie serwera), `npm run check` i 27 testów e2e zielone.
- 2026-11-17: Moje urlopy: plan części 1 zaakceptowany (15 kroków, od szkieletu testów do przeglądu kodu).
- 2026-11-17: Moje urlopy: spec zaakceptowany (`SPEC.md` ogólny, `SPEC-1.md` część 1).
- 2026-11-17: Moje urlopy: moduł w dwóch częściach (1: wnioski i pula, 2: wydruk PDF); „Zamknij rok” zablokowany, dopóki są wnioski czekające z zamykanego roku (odpowiedź a).
- 2026-11-17: Moje urlopy: odpowiedzi 1a–9a, zasady pól ok (wniosek w jednym roku, przyszły rok po „Zamknij rok”; czekające rezerwują dni; od dziś; bez nakładania się; bez edycji, tylko wycofanie; PDF z podpisami; wybór roku; e-mail tylko przy nowym wniosku).
- 2026-11-17: Moje urlopy: makieta (pula roku otwartego z paskiem i limitami typów, tabela wniosków z wyborem roku, okno wniosku z paskiem dni i liczeniem na bieżąco, stany: za mało dni, limit typu, termin zajęty, przyszły rok, wycofanie, podgląd PDF); 9 pytań.
