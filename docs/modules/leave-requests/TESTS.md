# Testy: Wnioski urlopowe

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

**Dane do sprawdzenia** (dodałem je przy sprawdzaniu w przeglądarce): pracownik **Kasia Przeglądarka** z dwoma wnioskami
na 1 dzień: 24.11.2026 (już zatwierdzony) i 01.12.2026 (czeka na decyzję). Zalogujesz się na nią loginem
`e2e.tmp.browser1794954977069@test.local` i hasłem testowym `Test-haslo-123!`. To konto testowe: zniknie przy
następnym uruchomieniu testów w przeglądarce (`npm run test:e2e`).

## Jako administrator (Twoje konto)

1. W menu kliknij „Wnioski urlopowe” → nagłówek „1 wniosek czeka na decyzję. Najdłużej czeka wniosek złożony …”,
   zakładka „Czekają (1)”, wiersz Kasi z 01.12.2026, kolumna „Zostało w puli”, przyciski „Zatwierdź” i „Odrzuć”.
2. Kliknij wiersz → z prawej otwierają się szczegóły „Wniosek nr …” z paskiem „Kto jeszcze ma wtedy wolne” i boksem
   „Pula na 2026”; adres zmienia się na `/admin/leave-requests/<numer>`. Zamknij krzyżykiem → wracasz na listę.
3. Kliknij „Odrzuć”, zostaw puste pole i kliknij „Odrzuć wniosek” → pod polem „To pole jest wymagane.”. Wpisz „ab” →
   „Wpisz powód (co najmniej 3 znaki)…”. Kliknij „Wróć” → nic się nie zmienia.
4. Kliknij „Zatwierdź” → okno „Zatwierdzić wniosek?” z zielonym przyciskiem; „Wróć” nic nie zmienia, „Zatwierdź” →
   dymek „Wniosek zatwierdzony. Kasia Przeglądarka dostaje powiadomienie.”, wniosek znika z „Czekają”.
5. Zakładka „Zatwierdzone” → oba wnioski Kasi z „Test Administrator”/Twoim imieniem i datą decyzji. „PDF” otwiera
   wniosek w nowej karcie.
6. Przy 24.11.2026 kliknij „Anuluj urlop”, wpisz powód „Przesunięty na styczeń.” → dymek „Urlop anulowany, dni wróciły
   do puli…”; w zakładce „Anulowane” wniosek z powodem w cudzysłowie, „Zostało w puli” wzrasta o 1.
7. Wpisz w adres `/admin/leave-requests/abc` → lista i dymek „Nie ma takiego wniosku.”.
8. Wyszukiwarka: wpisz „Kasia ” (ze spacją na końcu), poczekaj chwilę i dopisz „P” → w polu „Kasia P”, lista
   z wnioskami Kasi.
9. Na telefonie (albo wąskim oknie): zakładki są listą rozwijaną, wnioski kartami, szczegóły na cały ekran.

## Jako pracownik (Kasia Przeglądarka)

1. Zaloguj się na Kasię, kliknij dzwonek → „Urlop zatwierdzony” i „Urlop anulowany” z powodem.
2. „Moje urlopy” → 24.11.2026 „Anulowany” z powodem „„Przesunięty na styczeń.””, 01.12.2026 „Zatwierdzony” z „PDF”.
3. Wpisz w adres `/admin/leave-requests` → „Nie masz dostępu do tej części aplikacji.”.

## Próby nadużyć

Testy automatyczne: `backend/src/modules/leave-requests/__tests__/leave-requests.routes.test.ts` (`describe('abuse')`)
i `e2e/leave-requests.spec.ts` (`abuse`, na prawdziwej bazie).

- Pracownik wywołuje listę, szczegóły i decyzje przez API, także dla własnego wniosku → 403: przeszła
- Bez logowania każda trasa → 401: przeszła
- Dziwne numery w adresie (`0`, `-1`, `1.5`, `abc`, `0x10`, `007`, `1e3`, `21;DROP`, bardzo długi) → 404: przeszła
- Numery w filtrach listy (`?leaveTypeId=0x10`, `?year=1e3`) → wcześniej `0x10` stawało się typem nr 16; naprawiona
  (numer z adresu tylko z cyfr, wspólne pole `addressNumber`)
- Podrobione pola przy decyzji (status, kto zdecydował, właściciel, rok puli) → decyzję zapisuje zalogowany
  administrator, status liczy serwer: przeszła
- Dwa zatwierdzenia tego samego wniosku naraz (prawdziwa baza) → jedno 200, drugie 409, jedno powiadomienie: przeszła
- Przejścia spoza specu: odrzucenie zatwierdzonego, anulowanie czekającego i odrzuconego, zatwierdzenie odrzuconego
  i wycofanego → 409, wniosek bez zmian: przeszła
- Pracownik wycofuje wniosek, a administrator go zatwierdza → 409 „Pracownik wycofał ten wniosek.”: przeszła
- `<script>alert(1)</script>` jako powód → pracownik widzi go jako zwykły tekst, bez okienka: przeszła
- Powód pusty, z samych spacji, 2 znaki, 501 znaków, liczba albo lista zamiast tekstu → 400 pod polem: przeszła
- Wniosek osoby w archiwum → można rozpatrzyć, historia zostaje: przeszła
- Pula po decyzjach (anulowany, odrzucony, wycofany wracają, zatwierdzony zostaje) → 16 → 19 dni: przeszła
- „Zamknij rok” w tej samej chwili co decyzja → wcześniej możliwe złe przeniesienie dni albo zakleszczenie;
  naprawiona przy przeglądzie kodu (blokady); anulowanie po zamknięciu roku → 409 (test usługi, bez zamykania roku
  w bazie testowej)
