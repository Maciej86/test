# Stan projektu: test

**Wersja stepkit:** 0.1.34

**Następny krok:** Moduł Typy umów, etap makieta (wpisz `/stepkit:dalej` w nowej rozmowie).

## Start aplikacji

- [x] 1. Sprawdzenie komputera
- [x] 2. Szkielet i repo
- [x] 3. Opis
- [x] 4. Wywiad
- [x] 5. Podsumowanie
- [x] 6. Makieta ogólna
- [x] 7. Spec ogólny
- [x] 8. Plik stanu

## Moduły

| # | Moduł | Folder | Status | Etap | Zależy od |
|---|---|---|---|---|---|
| 1 | Wygląd | appearance | zrobiony | zamknięcie | — |
| 2 | Logowanie | login | zrobiony | zamknięcie | appearance |
| 3 | Pracownicy | employees | zrobiony | zamknięcie | login |
| 4 | Typy urlopów | leave-types | zrobiony | zamknięcie | login |
| 5 | E-mail | email | zrobiony | zamknięcie | login |
| 6 | Powiadomienia | notifications | zrobiony | zamknięcie | login |
| 7 | Typy umów | contract-types | czeka | makieta | employees |
| 8 | Moje urlopy | my-leave | czeka | makieta | employees, leave-types, email, notifications |
| 9 | Wnioski urlopowe | leave-requests | czeka | makieta | my-leave |
| 10 | Zadania | tasks | czeka | makieta | employees, notifications |
| 11 | Historia zmian | activity-log | czeka | makieta | employees, my-leave, leave-requests, tasks |
| 12 | Archiwum | archive | czeka | makieta | employees, tasks |
| 13 | Moje konto | my-account | czeka | makieta | login |
| 14 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 15 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, contract-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-16: Nowy moduł 7 „Typy umów” (contract-types) przed „Moimi urlopami”: administrator prowadzi listę typów umów w menu „Ustawienia”; obecne 4 rodzaje umowy staną się typami na start.

- 2026-11-16: Poprawka w Pracownikach (prośba użytkownika): nieobowiązkowe „Data zatrudnienia” i „Rodzaj umowy” (umowa o pracę, zlecenie, o dzieło, B2B) w oknach dodaj/edytuj i jako kolumny listy; wspólne pole daty `DateField`.

- 2026-11-16: Aktualizacja stepkit 0.1.33 → 0.1.34: pomysły, zmiany i błędy zgłaszane poleceniem `/stepkit:zglos` (linia w README).

- 2026-11-16: Aktualizacja stepkit 0.1.29 → 0.1.33: baza w strefie UTC (`--default-time-zone=+00:00`), wspólne `formatRelativeDateTime`/`formatRelativeDay` w `shared/src/date.ts` zamiast własnych w Powiadomieniach, README: nowa rozmowa przez `/clear`. Powrót po zalogowaniu, `timezone: 'Z'` i podświetlenie menu projekt już miał.

- 2026-11-16: Moduł Powiadomienia zrobiony (potwierdzony przez użytkownika): dzwonek w belce (okienko na komputerze, panel na cały ekran na telefonie), strona `/admin/notifications`, `notifyUsers`/`notifyAdmins` dla urlopów i zadań, `npm run notifications:test`; poprawka: godziny z bazy czytane w UTC (`timezone: 'Z'`).

- 2026-11-16: Powiadomienia: spec zaakceptowany (dzwonek, strona „wszystkie”, `notifyUsers`/`notifyAdmins` dla kolejnych modułów, `npm run notifications:test`).

- 2026-11-16: Powiadomienia: odpowiedzi 1a–6a (strona „wszystkie”, przeczytane po kliknięciu, odświeżanie co minutę, przeczytane usuwane po 90 dniach, każdy administrator osobno, teksty ok).

- 2026-11-16: Powiadomienia: makieta dzwonka w belce (licznik nieprzeczytanych, 8 ostatnich, „Oznacz wszystkie jako przeczytane”) i strony „wszystkie” (grupy po dniach, filtr „Nieprzeczytane”); 6 pytań.

- 2026-11-16: Moduł E-mail zrobiony (potwierdzony przez użytkownika): e-mail „Nowy wniosek urlopowy” do administratorów z e-mailem (`emailAdminsAboutNewRequest`, woła go „Moje urlopy” bez czekania), skrzynka testowa Mailpit (port 8026), `npm run email:test`, po zalogowaniu powrót na otwierany adres w panelu (`?next=`, `safeNextPath`).

- 2026-11-16: Skrzynka testowa Mailpit na porcie 8026 (`MAILPIT_PORT` w `.env`), bo 8025 zajmuje inny projekt.
