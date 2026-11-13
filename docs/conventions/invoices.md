# Wzorzec: faktury

Czytasz razem z `code-conventions.md` (zasady ogólne obowiązują zawsze), przy fakturach i kwotach z VAT. Czytasz też
`documents.md`. W projekcie ten plik jest w `docs/conventions/`.

## Zasady

- **W wywiadzie zapytaj, gdzie firma wystawia faktury dziś.** Wariant a (polecam, domyślny): aplikacja prowadzi
  zamówienia i przekazuje dane do programu księgowego (eksport albo połączenie z programem). Wariant b: aplikacja sama
  wystawia faktury; wtedy wysyłka do KSeF to osobny moduł z dodatkową biblioteką i kontem testowym KSeF. Powiedz
  jednym zdaniem, że prawdziwe faktury to więcej obowiązków niż zwykły dokument.
- Kwoty liczone **od pozycji**: kwota pozycji → VAT pozycji zaokrąglony do grosza → suma dokumentu.
- Stawki VAT jako słownik w panelu, nie lista w kodzie.

## Do pytań makiety (propozycje, decyduje użytkownik)

Czy VAT liczyć od netto, czy od brutto („warto potwierdzić z księgową”).

## Lista kontrolna

- [ ] kwoty liczone od pozycji, VAT pozycji zaokrąglony do grosza; stawki VAT ze słownika
