const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Dane od ludzi w HTML e-maila: znaki specjalne jako encje, żeby nikt nie wstawił linku, obrazka ani skryptu. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (ch) => ENTITIES[ch]!);
