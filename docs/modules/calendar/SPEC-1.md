# Spec: Kalendarz, część 1: Kalendarz

**Data:** 2026-11-21 · **Status:** zaakceptowany przez użytkownika 2026-11-21
**Podstawa:** `SPEC.md` (ogólny), `QUESTIONS.md`, makieta `mockups/src/modules/calendar/` (siatka `CalendarGrid.tsx`),
makieta Typów urlopów (tylko kolor)

## Cel

Ekran „Kalendarz” dla administratora: kto jest nieobecny od dziś przez 60 dni, z decyzją o czekających wnioskach bez
wychodzenia z kalendarza. Typ urlopu dostaje kolor, którym kalendarz go rysuje.

## Ekrany

### Kalendarz (`/admin/calendar`, administrator)

- Nagłówek „Kalendarz”, pod nim „Widoczne dni: <N> nieobecności, <M> czeka na decyzję”.
- Zdanie „Dziś nie ma: Jan Kowalski (wypoczynkowy), Ewa Mazur (na żądanie, czeka)” albo „Dziś wszyscy są w pracy”.
- Wyszukiwarka „Szukaj osoby” (filtruje wiersze po imieniu i nazwisku, bez wielkości liter i bez wysyłania do
  serwera **[decyzja AI]**: kilkanaście osób). Przyciski-filtry po jednym na kolor typów widocznych w zakresie (podpis: nazwy typów w tym kolorze,
  np. „Wypoczynkowy, Na żądanie”); wyłączony chowa paski tych typów. Przyciski są zarazem legendą.
- Pasek nad siatką: strzałka „30 dni wcześniej”, zakres „17.11.2026 – 16.01.2027”, strzałka „30 dni później”,
  po prawej „Dziś” (wyszarzony, gdy zakres zaczyna się dziś). Początek zakresu jest w adresie (`?from=`); brak albo
  zła data = dziś.
- Siatka i paski jak w `SPEC.md` („Pasek”, „Siatka”). Kolumna osób: kółko z inicjałami i imię z nazwiskiem (na
  telefonie bez kółka, węższa).
- Pod siatką legenda: „Jasny pasek z przerywaną ramką: czeka na decyzję”, „Weekend albo święto”, „Cienka linia:
  przerwa w urlopie liczonym w dniach roboczych”.
- Klik w pasek (także Enter na pasku): z prawej te same szczegóły wniosku co we Wnioskach urlopowych (wspólny klocek,
  zmiana zaakceptowana przy planie 2026-11-21: pula, „Kto jeszcze ma wtedy wolne”, przy czekającym „Odrzuć”
  i „Zatwierdź”, przy zatwierdzonym „Anuluj urlop” i „PDF”; bez „Otwórz wniosek”). Po decyzji: dymek, panel się zamyka, kalendarz i listy wniosków się odświeżają.
  Wniosek rozpatrzony w międzyczasie: ten sam komunikat 409 co we Wnioskach (`already_decided`).
- Stany: ładowanie i błąd przez `DataState`; brak aktywnych pracowników → „Nie ma jeszcze pracowników” z przyciskiem
  „Przejdź do Pracowników”; wyszukiwanie bez wyników → „Nikt o takim imieniu lub nazwisku nie pracuje w firmie.”
- Telefon: jedna kolumna, filtry zawijają się, siatka przewija się w bok, kolumna osób zostaje.

### Typy urlopów (zmiana, administrator)

- Przy nazwie typu kwadracik w jego kolorze (tabela i karty na telefonie).
- W oknie „Dodaj” / „Edytuj”: „Kolor w kalendarzu”, 6 kwadratów do kliknięcia (zielony, morski, turkusowy,
  granatowy, fioletowy, pomarańczowy), wybrany z ptaszkiem; podpis „Takim kolorem kalendarz pokaże nieobecności tego
  typu.” Nowy typ: zielony. Zmiana koloru działa od razu także dla starych wniosków (kolor nie jest częścią wniosku).
