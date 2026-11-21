# Kalendarz: pytania do makiety

Makieta: http://localhost:5181/admin/calendar (Panel, jako Administrator) i Ustawienia → Typy urlopów
(http://localhost:5181/admin/leave-types).

## Ustalone wcześniej

- 2026-11-21 (zgłoszenie, odpowiedzi 1a 2b 3a): kalendarz widzi tylko administrator; pracownicy w kolumnie po lewej,
  dni po prawej; widać urlop do zatwierdzenia, zatwierdzony i chorobowe; chorobowe zgłasza pracownik w Moich urlopach,
  jak wniosek, typem, który nie zmniejsza puli.
- 2026-11-21 (uwagi do pierwszej makiety):
  - Typ urlopu ma ustawienie **„Liczenie dni”**: dni robocze (pon–pt bez świąt, np. wypoczynkowy) albo dni
    kalendarzowe (wszystkie, np. ojcowski 14 dni). Kalendarz pokazuje to tak samo: urlop w dniach roboczych jest
    przerwany w weekendy i święta (cienka linia łączy kawałki), urlop w dniach kalendarzowych to ciągły pasek.
  - Typ urlopu ma ustawienie **„Wymaga zatwierdzenia”**. Chorobowe nie wymaga: zwolnienie wystawił lekarz albo nie.
  - Kalendarz pokazuje **dziś + 60 dni** (nie miesiąc), kolumny rozciągają się na całą szerokość ekranu; strzałki
    przesuwają o 30 dni, „Dziś” wraca. Na węższym ekranie siatka przewija się w bok.
  - Opis na pasku jest **wyśrodkowany**.

## 1. Panel po kliknięciu paska

Czy w kalendarzu można od razu zatwierdzić albo odrzucić wniosek?

- a) Szczegóły i od razu „Zatwierdź” / „Odrzuć” przy wniosku, który czeka (te same okna co we Wnioskach urlopowych),
  plus „Otwórz wniosek” **(rekomendacja)**
- b) Tylko szczegóły i „Otwórz wniosek”; decyzje zawsze we Wnioskach urlopowych

**Odpowiedź:**

## 2. Wiersze z osobami

Kogo pokazujemy w kolumnie po lewej? Osoby z Archiwum nie mają wiersza.

- a) Wszyscy aktywni pracownicy, także bez nieobecności w widocznych dniach **(rekomendacja)**
- b) Tylko osoby, które w widocznych dniach mają jakąś nieobecność

**Odpowiedź:**

## 3. Kolory pasków

- a) Każdy typ urlopu ma w ustawieniach kolor z 6 (zielony, morski, turkusowy, granatowy, fioletowy, pomarańczowy);
  wniosek, który czeka, jest w tym kolorze, ale jasny, z przerywaną ramką i dopiskiem „czeka” **(rekomendacja)**
- b) Stałe kolory: zielony = zatwierdzony urlop, żółty = czeka, fioletowy = typ bez zatwierdzania

**Odpowiedź:**

## 4. Typ bez zatwierdzania (np. chorobowe): zgłoszenie

- a) Wniosek od razu jest zatwierdzony i odejmuje dni (jeśli typ odejmuje); administrator dostaje powiadomienie
  w dzwonku i e-mail „Tomasz Wójcik zgłosił chorobowe 16–22.11.2026” **(rekomendacja)**
- b) Tak samo, ale bez e-maila, tylko powiadomienie w dzwonku

**Odpowiedź:**

## 5. Typ bez zatwierdzania: pomyłki

- a) Pracownik może je wycofać do pierwszego dnia; potem tylko administrator anuluje z powodem, jak zatwierdzony
  urlop **(rekomendacja)**
- b) Pracownik nie może nic zmienić; tylko administrator anuluje

**Odpowiedź:**

## 6. Dni kalendarzowe: gdzie działają

- a) Wszędzie: formularz wniosku, limit typu, pula (gdy typ odejmuje), wydruk, kalendarz; przy liczbie dopisek
  „dni kalendarzowych”. Istniejące typy zostają „robocze”, a zmiana ustawień typu dotyczy tylko nowych wniosków
  **(rekomendacja)**
- b) Tylko w kalendarzu i na wydruku; limit i pula zawsze w dniach roboczych

**Odpowiedź:**

## 7. Powiązania z innymi ekranami

- a) Na Pulpicie przy boksie „Nieobecności na 2 tygodnie” przycisk „Otwórz kalendarz”, a w szczegółach wniosku
  „Pokaż w kalendarzu” (zakres od pierwszego dnia wniosku) **(rekomendacja)**
- b) Tylko pozycja „Kalendarz” w menu

**Odpowiedź:**

## 8. Klik w pusty dzień

- a) Nic się nie dzieje: nieobecność zawsze zgłasza pracownik w Moich urlopach **(rekomendacja)**
- b) Administrator może wpisać nieobecność za pracownika (np. chorobowe, gdy ten zadzwonił); od razu zatwierdzona

**Odpowiedź:**
