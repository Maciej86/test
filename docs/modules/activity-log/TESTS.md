# Testy: Historia zmian

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako administrator

1. Zaloguj się jako administrator i kliknij w menu „Historia zmian” → widzisz wpisy pogrupowane po dniach („Dzisiaj”,
   „Wczoraj”, data), najnowsze na górze, nad nimi liczbę wpisów.
2. W „Typach urlopów” dodaj typ „Szkoleniowy”, wróć do „Historii zmian” → na górze, pod „Dzisiaj”, zielony wpis „Nowy
   typ urlopu”, „Szkoleniowy”, Twoje imię i godzina.
3. Kliknij ten wpis → rozwija się tabelka „Co się zmieniło” (np. Nazwa: brak → Szkoleniowy) i przycisk „Otwórz typy
   urlopów”. Kliknij przycisk → otwiera się lista typów urlopów. Wróć i ukryj „Szkoleniowy” → w historii szary wpis
   „Ukrycie typu urlopu”.
4. Na tablicy zadań przenieś kartę do innej kolumny → w historii „Przeniesienie zadania” z kolumnami przed → po.
   Kliknij „Otwórz zadanie” → otwiera się tablica projektu z oknem tego zadania. Przesunięcie karty w tej samej
   kolumnie nie dodaje wpisu.
5. Zatwierdź albo odrzuć wniosek urlopowy → w historii zielony albo czerwony wpis z osobą i opisem („wypoczynkowy,
   …, N dni”), „Otwórz wniosek” otwiera szczegóły wniosku.
6. Utwórz projekt „E2E Test historii”, potem usuń go na stałe → wpis „Usunięcie projektu na stałe” ma plakietkę
   „usunięty na stałe” i podpowiedź o zapamiętanej nazwie, bez przycisku „Otwórz”.
7. Wpisz w wyszukiwarkę część nazwiska → zostają wpisy tej osoby (zmienione przez nią albo jej dotyczące).
   Wybierz obszar „Zadania” i osobę w „Kto zmienił” → tylko jej zmiany w zadaniach. Ustaw daty od–do na dzisiaj →
   tylko dzisiejsze. Odśwież stronę → filtry zostają. Kliknij „Wyczyść filtry” → wraca pełna lista.
8. Ustaw filtry, których nic nie spełnia (np. daty sprzed roku) → „Żaden wpis nie pasuje do filtrów…”.
9. Ustaw „Do dnia” wcześniejsze niż „Od dnia” → pod polem komunikat o złej dacie.
10. Zmniejsz okno przeglądarki do szerokości telefonu → filtry jeden pod drugim, wpisy czytelne, bez przewijania w bok.

## Jako pracownik

11. Zaloguj się jako pracownik → w menu nie ma „Historii zmian”; adres http://localhost:5180/admin/activity-log
    pokazuje „Nie masz dostępu do tej części aplikacji.”

## Próby nadużyć

Testy automatyczne w blokach `describe('abuse')` (`activity-log.routes.test.ts`, `activity-log.service.test.ts`,
`ActivityLogPage.test.tsx`), 2026-11-20:

| Próba | Wynik |
|---|---|
| Pracownik otwiera historię i listę osób, także z dopisanymi parametrami → 403, bez danych | przeszła (zablokowane) |
| Ekran historii wpisany ręcznie przez pracownika → brak ekranu i menu (e2e) | przeszła (zablokowane) |
| Zapis, zmiana albo usunięcie wpisu historii (POST/PUT/PATCH/DELETE), także przez administratora → 404 | przeszła (zablokowane) |
| SQL w wyszukiwarce, nieznane pola, sortowanie, numery `1e3`/`0x10`/`007`, ujemna strona, za długie szukanie, zła data → pominięte | przeszła (zablokowane) |
| „Kto zmienił” podrobiony w treści żądania (`userId`, `userName`) → zapis z osobą z sesji | przeszła (zablokowane) |
| Login ze znakami `&`, `=`, `#`, `//` w przycisku „Otwórz” → zakodowany, adres zostaje w panelu | przeszła (zablokowane) |
| Usunięte konto w zmianach → „usunięte konto”, nigdy inna osoba | przeszła (zablokowane) |
| `<script>` w nazwie, opisie i zmianie → widać jako zwykły tekst | przeszła (zablokowane) |
| Adres spoza panelu w odpowiedzi serwera → przycisk „Otwórz” pokazany | **naprawiona**: ekran pokazuje przycisk tylko dla adresów w panelu |
| Nowy typ: „Limit dni w roku” pokazywał „bez limitu → bez limitu” (sprawdzenie w przeglądarce) | **naprawiona**: przy nowym rekordzie pole „przed” jest puste |
| Data „do” przed „od” → 400 przy polu `to` (serwer) i błąd pod polem (ekran) | przeszła (zablokowane) |
| Usunięcie projektu na stałe → wpisy zostają z nazwą i plakietką (e2e) | przeszła (zablokowane) |
| Hasło w historii → tylko „ustawiono hasło tymczasowe” (test Pracowników) | przeszła (zablokowane) |
