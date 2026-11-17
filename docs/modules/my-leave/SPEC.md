# Spec: Moje urlopy (ogólny)

**Data:** 2026-11-17 · **Status:** zaakceptowany przez użytkownika 2026-11-17
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-17: 1a–9a, zasady pól ok), `SPEC-GENERAL.md`,
makieta `mockups/src/modules/my-leave/`, `docs/modules/leave-types/SPEC.md` i `docs/modules/employees/SPEC.md`
(„Powiązania”)

## Cel

Pracownik składa wnioski urlopowe i widzi, ile dni mu zostało. Aplikacja sama liczy dni robocze (bez weekendów i świąt),
bierze je najpierw z zaległego urlopu, potem z puli rocznej, i nie pozwala złożyć wniosku na więcej dni, niż zostało,
ani ponad roczny limit typu. Wniosek czekający na decyzję pracownik może wycofać. Zatwierdzony wniosek pobiera jako PDF
do podpisu. Administrator dostaje powiadomienie (i e-mail przy nowym wniosku).

Moduł działa, gdy: pracownik z pulą 26 dni składa wniosek na 21–31.12.2026, widzi „7 dni roboczych”, wniosek ma status
„Czeka na decyzję”, administrator dostaje powiadomienie i e-mail, a w „Pracownikach” przy tej osobie widać 7 dni
czekających; wniosek ponad pozostałe dni albo ponad limit „Na żądanie” zostaje odrzucony przez serwer z jasnym
komunikatem; wycofanie oddaje dni.

Decyzje administratora (zatwierdź, odrzuć, anuluj) robi moduł 9 „Wnioski urlopowe”. Do tego czasu wnioski czekają.

## Części

Moduł jest duży (ok. 20 kroków planu), a wydruk może dojść później, więc budujemy go w dwóch częściach.

| # | Część | Zakres | Dlaczego osobno |
|---|---|---|---|
| 1 | Wnioski i pula | tabela `leave_requests`, ekran „Moje urlopy” (pula, limity, tabela wniosków z wyborem roku), okno „Złóż wniosek” z liczeniem dni i wszystkimi blokadami, wycofanie, powiadomienia i e-mail, liczby w „Pracownikach” i „Typach urlopów” | bez tego moduł nie działa; sama część 1 jest już używalna |
| 2 | Wydruk PDF | biblioteka `pdfmake` (lista zatwierdzona, wpisana w `SPEC-GENERAL.md`), wspólne `renderPdf`, dokument wniosku, trasa PDF, przycisk „PDF” przy zatwierdzonym wniosku | przycisk przyda się dopiero, gdy moduł „Wnioski urlopowe” zacznie zatwierdzać; ten sam dokument wykorzysta potem administrator |

Każda część ma `SPEC-<n>.md`, `PLAN-<n>.md`, `TESTS-<n>.md` w tym folderze. `SPEC-2.md` powstaje na początku części 2
(zarys niżej, „Część 2 w skrócie”).

## Zasady (obie części)

- **Rok wniosku (1a).** Pracownik ma zawsze jedną pulę otwartą (bez `closed_at`); jej rok to „rok otwarty” tej osoby.
  Obie daty wniosku muszą być w tym roku. Daty z następnego roku: blokada „Pula na <rok> nie jest jeszcze ustalona”
  (do „Zamknij rok”). Daty z roku już zamkniętego: blokada „Rok <rok> jest już zamknięty”. Urlop na przełomie lat =
  dwa wnioski. `pool_year` wniosku = rok otwarty. Zasada dotyczy wszystkich typów, także tych, które nie odejmują dni.
  **[decyzja AI]** (jedna zasada zamiast dwóch; każdy pracownik ma pulę).
- **Dni robocze:** `countWorkingDays(od, do)` z `@app/shared` (ta sama funkcja na ekranie i w serwerze; Wigilia od
  2025 jest świętem). Termin bez dnia roboczego: blokada.
- **Pula (2a).** Zostało = pula roczna + zaległe − dni zatwierdzone − dni czekające. Typ, który odejmuje dni: wniosek
  ponad „zostało” jest zablokowany. Podział: najpierw zaległe, które zostały (zaległe − zaległe zajęte przez wnioski
  czekające i zatwierdzone), reszta z puli rocznej. Typ, który nie odejmuje: 0 i 0, pula bez zmian.
- **Limit typu (1a w Typach urlopów).** Osobno dla każdej osoby, w dniach roboczych, w roku wniosku; liczą się wnioski
  czekające i zatwierdzone tego typu. Ponad limit: blokada.
- **Bez nakładania się (4a):** termin nie może mieć wspólnego dnia z innym wnioskiem tej osoby, który czeka albo jest
  zatwierdzony.
- **Od dziś (3a):** data „Od” nie wcześniejsza niż dziś (`todayIsoDate()`, strefa aplikacji).
- **Bez edycji (5a):** wniosku się nie zmienia. Czekający pracownik wycofuje (status `withdrawn`) i składa nowy.
  Wycofanego nie da się przywrócić. Wniosków się nie usuwa (`SPEC-GENERAL.md`).
- **Statusy:** `pending` (czeka), `approved`, `rejected`, `withdrawn`, `cancelled`. Ten moduł ustawia tylko `pending`
  (złożenie) i `withdrawn` (wycofanie z `pending`). Pozostałe ustawia moduł 9.
- **Serwer sprawdza wszystko sam**, w transakcji z blokadą puli tej osoby (`SELECT … FOR UPDATE`), żeby dwa wnioski
  wysłane naraz nie przekroczyły puli ani limitu. Dni robocze, podział i status liczy serwer. Ekran pokazuje te same
  obliczenia wcześniej, tylko jako podpowiedź.
