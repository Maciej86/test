# Księga wyglądu

Jak wygląda ta aplikacja i dlaczego. Uzupełnia ją moduł „Wygląd”, a potem każdy moduł, który doda nowy wzorzec.
Każda makieta i każdy ekran aplikacji trzyma się tych zasad. Kolory i czcionki technicznie: `shared/src/theme.ts`
i `shared/src/theme.css`.

**Stan:** jeszcze nie ustalony (moduł „Wygląd”). Wzorce niżej to ustawienia startowe stepkit: obowiązują, dopóki
użytkownik nie zdecyduje inaczej. Zmiana = wpis w „Historii zmian wyglądu”.

## Charakter

(2–3 zdania: dla kogo, jaki nastrój, czym ma się różnić od typowego szablonu.)

## Kolory

| Kolor (nazwa w motywie) | Do czego |
|---|---|

## Czcionki i tekst

## Odstępy, zaokrąglenia, cienie

## Układ

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

## Historia zmian wyglądu

- (data): (co zmieniono i dlaczego)
