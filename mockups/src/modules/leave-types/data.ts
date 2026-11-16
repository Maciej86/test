export interface MockLeaveType {
  id: number;
  name: string;
  /** Dni wniosku zmniejszają pulę pracownika (najpierw zaległe). */
  deducts: boolean;
  /** Ile dni roboczych w roku może wziąć jedna osoba; null = bez limitu. */
  limit: number | null;
  /** Liczba wniosków z tym typem (wszystkie lata). */
  requests: number;
  hidden: boolean;
}

/** Pięć typów na start (z wywiadu) i jeden ukryty, żeby było widać, jak wygląda ukryty typ. */
export const LEAVE_TYPES: MockLeaveType[] = [
  { id: 1, name: 'Wypoczynkowy', deducts: true, limit: null, requests: 38, hidden: false },
  { id: 2, name: 'Na żądanie', deducts: true, limit: 4, requests: 11, hidden: false },
  { id: 3, name: 'Okolicznościowy', deducts: false, limit: null, requests: 3, hidden: false },
  { id: 4, name: 'Bezpłatny', deducts: false, limit: null, requests: 1, hidden: false },
  { id: 5, name: 'Opieka nad dzieckiem', deducts: false, limit: 2, requests: 5, hidden: false },
  { id: 6, name: 'Szkoleniowy', deducts: false, limit: 6, requests: 2, hidden: true },
];

/** Nazwa wpisana w stanie „Nazwa zajęta”: taki typ już jest (ukryty). */
export const TAKEN_NAME = 'szkoleniowy';
