import { Router } from 'express';
import { myAccountEmailSchema, myAccountPasswordSchema, type MyAccountEmailInput, type MyAccountPasswordInput } from '@app/shared';
import { setAuthCookie, signToken } from '../../auth/token';
import { passwordChangeLimiter } from '../../middleware/rateLimit';
import { actorOf, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { changeMyPassword, getMyAccount, updateMyEmail } from './my-account.service';

/** Moduł Moje konto: tylko konto zalogowanej osoby (`req.user`); podpięty w app.ts przez mountModule (role z nawigacji). */
export const myAccountRoutes = Router();

myAccountRoutes.get('/', async (req, res) => {
  reply(res, await getMyAccount(req.user!.id));
});

myAccountRoutes.put('/email', validateBody(myAccountEmailSchema), async (req, res) => {
  reply(res, await updateMyEmail(actorOf(req.user), (req.body as MyAccountEmailInput).email));
});

// Limit przed sprawdzeniem danych: każda nieudana próba się liczy.
myAccountRoutes.post('/password', passwordChangeLimiter, validateBody(myAccountPasswordSchema), async (req, res) => {
  const result = await changeMyPassword(actorOf(req.user), req.body as MyAccountPasswordInput);
  if ('error' in result) return reply(res, result);
  // Inne sesje tej osoby właśnie wygasły; ta dostaje nowe ciasteczko i zostaje zalogowana.
  setAuthCookie(res, signToken(req.user!, result.tokenVersion));
  res.json({ ok: true });
});
