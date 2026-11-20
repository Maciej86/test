import { MY_ACCOUNT_MESSAGES, SERVER_MESSAGES, type MyAccount, type MyAccountPasswordInput } from '@app/shared';
import { hashPassword, verifyPassword } from '../../auth/password';
import { findPasswordHash, updatePassword } from '../../auth/users.queries';
import { diffChanges, logActivity } from '../../db/activityLog';
import { isDuplicateEntry } from '../../db/errors';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { fail, notFound, type Actor, type Result } from '../../middleware/routeHelpers';
import * as q from './my-account.queries';

/** Ten sam błąd co w Pracownikach, ale bez nazwiska i linku przywracania (pracownik nie poznaje cudzych kont). */
const EMAIL_TAKEN = 'validation.email_taken';
const emailTaken = () => fail(409, EMAIL_TAKEN, { fields: { email: EMAIL_TAKEN } });

const logOwn = (actor: Actor) => ({
  userId: actor.id, userName: actor.name, action: 'update', entityType: 'users', entityId: actor.id, entityName: actor.name,
});

export const getMyAccount = async (userId: number): Promise<Result<MyAccount>> =>
  (await q.findMyAccount(pool, userId)) ?? notFound();

/** Własny e-mail do powiadomień; bez zmiany adresu nic się nie zapisuje (ani wpis historii). */
export const updateMyEmail = async (actor: Actor, email: string | null): Promise<Result<{ email: string | null }>> => {
  try {
    return await withTransaction(async (conn) => {
      const before = await q.lockMyEmail(conn, actor.id);
      const changes = diffChanges({ email: before }, { email });
      if (Object.keys(changes).length === 0) return { email };
      if (email !== null && (await q.isEmailTaken(conn, email, actor.id))) return emailTaken();
      await q.setMyEmail(conn, actor.id, email);
      await logActivity(conn, { ...logOwn(actor), changes });
      return { email };
    });
  } catch (error) {
    // Wyścig dwóch zapisów tego samego adresu: unikalny indeks w bazie odrzuca drugi.
    if (isDuplicateEntry(error, 'uq_users_email')) return emailTaken();
    throw error;
  }
};

/**
 * Zmiana własnego hasła z obecnym. Hasło i wpis historii (bez hasła) w jednej transakcji; zwraca nową wersję sesji
 * do ciasteczka tej osoby, inne jej sesje się kończą.
 */
export const changeMyPassword = async (actor: Actor, input: MyAccountPasswordInput): Promise<Result<{ tokenVersion: number }>> => {
  const currentHash = await findPasswordHash(actor.id);
  if (!currentHash || !(await verifyPassword(input.currentPassword, currentHash))) {
    return fail(400, SERVER_MESSAGES.invalidData, { fields: { currentPassword: MY_ACCOUNT_MESSAGES.currentWrong } });
  }
  if (await verifyPassword(input.newPassword, currentHash)) {
    return fail(400, SERVER_MESSAGES.invalidData, { fields: { newPassword: MY_ACCOUNT_MESSAGES.sameAsCurrent } });
  }
  const passwordHash = await hashPassword(input.newPassword);
  return withTransaction(async (conn) => {
    const tokenVersion = await updatePassword(actor.id, passwordHash, conn);
    await logActivity(conn, { ...logOwn(actor), changes: { password: { before: null, after: 'changed' } } });
    return { tokenVersion };
  });
};
