import type { Role } from '@app/shared';

/** Zalogowana osoba w makiecie „Moje konto” (zmyślone dane, ta sama Anna i ten sam Jan co w Pracownikach). */
export interface MockAccount {
  name: string;
  login: string;
  role: Role;
  notifyEmail: string;
  hiredOn: string | null;
  contractType: string | null;
}

export const ACCOUNTS: Record<Role, MockAccount> = {
  admin: {
    name: 'Anna Nowak',
    login: 'anna.nowak@firma.pl',
    role: 'admin',
    notifyEmail: 'anna.nowak@firma.pl',
    hiredOn: '2018-04-03',
    contractType: 'Umowa o pracę',
  },
  employee: {
    name: 'Jan Kowalski',
    login: 'jan.kowalski@firma.pl',
    role: 'employee',
    notifyEmail: 'jan.kowalski@firma.pl',
    hiredOn: '2021-09-01',
    contractType: 'Umowa o pracę',
  },
};