- **Powiadomienia i e-mail (9a):** nowy wniosek → powiadomienie `leave_request_new` dla administratorów (w transakcji)
  i e-mail `emailAdminsAboutNewRequest` (po zapisie, bez czekania). Wycofanie → samo powiadomienie
  `leave_request_withdrawn`.
- **„Zamknij rok” przy czekających wnioskach (odpowiedź a, 2026-11-17, po sprawdzeniu specu):** zablokowany, dopóki
  osoby mają wnioski czekające z zamykanego roku (`pool_year`). Okno „Zamknij rok” pokazuje żółtą ramkę „Najpierw
  rozpatrz <N> wniosków czekających na decyzję.”, przycisk zamknięcia jest wyłączony, a serwer odpowiada 409
  `employees.pending_requests`. Dzięki temu dni z czekających wniosków nie przechodzą na następny rok podwójnie.
- **Dwie liczby „zostało” [decyzja AI]:** w „Moich urlopach” pracownik widzi dni, o które może jeszcze wnioskować
  (czekające odjęte, 2a); w „Pracownikach” administrator widzi pulę pomniejszoną o zatwierdzone, a czekające w dopisku
  (Pracownicy, pytanie 1a). Obie liczby liczą się z tych samych zapisanych kolumn `days_from_carried` /
  `days_from_annual`, więc podział „z zaległego / z puli” jest w obu miejscach ten sam.
- **Historia zmian:** złożenie (`create`) i wycofanie (`status`) z tabelą `leave_requests`, w tej samej transakcji.

## Dane

Migracja `017_leave_requests.sql` (część 1). Kolumny jak w `SPEC-GENERAL.md`, szczegóły w `SPEC-1.md`.

| Rodzic | Dziecko (kolumna) | Przy usunięciu rodzica | Dlaczego |
|---|---|---|---|
| `users` | `leave_requests.user_id` | RESTRICT | historia urlopów nie znika bez ostrzeżenia (`SPEC-GENERAL.md`, do potwierdzenia w Archiwum) |
| `users` | `leave_requests.decided_by` | SET NULL + `decided_by_name` | autorstwo decyzji (kolumny wypełni moduł 9) |
| `leave_types` | `leave_requests.leave_type_id` | RESTRICT | typ użyty we wnioskach można tylko ukryć |

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| leave-types | typy do wyboru i ich zasady | `listSelectableLeaveTypes()`, `findSelectableLeaveType(id)` (są) | `id, name, deductsPool, yearlyLimit` |
| leave-types | kolumna „Wnioski” przy typie i żółta ramka w oknie edycji | `countRequestsByLeaveType()` (nowa, w `my-leave.queries.ts`) | liczby |
| employees | pula otwarta tej osoby (rok, pula roczna, zaległe), przy składaniu z blokadą wiersza | `getOpenPool(db, userId, { lock })` (nowa w `employees.service.ts`, zapytanie w `employees.queries.ts`) | liczby |
| employees | pasek puli: wykorzystane i czekające dni | `getPoolUsage(userIds, year)` w `employees.service.ts` woła nową `sumPoolUsage(userIds, year)` z `my-leave.queries.ts` zamiast zer | liczby |
| employees | blokada i żółta ramka w „Zamknij rok” | `countPendingRequests(year)` (nowa) zamiast `pendingRequests: 0` | liczba |
| notifications | dzwonek administratora | `notifyAdmins(conn, …)` (jest) | typ, imię i nazwisko, typ urlopu, daty, dni |
| email | e-mail o nowym wniosku | `emailAdminsAboutNewRequest(data)` (jest) | jak w `NewLeaveRequestEmailData` |
| leave-requests (moduł 9) | lista i decyzje na tej samej tabeli; ten sam PDF wniosku | funkcje dopisze moduł 9; PDF z części 2 | — |
| dashboard (moduł 14) | boks „Pozostałe dni” | `getMyLeaveOverview(userId)` (część 1) | pula |

## Część 2 w skrócie

`npm install -w @app/backend pdfmake`; `backend/src/pdf/renderPdf.ts` według `docs/CONVENTIONS.md` („PDF i wydruk”);
`my-leave.pdf.ts` buduje dokument jak w makiecie (nazwa aplikacji, data złożenia, „Wniosek o urlop”, numer, pracownik,
typ, termin, dni robocze z podziałem, komentarz, decyzja: kto i kiedy, dwa miejsca na podpis), jasny jak papier.
`GET /api/my-leave/requests/:id/pdf`: tylko własny wniosek (inaczej 404), tylko zatwierdzony (inaczej 409),
`Content-Type: application/pdf`, `Content-Disposition: inline` z nazwą pliku, żeby otworzył się w nowej karcie (6a).
**[decyzja AI]** PDF z serwera (`pdfmake`, jak w `SPEC-GENERAL.md`) zamiast wydruku ekranu: ten sam plik w każdej
przeglądarce i na telefonie, a moduł 9 użyje go dla administratora. Przycisk „PDF” przy wniosku zatwierdzonym otwiera
adres w nowej karcie.

## Poza zakresem

- Zatwierdzanie, odrzucanie, anulowanie i lista wszystkich wniosków: moduł 9 „Wnioski urlopowe”. 
- Pół dnia urlopu, urlop w godzinach, dodatkowe dni wolne firmy, załączniki (pomysł w `IDEAS.md`), kalendarz zespołu.
- Wnioski składane przez administratora albo w imieniu pracownika (`SPEC-GENERAL.md`, decyzja AI z 2026-11-13).
