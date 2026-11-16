# Testy: E-mail

Przed testem: `npm run db` (baza i skrzynka testowa Mailpit), `npm run dev`, aplikacja: http://localhost:5180,
skrzynka testowa: http://localhost:8025.

## E-mail o nowym wniosku

1. W terminalu VS Code wpisz `npm run email:test` → napis „Wysłano e-mail testowy…”.
2. Otwórz http://localhost:8025 → na liście e-mail „Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027” od
   „Urlopy i zadania”.
3. Otwórz go → wygląda jak makieta: granatowy pasek, termin dużą czcionką, wiersze z typem, dniami, pulą i komentarzem,
   przycisk „Otwórz wniosek”.
4. W Mailpit zakładka „Text” → ta sama treść bez kolorów.
5. Zakładka „HTML Check” albo podgląd na wąskim oknie → czytelne na telefonie.

## Powrót po zalogowaniu

1. Wyloguj się. Wpisz w pasku adresu http://localhost:5180/admin/employees → ekran logowania.
2. Zaloguj się jako administrator → od razu lista pracowników (nie Pulpit).
3. Wyloguj się. Wpisz http://localhost:5180/login?next=https://example.com i zaloguj się → Pulpit (obcy adres
   pominięty).

## Próby nadużyć
(uzupełniane na etapie testy)
