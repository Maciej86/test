# Zasady kodu aplikacji

> Kopia tego pliku jest w projekcie jako `docs/CONVENTIONS.md` (czyta ją `CLAUDE.md`, także bez pluginu stepkit).
> Aktualizacja stepkit podmienia ją w całości: wyjątki tego projektu zapisuj w „Zasadach wspólnych” w
> `SPEC-GENERAL.md`, nie tutaj.

Czytasz ten plik na etapach **spec**, **plan** i **implementacja** (oraz w kroku 7 `/stepkit:start` przy projekcie
bazy). To są reguły, nie propozycje. Stos jest stały: React + Vite + TypeScript + Mantine, TanStack Query + axios,
Express + mysql2 + TypeScript, zod, i18next, dayjs, MySQL w Dockerze.

## Biblioteki

Użytkownik nie oceni, czy paczka jest dobra, więc to Ty pilnujesz, żeby nie przybywało ich bez potrzeby. Każda
biblioteka to cudzy kod z dostępem do danych aplikacji, coś do aktualizowania i ryzyko, że moduły zaczną robić to
samo na dwa sposoby.

**Lista zatwierdzona** (instalujesz, gdy moduł ich potrzebuje, bez pytania; zapisz w „Bibliotekach” w
`SPEC-GENERAL.md`):

| Potrzeba | Biblioteka |
|---|---|
| e-mail | `nodemailer` |
| przesyłanie plików | `multer` |
| zadania o stałej porze | `cron` |
| Excel (eksport, import) | `exceljs` |
| PDF tworzony na serwerze (załącznik e-maila, zestawienie, dokument do archiwum) | `pdfmake` |
| dziennik serwera | `winston` |
| HTML od użytkownika (np. edytor treści) | `sanitize-html` |
| wykresy | `@mantine/charts` z `recharts` |
| kalendarz, grafik, kalendarz zespołu | `@mantine/schedule` |
| czat i powiadomienia na żywo | `socket.io` (backend) i `socket.io-client` (front) |
| edycja grafiki w przeglądarce (jeden moduł, nie cała aplikacja) | `fabric` |

**Spoza listy** (np. paczka do PDF, mapy, płatności):
1. Sprawdź, czy nie wystarczy to, co już jest: Mantine (`@mantine/*`), dayjs, przeglądarka, Node.
2. Jeśli nie: w `SPEC.md` modułu punkt „Nowa biblioteka”: nazwa, do czego, jakie alternatywy, czy jest utrzymywana
   (ostatnie wydanie w ostatnim roku, licencja MIT, Apache albo BSD).
3. Zapytaj użytkownika prostym językiem: „Do <czego> potrzebna jest dodatkowa biblioteka <nazwa>. To popularne,
   sprawdzone narzędzie, używa jej wiele firm. Zgadzasz się?” Bez zgody szukasz innej drogi.
4. Dopisz ją do „Bibliotek” w `SPEC-GENERAL.md`. Kolejne moduły używają tej samej paczki, nie drugiej do tego samego.

Nigdy: przeglądarki uruchamianej na serwerze do PDF (puppeteer, playwright), drugiej biblioteki komponentów, drugiej paczki ikon, `fetch` w modułach ani drugiego klienta HTTP (wszystkie zapytania przez `api`
z `frontend/src/core/api/client.ts`), moment,
date-fns, lodash.

**Kalendarze:** `@mantine/schedule` w tej samej wersji co `@mantine/core`, w obu miejscach naraz
(`npm install -w @app/frontend -w @app/mockups @mantine/schedule@<wersja>`, `import '@mantine/schedule/styles.css';`
w obu `main.tsx`). Kalendarz zespołu (osoby w wierszach, dni w kolumnach): `ResourcesMonthView` albo
`ResourcesWeekView`; osoby to `resources`, urlopy, wydarzenia i zadania to `events`. Daty zawsze jako `RRRR-MM-DD`
i `locale="pl"` (z `import 'dayjs/locale/pl'`); święta z `getPolishHolidays` jako wyszarzone dni.

**Wykresy:** tylko `@mantine/charts` (`BarChart`, `LineChart`, `AreaChart`, `PieChart`, `DonutChart` …). Instalujesz go
w module, który pierwszy potrzebuje wykresu, w obu miejscach naraz:
`npm install -w @app/frontend -w @app/mockups @mantine/charts@<wersja @mantine/core z szablonu> recharts`, a w
`frontend/src/main.tsx` i `mockups/src/main.tsx` dopisz `import '@mantine/charts/styles.css';`. Kolory serii tylko
z motywu (`color: 'violet.6'`, `'teal.5'` …), żeby wykresy pasowały do aplikacji i były czytelne w ciemnym motywie.

## Struktura modułu

Jedna pozycja nawigacji = jeden moduł = jedna nazwa folderu (po angielsku, małe litery, myślniki):

| Gdzie | Co |
|---|---|
| `shared/src/schemas/<module>.ts` | schematy zod (formularze i API) |
| `shared/src/constants/<module>.ts` | statusy, limity, długości pól modułu |
| `shared/locales/pl/<module>.json` | wszystkie teksty modułu (dopisany w `shared/src/i18n.ts`) |
| `backend/migrations/NNN_<opis>.sql` | zmiany bazy |
| `backend/src/modules/<module>/<module>.routes.ts` | adresy API, `requireRole`, `validateBody` |
| `backend/src/modules/<module>/<module>.queries.ts` | zapytania SQL |
| `backend/src/modules/<module>/<module>.service.ts` | logika (gdy jest więcej niż samo zapytanie) |
| `frontend/src/modules/<module>/` | ekrany prawdziwej aplikacji (wnętrze niżej) |
| `mockups/src/modules/<module>/` | ekrany makiety |
| `e2e/<module>.spec.ts` | testy przeglądarkowe |
| `docs/modules/<module>/` | `QUESTIONS.md`, `SPEC.md`, `PLAN.md`, `TESTS.md` |

