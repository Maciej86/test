import { z } from 'zod';

/** Kierunek strzałek kolejności na listach (typy urlopów, typy umów, projekty). */
export const ORDER_DIRECTIONS = ['up', 'down'] as const;
export type OrderDirection = (typeof ORDER_DIRECTIONS)[number];

/** Strzałki kolejności (POST /api/<moduł>/:id/move). */
export const orderMoveSchema = z.object({ direction: z.enum(ORDER_DIRECTIONS) });
export type OrderMoveInput = z.output<typeof orderMoveSchema>;