- Kolumny „Liczenie dni” i „Zatwierdzanie” z makiety dochodzą w części 2.

### Pulpit i Wnioski urlopowe (zmiana, administrator)

- Pulpit: w boksie „Nieobecności na 2 tygodnie” przycisk „Otwórz kalendarz” (na dole po prawej, jak akcje `InfoCard`).
- Szczegóły wniosku (czekający i zatwierdzony): przycisk „Pokaż w kalendarzu” → `/admin/calendar?from=<data od>`.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Typ urlopu | Kolor w kalendarzu | tak | jeden z 6 | `green`, `teal`, `cyan`, `navy`, `grape`, `orange` | `z.enum(LEAVE_TYPE_COLORS)` w schemacie typu |
| Kalendarz (adres) | `from` | nie | 2000-01-01 – 2099-12-31 | RRRR-MM-DD (`2026-11-17`) | pole daty z `fields.ts` w `calendarQuerySchema` |

## Dane

Migracja `029_leave_types_color.sql`: `ALTER TABLE leave_types ADD COLUMN color VARCHAR(10) NOT NULL DEFAULT 'green'
AFTER yearly_limit`. Druga migracja `030_leave_types_color_seed.sql` (zmiana danych osobno) ustawia kolory typów
startowych po nazwie: Okolicznościowy → `teal`, Bezpłatny → `orange`, Opieka nad dzieckiem → `navy`, reszta zostaje
zielona **[decyzja AI]**. Lista kolorów: `LEAVE_TYPE_COLORS` w `shared/src/constants/leaveTypes.ts` (bez żółtego
i czerwonego: to kolory statusów). Serwer przyjmuje tylko kolor z listy.

Historia zmian: zmiana koloru jest zwykłą zmianą typu urlopu (wpis z polem `color` przed → po).

## API

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/calendar?from=RRRR-MM-DD` | admin | `calendarQuerySchema` (`from` nieobowiązkowe) | `{ from, to, today, people: [{ id, name }], absences: [{ id, userId, leaveTypeName, color, status, dateFrom, dateTo, days }] }` (komentarz i daty decyzji pokazują szczegóły wniosku z `GET /api/leave-requests/:id`) | 400 zła data, 401, 403 |
| `POST /api/leave-types`, `PUT /api/leave-types/:id` (zmiana) | admin | schemat typu z polem `color` | jak dziś | 400 kolor spoza listy |

Wartości liczone przez serwer: `to = from + 60 dni`, `today` (strefa aplikacji), lista osób (rola `employee`, bez
archiwum, po nazwisku i imieniu), wnioski `pending` i `approved` nachodzące na zakres (`date_from ≤ to AND
date_to ≥ from`), wiersze tylko osób z listy. Weekendy i święta liczy klient z `@app/shared` (te same funkcje co serwer).

Mapa dostępu w `SPEC-GENERAL.md`: `/admin/calendar`, `GET /api/calendar` — admin, `mountModule(api, 'calendar', …)`.

## Powiązania

Jak w `SPEC.md`. Decyzje w panelu używają tras Wniosków urlopowych bez zmian; okna „Zatwierdź” i „Odrzuć” oraz hooki
decyzji trafiają do miejsc wspólnych (frontend nie importuje z folderu innego modułu), szczegóły w planie.

## Teksty

`shared/locales/pl/calendar.json` (jest z makiety: tytuł, podsumowanie, „Dziś nie ma”, legenda, panel, puste stany,
strzałki), `leave-types.json` (`field_color`, `field_color_hint`, `colors.*`), `dashboard.json` (`open_calendar`),
`leave-requests.json` (`show_in_calendar`).

## Poza zakresem (część 2 albo nigdy)

- Liczenie dni kalendarzowych, typy bez zatwierdzania, typ „Chorobowe”: część 2.
- Dodawanie nieobecności w kalendarzu, kalendarz dla pracowników, eksport.
