import { describe, expect, it } from 'vitest';
import { ORDER_DIRECTIONS, orderMoveSchema } from '../ordering';

describe('orderMoveSchema', () => {
  it('accepts up and down', () => {
    expect(ORDER_DIRECTIONS).toEqual(['up', 'down']);
    for (const direction of ORDER_DIRECTIONS) expect(orderMoveSchema.parse({ direction })).toEqual({ direction });
  });

  it('rejects other directions', () => {
    expect(orderMoveSchema.safeParse({ direction: 'left' }).success).toBe(false);
    expect(orderMoveSchema.safeParse({}).success).toBe(false);
  });
});