Nowa pozycja nawigacji: wpis w `NAVIGATION` (panel, ścieżka od `/admin`), `ACCOUNT_NAVIGATION` (konto, ścieżka od
`/account`) albo `PUBLIC_NAVIGATION` (strona); wpis w `frontend/src/core/routes/pages.ts` i
`mockups/src/screens.tsx`; trasy API dopisane w `backend/src/app.ts` (`api.use('/<module>', <module>Routes)`).

**Wnętrze `frontend/src/modules/<module>/`:**
- `<Module>ListPage.tsx`, `<Module>FormPage.tsx` (albo `<Module>FormModal.tsx`): ekrany;
- `components/`: części ekranów używane tylko w tym module;
- `<module>.api.ts`: hooki zapytań modułu („Pobieranie danych na froncie”);
- `<Ekran>.module.css` i testy `*.test.tsx` obok pliku, którego dotyczą.

**Wspólne zamiast kopii.** Gdy komponent albo hook jest potrzebny w drugim module, przenosisz go do
`frontend/src/common/` (komponent) albo `frontend/src/core/` (hook bez wyglądu), z testem, i podmieniasz w pierwszym
module. Nie kopiujesz go i nie importujesz z folderu innego modułu. Gdy makieta używa tego samego klocka, kopia jest
w `mockups/src/common/`. Plik ekranu dłuższy niż ok. 250 linii rozbijasz na komponenty w `components/`.

**Wygląd:** prawdziwy ekran we `frontend/` odtwarza układ zaakceptowanej makiety modułu (bez panelu pytań) i trzyma się
wzorców z `docs/DESIGN.md`. Gotowe klocki są w `common/` (we froncie i w makietach te same): `InfoCard` (boks z
nagłówkiem, treścią i akcjami na dole, np. na pulpicie), `PageSection` (sekcja strony dla odwiedzających z tłem na całą
szerokość), `ButtonIcon` (ikona akcji przycisku), `DateText` (data), `DataState` (ładowanie, błąd, pusta lista). Każda tabela jest w
`<Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>` (test `tables.test.ts`). Kolory,
czcionki i wygląd komponentów biorą się z `shared/src/theme.ts` i `shared/src/theme.css`; nie ustawiaj ich w module.
Żadnych kolorów wpisanych na sztywno (`#fff`, `rgb(…)`): tylko kolory Mantine i zmienne `var(--mantine-color-…)`,
inaczej ciemny motyw i zmiana kolorów aplikacji przestają działać (test `frontend/src/test/colors.test.ts`).
Gdy ekran potrzebuje własnych stylów, użyj pliku CSS Modules w folderze modułu (`<Ekran>.module.css`). Ekrany panelu
i konta zawsze na całą szerokość obszaru treści (`DESIGN.md`, „Układ”).

**Dymki po akcjach** (zawsze, chyba że użytkownik zdecydował inaczej w „Zasadach wspólnych” `SPEC-GENERAL.md`):
`notify.success(t(...))` / `notify.error(t(...))` z `frontend/src/core/notify.ts` (w makietach
`mockups/src/common/notify.ts`). Dymek po udanym zapisie, usunięciu, wysłaniu i przy błędzie serwera; błędy pól
formularza pod polem, nie w dymku; potwierdzenie usunięcia w oknie. Nie wołaj `notifications.show` w modułach.

