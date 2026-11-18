import { describe, expect, it, vi } from 'vitest';
import { swapWithNeighbour } from '../ordering';

const rows = [
  { id: 4, position: 1 },
  { id: 7, position: 3 },
  { id: 9, position: 6 },
];
const db = { query: vi.fn() };

describe('swapWithNeighbour', () => {
  it('swaps positions with the previous item when moving up', async () => {
    const setPosition = vi.fn();
    expect(await swapWithNeighbour(db, rows, 7, 'up', setPosition)).toEqual({ ok: true });
    expect(setPosition.mock.calls).toEqual([[db, 7, 1], [db, 4, 3]]);
  });

  it('swaps with the next item when moving down', async () => {
    const setPosition = vi.fn();
    await swapWithNeighbour(db, rows, 7, 'down', setPosition);
    expect(setPosition.mock.calls).toEqual([[db, 7, 6], [db, 9, 3]]);
  });

  it('first up and last down change nothing', async () => {
    const setPosition = vi.fn();
    expect(await swapWithNeighbour(db, rows, 4, 'up', setPosition)).toEqual({ ok: true });
    expect(await swapWithNeighbour(db, rows, 9, 'down', setPosition)).toEqual({ ok: true });
    expect(setPosition).not.toHaveBeenCalled();
  });

  it('unknown id gives 404', async () => {
    const result = await swapWithNeighbour(db, rows, 99, 'up', vi.fn());
    expect(result).toEqual({ error: expect.objectContaining({ status: 404 }) });
  });
});
