# Plan: Moje urlopy, część 2 (wydruk PDF)

**Spec:** `SPEC.md` (zasady obu części) i `SPEC-2.md`. **Testy ręczne:** `TESTS-2.md`.
**Jak:** w tej rozmowie, krok po kroku na `main`: test, który nie przechodzi → kod → `npm run check` → `- [x]`
i etap w `STATUS.md` (`implementacja, część 2/2 (krok n/7)`). Kod według `docs/CONVENTIONS.md` („PDF i wydruk”).

**Używam ponownie:** `findOwnRequest` / `REQUEST_COLUMNS` / `RequestRow` (`my-leave.queries.ts`), `idParam`, `reply`,
`fail`, `notFound` (`routeHelpers.ts`), `createI18n` i `formatDate` (`@app/shared`), paleta z `shared/src/theme.ts`,
`ButtonIcon action="print"` (common), wzór skryptu testowego z `sendTestNotifications.ts` (odmowa w produkcji,
`pathToFileURL`), wzór wpisu w `README.md` z `email:test`, `seedE2e.ts`.
**Wydzielam:** brak (nowe wspólne miejsce `backend/src/pdf/` powstaje od razu jako wspólne; `splitText` z ekranu
zostaje we froncie: PDF składa podział z tych samych kluczy i18n po stronie serwera, to kilka linii).

## Uwaga przy przeglądzie (Review Focus)

1. Decyzja zapisana tuż po północy czasu polskiego (`decided_at` 2026-12-01 23:30 UTC) → w PDF 02.12.2026 (`formatDate`
   w strefie `Europe/Warsaw`), test w kroku 2.
2. Osoba, która zatwierdziła, usunięta na stałe (`decided_by` NULL) → PDF dalej pokazuje `decided_by_name`; brak obu
   nie wywraca dokumentu (pusta nazwa), test w kroku 2.
3. Komentarz 500 znaków bez spacji i z polskimi literami nie psuje układu ani znaków (Roboto), test w kroku 2
   (render do `%PDF`) i podgląd w kroku 6.
4. Jednodniowy wniosek (Od = Do) → sama data bez „–”; typ bez odejmowania → bez nawiasu z podziałem (krok 2).
5. Nazwa pliku w `Content-Disposition` tylko ze znaków ASCII (`wniosek-urlopowy-42.pdf`), żeby każda przeglądarka ją
   przyjęła (krok 3).

## Kroki

- [x] 0. **Szkielet testów** (`it.todo`, po jednym na wymaganie ze `SPEC-2.md`, „Testy”):
  `backend/src/pdf/__tests__/renderPdf.test.ts`, `backend/src/pdf/__tests__/leaveRequestPdf.test.ts`, dopiski
  w `backend/src/modules/my-leave/__tests__/my-leave.routes.test.ts` i `my-leave.queries.test.ts`,
  `backend/src/scripts/__tests__/approveTestLeaveRequest.test.ts`, dopiski w
  `frontend/src/modules/my-leave/__tests__/MyLeavePage.test.tsx`, scenariusze `TESTS-2.md` w `e2e/my-leave.spec.ts`
  → `npm run check`.

- [x] 1. **`pdfmake` i `renderPdf`:** `npm install -w @app/backend pdfmake@^0.3.14`; `backend/src/pdf/renderPdf.ts`
  dokładnie jak w `CONVENTIONS.md` (`renderPdf(doc: object): Promise<Buffer>`, Roboto, `setUrlAccessPolicy(() =>
  false)`, `setLocalAccessPolicy` tylko folder czcionek). Testy: bufor zaczyna się od `%PDF`; tekst z „zażółć gęślą
  jaźń” się renderuje; dokument z obrazkiem `https://…` kończy się błędem, a nie pobraniem → `npm run check`.

- [x] 2. **Dokument wniosku** `backend/src/pdf/leaveRequestPdf.ts`:
  `export interface LeaveRequestPdfData { id; createdAt: string (ISO); employeeName; leaveTypeName; deductsPool;
  dateFrom; dateTo; workingDays; daysFromCarried; daysFromAnnual; poolYear; comment: string | null;
  decidedByName: string | null; decidedAt: string | null }` i
  `buildLeaveRequestPdf(data: LeaveRequestPdfData): object` (sama definicja dokumentu, A4, marginesy 56 pt, układ
  i klucze z tabeli „Dokument PDF” w `SPEC-2.md`, teksty z `createI18n().t(…, { ns: 'my-leave' })`, kolory
  z `theme.colors` w `shared/src/theme.ts`, podpisy jako kropkowane linie `canvas`) oraz
  `leaveRequestPdfFileName(id): string` (`print_file_name`). Nowy klucz `print_file_name:
  "wniosek-urlopowy-{{id}}.pdf"` w `my-leave.json`. Testy na definicji (spłaszczony tekst): imię i nazwisko,
  „21.12.2026 – 31.12.2026”, „7 dni roboczych (2 z zaległego i 5 z puli 2026)”, jeden dzień bez „–”, typ bez
  odejmowania bez nawiasu, komentarz tylko gdy jest, „Zatwierdził(a) Anna Nowak, 02.12.2026” z `decidedAt`
  `2026-12-01T23:30:00Z`, brak nazwiska nie rzuca błędem, oba podpisy, nazwa pliku; render pełnego przykładu
  z komentarzem 500 znaków → `%PDF` → `npm run check`.

