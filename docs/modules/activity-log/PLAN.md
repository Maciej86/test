# Plan: Historia zmian

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** ekran „Historia zmian” dla administratora (dziennik po dniach, filtry, rozwijany wpis z „przed → po”
i „Otwórz”), nazwa i opis rekordu zapamiętane w każdym wpisie, nowe wpisy dla typów urlopów i umów.

**Architektura:** backend `modules/activity-log/`: `activity-log.routes.ts` (`validateQuery`), `activity-log.queries.ts`
(lista z filtrami, osoby, stan rekordu, imiona osób ze zmian), `activity-log.service.ts` (`state`, `link`, zamiana id
osób na imiona). Podpięcie `mountModule(api, 'activity-log', activityLogRoutes)`. `shared/`: `schemas/activityLog.ts`
(`activityLogQuerySchema`, typy odpowiedzi), `constants/activityLog.ts` (`ACTIVITY_AREAS`), `activityLog.ts`
(`describeActivity`: opis i kolor wpisu). Front `modules/activity-log/`: `ActivityLogPage.tsx`, `components/`
(filtry, wiersz wpisu, tabelka zmian), `activity-log.api.ts`.

**Spec:** `docs/modules/activity-log/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/activity-log/`

**Używam ponownie:** `listQuerySchema` (shared), `validateQuery`, `mountModule`, `routeHelpers` (`reply`, `fail`),
`withTransaction`, `diffChanges`/`logActivity` (db), `useListParams` (core), `PageHeader`, `SearchField`,
`DateField`, `ListPagination`, `EmptyState`, `DataState`, `ButtonIcon`, `DateText` (common), `formatRelativeDay`,
`formatDate`, `taskBoardPath` (shared)
**Wydzielam:** `groupByDay` z `NotificationsPage.tsx` → `shared/src/date.ts` (parametr: pole z datą, etykieta dnia),
z testem; podmiana w Powiadomieniach i w makiecie Historii zmian (makiety Powiadomień, modułu zrobionego, nie ruszam)

- [x] 0. Szkielet testów `it.todo`: `shared` (`activityLogQuerySchema`, `describeActivity`, `groupByDay`), backend
  (`activityLog.test.ts` z `entityName`, trasy, zapytania/usługa, wpisy w Typach urlopów i umów), front (strona),
  `e2e/activity-log.spec.ts` ze scenariuszy `TESTS.md` → `npm run check`
- [x] 1. Wydzielenie `groupByDay` do `shared/src/date.ts` + test, podmiana w `NotificationsPage.tsx` i w makiecie
  Historii zmian → `npm run check`
- [x] 2. Migracje `025_activity_log_entity_name.sql`, `026_activity_log_entity_context.sql` → `npm run migrate`
- [x] 3. `logActivity` z obowiązkowym `entityName` i opcjonalnym `entityContext` + test zapisu; wszystkie wywołania
  podają nazwę i opis: Pracownicy (osoba, pula: „rok 2026”, nowe konto: rola), Moje urlopy i Wnioski (osoba; typ,
  termin, dni), Zadania (tytuł; projekt), Projekty (nazwa); testy usług sprawdzają nazwę → `npm run check`
- [x] 4. Migracja `027_activity_log_names_fill.sql` (uzupełnienie starych wpisów z obecnych tabel, usunięty projekt
  z `changes.name`) → `npm run migrate`, sprawdzenie w bazie, że nie został wpis z pustą nazwą
- [x] 5. Typy urlopów: dodanie, zmiana, ukrycie, przywrócenie zapisują wpis (osoba z `req.user` przez trasę do
  usługi, w tej samej transakcji); zmiana kolejności nie; testy → `npm run check`
- [x] 6. Typy umów: to samo co w kroku 5 → `npm run check`
- [x] 7. `shared`: `ACTIVITY_AREAS`, `activityLogQuerySchema` (strona, szukanie ≤ 100, obszar, osoba, od/do, „do” ≥
  „od”, złe wartości pomijane), typy odpowiedzi, `describeActivity` (opis i kolor dla każdego obszaru i akcji,
  w tym statusy wniosków, zamknięcie roku, hasło, zakończenie zadania) + testy → `npm run check`
- [x] 8. Backend: zapytania listy (filtry, `LIKE ?` po nazwie, opisie i osobie, najnowsze, 50 na stronę), osób,
  stanu rekordów (istnieje / w archiwum / usunięty) i imion osób ze zmian + testy → `npm run check`
- [x] 9. Backend: usługa (`state`, `link` dla każdego obszaru, „usunięte konto”) i trasy `GET /api/activity-log`,
  `GET /api/activity-log/people`, `mountModule`, wiersze w Mapie dostępu; testy: dane, filtry, druga strona, zły
  parametr pominięty, 401, 403, brak tras zapisu (POST/PATCH/DELETE → 404) → `npm run check`
- [x] 10. Front: `activity-log.api.ts`, strona z `DataState`, nagłówek z liczbą, filtry w adresie, dziennik po
  dniach, stronicowanie, pusta historia, brak wyników; testy → `npm run check`
- [x] 11. Front: rozwijany wpis (jeden otwarty, tabelka „przed → po”, wartości przetłumaczone: statusy, kolumny,
  role, tak/nie, daty), „Otwórz …” z `link`, plakietki „w archiwum” i „usunięty na stałe”; testy → `npm run check`
- [ ] 12. Strona w `pages.ts`, zgodność z makietą, widok telefonu (390 px) sprawdzony w przeglądarce
- [ ] 13. E2E `e2e/activity-log.spec.ts` ze scenariuszy `TESTS.md` (dane z przedrostkiem `E2E `, sprzątanie
  w `global-teardown.ts`) → `npm run test:e2e`
- [ ] 14. Przegląd kodu całego modułu (lista kontrolna z `docs/CONVENTIONS.md`), poprawki z testem → `npm run check`
