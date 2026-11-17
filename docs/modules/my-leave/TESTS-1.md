# Testy: Moje urlopy, część 1 (wnioski i pula)

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180. Daty w przykładach zakładają, że dziś jest
listopad 2026 (rok otwarty 2026); w innym dniu wybierz podobne dni robocze w przyszłości w roku otwartym.

## Jako pracownik

1. Zaloguj się jako pracownik z pulą 26 dni i kliknij w menu „Moje urlopy” → nagłówek „Moje urlopy”, karta
   „Urlop w 2026” z liczbą dni do wykorzystania, obok „Limity w 2026” (Na żądanie, Opieka nad dzieckiem).
2. Kliknij „Złóż wniosek” → okno; typ „Wypoczynkowy”, pod nim „Odejmuje dni z puli”.
3. Wybierz Od 21.12.2026, Do 31.12.2026 → pasek dni: 24, 25, 26, 27 przekreślone (po najechaniu na 24 „Wigilia”),
   ramka „7 dni roboczych” i ile zostanie po zatwierdzeniu.
4. Wpisz komentarz „Święta u rodziców.”, kliknij „Złóż wniosek” → dymek „Wniosek złożony. Administrator dostał
   powiadomienie.”, wniosek w tabeli na górze ze statusem „Czeka na decyzję”, liczba dni w karcie mniejsza o 7, w pasku
   żółta część „7 czeka na decyzję”.
5. Znowu „Złóż wniosek”, Od 28.12.2026, Do 28.12.2026 → czerwona ramka „Ten termin jest już we wniosku”, przycisk
   „Złóż wniosek” szary.
6. Wybierz Od 11.01.2027 → żółta ramka „Pula na 2027 nie jest jeszcze ustalona”, przycisk szary.
7. Wybierz Od i Do w sobotę i niedzielę → czerwona ramka „W tym terminie nie ma dni roboczych”.
8. Wybierz termin dłuższy niż pozostałe dni (np. 30.11–18.12 przy małej puli) → czerwona ramka „Za mało dni…”.
9. Wybierz typ „Na żądanie” i 5 dni roboczych → czerwona ramka „Przekroczony limit: Na żądanie”.
10. W kalendarzu pola „Od” dni przed dziś są szare (nie da się ich wybrać).
11. Zamknij okno. Przy wniosku z kroku 4 kliknij „Wycofaj” → okno „Wycofać wniosek?” z terminem i zdaniem o 7 dniach;
    kliknij „Zostaw” → nic się nie zmienia; kliknij znowu „Wycofaj” i w oknie „Wycofaj” → dymek „Wniosek wycofany. Dni
    wróciły do puli.”, status „Wycofany”, pod dniami „nie liczą się do puli”, liczba w karcie wraca.
12. Złóż wniosek „Okolicznościowy” na jeden dzień → ramka „Ten typ nie odejmuje dni z puli.”, po złożeniu w tabeli
    „nie odejmuje z puli”, liczba dni w karcie bez zmian.
13. W wyborze roku nad tabelą wybierz inny rok bez wniosków → „W tym roku nie masz jeszcze wniosków…” z przyciskiem
    „Złóż wniosek”. Odśwież stronę → wybrany rok zostaje.
14. Zmniejsz okno do szerokości telefonu → karty zamiast tabeli, w oknie wniosku pola dat jedno pod drugim, pasek dni
    układa się w tygodnie.

## Jako administrator

1. Po kroku 4 pracownika: dzwonek pokazuje „Nowy wniosek urlopowy” od tej osoby; w Mailpit (http://localhost:8026)
   jest e-mail „Nowy wniosek urlopowy” (tylko gdy administrator ma e-mail do powiadomień).
2. „Pracownicy” → przy tej osobie w pasku puli dopisek „7 dni czeka na decyzję”.
3. Kliknij „Zamknij rok 2026” → żółta ramka „Najpierw rozpatrz 1 wniosek czekający na decyzję. Wtedy zamkniesz rok.”,
   przycisk „Zamknij rok 2026” szary. Zamknij okno (nie zamykaj roku).
4. Po wycofaniu (krok 11 pracownika): dzwonek „Wniosek wycofany”, w „Pracownikach” dopisek o czekających znika.
5. „Ustawienia → Typy urlopów” → w kolumnie „Wnioski” przy „Wypoczynkowy” liczba złożonych wniosków (także
   wycofanych); w „Edytuj” żółta ramka o typie użytym we wnioskach.
6. W menu administratora nie ma „Moje urlopy”; adres http://localhost:5180/admin/my-leave pokazuje „Nie masz dostępu do tej części aplikacji.”

## Próby nadużyć

Sprawdzone 2026-11-17 (testy `describe('abuse')` w `my-leave.routes.test.ts` i w `e2e/my-leave.spec.ts`, na prawdziwej bazie):

| Próba | Wynik |
|---|---|
| Wycofanie cudzego wniosku (inny pracownik, numer w adresie) | odparta: 404 jak nieistniejący |
| Lista i pula innej osoby (`?userId=`, `user_id` w treści) | odparta: zawsze tylko własne (`req.user`) |
| Administrator składa wniosek albo otwiera `/admin/my-leave` | odparta: 403, „Nie masz dostępu…” |
| Podrobione pola (status „zatwierdzony”, liczba dni, podział, rok puli, decyzja, właściciel) | odparta: serwer liczy sam, wniosek „czeka”, dni policzone |
| Dwa wnioski naraz, razem ponad limit „Na żądanie” | odparta: jeden zapisany, drugi 409 |
| Dwa wycofania naraz | odparta: jedno przechodzi, drugie 409 |
| Złe numery w adresie (`abc`, `0x10`, `1e3`, `-1`, ogromne) | odparta: 404 |
| Złe dane: odwrócone daty, komentarz 501 znaków, ujemny lub ogromny numer typu, rok `abc`, data w przeszłości | odparta: 400 z komunikatem przy polu |
| `<script>alert(1)</script>` w komentarzu | odparta: widać zwykły tekst |
| Usunięcie konta albo typu urlopu z wnioskami | odparta: klucz obcy RESTRICT, historia zostaje |
| „Zamknij rok” w chwili składania wniosku | naprawiona przy przeglądzie kodu: liczenie czekających wniosków z blokadą |
