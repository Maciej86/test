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
  /** Jak liczyć dni wniosku: robocze (pon–pt bez świąt) albo kalendarzowe (wszystkie). */
  dayCount: 'working' | 'calendar';
  /** Wniosek czeka na decyzję administratora; bez tego od razu jest zatwierdzony. */
  approval: boolean;
  /** Kolor paska w Kalendarzu. */
  color: string;
}

/** Kolory do wyboru dla typu (bez żółtego i czerwonego: to kolory statusów). */
export const TYPE_COLORS = ['green', 'teal', 'cyan', 'navy', 'grape', 'orange'];

/** Pięć typów na start (z wywiadu) i jeden ukryty, żeby było widać, jak wygląda ukryty typ. */
export const LEAVE_TYPES: MockLeaveType[] = [
  { id: 1, name: 'Wypoczynkowy', deducts: true, limit: null, requests: 38, hidden: false, dayCount: 'working', approval: true, color: 'green' },
  { id: 2, name: 'Na żądanie', deducts: true, limit: 4, requests: 11, hidden: false, dayCount: 'working', approval: true, color: 'green' },
  { id: 7, name: 'Chorobowe', deducts: false, limit: null, requests: 9, hidden: false, dayCount: 'calendar', approval: false, color: 'grape' },
  { id: 8, name: 'Ojcowski', deducts: false, limit: 14, requests: 0, hidden: false, dayCount: 'calendar', approval: true, color: 'cyan' },
  { id: 3, name: 'Okolicznościowy', deducts: false, limit: null, requests: 3, hidden: false, dayCount: 'working', approval: true, color: 'teal' },
  { id: 4, name: 'Bezpłatny', deducts: false, limit: null, requests: 1, hidden: false, dayCount: 'working', approval: true, color: 'orange' },
  { id: 5, name: 'Opieka nad dzieckiem', deducts: false, limit: 2, requests: 5, hidden: false, dayCount: 'working', approval: true, color: 'navy' },
  { id: 6, name: 'Szkoleniowy', deducts: false, limit: 6, requests: 2, hidden: true, dayCount: 'working', approval: true, color: 'navy' },
];

/** Nazwa wpisana w stanie „Nazwa zajęta”: taki typ już jest (ukryty). */
export const TAKEN_NAME = 'szkoleniowy';
