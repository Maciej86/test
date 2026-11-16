/** Zmyślone dane makiety modułu Pracownicy. Rok puli = rok, który jeszcze nie jest zamknięty. */
export const POOL_YEAR = 2026;

export interface MockEmployee {
  id: number;
  name: string;
  login: string;
  notifyEmail: string | null;
  role: 'admin' | 'employee';
  /** Data zatrudnienia RRRR-MM-DD i rodzaj umowy (oba nieobowiązkowe). */
  hiredOn: string | null;
  /** Nazwa typu ze słownika Typy umów (od modułu Typy umów zamiast stałej listy). */
  contractType: string | null;
  /** Konto osoby, która ogląda makietę (Anna Nowak, administrator). */
  isMe?: boolean;
  /** Pula na POOL_YEAR; administrator nie ma puli. */
  pool: { annual: number; carried: number; used: number; pending: number } | null;
  /** Do okna „Do archiwum”: ile wniosków czeka na decyzję i do ilu zadań jest przypisany. */
  pendingRequests: number;
  tasks: number;
}

/** Typy umów do pola „Rodzaj umowy” (w aplikacji prowadzi je administrator w Ustawieniach → Typy umów). */
export const CONTRACT_TYPE_NAMES = ['Umowa o pracę', 'Umowa zlecenie', 'Umowa o dzieło', 'B2B'];

export const EMPLOYEES: MockEmployee[] = [
  { id: 1, name: 'Anna Nowak', login: 'anna.nowak@firma.pl', notifyEmail: 'anna.nowak@firma.pl', hiredOn: '2018-04-03', contractType: 'Umowa o pracę', role: 'admin', isMe: true, pool: null, pendingRequests: 0, tasks: 4 },
  { id: 2, name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', notifyEmail: 'jan.kowalski@firma.pl', hiredOn: '2021-09-01', contractType: 'Umowa o pracę', role: 'employee', pool: { annual: 26, carried: 4, used: 9, pending: 2 }, pendingRequests: 1, tasks: 3 },
  { id: 3, name: 'Katarzyna Wiśniewska', login: 'katarzyna.wisniewska@firma.pl', notifyEmail: null, hiredOn: '2024-02-12', contractType: 'Umowa zlecenie', role: 'employee', pool: { annual: 20, carried: 2, used: 10, pending: 0 }, pendingRequests: 0, tasks: 2 },
  { id: 4, name: 'Piotr Zieliński', login: 'piotr.zielinski@firma.pl', notifyEmail: 'p.zielinski@gmail.com', hiredOn: null, contractType: 'B2B', role: 'employee', pool: { annual: 26, carried: 0, used: 8, pending: 3 }, pendingRequests: 1, tasks: 5 },
  { id: 5, name: 'Magdalena Lewandowska', login: 'magdalena.lewandowska@firma.pl', notifyEmail: null, hiredOn: '2019-01-07', contractType: 'Umowa o pracę', role: 'employee', pool: { annual: 26, carried: 6, used: 32, pending: 0 }, pendingRequests: 0, tasks: 1 },
  { id: 6, name: 'Tomasz Wójcik', login: 'tomasz.wojcik@firma.pl', notifyEmail: 'tomasz.wojcik@firma.pl', hiredOn: null, contractType: null, role: 'employee', pool: { annual: 20, carried: 5, used: 2, pending: 1 }, pendingRequests: 0, tasks: 0 },
];

/** Konto w archiwum z loginem, który ktoś próbuje założyć drugi raz (stan „Login zajęty”). */
export const ARCHIVED_DUPLICATE = { name: 'Ewa Mazur', login: 'ewa.mazur@firma.pl' };

/** Przykładowe hasło z przycisku „Wygeneruj”. */
export const GENERATED_PASSWORD = 'Sosna-48-Kruk!';

/** Dni z puli: zaległe schodzą pierwsze. */
export const poolParts = (pool: NonNullable<MockEmployee['pool']>) => {
  const total = pool.annual + pool.carried;
  const usedCarried = Math.min(pool.used, pool.carried);
  const leftCarried = pool.carried - usedCarried;
  const leftAnnual = pool.annual - (pool.used - usedCarried);
  return { total, left: leftCarried + leftAnnual, leftCarried, leftAnnual };
};
