/**
 * Czy zapis odrzucił unikalny indeks bazy (powtórzona nazwa, login, e-mail). Z nazwą indeksu: tylko ten indeks
 * (np. `uq_users_email`), gdy tabela ma kilka unikalnych kolumn. Moduł zamienia to na swój błąd pola.
 */
export const isDuplicateEntry = (error: unknown, index?: string): boolean => {
  if (!(error instanceof Error) || (error as { code?: string }).code !== 'ER_DUP_ENTRY') return false;
  return index === undefined || error.message.includes(index);
};
