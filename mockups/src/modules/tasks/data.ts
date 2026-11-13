export type Column = 'draft' | 'in_progress' | 'done';

export const COLUMNS: Column[] = ['draft', 'in_progress', 'done'];

export const TASKS: { id: number; column: Column; title: string; description?: string; due?: string; overdue?: boolean; people: string[] }[] = [
  { id: 1, column: 'draft', title: 'Zamówić tonery do drukarek', people: ['Katarzyna Wiśniewska'] },
  { id: 2, column: 'draft', title: 'Inwentaryzacja magazynu', description: 'Spis z natury, regały A–F.', due: '2026-11-30', people: ['Jan Kowalski', 'Piotr Zieliński'] },
  { id: 3, column: 'draft', title: 'Odnowić umowę z firmą sprzątającą', due: '2026-12-15', people: ['Anna Nowak'] },
  { id: 4, column: 'in_progress', title: 'Przygotować ofertę dla hurtowni Lewiatan', description: 'Cennik na 2027 i warunki dostaw.', due: '2026-11-18', people: ['Jan Kowalski'] },
  { id: 5, column: 'in_progress', title: 'Szkolenie BHP dla nowych osób', due: '2026-11-10', overdue: true, people: ['Magdalena Lewandowska', 'Tomasz Wójcik'] },
  { id: 6, column: 'done', title: 'Wymiana opon w samochodach służbowych', people: ['Tomasz Wójcik'] },
  { id: 7, column: 'done', title: 'Aktualizacja strony z cennikiem', people: ['Katarzyna Wiśniewska'] },
];

export const EMPLOYEES = ['Anna Nowak', 'Jan Kowalski', 'Katarzyna Wiśniewska', 'Piotr Zieliński', 'Magdalena Lewandowska', 'Tomasz Wójcik'];