- [x] 3. **Trasa PDF:** w `my-leave.queries.ts` `findOwnRequestForPdf(db, id, userId): Promise<(RequestRow &
  { employee_name: string }) | null>` (`REQUEST_COLUMNS` + `JOIN users u ON u.id = r.user_id`, `WHERE r.id = ? AND
  r.user_id = ?`); w `my-leave.service.ts` `getRequestPdf(id, userId): Promise<Result<{ fileName: string; pdf:
  Buffer }>>` (brak → `notFound()`, status ≠ `approved` → `fail(409, MY_LEAVE_MESSAGES.notApproved)`); trasa
  `GET /requests/:id/pdf` (`idParam`, nagłówki `Content-Type: application/pdf`, `Content-Disposition: inline;
  filename="…"`, `Cache-Control: no-store`). Stała `MY_LEAVE_MESSAGES.notApproved =
  'my-leave.server.not_approved'` i tekst „Wydrukować można tylko zatwierdzony wniosek.”. Wiersz
  `GET /api/my-leave/requests/:id/pdf` w „Mapie dostępu” `SPEC-GENERAL.md`. Testy: zapytanie z `user_id = ?`; 200
  `%PDF` i trzy nagłówki; 401; 403 administrator; 404 cudzy, brak, `1e3`, `0x10`, `007`; 409 dla `pending`,
  `rejected`, `withdrawn`, `cancelled` → `npm run check`.

- [x] 4. **Przycisk „PDF” na ekranie:** `myLeavePdfUrl(id: number): string` w `my-leave.api.ts`
  (`${api.defaults.baseURL}/my-leave/requests/${id}/pdf`); w `RequestsTable.tsx` (tabela i karty) przy `approved`
  `Button component="a" href target="_blank" rel="noopener" size="xs" variant="subtle"` z `ButtonIcon action="print"`
  i tekstem `print`. Testy: zatwierdzony ma odnośnik z adresem `/api/my-leave/requests/<id>/pdf` i `target="_blank"`;
  czekający ma „Wycofaj” bez „PDF”; odrzucony, wycofany, anulowany bez obu → `npm run check`.

- [x] 5. **Polecenie testowe i dane e2e:** `backend/src/scripts/approveTestLeaveRequest.ts`:
  `approveNewestPending(conn: Db, env): Promise<{ id: number; employee: string } | null>` (produkcja → błąd
  „Polecenie testowe nie działa na serwerze produkcyjnym.”; najnowszy `pending`, `decided_by` = pierwszy aktywny
  administrator, `decided_by_name`, `decided_at = NOW()`, `status = 'approved'`; brak → `null`); skrypty
  `my-leave:approve-test` w `backend/package.json` i głównym `package.json`; wpis w `README.md` pod „E-mail testowy”.
  `seedE2e.ts`: zatwierdzony wniosek konta e2e pracownika (przyszły dzień roboczy roku otwartego, typ bez odejmowania
  dni, żeby nie ruszać puli testów części 1). Testy: zatwierdza najnowszy czekający z nazwiskiem administratora;
  bez czekających `null`; `NODE_ENV=production` → błąd i brak zapytań; seed dodaje wniosek po wyczyszczeniu
  → `npm run check`.
  _Uwaga:_ zamiast wniosku w `seedE2e` polecenie przyjmuje login (`npm run my-leave:approve-test -- <login>`): test e2e zatwierdza wniosek swojej tymczasowej osoby, a użytkownik może wskazać konkretnego pracownika. Seed bez zmian. Wynik zwraca też nazwisko administratora (komunikat w terminalu).

- [x] 6. **Test w przeglądarce i `TESTS-2.md`:** `TESTS-2.md` (pracownik: przycisk tylko przy zatwierdzonym, PDF
  w nowej karcie z polskimi literami, nazwa pliku przy zapisie; cudzy numer w adresie → „nie znaleziono”;
  administrator nie otwiera adresu PDF). `e2e/my-leave.spec.ts`: przycisk przy zatwierdzonym wniosku z seeda, nowa
  karta dostaje `application/pdf`, czekający bez przycisku → `npm run check`, `npm run test:e2e`.

- [x] 7. **Przegląd kodu** części jednym recenzentem (lista kontrolna z `CONVENTIONS.md`), poprawki z testem,
  `npm run check`; potem etap **testy** (`abuse.md`, `browser.md`).
  _Uwaga:_ recenzent: brak krytycznych i ważnych. Poprawione z testem: (1) dostęp do plików tylko wewnątrz folderu czcionek (`isFontPath`: bez folderów o podobnej nazwie i bez „..”); (2) bez nazwiska zatwierdzającego wiersz decyzji „Zatwierdzony <data>” zamiast „Zatwierdził(a) ,”; (3) poprawione przykłady w `SPEC-2.md` (podział dni z przecinkiem, polecenie z loginem zamiast `seedE2e`). Odłożone: cudzy wniosek w e2e sprawdzany nieistniejącym numerem (prawdziwy cudzy wniosek dojdzie w próbach nadużyć).
