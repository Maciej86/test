# Stan projektu: test

**Wersja stepkit:** 0.1.40

**Następny krok:** Moduł Zadania, część 1/2: implementacja, krok 17 z `PLAN-1.md` (`/stepkit:dalej`).

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
| 10 | Zadania | tasks | w toku | implementacja, część 1/2 (krok 17/20) | employees, notifications |
| 11 | Historia zmian | activity-log | czeka | makieta | employees, my-leave, leave-requests, tasks |
| 12 | Archiwum | archive | czeka | makieta | employees, tasks |
| 13 | Moje konto | my-account | czeka | makieta | login |
| 14 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 15 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, contract-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-18: Zadania: spec części 1 zaakceptowany; napisane `PLAN-1.md` (20 kroków) i `TESTS-1.md`.
- 2026-11-18: Zadania: podział na 2 części zaakceptowany (1. projekty i tablice, 2. komentarze); napisane `SPEC.md` i `SPEC-1.md`; zmiana roli administrator → pracownik dopisuje go do projektów z jego otwartymi zadaniami.
- 2026-11-18: Zadania: odpowiedzi na wszystkie pytania makiety (`@dnd-kit` zatwierdzony, projekt usuwa się na stałe z zadaniami po wpisaniu nazwy, osoba usunięta z projektu znika tylko z otwartych zadań, reszta jak w rekomendacjach); panele pytań usunięte z makiety.
- 2026-11-18: Poprawka (zgłoszenie użytkownika): tabela Wniosków urlopowych i Moich urlopów nie skacze przy zmianie zakładki i roku (`keepPreviousData`).
- 2026-11-18: Zadania: zmiana zakresu na prośbę użytkownika: projekty jako podmenu „Zadań” (tworzy administrator, pracownik widzi tylko swoje), komentarze z powiadomieniem, dodawanie w oknie, podgląd z prawej 540 px, odświeżanie co 5 s (odpowiedź 7); makieta przerobiona, 15 otwartych pytań; wspólne `OrderArrows` w makietach.
- 2026-11-18: Zadania: makieta tablicy (trzy kolumny z przeciąganiem, na telefonie jedna kolumna naraz, „Tylko moje zadania”, wyszukiwarka, chowanie zrealizowanych po 30 dniach), formularz w szufladzie z prawej (dodaj i edytuj, ostrzeżenie o urlopie osoby przed terminem), usunięcie do archiwum; 9 pytań.
- 2026-11-18: Aktualizacja stepkit do 0.1.40: wspólny typ `Db` w `backend/src/db/pool.ts` zamiast kopii w modułach, nowy plik `docs/FIXES.md` na odłożone poprawki (na razie pusty: w `IDEAS.md` nie było otwartych poprawek), aktualne zasady w `docs/CONVENTIONS.md` i `docs/conventions/`.
- 2026-11-17: Moduł Wnioski urlopowe zrobiony (potwierdzony przez użytkownika: „działa”): lista z zakładkami i filtrami, szczegóły pod `/admin/leave-requests/:id` (link z e-maila i dzwonka) z paskiem „Kto jeszcze ma wtedy wolne”, zatwierdzenie w oknie potwierdzenia, odrzucenie i anulowanie z obowiązkowym powodem, PDF, powiadomienia dla pracownika.
- 2026-11-17: Wnioski urlopowe: 14 prób nadużyć (trasy i prawdziwa baza), jedna naprawiona (numer z adresu tylko z cyfr, `addressNumber` w `fields.ts`); sprawdzenie w przeglądarce (lista, szczegóły, zatwierdzenie, odrzucenie, telefon), tytuł szczegółów szeryfowy jak w makiecie; `npm run check` i 32 testy e2e zielone (pełny przebieg).
- 2026-11-17: Wnioski urlopowe: zbudowane (kroki 0–16: lista z zakładkami i filtrami, szczegóły pod `/admin/leave-requests/:id` z paskiem „Kto jeszcze ma wtedy wolne”, zatwierdzenie w oknie, odrzucenie i anulowanie z powodem, PDF, powiadomienia), przegląd kodu z poprawkami, `npm run check` i 31 testów e2e zielone. Wspólne: `LeaveRequestParts`, `SearchField`, `sendInlinePdf`, `leaveRequestPdfData`, `likePattern`, adresy podstron (`detailPath`).
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
