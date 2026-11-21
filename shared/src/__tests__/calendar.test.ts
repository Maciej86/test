import { describe, it } from 'vitest';

describe('calendarSegments', () => {
  it.todo('working days leave over a weekend → two bars and a bridge');
  it.todo('working days leave over Christmas Eve and holidays → bars only on working days');
  it.todo('calendar days leave → one bar including weekend');
  it.todo('leave starting before the range → cut to the first day, no leading bridge');
  it.todo('leave ending after the range → cut to the last day, no trailing bridge');
  it.todo('one day leave → one bar');
});
