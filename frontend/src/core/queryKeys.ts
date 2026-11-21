/**
 * Klucze danych, które odświeżają inne moduły po swoich zmianach (np. kolor typu urlopu, nowy pracownik albo decyzja
 * o wniosku zmieniają Kalendarz). Moduł nie importuje z folderu innego modułu, więc wspólne klucze są tutaj.
 */
export const CALENDAR_KEY = ['calendar'] as const;
export const DASHBOARD_KEY = ['dashboard'] as const;
