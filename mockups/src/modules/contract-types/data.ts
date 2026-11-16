export interface MockContractType {
  id: number;
  name: string;
  /** Ilu pracowników (także w archiwum) ma ten typ umowy. */
  employees: number;
  hidden: boolean;
}

/** Cztery typy na start (dotychczasowe rodzaje umowy) i jeden ukryty, żeby było widać, jak wygląda ukryty typ. */
export const CONTRACT_TYPES: MockContractType[] = [
  { id: 1, name: 'Umowa o pracę', employees: 4, hidden: false },
  { id: 2, name: 'Umowa zlecenie', employees: 1, hidden: false },
  { id: 3, name: 'Umowa o dzieło', employees: 0, hidden: false },
  { id: 4, name: 'B2B', employees: 1, hidden: false },
  { id: 5, name: 'Umowa o staż', employees: 1, hidden: true },
];

/** Nazwa wpisana w stanie „Nazwa zajęta”: taki typ już jest (ukryty). */
export const TAKEN_NAME = 'umowa o staż';
export const TAKEN_HIDDEN_NAME = 'Umowa o staż';
