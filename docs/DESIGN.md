# Księga wyglądu

Jak wygląda ta aplikacja i dlaczego. Uzupełnia ją moduł „Wygląd”, a potem każdy moduł, który doda nowy wzorzec.
Każda makieta i każdy ekran aplikacji trzyma się tych zasad. Kolory i czcionki technicznie: `shared/src/theme.ts`
i `shared/src/theme.css`.

**Stan:** ustalony 2026-11-14 (moduł „Wygląd”, wariant „Nocny granat, cały ciemny”). Zmiana = wpis w „Historii
zmian wyglądu”.

## Charakter

Wewnętrzne narzędzie jednej firmy do urlopów i zadań, używane codziennie przez kilka–kilkanaście osób. Nastrój
poważny i spokojny, „dokumentowy”: nagłówki szeryfowe jak w piśmie kadrowym, treść prostym, gęstym krojem. Zawsze
ciemny motyw w odcieniach granatu (nie czerni ani szarości); jaśniejsze są tylko rzeczy, z którymi się pracuje:
karty, tabele, pola i główne przyciski. Bez cieni, gradientów i ozdobników; prawie kanciaste kształty.

## Kolory

Motyw jest **zawsze ciemny**, bez przełącznika (`COLOR_SCHEME_TOGGLE = false`, `FIXED_COLOR_SCHEME = 'dark'`).
Wydruk i PDF wniosku urlopowego są jasne (papier).

| Kolor (nazwa w motywie) | Do czego |
|---|---|
| `dark.9` | rama: górna belka i menu boczne (najciemniejsze) |
| `dark.8` | tło panelu (`--app-panel-background`) |
| `dark.7` | tło strony poza panelem, najechanie na pozycję menu |
| `dark.6` | karty (`InfoCard`), tabele, pola formularzy, aktywna pozycja menu |
| `dark.4` | obramowania |
| `dark.0` / `dark.2` | tekst / tekst przygaszony (`c="dimmed"`) |
| `navy` (główny, odcień 6 na ciemnym tle) | główne przyciski, linki, zaznaczenia; `navy.4` pasek aktywnej pozycji menu, `navy.3` ikony menu |
| `blue` | to samo co `navy` (żeby `color="blue"` nie odstawał) |
| `gray` | znaczniki neutralne (np. rola Pracownik) |
| `green` (wypełniony: odcień 9) | zatwierdzenie, status „zatwierdzony” |
| `red` (wypełniony: odcień 8) | odrzucenie, archiwizacja, termin po czasie |
| `yellow` | status „czeka na decyzję” |

Znaczniki i przyciski `light` / `subtle` na ciemnym tle: przezroczysty odcień koloru (20%) i jasny napis (odcień 3);
ustawione w `theme.css` dla wszystkich kolorów Mantine.
## Czcionki i tekst

- **Source Serif 4** (szeryfowa, 600): tytuły ekranów i nagłówki kart.
- **Source Sans 3** (400 / 500 / 600 / 700): cała reszta, także liczby w tabelach.
- Obie z Google Fonts z polskimi znakami (`theme.css`).
- Znaczniki (`Badge`) zwykłymi literami, nie WIELKIMI; bez wielkich liter w etykietach.

## Odstępy, zaokrąglenia, cienie

- Zaokrąglenia małe: `xs` 2 px (domyślne), `sm` 3, `md` 4, `lg` 6, `xl` 8.
- Bez cieni (`Card` `shadow="none"`); karty odcina jaśniejsze tło i cienkie obramowanie.
- Tabele zwarte (`verticalSpacing="xs"`), na tle karty (`--mantine-color-default`).
- Odstępy domyślne Mantine.

## Układ

**Ciemna rama:** belka i menu na `dark.9` (klasy `app-header`, `app-navbar`, `app-navlink` w `theme.css`, podpięte
w motywie). Aktywna pozycja menu: jaśniejsze tło `dark.6`, pasek po lewej w kolorze `navy.4`, pogrubiony napis.

**Panel i konto** (`AppLayout`, `AccountLayout`, oba przez `SideMenuLayout`): menu po lewej (na telefonie schowane
pod przyciskiem w belce), treść w środku na tle `--app-panel-background` (innym niż karty).
**Górna belka** (panel i konto): po lewej przycisk menu (tylko na telefonie), logo i nazwa firmy lub aplikacji; po
prawej przełącznik jasny/ciemny, dzwonek powiadomień (gdy aplikacja je ma) i menu użytkownika: kółko z inicjałami
i imię (na telefonie same inicjały), a w nim „Moje konto” i „Wyloguj”. Makieta pokazuje tę samą belkę; przełączniki
makiety są tylko w żółtym pasku nad nią. Pozycja menu bieżącego ekranu jest
podświetlona, także na jego podstronach (`/admin/orders/5` podświetla „Zamówienia”). Każdy ekran panelu i konta
zajmuje całą szerokość obszaru treści (bez `Container`, `maw` ani `w` na całej stronie), także gdy ma mało danych.
Węższe mogą być tylko elementy w środku: formularz w oknie (`Modal`) albo w siatce (`SimpleGrid`, `Grid`), pole
wyszukiwania. Ograniczoną szerokość z `Container` mają tylko sekcje strony dla odwiedzających (`PageSection`).

