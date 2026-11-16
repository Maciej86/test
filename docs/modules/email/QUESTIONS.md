# E-mail: pytania do makiety

Makieta: http://localhost:5181/email (w menu makiety „E-mail: nowy wniosek”). Przełącznik „Pokaż” pokazuje: e-mail,
wersję tekstową (dla programów bez kolorów), wniosek bez komentarza i wygląd na telefonie.

**[decyzja AI]** Treść e-maila jest na jasnym tle (programy pocztowe pokazują e-maile na białym), z granatowym paskiem
z nazwą aplikacji. Każdy e-mail ma też wersję tekstową. Do czasu prawdziwej wysyłki e-maile łapie skrzynka testowa
Mailpit na tym komputerze (http://localhost:8025). Jedyny e-mail aplikacji: nowy wniosek → każdy administrator
z e-mailem do powiadomień (spec ogólny).

## 1. Co ma być w e-mailu o nowym wniosku?

- a) Wszystko, co pomaga zdecydować: kto, typ, termin, dni robocze, z której puli, ile zostanie i komentarz
  pracownika **(polecam)**
- b) To samo, ale bez komentarza (komentarz bywa prywatny; przeczytasz go w aplikacji)
- c) Tylko „Nowy wniosek od Jan Kowalski” i przycisk, szczegóły wyłącznie w aplikacji

**Odpowiedź:**

## 2. Jaki temat e-maila?

- a) „Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027”: widać wszystko już na liście e-maili **(polecam)**
- b) Krótko: „Nowy wniosek urlopowy”

**Odpowiedź:**

## 3. Jaka nazwa nadawcy ma się pokazać w skrzynce?

- a) Nazwa aplikacji: „Urlopy i zadania” **(polecam)**
- b) Nazwa firmy (napisz jaka)

**Odpowiedź:**

## 4. Co, gdy wysyłka e-maila się nie uda (np. chwilowa awaria poczty)?

- a) Wniosek i tak się zapisuje, pracownik nic nie widzi; administrator ma wniosek w aplikacji i w dzwonku, a błąd
  trafia do dziennika serwera **(polecam)**
- b) Wniosek się zapisuje, a pracownik widzi dymek „Wniosek złożony, ale e-mail do administratora nie doszedł”

**Odpowiedź:**

## 5. Kiedy włączyć prawdziwą wysyłkę e-maili?

- a) Do publikacji e-maile łapie skrzynka testowa na Twoim komputerze (nikt ich nie dostaje); prawdziwą wysyłkę
  ustawimy przy publikacji, z adresem w Twojej domenie **(polecam)**
- b) Już teraz, żebyś dostawał prawdziwe e-maile na swoją skrzynkę (darmowe konto w Mailgun, ok. 15 minut, działa
  tylko na adresy, które sam zatwierdzisz)

**Odpowiedź:**

## 6. Przycisk „Otwórz wniosek”: co, gdy nie jesteś zalogowany?

Przycisk prowadzi do wniosku w aplikacji (`/admin/leave-requests/<numer>`, ekran z modułu Wnioski urlopowe). Dziś po
zalogowaniu aplikacja zawsze przenosi na Pulpit.

- a) Niezalogowany widzi ekran logowania, a po zalogowaniu wraca od razu do tego wniosku; przyjmowane są tylko adresy
  w obrębie aplikacji (zaczynające się od `/admin`), żeby link nie mógł przenieść na obcą stronę **(polecam)**
- b) Po zalogowaniu zawsze Pulpit (jak dziś); wniosek szukasz na liście „Wnioski urlopowe”

**Odpowiedź:**
