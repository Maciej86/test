/** Wzorzec do `LIKE ?` z wyszukiwarki: tekst w środku, a `%`, `_` i `\` z tekstu szukane dosłownie (nie jako „cokolwiek”). */
export const likePattern = (search: string): string => `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
