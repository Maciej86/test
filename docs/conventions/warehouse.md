# Wzorzec: magazyn

Czytasz razem z `code-conventions.md` (zasady ogólne obowiązują zawsze), przy module magazynu: stany, miejsca,
przyjęcia, wydania. Czytasz też `documents.md`. W projekcie ten plik jest w `docs/conventions/`.

## Zasady

- Stan nie jest polem do edycji. Liczy się z ruchów (`stock_movements`: przyjęcie, wydanie, przesunięcie,
  inwentaryzacja), a każdy ruch powstaje z dokumentu.
- Ilości `DECIMAL(12,3)` z jednostką (szt., kg, m).
- **Przyjęcie (PZ) i wydanie (WZ)** to dokumenty jak każdy inny (pozycje, numer, kopia danych, zamknięcie po
  zatwierdzeniu). **Stan zmienia dopiero zatwierdzenie**, nie szkic. Pomyłkę po zatwierdzeniu poprawia korekta (ruch
  w drugą stronę), nigdy edycja.
- **Przyjęcie z faktury zakupu:** PZ ma dostawcę (z tabeli kontrahentów), numer i datę faktury oraz opcjonalnie skan
  (`saveUpload`). Para dostawca + numer faktury jest unikalna, więc tej samej faktury nie da się przyjąć dwa razy
  (409). Gdy spec dopuszcza przyjęcie jednej faktury w częściach, unikalność obejmuje pozycje, nie całą fakturę.
- Pozycja PZ zapisuje ilość **faktycznie przyjętą**; gdy różni się od ilości z faktury, zapisuje obie i uwagę. Cena
  zakupu netto jest zapisana przy pozycji i w ruchu, nawet gdy magazyn liczy na start tylko ilości. Usługi i transport
  z faktury nie trafiają na PZ.
- WZ może wskazywać zamówienie albo numer faktury sprzedaży z programu księgowego, jako odwołanie.
- Testy: szkic nie zmienia stanu, zatwierdzenie zmienia; druga PZ z tą samą fakturą tego samego dostawcy → 409;
  korekta przywraca stan.
- Wydanie w transakcji z blokadą stanu (`SELECT … FOR UPDATE`), z regułą „poniżej zera” ze specu. Test na dwa
  równoczesne wydania ostatniej sztuki.
- **Miejsca składowania** to jedna tabela `locations` z `parent_id` (klucz obcy do tej samej tabeli, `RESTRICT`)
  i poziomem ze słownika `location_levels` ustalonego w specu (np. magazyn → strefa → regał → półka → miejsce). Ta sama
  budowa obsługuje jeden poziom („Magazyn główny”) i pięć. Każde miejsce ma krótki kod, a pełny kod składa się z kodów
  poziomów, np. `M1-A-03-2`; jest unikalny i liczy go serwer.
- Towar leży zawsze w **najniższym poziomie** ze specu. Stan liczy się dla pary towar + miejsce, a stan regału czy
  magazynu to suma miejsc pod nim (zapytanie `WITH RECURSIVE` albo zapisana ścieżka `path`, np. `/1/4/17/`,
  z indeksem).
- Ruchy mają `from_location_id` i `to_location_id`: przyjęcie tylko „do”, wydanie tylko „z”, przesunięcie oba.
  Przesunięcie to dokument jak każdy inny, z historią.
- Miejsca, w którym coś leży albo które ma miejsca pod sobą, nie da się usunąć (409); puste można zarchiwizować.
- Testy: stan regału = suma jego półek; przesunięcie nie zmienia stanu całego magazynu; usunięcie zajętego miejsca
  → 409.

## Do pytań makiety (propozycje, decyduje użytkownik)

Czy stan może zejść poniżej zera; ile poziomów miejsc ma magazyn i jak się nazywają (propozycja: magazyn → regał →
półka; jeden poziom, gdy firma nie szuka towaru po półkach); czy przyjęcie zawsze idzie z fakturą zakupu, czy też
bez (zwrot od klienta, przyjęcie z produkcji); czy jedną fakturę można przyjmować w częściach; czy magazyn liczy także
wartość towaru (wtedy metoda wyceny, np. średnia albo FIFO, „warto potwierdzić z księgową”); czy drukować etykiety
z kodem miejsca (kod kreskowy albo QR to biblioteka spoza listy, więc za zgodą).

## Lista kontrolna

- [ ] stan tylko z ruchów, zmienia go zatwierdzenie dokumentu; wydanie w transakcji z blokadą stanu
- [ ] ta sama faktura zakupu tego samego dostawcy nie wchodzi dwa razy (409)
- [ ] miejsca w jednej tabeli z `parent_id`; zajętego miejsca nie da się usunąć
