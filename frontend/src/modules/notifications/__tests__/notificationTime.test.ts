import { describe, it } from 'vitest';

describe('notification time', () => {
  it.todo('today → "dzisiaj, GG:MM"');
  it.todo('yesterday 23:50 → "wczoraj, 23:50"');
  it.todo('older → full date and time');
  it.todo('new year: 01.01 vs 31.12 → yesterday');
  it.todo('dayLabel: Dzisiaj / Wczoraj / date');
});
