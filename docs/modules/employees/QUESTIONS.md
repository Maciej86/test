# Pracownicy: pytania do makiety

Makieta: http://localhost:5181/admin/employees (w menu makiety „Pracownicy”). Przełącznik „Pokaż stan” pokazuje
stany ekranu: lista, „Tylko Ty” (jeszcze bez pracowników), brak wyników wyszukiwania, login zajęty przez konto
w archiwum. Przyciski „Dodaj pracownika”, „Zamknij rok 2026”, „Edytuj”, „Ustaw hasło” i „Do archiwum” otwierają okna.

## 1. Kolumna „Urlop w 2026”: jak liczyć, ile dni zostało?

Wnioski zbuduje moduł „Moje urlopy”; tu ekran tylko pokazuje ich wynik.

- a) Dni odejmują tylko zatwierdzone wnioski; dni z wniosków czekających są w dopisku pod paskiem **(polecam)**
- b) Wnioski czekające też od razu zmniejszają „zostało”

**Odpowiedź:**

## 2. Zamknij rok: co przechodzi na nowy rok?

- a) Wszystkie niewykorzystane dni, także stare zaległe, przechodzą do zaległych na nowy rok **(polecam)**
- b) Przechodzą tylko dni z puli rocznej; niewykorzystane stare zaległe przepadają

**Odpowiedź:**

## 3. Zamknij rok: skąd pula dni na nowy rok?

- a) W oknie przy każdej osobie podpowiedź: pula taka jak w zamykanym roku, do zmiany **(polecam)**
- b) Jedna liczba dla wszystkich, wpisana raz

**Odpowiedź:**

## 4. Zamknij rok: czy da się cofnąć?

Przycisk działa w dowolnym dniu (np. już w grudniu); aplikacja sama roku nie zamyka.

- a) Bez cofania: przed zatwierdzeniem okno z podglądem, potem pojedyncze poprawki w „Edytuj” **(polecam)**
- b) Przycisk „Cofnij zamknięcie roku”, dopóki nikt nie złożył wniosku na nowy rok

**Odpowiedź:**

## 5. Hasło przy dodawaniu i przy „Ustaw hasło”

W obu przypadkach hasło jest tymczasowe: przy logowaniu pracownik ustawia własne (ustalone w Logowaniu).

- a) Wpisujesz hasło sam albo klikasz „Wygeneruj” **(polecam)**
- b) Tylko „Wygeneruj”, bez wpisywania

**Odpowiedź:**

## 6. Rola i własne konto

Administrator nie ma puli dni, więc przy tej roli pola puli znikają z okna.

- a) Możesz nadać rolę Administrator innej osobie; własnej roli nie zmienisz i własnego konta nie zarchiwizujesz
  **(polecam)**
- b) Administrator jest tylko jeden (Ty); pole „Rola” znika

**Odpowiedź:**

## 7. Do archiwum: co z wnioskami czekającymi na decyzję?

Przy zadaniach osoba zostaje z dopiskiem „zarchiwizowany” (ustalone w specu ogólnym).

- a) Wycofują się same, z wpisem w historii zmian **(polecam)**
- b) Zostają na liście wniosków do decyzji administratora

**Odpowiedź:**

## 8. Wyszukiwarka i filtry

- a) Szukanie po imieniu, nazwisku i loginie, filtr roli, kolejność: nazwisko albo „najmniej dni zostało”
  **(polecam)**
- b) To samo i dodatkowo filtr „bez e-maila do powiadomień”

**Odpowiedź:**

## 9. Ekran z kartoteką jednej osoby

- a) Bez osobnego ekranu: w „Edytuj” zmieniasz pulę bieżącego roku; starsze lata widać w historii zmian **(polecam)**
- b) Osobny ekran pracownika z pulami z kolejnych lat i jego wnioskami

**Odpowiedź:**

## 10. Zasady pól

| Pole | Wymagane | Zakres | Format |
|---|---|---|---|
| Imię i nazwisko | tak | 2–150 znaków | — |
| Login | tak | 3–190 znaków | bez spacji, zapisywany małymi literami, niepowtarzalny także w archiwum, np. `jan.kowalski@firma.pl` |
| E-mail do powiadomień | nie | do 190 znaków | prawdziwy adres, niepowtarzalny, np. `jan.kowalski@gmail.com` |
| Rola | tak | Pracownik / Administrator | domyślnie Pracownik |
| Hasło tymczasowe | tak (przy dodawaniu i „Ustaw hasło”) | 8–72 znaki | co najmniej jedna cyfra i jeden znak specjalny (jak w Logowaniu) |
| Dni na rok | tak (rola Pracownik) | 0–60 | liczba całkowita, domyślnie 26 |
| Zaległe | nie | 0–60 | liczba całkowita, domyślnie 0 |

**Odpowiedź:**