**Ikony:** tylko Lucide (`lucide-react`, nazwy ze strony https://lucide.dev/icons/), żadnej innej paczki ikon. Na ekranach
importujesz je wprost: `import { CalendarDays } from 'lucide-react'`. **Przyciski akcji mają ikonę** z `ButtonIcon`:
`<Button leftSection={<ButtonIcon action="save" />}>` (Zapisz = dyskietka, Usuń = kosz, pełna lista w `DESIGN.md`).
Nowa akcja: dopisz ją do `BUTTON_ICONS` we froncie i w makietach oraz do tabeli w `DESIGN.md`. Ikona pozycji nawigacji: nazwa z Lucide w polu
`icon` w `navigation.config.ts` (np. `'calendar-days'`) i ta sama nazwa dopisana do `NAV_ICONS` w
`frontend/src/common/icons.tsx` **i** `mockups/src/common/icons.tsx` (test pilnuje, że każda jest na liście).

## Nazwy i stałe

- **Słownik zamiast listy w kodzie.** Gdy rodzajów czegoś jest dużo i różnią się między firmami (rodzaje urlopu
  i nieobecności, kategorie, stanowiska, typy dokumentów), to tabela, którą administrator prowadzi w panelu, a każdy
  rodzaj ma właściwości zamiast warunków w kodzie (np. `deducts_from_allowance`, `requires_attachment`,
  `yearly_limit_days`, `color`). Na start wpisz kilka najczęstszych (migracja z danymi) i powiedz, że to propozycja,
  nie pełna lista. Stałe w kodzie (`shared/src/constants/`) tylko dla tego, od czego zależy logika aplikacji, np.
  statusy wniosku.

- **Identyfikatory po angielsku:** foldery, pliki, funkcje, zmienne, typy, tabele, kolumny, adresy URL.
  `orders/OrderList.tsx`, tabela `orders`, kolumna `created_at`. **Nie:** `zamowienia/ListaZamowien.tsx`, `data_utworzenia`.
- Nazwy folderów modułów różnią się czymś więcej niż liczbą pojedynczą i mnogą (`new-request` i `leave-requests`,
  nie `leave-request` i `leave-requests`).
- **Po polsku tylko to, co czyta człowiek:** teksty w plikach `locales`, treść dokumentów, opisy commitów.
- **Zero „magicznych” liczb i tekstów w logice.** Statusy modułu:
  ```ts
  // shared/src/constants/orders.ts
  export const ORDER_STATUSES = ['new', 'in_progress', 'sent'] as const;
  export type OrderStatus = (typeof ORDER_STATUSES)[number];
  export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    new: 'orders.status.new', in_progress: 'orders.status.in_progress', sent: 'orders.status.sent',
  };
  ```
- `.env` tylko na hasła i ustawienia zależne od komputera (porty, adresy). Wszystko inne to stałe w kodzie:
  `shared/src/constants/`, `backend/src/config/constants.ts`, `frontend/src/config/constants.ts`.

## Daty i święta

- **Wyświetlanie tylko przez `@app/shared`:** `formatDate`, `formatDateTime`, `formatTime` (backend: e-maile, Excel,
  PDF) i `<DateText value={...} withTime? dimmed? />` na ekranach. Format `DD.MM.RRRR`, z godziną `DD.MM.RRRR GG:MM`
  w strefie `Europe/Warsaw`. Nigdy `toLocaleDateString`, `Intl.DateTimeFormat` ani składania z `getMonth()` (test
  `formatting.test.ts`); przeglądarka po angielsku pokazałaby `8/3/2026`.
- **Kolumna `DATE`** (dzień bez godziny: urlop, termin) przychodzi z bazy jako tekst `RRRR-MM-DD` (`dateStrings` w
  `backend/src/db/pool.ts`) i tak idzie w API i w schematach zod (`z.iso.date()`). **`DATETIME`** (chwila: utworzono,
  wysłano) jako `Date`, w JSON tekst ISO.
- Obliczenia na datach: `dayjs` z `@app/shared` (`dayjs(a).add(1, 'day')`), dzisiaj: `todayIsoDate()`.
- **Dni robocze i święta:** `getPolishHolidays(rok)` (z nazwą: `translateKey(t, holiday.label)`), `isHoliday`,
  `isWorkingDay`, `countWorkingDays(od, do, dodatkoweDniWolne?)` z `@app/shared`. Dodatkowe dni wolne firmy to tabela
  prowadzona przez administratora; backend i front przekazują je jako listę `RRRR-MM-DD`. Jedna funkcja dla frontu i backendu, więc liczba dni
  urlopu wszędzie wychodzi ta sama. Nowe święto ustawowe: wpis w `FIXED_HOLIDAYS` z `fromYear`.
- Moduł urlopów lub czasu pracy: zapytaj w makiecie, co firma robi, gdy święto wypada w sobotę (`countWorkingDays`
  tego nie liczy). Czy nieobecność odejmuje dni z puli, zależy od jej rodzaju (właściwość w słowniku rodzajów), nie
  od reguły w kodzie.

## Liczby i kwoty

- **Wyświetlanie tylko przez `@app/shared`:** `formatMoney(wartość)` → `1 234,50 zł`,
  `formatNumber(wartość, miejscaPoPrzecinku?)` → `12 500`, `7,5`. Tak samo na ekranie, w PDF, e-mailach i Excelu.
  Nigdy `toFixed`, `toLocaleString` ani składania kwoty z „zł” w module. Test `formatting.test.ts` wyłapuje też
  `toFixed(`; gdy jest naprawdę potrzebne w obliczeniu, dopisz na końcu linii `// format-ok: <powód>`.
- **Wpisywanie:** Mantine `NumberInput` z `decimalSeparator={DECIMAL_SEPARATOR}`,
  `thousandSeparator={THOUSAND_SEPARATOR}`, przy kwotach `decimalScale={MONEY_DECIMALS}`, `fixedDecimalScale`
  i `suffix={' ' + CURRENCY_SYMBOL}`. Schemat zod sprawdza zakres (np. kwota ≥ 0).
- **W bazie:** kwoty w kolumnach `DECIMAL(12,2)`, nigdy `FLOAT` ani `DOUBLE` (zaokrąglenia gubią grosze). Sumy
  i rabaty liczy baza (`SUM`, `ROUND`) albo serwer na groszach (liczby całkowite), nie na ułamkach w JavaScripcie.

## Pola formularzy

- Zasady pól z tabeli „Pola formularzy” w `SPEC.md` modułu zapisujesz w schemacie zod modułu
  (`shared/src/schemas/<module>.ts`). Ten sam schemat sprawdza formularz (`zodResolver`) i serwer (`validateBody`).
  Limity są w `shared/src/constants/<module>.ts`, a maksymalna długość zgadza się z kolumną w migracji (`VARCHAR(n)`).
- **Gotowe pola zod** w `shared/src/schemas/fields.ts` (eksport z `@app/shared`): `text(max)`, `postalCode`, `nip`,
  `regon`, `pesel`, `phone`, `email`, `iban`, `money` / `moneyField(min, max)`, `quantity` / `quantityField(min, max)`
  i `optionalField(pole)` (puste pole formularza zapisuje się jako `NULL`). Moduł składa z nich schemat i nie pisze
  własnych wyrażeń regularnych:
  ```ts
  export const clientSchema = z.object({
    name: text(CLIENT_NAME_MAX),
    nip: optionalField(nip),
    postalCode,
    email: optionalField(email),
  });
  ```
  Nowy format dopisujesz do `fields.ts`, z kluczem komunikatu w `validation.json` i testem w `fields.test.ts`.
- Porządkowanie przed zapisem robi schemat (`trim`, `toLowerCase`, `transform`: NIP bez kresek, kod pocztowy
  z kreską, e-mail małymi literami), więc front i serwer zapisują to samo.
- Pole z formatem ma w formularzu podpowiedź z przykładem (`description`, np. „np. 64-300”), a komunikat błędu mówi,
  jak wygląda poprawna wartość.
- **Testy schematu:** dla każdego pola z tabeli wartości graniczne (min−1, min, maks, maks+1) i jeden zły format.

## Pobieranie danych na froncie

- Zapytania tylko przez `api` z `frontend/src/core/api/client.ts` (axios). Kiedy pobierać, co pamiętać i co
  odświeżyć, decyduje TanStack Query (`@tanstack/react-query`, `QueryClientProvider` jest w `main.tsx`).
- Każdy moduł ma hooki w `frontend/src/modules/<module>/<module>.api.ts`; ekrany nie wołają `api` same:
  ```ts
  export function useClients(params: ListQuery) {
    return useQuery({
      queryKey: ['clients', params],
      queryFn: () => api.get<ListResponse<Client>>('/clients', { params }).then((r) => r.data),
    });
  }
  export function useSaveClient() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (client: ClientInput) => api.post('/clients', client),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    });
  }
  ```
  Po udanym zapisie odświeżasz dane przez `invalidateQueries`. Nigdy `useEffect` z ręcznym pobieraniem.
- **Ładowanie, błąd, pusto:** każdy ekran z danymi używa `<DataState query={…} isEmpty={…} emptyText={…}
  emptyAction={…}>` z `common/`: kręciołek, ramka z błędem i przyciskiem „Spróbuj ponownie”, pusta lista z tekstem
  i akcją (np. „Dodaj pierwszego klienta”).
- Wygasła sesja i obowiązkowa zmiana hasła są obsłużone w jednym miejscu, w `client.ts` (`handleSessionError`):
  401 (poza `/auth/me` i `/auth/login`) przenosi na `/login?reason=expired`, 403 `server.password_change_required` na
  `/change-password`. Moduły tego nie obsługują same.
- Testy ekranów z `renderWithProviders` (ma już `QueryClientProvider`); `api` podmieniasz `vi.spyOn(api, 'get')`.

## Listy

- Stronicowanie, wyszukiwanie i sortowanie robi serwer: `GET /api/<module>?page=1&search=…&sort=name&dir=asc`,
  odpowiedź `ListResponse` (`{ items, total, page, pageSize }`), `PAGE_SIZE` z `backend/src/config/constants.ts`.
- Parametry sprawdza `validateQuery(listQuerySchema(['name', 'created_at']))` (`backend/src/middleware/validateQuery.ts`,
  schemat z `@app/shared`). Sortować można tylko po kolumnach z tej listy; nazwa kolumny z adresu nigdy nie trafia do
  SQL bez tego sprawdzenia. Wyszukiwanie przez `LIKE ?` z parametrem.
- Na froncie `Pagination` z Mantine; strona, wyszukiwanie i sortowanie siedzą w adresie (`?page=2&search=kowal`,
  czytane tym samym `listQuerySchema`), więc odświeżenie strony i wysłany link pokazują ten sam widok.
- **Testy:** druga strona, wyszukiwanie, nieznana kolumna sortowania → 400.

## Teksty

- Żaden tekst dla człowieka nie jest wpisany w kod. Klucz `<module>.<ekran>.<element>`, np. `orders.list.empty`.
- Front i makiety: `const { t } = useTranslation('<module>')`, potem `t('list.empty')`.
- Klucze z innej przestrzeni (np. etykiety ról): `translateKey(t, ROLE_LABELS[role])` z `@app/shared`.
- Schematy zod: komunikaty to klucze `validation.*` (wspólne) albo `<module>.validation.*`; front tłumaczy je
  `translateKey`.
- Backend zwraca **klucze**, nigdy polskie zdania: `sendError(res, 404, SERVER_MESSAGES.notFound)` albo klucz z
  `shared/src/constants/<module>.ts`. Nowe klucze serwera dopisz do `server.json` (wspólne) lub `<module>.json`.
- Nowy język: skopiuj `shared/locales/pl/` do `shared/locales/en/`, przetłumacz wartości, dopisz `en` w `resources`.

## API i bezpieczeństwo

**Serwer jest jedynym źródłem prawdy.** Front może być zmieniony przez każdego, kto otworzy narzędzia przeglądarki,
więc backend sprawdza wszystko sam, nawet jeśli formularz już to sprawdził:
- kto: zawsze `req.user` (z bazy), nigdy `userId`, `role`, `companyId`, `createdBy` z treści żądania;
- co wolno: rola i właściciel rekordu sprawdzane przy każdej trasie, także przy odczycie pojedynczego rekordu po `id`;
- co zapisać: tylko pola ze schematu zod (zod po cichu usuwa nieznane pola; nie używaj `.passthrough()` ani
  `.loose()`; `validateBody` podmienia `req.body` na dane po sprawdzeniu), a wartości wyliczane (cena, suma, status po akcji, liczba dni urlopu, data utworzenia) liczy serwer,
  nawet gdy front wysłał swoją;
- przejścia statusów (np. „wysłane” nie wraca do „nowe”) i limity (np. dni urlopu) sprawdza serwer, a front tylko
  ukrywa niedostępne przyciski.

- **Domyślnie zamknięte.** W `backend/src/app.ts` są dwie części: trasy publiczne (przed `api.use(requireAuth)`) i cała
  reszta, która wymaga logowania. Publiczne są **tylko** adresy oznaczone tak w „Mapie dostępu” w `SPEC-GENERAL.md`
  (logowanie, formularze strony dla odwiedzających); zawsze z `validateBody` i limitem zapytań (`express-rate-limit`,
  ustawienia w `backend/src/config/constants.ts`).
- **Moduł podpinasz przez `mountModule(api, '<klucz>', <module>Routes)`** (`backend/src/middleware/mountModule.ts`):
  bierze role pozycji nawigacji o tym kluczu, więc menu i API mają te same uprawnienia. Moduł bez pozycji w nawigacji:
  role jawnie, `mountModule(api, 'email', emailRoutes, ['admin'])`. Węższe uprawnienia pojedynczej trasy („usuwa tylko
  admin”): `requireRole('admin')` przy tej trasie. Ukrycie pozycji w menu nie jest zabezpieczeniem.
- Każda trasa modułu ma wiersz w „Mapie dostępu” (`SPEC-GENERAL.md`); `SPEC.md` modułu wymienia trasy z rolami.
- W koncie użytkownika dane są **zawsze** filtrowane po `req.user.id` (klient nie zobaczy cudzych zamówień, nawet
  gdy zmieni numer w adresie).
- `validateBody(schema)` z tym samym schematem co formularz (`zodResolver(schema)` z `mantine-form-zod-resolver`
  w `useForm`).
- Format błędu jest jeden: `{ error: { message: <klucz>, fields?: { pole: <klucz> } } }`, kody 400/401/403/404/409/503.
  Na froncie: `notify.error(apiErrorMessage(err, t))` (`apiErrorMessage` z `frontend/src/core/api/client.ts`).
- SQL **tylko z parametrami** `?`: `pool.query('SELECT * FROM orders WHERE id = ?', [id])`. Nigdy nie sklejaj SQL
  z danymi od użytkownika.
- Kilka zapisów, które muszą się udać razem (także każdy zapis z historią zmian): `withTransaction(async (conn) => { … })`
  z `backend/src/db/transaction.ts`. Sama zatwierdza, cofa przy błędzie i oddaje połączenie; nie wołasz
  `pool.getConnection()` ręcznie.

## Powiązania między modułami

Moduły jednej aplikacji korzystają ze swoich danych: zadania pokazują, że osoba będzie na urlopie, pulpit zbiera
boksy z modułów, kalendarz pokazuje urlopy, wydarzenia i zadania naraz. Zasady:
- Powiązania są w `SPEC.md` modułu, sekcja „Powiązania”: co ten moduł pokazuje z innych i co inne pokazują z niego.
- Moduł sięga po dane innego modułu przez jego funkcję (`<module>.service.ts` albo `<module>.queries.ts`, eksport
  nazwany np. `getAbsences(userIds, from, to)`), nie przez własne zapytania do cudzych tabel.
- Uprawnienia zostają: kto ma dostęp do zadań, a nie do urlopów, widzi tylko „nieobecny 12–16.11”, bez rodzaju
  urlopu, powodu i dokumentów. Funkcja dla innych modułów zwraca tylko te pola.
- Gdy moduł dochodzi później (np. zadania po urlopach), jego makieta pokazuje powiązania ze zrobionymi modułami,
  a te dostają drobną zmianę (np. boks na pulpicie) jako osobny krok planu z testem.

## Pliki

Gdy moduł przyjmuje pliki (zdjęcia, dokumenty, załączniki). Pomocnik: `backend/src/files/storage.ts`.
- **Na dysku:** `uploads/<moduł>/<id rekordu>/<losowa nazwa>.<rozszerzenie>` (`saveUpload`). Folder według rekordu,
  do którego plik należy (wniosek, umowa), nie według osoby. Nazwa od użytkownika nigdy nie trafia na dysk.
- **W bazie:** tabela plików modułu, np. `leave_request_files`: `id`, `<rekord>_id` (klucz obcy, `ON DELETE CASCADE`),
  `stored_name`, `original_name`, `mime`, `size`, `uploaded_by` (`SET NULL`) + `uploaded_by_name`, `created_at`.
  Osobna tabela dla modułu, nie jedna wspólna (wspólna nie może mieć klucza obcego).
- **Wgrywanie:** `multer` z `memoryStorage()` i `limits: { fileSize: UPLOAD_MAX_BYTES, files: UPLOAD_MAX_FILES }`
  (instalujesz w module, który pierwszy przyjmuje pliki), potem `saveUpload(moduł, id, file.buffer)`; `UploadError` →
  `sendError(res, 400, err.messageKey)`. Typ sprawdzany po zawartości (`UPLOAD_FILE_TYPES`: PDF, PNG, JPG, WebP);
  nowy typ = wpis w stałych z testem. Najpierw sprawdź, że osoba może zmieniać ten rekord.
- **Pobieranie:** tylko trasą API, np. `GET /api/leave-requests/:id/files/:fileId`, z tymi samymi uprawnieniami co
  rekord (w koncie: tylko własne), potem `sendUpload`. Folder `uploads/` nie jest nigdy serwowany wprost.
- **Usuwanie:** wiersz z tabeli w transakcji, plik z dysku (`removeUpload`) po udanym `commit`. Archiwizacja rekordu
  nie usuwa plików; usunięcie na stałe: `removeRecordUploads` po `commit`.
- Na serwerze pliki leżą w wolumenie `uploads_data` (przetrwają „wgraj nową wersję”) i trafiają do kopii zapasowej
  (`scripts/backup-db.sh`). `uploads/` jest w `.gitignore`.
- Testy: zły typ i za duży plik → 400; pobranie cudzego pliku → 404; bez logowania → 401; usunięcie rekordu na stałe
  usuwa jego pliki.

## PDF i wydruk

Dwa przypadki, dwie drogi:
- **Wydruk ekranu** (wniosek do podpisu, zamówienie na kartce, „zapisz jako PDF” przez użytkownika): ekran z wersją
  do druku, bez biblioteki. Przycisk „Drukuj” (`ButtonIcon action="print"`, `window.print()`), a w
  `<Ekran>.module.css` `@media print` ukrywa menu, przyciski i panel; treść na białym tle, tabela bez przewijania.
  Zawsze zacznij od tej drogi.
- **PDF tworzony przez serwer** (dołączany do e-maila, zapisywany w archiwum, zestawienie zamówień albo stanów
  magazynu do pobrania): `pdfmake` w backendzie (`npm install -w @app/backend pdfmake`). Jeden plik
  `backend/src/pdf/renderPdf.ts`:
  ```ts
  import { createRequire } from 'node:module';
  import { dirname } from 'node:path';
  const require = createRequire(import.meta.url);
  const pdfmake = require('pdfmake');
  const Roboto = require('pdfmake/fonts/Roboto'); // polskie znaki
  const fontsDir = dirname(require.resolve('pdfmake/fonts/Roboto'));
  pdfmake.addFonts(Roboto);
  pdfmake.setUrlAccessPolicy(() => false); // dokument nigdy nie pobiera nic z internetu
  pdfmake.setLocalAccessPolicy((path: string) => path.startsWith(fontsDir)); // ani plików z serwera
  export function renderPdf(doc: object): Promise<Buffer> {
    return pdfmake.createPdf({ defaultStyle: { font: 'Roboto' }, ...doc }).getBuffer();
  }
  ```
  Treść dokumentu buduje funkcja modułu (np. `orders.pdf.ts`) z danych z bazy: teksty z i18n, daty przez
  `formatDate`, kwoty przez `formatMoney`, liczby przez `formatNumber`. Trasa `GET /api/<moduł>/:id/pdf` z tymi samymi
  uprawnieniami co rekord, odpowiedź `Content-Type: application/pdf` i `Content-Disposition: attachment`. Obrazki
  (np. logo) tylko z plików aplikacji, dołączone jako dane, nigdy z adresu podanego przez użytkownika.
  Testy: odpowiedź zaczyna się od `%PDF`, bez logowania 401, cudzy rekord 404.

## Na żywo (WebSocket)

Tylko gdy moduł naprawdę tego potrzebuje (czat, powiadomienie w chwili zdarzenia). Licznik nowych rzeczy odświeżany co
kilkanaście sekund nie potrzebuje WebSocketu. Biblioteka: `socket.io`.
- WebSocket **omija** `requireAuth`, `mountModule` i `requireRole`. Przy połączeniu sprawdź ciasteczko logowania tak
  jak `authenticate` (token, potem konto w bazie, bez zarchiwizowanych); bez konta rozłącz.
- Każde zdarzenie od klienta sprawdza uprawnienia (czy ta osoba należy do tej rozmowy) i dane (schemat zod).
- Zapis idzie zwykłą trasą API (`validateBody`, testy 401/403), a WebSocket tylko powiadamia innych („nowa wiadomość
  w rozmowie 5”), żeby pobrali ją przez API.
- Ścieżka pod `/api`, żeby Caddy i Vite przekazały ją do backendu bez zmian w `Caddyfile`:
  `new Server(httpServer, { path: '/api/socket.io' })` i `io({ path: '/api/socket.io' })`; w `frontend/vite.config.ts`
  proxy `/api` dostaje `ws: true`.

## Baza danych

- Każda zmiana bazy = nowy plik `backend/migrations/NNN_<opis>.sql` (kolejny numer, np. `003_orders.sql`), potem
  `npm run migrate`. **Nigdy** nie zmieniaj bazy ręcznie w phpMyAdmin i nie edytuj migracji, która już została
  zastosowana; napisz nową.
- **Jedna zmiana struktury na plik migracji** (jedno `CREATE TABLE` albo jedno `ALTER TABLE`). MySQL zatwierdza
  zmiany struktury od razu, więc migracja przerwana w połowie zostawia część zmian. Wtedy: cofnij ręcznie to, co
  zdążyła zrobić (np. `DROP TABLE` nowej tabeli), popraw plik, uruchom `npm run migrate` ponownie.
- Tabele `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci`, klucz `id INT UNSIGNED AUTO_INCREMENT`,
  `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP`.
- **Każda relacja ma klucz obcy** z indeksem i z regułą przy usunięciu. Regułę zapisz w specu (tabela relacji):

| Reguła | Kiedy | Przykład |
|---|---|---|
| `ON DELETE CASCADE` | dziecko bez rodzica nie ma sensu | `order_items.order_id` → `orders` |
| `ON DELETE SET NULL` + kopia nazwy | autorstwo (`created_by`, `updated_by`) | `orders.created_by` → `users`, obok `created_by_name` |
| `ON DELETE RESTRICT` | usunięcie skasowałoby ważne dane bez ostrzeżenia | `orders.customer_id` → `customers` |

  Przy `RESTRICT` makieta pyta, co ma się stać, a interfejs przed usunięciem mówi, dlaczego nie można (np. „Ten klient
  ma 3 zamówienia. Najpierw przenieś go do archiwum.”). Przy `CASCADE` okno potwierdzenia mówi, ile rzeczy zniknie.
- Test backendu dla każdej relacji `CASCADE` i `RESTRICT` (usunięcie rodzica → dzieci znikają / błąd 409).

## Archiwum (miękkie usuwanie)

Dla danych z listy „Archiwum” w `docs/SPEC-GENERAL.md`:

- Kolumny `archived_at DATETIME NULL`, `archived_by INT UNSIGNED NULL` (klucz obcy do `users`, `ON DELETE SET NULL`),
  przy dzieciach archiwizowanych razem z rodzicem także `archived_with_parent BOOLEAN NOT NULL DEFAULT FALSE`.
- Trasy: `POST /api/<module>/:id/archive` i `POST /api/<module>/:id/restore` z `requireRole`.
- Listy: domyślnie `WHERE archived_at IS NULL`; zakładka „Archiwum” wysyła `?archived=1`
  (`WHERE archived_at IS NOT NULL`) i ma przycisk „Przywróć”.
- „Usuń” w interfejsie = archiwizacja. Usunięcie na stałe (`DELETE /api/<module>/:id`), jeśli w ogóle dozwolone, tylko
  dla rekordu w archiwum, inaczej 409 `server.archive_first` (dopisz klucz do `server.json` i `SERVER_MESSAGES`);
  okno potwierdzenia mówi, ile powiązanych rzeczy zniknie.
- Zarchiwizowany rekord dalej widać tam, gdzie był użyty, z dopiskiem „zarchiwizowany”; w nowych formularzach nie da
  się go wybrać (zapytania list wyboru mają `archived_at IS NULL`).
- Archiwizacja rodzica: w tej samej transakcji archiwizuje aktywne dzieci z `archived_with_parent = TRUE`;
  przywrócenie rodzica przywraca tylko dzieci z `archived_with_parent = TRUE` i zeruje ten znacznik.
- Unikalne pola (np. e-mail) obejmują archiwum: zamiast drugiego konta z tym samym adresem zaproponuj przywrócenie.
- **Użytkownicy w archiwum:** w module Logowanie `authenticate` sprawdza w bazie, że konto nie ma `archived_at`
  (zarchiwizowane → `req.user = undefined`, a `GET /api/auth/me` daje 401 `server.account_archived`); logowanie
  zarchiwizowanego konta odrzucone tym samym kluczem.
- Testy: lista nie zwraca zarchiwizowanych; przywrócenie wraca rekord; `DELETE` aktywnego → 409; zarchiwizowany
  użytkownik z ważnym tokenem → 401; rodzic archiwizuje i przywraca tylko „swoje” dzieci.

## Historia zmian

Gdy `docs/SPEC-GENERAL.md` ma włączoną historię:

- W module Logowanie, jako migrację **zaraz po** tabeli `users` (ma do niej klucz obcy): skopiuj
  `backend/src/db/sql/activity_log.sql` do `backend/migrations/` z kolejnym numerem.
- Każda zmiana z zakresu historii, w **tej samej transakcji** co zmiana:
  ```ts
  import { diffChanges, logActivity } from '../../db/activityLog';
  await logActivity(conn, {
    userId: req.user!.id, userName: req.user!.name,
    action: 'update', entityType: 'orders', entityId: id,
    changes: diffChanges(before, after),
  });
  ```
  Akcje: `create`, `update`, `delete`, `archive`, `restore`, `status` (zmiana statusu), `login` (jeśli w zakresie).
- Ekran „Historia zmian” w panelu (moduł `activity`): tabela z filtrami moduł / osoba / data, widoczny dla ról
  z `SPEC-GENERAL.md`.
- Test: zmiana tworzy wpis z poprawnymi parami „przed → po”; usunięcie rekordu nie usuwa jego historii.

## Wzorce opcjonalne

Tylko gdy wywiad je potwierdził (decyzja w `SPEC-GENERAL.md`, przed modułem Logowanie):

- **Wiele firm:** tabela `companies`; `company_id` (klucz obcy) w `users` i w każdej tabeli danych; `companyId`
  w `SessionUser` i w tokenie; **każde zapytanie** ma `WHERE company_id = ?` z `req.user.companyId`, nigdy z danych
  żądania.
- **Dostęp nadawany przez administratora:** tabela `user_modules(user_id, module_key)` (oba klucze obce, `CASCADE`),
  pole `modules?: string[]` w `SessionUser`, rozszerzenie `canSee` o warunek modułu i middleware
  `requireModule('<module>')` na trasach modułu.

Zmiana `SessionUser` = zmiana w `shared/src/navigation.ts`, `backend/src/auth/token.ts` i testach obu.

## Testy modułu

Najpierw test, potem kod (TDD). Krok planu jest zrobiony dopiero po `npm run check` bez błędów.

- **Szkielet z wymagań:** pierwszy krok planu zapisuje `it.todo('…')` dla każdego wymagania ze specu (trasy, pola,
  reguły z plików „Wzorce”, scenariusze `TESTS.md`). Implementacja zamienia je na prawdziwe testy; w module
  `zrobiony` nie może zostać żadne `it.todo` (test zasad).
- **Ochrona tras:** `backend/src/test/routeProtection.test.ts` sam sprawdza każdy moduł podpięty przez `mountModule`:
  bez logowania 401, rola spoza modułu 403, na każdym adresie i każdą metodą.

- **Backend** (`*.test.ts` obok kodu, supertest na `createApp({ extraRoutes })` albo na trasach modułu): każda trasa:
  poprawne dane → sukces; błędne dane → 400 z kluczami pól; bez logowania → 401; zła rola → 403; w koncie cudze
  dane → 404. Plus reguły usuwania, archiwum i historii, jeśli dotyczą modułu.
- **`shared/`:** schematy zod (poprawne i błędne dane, wartości graniczne z tabeli pól, klucze komunikatów).
- **Frontend:** formularze (błędy pól po polsku) i listy (ładowanie, błąd, pusta lista, dane), z
  `renderWithProviders` z `frontend/src/test/render.tsx`.
- **E2E** (`e2e/<module>.spec.ts`, `@playwright/test`): scenariusze z `TESTS.md`, po jednym na rolę. Wymagają bazy
  (`npm run db`), uruchamiane `npm run test:e2e` przy zamknięciu modułu.

## Testy zasad

Część zasad sprawdza `npm run check` sam, w plikach stepkit, których **nie zmieniasz** (aktualizacja podmienia je
w całości). Czerwony test zasad znaczy: popraw kod, nie test.

| Plik | Pilnuje |
|---|---|
| `backend/src/test/conventions.test.ts` | SQL tylko z `?`; transakcje tylko przez `withTransaction`; `validateBody` przy każdej trasie zapisu; kto i jaka rola tylko z `req.user`; moduły za logowaniem tylko przez `mountModule`; obok każdego `*.routes.ts` test z 401 i 403; każdy klucz obcy z `ON DELETE`; w module `zrobiony` (według `docs/STATUS.md`) żadnego `it.todo` |
| `backend/src/test/routeProtection.test.ts` | każdy moduł z `mountModule`: bez logowania 401, rola spoza modułu 403 |
| `frontend/src/test/conventions.test.ts` | zapytania tylko przez `api`; w modułach `api` tylko w `*.api.ts`; brak importów z innego modułu; dymki przez `notify`; brak polskich tekstów w kodzie; schematy w `shared/src/schemas/` bez własnych `.regex(` |
| `frontend/src/test/colors.test.ts`, `formatting.test.ts`, `tables.test.ts` | kolory z motywu; daty i liczby przez `@app/shared`; tabele w `Table.ScrollContainer` |

**Wyjątek** tylko tam, gdzie zasada naprawdę nie pasuje: na końcu linii komentarz `// rule-ok: <powód>` (np. sortowanie
po kolumnie sprawdzonej przez `listQuerySchema`; trasy publiczne bez testu 401 w pliku tras). Powód musi być
konkretny; przegląd kodu sprawdza każdy.

## Wzorce dziedzin

Reguły dla konkretnych rodzajów modułów są w osobnych plikach: w stepkit `references/domains/`, w projekcie
`docs/conventions/`. Który moduł czyta które pliki, mówi kolumna „Wzorce” w tabeli „Moduły i kolejność”
w `SPEC-GENERAL.md`. Moduł bez pasującego pliku korzysta tylko z tego pliku ogólnego.

| Plik | Kiedy |
|---|---|
| `login.md` | moduł Logowanie |
| `documents.md` | moduł z dokumentami: zamówienie, faktura, PZ/WZ, zlecenie, protokół |
| `invoices.md` | faktury i kwoty z VAT (razem z `documents.md`) |
| `warehouse.md` | magazyn: stany, miejsca, przyjęcia, wydania (razem z `documents.md`) |
| `deadlines.md` | terminy cykliczne: flota, umowy, przeglądy, legalizacje |

Pliki dziedzinowe nie powtarzają zasad ogólnych; ogólne obowiązują zawsze. Przegląd kodu przechodzi listę kontrolną
niżej i listy z plików dziedzinowych modułu.

## Lista kontrolna przeglądu kodu

Używaj jej, gdy nie ma `superpowers:requesting-code-review`:

- [ ] moduł podpięty przez `mountModule`; trasy publiczne tylko te z „Mapy dostępu”, z limitem i `validateBody`
- [ ] każda trasa jest w „Mapie dostępu”, a testy sprawdzają 401 bez logowania i 403 dla złej roli
- [ ] SQL tylko z `?`, dane konta filtrowane po `req.user.id`, przy wielu firmach po `company_id`
- [ ] każda relacja ma klucz obcy z regułą zgodną ze specem
- [ ] brak polskich tekstów i liczb „z ręki” w kodzie
- [ ] te same schematy zod na froncie i w backendzie
- [ ] backend nie bierze z żądania właściciela, roli, firmy ani wartości wyliczanych; sprawdza przejścia statusów
- [ ] daty przez `formatDate` / `DateText`, dni robocze przez `countWorkingDays`; tabele w `Table.ScrollContainer`
- [ ] przyciski akcji z `ButtonIcon`, dymki przez `notify`
- [ ] nowe biblioteki tylko z listy zatwierdzonej albo ze zgodą użytkownika (zapisane w `SPEC-GENERAL.md`)
- [ ] dane z innych modułów przez ich funkcje, z polami dozwolonymi dla roli
- [ ] pola formularzy zgodne z tabelą w specu, formaty z `fields.ts`, testy wartości granicznych
- [ ] dane na froncie przez hooki `<module>.api.ts` i `DataState`; brak `useEffect` z pobieraniem i `fetch`
- [ ] listy: `validateQuery(listQuerySchema(...))`, sortowanie tylko po kolumnach z listy, stan w adresie
- [ ] kilka zapisów naraz przez `withTransaction`
- [ ] nic skopiowanego między modułami: wspólne w `common/` albo `core/`
- [ ] każde `// rule-ok:` ma konkretny, prawdziwy powód; testy zasad niezmienione
- [ ] pliki przez `saveUpload` / `sendUpload`, pobieranie z kontrolą dostępu, tabela plików z kluczem obcym
- [ ] testy dla każdej trasy i formularza, `npm run check` zielony
- [ ] `.env` nie jest w repo (`git check-ignore .env`)
