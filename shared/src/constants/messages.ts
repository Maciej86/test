/** Klucze komunikatów zwracanych przez backend (tekst w shared/locales/pl/server.json). */
export const SERVER_MESSAGES = {
  notFound: 'server.not_found',
  serverError: 'server.error',
  loginRequired: 'server.login_required',
  noAccess: 'server.no_access',
  invalidData: 'server.invalid_data',
  dbDown: 'server.db_down',
  tooManyLogins: 'server.too_many_logins',
  fileTooLarge: 'server.file_too_large',
  fileTypeNotAllowed: 'server.file_type_not_allowed',
  /** Serwer odrzuca zapytanie, bo osoba musi najpierw ustawić własne hasło (moduł Logowanie). */
  passwordChangeRequired: 'server.password_change_required',
  /** Zły login, złe hasło albo konto w archiwum: zawsze ten sam komunikat (moduł Logowanie). */
  loginFailed: 'server.login_failed',
  /** Ustawienie hasła bez obecnego działa tylko przy haśle tymczasowym (moduł Logowanie). */
  passwordNotTemporary: 'server.password_not_temporary',
  /** Usunąć na stałe można tylko rekord z archiwum (moduł Archiwum). */
  archiveFirst: 'server.archive_first',
} as const;

export type ServerMessage = (typeof SERVER_MESSAGES)[keyof typeof SERVER_MESSAGES];
