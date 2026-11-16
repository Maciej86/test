import { describe, it } from 'vitest';

describe('newLeaveRequestEmail', () => {
  it.todo('subject: "Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027"');
  it.todo('html and text contain type, dates, 5 working days, "3 z zaległego, 2 z puli rocznej", "24 dni" and the comment');
  it.todo('without a comment there is no "Komentarz" row');
  it.todo('leftAfter null → no "Z puli" and "Zostanie po zatwierdzeniu" rows');
  it.todo('button and text link to <FRONTEND_URL>/admin/leave-requests/128');
  it.todo('escapes the comment and the names in html, keeps them as typed in text');
  it.todo('no untranslated {{…}} and no missing keys in subject, html and text');
});
