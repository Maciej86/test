# Kalendarz: pytania do makiety

Makieta: http://localhost:5181/admin/calendar (Panel, jako Administrator). Ustalone wcześniej (2026-11-21, odpowiedzi
1a 2b 3a przy zgłoszeniu): kalendarz widzi tylko administrator; pracownicy w kolumnie po lewej, dni po prawej; widać
urlop do zatwierdzenia, zatwierdzony i chorobowe; chorobowe zgłasza pracownik jak wniosek (typ, który nie zmniejsza
puli), administrator je zatwierdza.

## 1. Okno po kliknięciu paska

Czy w kalendarzu można od razu zatwierdzić albo odrzucić wniosek?

- a) Szczegóły i od razu „Zatwierdź” / „Odrzuć” przy wniosku, który czeka (te same okna co we Wnioskach urlopowych),
  plus „Otwórz wniosek” **(rekomendacja)**
- b) Tylko szczegóły i „Otwórz wniosek”; decyzje zawsze we Wnioskach urlopowych

**Odpowiedź:**

## 2. Wiersze z osobami

Kogo pokazujemy w kolumnie po lewej? Osoby z Archiwum nie mają wiersza.

- a) Wszyscy aktywni pracownicy, także bez nieobecności w tym miesiącu **(rekomendacja)**
- b) Tylko osoby, które w tym miesiącu mają urlop albo chorobowe

**Odpowiedź:**

## 3. Chorobowe

Skąd kalendarz ma wiedzieć, który typ to chorobowe?

- a) W Typach urlopów nowe pole „Rodzaj”: urlop albo chorobowe; dopisany typ „Chorobowe” (nie odejmuje dni z puli);
  typy z rodzajem „chorobowe” są w kalendarzu fioletowe **(rekomendacja)**
- b) Każdy typ urlopu dostaje własny kolor do wybrania w Typach urlopów

**Odpowiedź:**

## 4. Kolory pasków

Jak odróżniać urlop, chorobowe i to, co czeka? Odrzucone, wycofane i anulowane wnioski nie pojawiają się.

- a) Kolor = rodzaj (urlop zielony, chorobowe fioletowe); czekający jasny z dopiskiem „czeka”; urlop do zatwierdzenia
  żółty jak w całej aplikacji **(rekomendacja)**
- b) Tylko zielony = zatwierdzone i żółty = czeka; chorobowe po napisie na pasku

**Odpowiedź:**

## 5. Zakres i telefon

- a) Zawsze cały miesiąc ze strzałkami i „Dziś”; na telefonie ten sam widok przewija się w bok i od razu pokazuje
  dzisiejszy dzień **(rekomendacja)**
- b) Na komputerze miesiąc, na telefonie lista nieobecności z najbliższych 2 tygodni

**Odpowiedź:**

## 6. Powiązania z innymi ekranami

- a) Na Pulpicie przy boksie „Nieobecności na 2 tygodnie” przycisk „Otwórz kalendarz”, a w szczegółach wniosku
  „Pokaż w kalendarzu” (miesiąc tego wniosku) **(rekomendacja)**
- b) Tylko pozycja „Kalendarz” w menu

**Odpowiedź:**

## 7. Klik w pusty dzień

Czy administrator może sam dodać nieobecność, klikając dzień w wierszu osoby?

- a) Nie: nieobecność zawsze zgłasza pracownik, administrator tylko decyduje **(rekomendacja)**
- b) Tak: administrator wpisuje chorobowe za pracownika (np. gdy ten zadzwonił), od razu zatwierdzone

**Odpowiedź:**
