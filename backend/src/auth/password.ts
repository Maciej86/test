import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../config/constants';

/** Skrót hasła do zapisu w bazie (`users.password_hash`). Samego hasła nigdy się nie zapisuje. */
export const hashPassword = (plain: string): Promise<string> => {
  return bcrypt.hash(plain, BCRYPT_COST);
};

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

/**
 * Skrót do porównania, gdy konta o podanym loginie nie ma: logowanie trwa wtedy tyle samo co przy złym haśle,
 * więc czas odpowiedzi nie zdradza, które loginy istnieją. Liczony raz, przy pierwszym użyciu.
 */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = (): Promise<string> => {
  dummyHash ??= bcrypt.hash('dummy-password-for-missing-accounts', BCRYPT_COST);
  return dummyHash;
};
