/** Typy umów (moduł Typy umów). */

/** Nazwa typu: do 60 znaków (VARCHAR(60) w bazie). */
export const CONTRACT_TYPE_NAME_MAX = 60;


/** Klucze błędów serwera modułu (teksty w shared/locales/pl/contract-types.json, sekcja server). */
export const CONTRACT_TYPE_MESSAGES = {
  nameTaken: 'contract-types.server.name_taken',
  nameTakenHidden: 'contract-types.server.name_taken_hidden',
  alreadyHidden: 'contract-types.server.already_hidden',
  notHidden: 'contract-types.server.not_hidden',
} as const;
