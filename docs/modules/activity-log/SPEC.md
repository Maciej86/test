# Spec: Historia zmian

**Data:** 2026-11-20 · **Status:** zaakceptowany 2026-11-20, moduł gotowy 2026-11-20
**Podstawa:** `QUESTIONS.md` (odpowiedzi 1a–9a z 2026-11-20), `SPEC-GENERAL.md` („Historia zmian”, Mapa dostępu)

## Cel

Administrator widzi w jednym miejscu, kto, kiedy i co zmienił we wnioskach urlopowych, pulach dni, zadaniach,
projektach, kontach pracowników oraz typach urlopów i umów. Historii nikt nie może zmienić ani usunąć.

## Ekrany

### Historia zmian (`/admin/activity-log`, tylko administrator)

- **Nagłówek:** tytuł, podtytuł, liczba wpisów pasujących do filtrów.
- **Filtry** (w adresie strony, jak na innych listach): wyszukiwarka (nazwa tego, czego dotyczy wpis, opis i osoba,
  która zmieniła), obszar (Wnioski urlopowe, Pule dni, Zadania, Projekty, Pracownicy, Typy urlopów, Typy umów), kto
  zmienił (osoby z historii, także archiwalne i usunięte), daty od–do (włącznie). „Wyczyść filtry”, gdy któryś jest
  użyty. Data „do” wcześniejsza niż „od” = błąd pola.
- **Dziennik:** najnowsze na górze, 50 wpisów na stronę, stronicowanie pod spodem. Wpisy pogrupowane po dniach
  („Dzisiaj”, „Wczoraj”, potem data). Wiersz: ikona obszaru w kolorze rodzaju zmiany (zielony: zatwierdzenie,
  dodanie, zakończenie; czerwony: odrzucenie, anulowanie, usunięcie, archiwizacja; szary: wycofanie, ukrycie;
  granatowy: reszta), opis bezosobowy („Zatwierdzenie wniosku”), czego dotyczy (+ krótki opis, np. „wypoczynkowy,
  22.12–31.12.2026, 6 dni”, „projekt Marketing”), godzina, kto zmienił.
- **Kliknięcie wpisu** rozwija go (drugie kliknięcie zwija, otwarty jest jeden): tabelka „Co się zmieniło” (pole,
  przed → po; puste „przed” = „brak”), albo „Bez szczegółów do pokazania.”; przycisk „Otwórz …”:
  - wniosek → `/admin/leave-requests/<id>`,
  - zadanie → tablica projektu z otwartym zadaniem (`taskBoardPath(projectId, taskId)`),
  - projekt → tablica projektu,
  - pracownik i pula dni → lista pracowników z wyszukaniem po loginie (`/admin/employees?search=<login>`),
  - typ urlopu / typ umowy → ich lista w Ustawieniach.
  - Rekord w archiwum (zadanie, konto): plakietka „w archiwum” i przycisk „Otwórz w archiwum” (moduł Archiwum,
    2026-11-20): zadanie → podgląd w Archiwum (`archiveTaskPath`), konto i pula → zakładka Pracownicy z wyszukaniem
    po loginie (`archiveEmployeesPath`).
  - Rekord usunięty na stałe: plakietka „usunięty na stałe”, podpowiedź „Nazwa zapamiętana w chwili zmiany, rekordu
    już nie ma.”, bez przycisku.
- **Pusta historia:** „Historia jest pusta” + opis. **Brak wyników filtrów:** „Żaden wpis nie pasuje do filtrów…”.
- **Telefon:** filtry jedna pod drugą, wpis w dwóch liniach (jak w makiecie).
- **Błąd pobrania:** `DataState` (jak na innych ekranach).

### Pola formularzy

Ekran nie ma formularza, tylko filtry listy:

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Filtry | Szukaj | nie | 0–100 znaków | — | z `listQuerySchema` |
| Filtry | Obszar | nie | jeden z 7 obszarów | — | `z.enum(ACTIVITY_AREAS)` |
| Filtry | Kto zmienił | nie | id osoby > 0 | — | liczba całkowita |
| Filtry | Od dnia / Do dnia | nie | „do” ≥ „od” | RRRR-MM-DD (2026-11-20) | pole daty z `fields.ts` |

Zła wartość w adresie (np. nieznany obszar) jest pomijana, jak na innych listach.

## Dane

