# Wzorzec: dokumenty

Czytasz razem z `code-conventions.md` (zasady ogólne obowiązują zawsze), przy modułach z dokumentami: zamówienie,
faktura, PZ/WZ, zlecenie, protokół. W projekcie ten plik jest w `docs/conventions/`.

## Zasady

- **Pozycje w osobnej tabeli** (`<doc>_items`); sumy liczy serwer z pozycji, nigdy nie bierze ich z żądania.
- **Kopia danych z chwili wystawienia:** nazwa i cena towaru, dane klienta, stawka VAT zapisane w dokumencie, nie
  tylko `product_id`. Zmiana ceny w cenniku nie zmienia starych dokumentów; test to sprawdza.
- **Numeracja** według wzoru ze specu (np. `ZAM/2026/11/0001`). Numer nadaje serwer w transakcji z blokadą licznika
  (tabela `document_counters`, `SELECT … FOR UPDATE`): bez dziur i bez duplikatów, także gdy dwie osoby wystawiają
  naraz. Test na równoczesne wystawienie.
- **Statusy** jako stała w `shared/`, z dozwolonymi przejściami; przejścia sprawdza serwer.
- **Wystawiony dokument jest zamknięty.** Edycja tylko w szkicu. Po wystawieniu: anulowanie albo dokument
  korygujący z odwołaniem do pierwotnego, nigdy nadpisanie. Usunięcie wystawionego dokumentu jest zablokowane.

## Do pytań makiety (propozycje, decyduje użytkownik)

Jakie statusy i przejścia ma dokument; wzór numeru.

## Lista kontrolna

- [ ] dokumenty: kopia danych z chwili wystawienia, numer nadawany w transakcji, wystawionego nie da się edytować