**Strona dla odwiedzających** (`PublicLayout`): menu przyklejone u góry okna, bieżąca podstrona podświetlona. Pierwsza
sekcja strony głównej to nagłówek ze zdjęciem lub grafiką na całą szerokość, z hasłem i jednym głównym przyciskiem.
Każda kolejna sekcja to `PageSection` z tłem na całą szerokość, na zmianę `default` / `alt`.

## Wzorce

| Wzorzec | Jak wygląda | Gdzie pierwszy raz |
|---|---|---|
| Pulpit | boksy `InfoCard` w siatce `SimpleGrid` (1 kolumna na telefonie, 2–3 na komputerze); każdy moduł może dodać swój boks | szablon |
| Boks (`InfoCard`) | karta z obramowaniem: nagłówek, treść, przyciski akcji na dole po prawej | szablon |
| Tabela z listą | zawsze w `Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}`, przewija się w bok zamiast ściskać kolumny (test `tables.test.ts`) | szablon |
| Przycisk z akcją | ikona z `ButtonIcon` w `leftSection`; główny przycisk wypełniony, pozostałe `default` lub `subtle` | szablon |
| Dymek po akcji | `notify.success` (zielony, ✓) po zapisie, usunięciu, wysłaniu; `notify.error` (czerwony, ✗) przy błędzie serwera | szablon |
| Błąd w formularzu | pod polem, nie w dymku | szablon |
| Usunięcie | okno potwierdzenia z liczbą rzeczy, które znikną | szablon |
| Data | `DateText` (`DD.MM.RRRR`, z godziną `DD.MM.RRRR GG:MM`); pusta = szare „brak” | szablon |
| Pusta lista | ikona, jedno zdanie i przycisk „Dodaj” | |
| Statusy | `Badge variant="light"`: czeka = `yellow`, zatwierdzony = `green`, odrzucony / anulowany = `red`, wycofany = `gray` | Wygląd |
| Kolumny tablicy | `Paper withBorder` na tle panelu (`var(--app-panel-background)`), karty zadań na `dark.6` | Wygląd |
| Karta z liczbą | duża liczba (40 px, 700) i przygaszony opis obok, pod spodem pasek `Progress` | Wygląd |
| Potwierdzenie usunięcia | `Modal` z liczbą rzeczy, które znikną; przycisk `red` wypełniony, obok „Anuluj” `default` | Wygląd |
| Dzwonek powiadomień | w belce przed menu użytkownika; czerwona liczba nieprzeczytanych (`red.8`, powyżej 99 „99+”); na komputerze okienko 420 px pod dzwonkiem, na telefonie panel z prawej na cały ekran. Nieprzeczytane: tło `dark.6`, pasek `navy.4` po lewej, pogrubiony tytuł i kropka; ikona rodzaju w kolorach statusów | Powiadomienia |
| Karta zadania | `Card withBorder` na `dark.6`: tytuł, 2 linie opisu, termin (po czasie `red.4`, dziś i jutro `yellow.4`), kółka osób (`navy` light, archiwum szare, żółta kropka = urlop), pasek `navy.4` po lewej przy moim zadaniu, menu „⋮” | Zadania |
| Podgląd z prawej | `Drawer position="right"` 540 px (na telefonie cały ekran): od razu edytowalne pola, „Usuń” po lewej na dole, „Anuluj” i „Zapisz” po prawej; nowe rekordy dodaje się w oknie na środku (`Modal size="lg"`) | Zadania |
| Usunięcie na stałe | `ConfirmModal` z polem „wpisz nazwę” i `confirmDisabled`, dopóki nazwa się nie zgadza | Zadania |
| Kalendarz zespołu | `@mantine/schedule`, `ResourcesMonthView` / `ResourcesWeekView`: osoby w wierszach, dni w kolumnach; urlopy, wydarzenia i zadania jako paski; weekend i święta (`getPolishHolidays`) wyszarzone | |

## Ikony przycisków

Ta sama akcja ma w całej aplikacji tę samą ikonę (`ButtonIcon` w `common/`, lista `BUTTON_ICONS`):

| Akcja | Ikona Lucide |
|---|---|
| Zapisz | `Save` (dyskietka) |
| Dodaj | `Plus` |
| Edytuj | `Pencil` |
| Usuń | `Trash2` (kosz) |
| Anuluj, zamknij | `X` |
| Potwierdź | `Check` |
| Szukaj | `Search` |
| Filtruj | `Funnel` |
| Eksport, pobierz | `Download` |
| Import, wgraj | `Upload` |
| Archiwizuj / przywróć | `Archive` / `ArchiveRestore` |
| Wróć | `ArrowLeft` |
| Wyślij | `Send` |
| Drukuj | `Printer` |
| Odśwież | `RefreshCw` |
| Szczegóły | `Eye` |
| Kopiuj | `Copy` |
| Zaloguj / wyloguj | `LogIn` / `LogOut` |
| Ustaw hasło | `KeyRound` (klucz) |
| Zamknij rok | `CalendarCheck` |
| Ukryj (np. typ urlopu) / przywróć ukryty | `EyeOff` / `Undo2` |

## Historia zmian wyglądu

- 2026-11-14: wybrany „Nocny granat, cały ciemny” (z 4 wariantów: granat klasyczny, atrament, nocny granat z jasną
  treścią, nocny cały ciemny). Użytkownikowi podobała się ciemna rama, ale chciał ciemną także treść. Zmienia ustalenie
  z wywiadu „tylko jasny motyw” na „tylko ciemny”.