- `activity_log` już jest (migracja 002). Nowe migracje:
  - `025_activity_log_entity_name.sql`: kolumna `entity_name VARCHAR(255) NOT NULL DEFAULT ''`: czego dotyczy wpis,
    zapamiętane w chwili zmiany (osoba „Nazwisko Imię”, tytuł zadania, nazwa projektu lub typu).
  - `026_activity_log_entity_context.sql`: kolumna `entity_context VARCHAR(255) NULL`: krótki opis (typ urlopu
    i termin wniosku, projekt zadania, rok puli, rola nowego konta).
  - `027_activity_log_names_fill.sql`: uzupełnienie obu kolumn dla wpisów zapisanych wcześniej, z obecnych tabel
    (usunięte projekty: nazwa z `changes.name`).
- `logActivity` dostaje obowiązkowe `entityName` i opcjonalne `entityContext`; wszystkie obecne wywołania (Pracownicy,
  Moje urlopy, Wnioski, Zadania, Projekty) je podają.
- Nowe wpisy (odpowiedź 7a): Typy urlopów i Typy umów zapisują dodanie, zmianę, ukrycie i przywrócenie (w tej samej
  transakcji co zmiana; usługi dostają osobę z `req.user`). Zmiana kolejności typów się nie zapisuje.
- Bez zmian: zmiana kolejności karty w tej samej kolumnie się nie zapisuje (6a, tak już działa); komentarze do zadań
  i logowania się nie zapisują (logowania: wiersz w `IDEAS.md`); hasła nigdy, tylko „ustawiono hasło tymczasowe”.
- Wpisy trzymane zawsze (5a). Brak tras zmiany i usuwania wpisów. Usunięcie osoby: `user_id` → NULL, `user_name`
  zostaje (już tak jest). Usunięcie rekordu: wpisy zostają (4a), `entity_id` bez klucza obcego.
- „W archiwum” i „usunięty na stałe” serwer ustala przy odczycie, sprawdzając, czy rekord istnieje i czy ma
  `archived_at`.
- Osoby w zmianach (`assignee_ids`, `member_ids`, `added_member_id`) serwer zamienia na imiona i nazwiska przy
  odczycie; nieistniejące konto = „usunięte konto”.
- **Zmiana w implementacji (2026-11-20):** `entity_context` to dane bez słów, zapisane jako JSON (np.
  `{"project":"Marketing"}`, `{"leaveType":"Wypoczynkowy","from":"2026-12-22","to":"2026-12-31","days":6}`,
  `{"year":2026}`, `{"role":"employee"}`), bo tekst dla człowieka nie może powstawać w kodzie serwera; zdanie
  układa ekran z kluczy `activity-log.json` → `context`. Za długi JSON (> 255 znaków) nie jest zapisywany.
  Doszła migracja `028_activity_log_names_fill_deleted.sql`: nazwy rekordów usuniętych przed zmianą (konta i wnioski
  z testów) z danych w samych wpisach. Wpis bez żadnej zapamiętanej nazwy (stare wpisy usuniętych projektów
  z testów) pokazuje numer rekordu.

## API

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/activity-log` | admin | `activityLogQuerySchema` (`page`, `search`, `area`, `userId`, `from`, `to`; kolejność stała: najnowsze) | `{ items, total, page, pageSize }`; wpis: `id`, `createdAt`, `userName`, `area`, `action`, `entityId`, `entityName`, `entityContext`, `changes`, `state` (`exists` / `archived` / `deleted`), `link` (adres „Otwórz” albo `null`) | 401, 403 |
| `GET /api/activity-log/people` | admin | — | osoby, które coś zmieniły (`userId`, `userName`), alfabetycznie | 401, 403 |

Wartości liczone przez serwer (nie brane z żądania): `state`, `link`, imiona osób w zmianach, kto zmienił
(`req.user` przy zapisie). Opis i kolor wpisu liczy funkcja `describeActivity(area, action, changes)` w `shared/`
(z testem), używana na ekranie.

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| employees, my-leave, leave-requests, tasks | zapisują wpisy (z nazwą i opisem) | `logActivity` | tylko admin widzi historię |
| leave-types, contract-types | nowe wpisy: dodanie, zmiana, ukrycie, przywrócenie | `logActivity` | tylko admin |
| archive (później) | przycisk „Otwórz w archiwum”; wpisy usunięcia na stałe pracownika i zadania | `logActivity`, `link` | tylko admin |

## Teksty

`shared/locales/pl/activity-log.json` (już z makiety): `title`, `subtitle`, filtry, `area.*`, `actions.*`, `fields.*`,
`open.*`, `deleted`, `archived`, `empty*`, `no_results`; wartości pól (statusy, kolumny, role) z plików modułów,
z których pochodzą.

## Poza zakresem

- Logowania i nieudane próby (pomysł w `IDEAS.md`).
- Komentarze do zadań, zmiana kolejności kart i typów.
- Historia w szczegółach wniosku i w oknie pracownika (9a).
- Usuwanie starych wpisów (5a: trzymane zawsze), eksport historii.
