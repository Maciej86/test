# test

Aplikacja www zbudowana ze stepkit dla osoby, która nie programuje. Mów po polsku, prosto, każde pojęcie techniczne
wyjaśniaj jednym zdaniem. Opis aplikacji: `docs/OVERVIEW.md`, ustalenia: `docs/SPEC-GENERAL.md`, stan: `docs/STATUS.md`.

Te zasady obowiązują **zawsze**, także bez pluginu stepkit. Szczegóły i przykłady: `docs/CONVENTIONS.md`, a dla modułu
z kolumną „Wzorce” w `SPEC-GENERAL.md` także `docs/conventions/<plik>.md`; przeczytaj odpowiednią sekcję, zanim
zmienisz kod.

## Jak pracować

- Nowa funkcja albo moduł: gdy jest plugin stepkit, `/stepkit:dalej` (makieta, pytania, spec, plan). Bez niego: ten sam
  porządek w skrócie: opisz zmianę i zapytaj o zgodę, zanim napiszesz kod.
- Drobna zmiana lub błąd: najpierw test, który nie przechodzi, potem kod, potem `npm run check` (musi być zielony),
  potem użytkownik sprawdza w przeglądarce, potem zapis w git z opisem po polsku.
- Ustalenia, które się zmieniły, dopisz do `SPEC.md` modułu (`docs/modules/<moduł>/`) albo `SPEC-GENERAL.md`.
- Pomysł spoza bieżącej pracy: wiersz w `docs/IDEAS.md`, nie budujesz go od razu.
- Testów zasad (`conventions.test.ts`, `routeProtection.test.ts`, `colors.test.ts`, `formatting.test.ts`,
  `tables.test.ts`) nie zmieniasz: czerwony = popraw kod. Wyjątek tylko komentarzem `// rule-ok: <powód>` na końcu
  linii. Plan modułu zaczyna się od szkieletu testów `it.todo` z wymagań; w gotowym module nie zostaje żadne.

## Stos (stały)

React + Vite + TypeScript + Mantine, TanStack Query + axios, Express + mysql2 + TypeScript, zod, i18next, dayjs,
MySQL w Dockerze. Workspace'y:
`shared/` (schematy, stałe, teksty, daty), `backend/`, `frontend/`, `mockups/` (makiety, port 5174), `e2e/`.
**Biblioteki:** tylko z listy w `docs/CONVENTIONS.md` („Biblioteki”); każda inna dopiero po zgodzie użytkownika
i z wpisem w „Bibliotekach” w `SPEC-GENERAL.md`. Wersje bibliotek podnosisz tylko świadomie, z `npm run check`.

## Bezpieczeństwo

- API jest domyślnie zamknięte: moduł podpinasz przez `mountModule` w `backend/src/app.ts`; publiczne są tylko adresy
  z „Mapy dostępu” w `SPEC-GENERAL.md`. Każda nowa trasa: wiersz w Mapie dostępu i testy 401 (bez logowania)
  i 403 (zła rola).
- Serwer jest jedynym źródłem prawdy: kto = `req.user`, nigdy dane z żądania; wartości wyliczane liczy serwer;
  dane wejściowe przez `validateBody(schemat zod)`, parametry list przez `validateQuery(listQuerySchema(...))`
  (sortowanie tylko po kolumnach z listy); w koncie użytkownika filtr po `req.user.id`.
- Pliki od użytkowników tylko przez `saveUpload` / `sendUpload` (`backend/src/files/storage.ts`), pobieranie trasą API
  z tymi samymi uprawnieniami co rekord.
- SQL tylko z parametrami `?`. Hasła i klucze nigdy w kodzie, w rozmowie ani w repo (`.env` jest poza git).

## Baza

Każda zmiana = nowy plik `backend/migrations/NNN_opis.sql` (jedna zmiana struktury na plik), potem `npm run migrate`.
Nigdy nie edytuj zastosowanej migracji i nie zmieniaj bazy ręcznie. Każda relacja ma klucz obcy z regułą przy usunięciu.
Kilka zapisów naraz (także z historią zmian) tylko przez `withTransaction` (`backend/src/db/transaction.ts`).

## Kod wspólny

- Formularze: schemat zod modułu złożony z gotowych pól `shared/src/schemas/fields.ts` (`text`, `postalCode`, `nip`,
  `email`, `money`…); ten sam schemat na froncie i w backendzie.
- Dane na froncie: hooki modułu w `<module>.api.ts` (TanStack Query, zapytania przez `api` z `core/api/client.ts`),
  ekran z `DataState`; nigdy `useEffect` z pobieraniem ani `fetch`.
- Wspólne zamiast kopii: to, czego potrzebuje drugi moduł, przenosisz do `common/` (komponent) albo `core/` (hook),
  z testem. Nie importujesz z folderu innego modułu.

## Wygląd i teksty

- Wzorce z `docs/DESIGN.md`; gotowe klocki w `common/`: `InfoCard`, `PageSection`, `ButtonIcon` (przycisk akcji
  zawsze z ikoną), `DateText`, `DataState`; dymki przez `notify`; tabela zawsze w `Table.ScrollContainer`.
- Kolory tylko z motywu (`shared/src/theme.ts`), nigdy `#fff` czy `rgb()`. Ikony tylko Lucide.
- Daty tylko przez `formatDate` / `DateText` z `@app/shared`; dni robocze i święta: `countWorkingDays`,
  `getPolishHolidays`.
- Żaden tekst dla człowieka w kodzie: klucze i18n w `shared/locales/pl/<moduł>.json`. Nazwy w kodzie po angielsku.
- Zmiana ekranu: najpierw w makiecie (`mockups/`), potem w aplikacji (`frontend/`), żeby obie zostały zgodne.

## Polecenia

`npm run dev` (domyślnie: aplikacja 5173, makiety 5174, API 3001), `npm run db` (baza w Dockerze), `npm run migrate`,
`npm run check` (typy i testy), `npm run test:e2e`. Adresy i logowanie do bazy: `README.md`.
Publikacja nowej wersji: sekcja „Wgraj nową wersję” w `docs/STATUS.md` (przed nią `npm run check` i `npm audit`).
