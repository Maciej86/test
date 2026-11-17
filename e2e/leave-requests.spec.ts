import { expect, test, type Page } from '@playwright/test';
import { ADMIN, DAY, employee, iso, logIn, next, password, todayUtc } from './helpers';

// Scenariusze z docs/modules/leave-requests/SPEC.md („Moduł działa, gdy”). Pracownika zakłada test (e2e.tmp.*,
// pula 20 dni) i składa przez API dwa wnioski: A (poniedziałek–wtorek) i B (czwartek). Administrator zatwierdza A
// w oknie, odrzuca B (najpierw bez powodu), potem anuluje A z powodem; pracownik widzi powody w „Moich urlopach”.

const monday = next(1, 2);
const tuesday = new Date(monday.getTime() + DAY);
const thursday = new Date(monday.getTime() + 3 * DAY);

const submit = async (page: Page, from: Date, to: Date, comment: string) => {
  const overview = (await (await page.request.get('/api/my-leave/overview')).json()) as { types: { id: number; deductsPool: boolean; yearlyLimit: number | null }[] };
  const vacation = overview.types.find((t) => t.deductsPool && t.yearlyLimit === null)!;
  const res = await page.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(from), dateTo: iso(to), comment } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: number }).id;
};

test('administrator zatwierdza w oknie, odrzuca z powodem i anuluje urlop; pracownik widzi decyzje', async ({ page, browser }) => {
  test.setTimeout(90_000);
  test.skip(thursday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: ola } = await employee(page, browser, 'Ola', 'Decyzja');
  const idA = await submit(ola, monday, tuesday, 'Wniosek A z testu.');
  const idB = await submit(ola, thursday, thursday, 'Wniosek B z testu.');

  // Lista „Czekają” i szczegóły po kliknięciu wiersza.
  await page.goto('/admin/leave-requests');
  await expect(page.getByRole('heading', { name: 'Wnioski urlopowe' })).toBeVisible();
  await page.getByPlaceholder('Szukaj pracownika').fill('Ola Decyzja');
  const rowA = page.getByRole('row', { name: /Wniosek A z testu/ });
  await expect(rowA).toContainText('Czeka na decyzję');
  await rowA.getByText('Ola Decyzja').click();
  await expect(page).toHaveURL(new RegExp(`/admin/leave-requests/${idA}\\?search=`));
  const details = page.getByRole('dialog', { name: `Wniosek nr ${idA}` });
  await expect(details.getByText('Kto jeszcze ma wtedy wolne')).toBeVisible();
  await expect(details.getByText(/^Pula na \d{4}$/)).toBeVisible();

  // Link jak z e-maila: od razu szczegóły; zatwierdzenie w oknie potwierdzenia.
  await page.goto(`/admin/leave-requests/${idA}`);
  await details.getByRole('button', { name: 'Zatwierdź' }).click();
  const approve = page.getByRole('dialog', { name: 'Zatwierdzić wniosek?' });
  await approve.getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(page.getByText('Wniosek zatwierdzony. Ola Decyzja dostaje powiadomienie.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/leave-requests$/);

  // Odrzucenie z listy: bez powodu błąd pod polem, z powodem przechodzi.
  await page.getByPlaceholder('Szukaj pracownika').fill('Ola Decyzja');
  const rowB = page.getByRole('row', { name: /Wniosek B z testu/ });
  await rowB.getByRole('button', { name: 'Odrzuć' }).click();
  const reject = page.getByRole('dialog', { name: 'Odrzucenie wniosku' });
  await reject.getByRole('button', { name: 'Odrzuć wniosek' }).click();
  await expect(reject.getByText('To pole jest wymagane.')).toBeVisible();
  await reject.getByLabel(/Powód odrzucenia/).fill('W czwartek inwentaryzacja.');
  await reject.getByRole('button', { name: 'Odrzuć wniosek' }).click();
  await expect(page.getByText('Wniosek odrzucony. Ola Decyzja dostaje powiadomienie z powodem.')).toBeVisible();

  // Anulowanie zatwierdzonego urlopu z powodem.
  await page.goto('/admin/leave-requests?status=approved');
  await page.getByPlaceholder('Szukaj pracownika').fill('Ola Decyzja');
  const approvedA = page.getByRole('row', { name: /Wniosek A z testu/ });
  await expect(approvedA).toContainText('Zatwierdzony');
  await approvedA.getByRole('button', { name: 'Anuluj urlop' }).click();
  const cancel = page.getByRole('dialog', { name: 'Anulowanie urlopu' });
  await cancel.getByLabel(/Powód anulowania/).fill('Przesunięty na styczeń.');
  await cancel.getByRole('button', { name: 'Anuluj urlop' }).click();
  await expect(page.getByText('Urlop anulowany, dni wróciły do puli. Ola Decyzja dostaje powiadomienie z powodem.')).toBeVisible();

  // Pracownik: powody w „Moich urlopach”, powiadomienie, brak dostępu do wniosków wszystkich.
  await ola.goto('/admin/my-leave');
  const mineA = ola.getByRole('row', { name: /Wniosek A z testu/ });
  await expect(mineA).toContainText('Anulowany');
  await expect(mineA).toContainText('„Przesunięty na styczeń.”');
  const mineB = ola.getByRole('row', { name: /Wniosek B z testu/ });
  await expect(mineB).toContainText('Odrzucony');
  await expect(mineB).toContainText('„W czwartek inwentaryzacja.”');
  await ola.getByRole('button', { name: /Powiadomienia/ }).click();
  await expect(ola.getByText('Urlop anulowany').first()).toBeVisible();
  await ola.keyboard.press('Escape');
  await ola.goto('/admin/leave-requests');
  await expect(ola.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
  await ola.goto(`/admin/leave-requests/${idB}`);
  await expect(ola.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
});

test.describe('abuse', () => {
  test('dwa zatwierdzenia naraz, niedozwolone przejścia, podrobione pola, HTML w powodzie, osoba w archiwum, pula po decyzjach', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const nextMonday = new Date(monday.getTime() + 7 * DAY);
    test.skip(nextMonday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');

    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const { page: ola, login } = await employee(page, browser, 'Ola', 'Nadużycie');
    const [a, b, c, d] = [
      await submit(ola, monday, monday, 'A'),
      await submit(ola, tuesday, tuesday, 'B'),
      await submit(ola, thursday, thursday, 'C'),
      await submit(ola, nextMonday, nextMonday, 'D'),
    ];
    const left = async () => ((await (await ola.request.get('/api/my-leave/overview')).json()) as { pool: { leftDays: number } }).pool.leftDays;
    expect(await left()).toBe(16);
    const post = (id: number, action: string, data?: object) => page.request.post(`/api/leave-requests/${id}/${action}`, data ? { data } : {});
    const errorOf = async (res: Awaited<ReturnType<typeof post>>) => ((await res.json()) as { error: { message: string; current?: string } }).error;

    // 1. Dwa zatwierdzenia tego samego wniosku naraz: jedno przechodzi, drugie 409; jedno powiadomienie u pracownika.
    const both = await Promise.all([post(a, 'approve'), post(a, 'approve')]);
    expect(both.map((r) => r.status()).sort()).toEqual([200, 409]);
    const approvedNotices = ((await (await ola.request.get('/api/notifications/summary')).json()) as { latest: { type: string }[] }).latest;
    expect(approvedNotices.filter((n) => n.type === 'leave_approved')).toHaveLength(1);

    // 2. Przejścia spoza specu: 409, wniosek bez zmian.
    expect((await errorOf(await post(a, 'reject', { reason: 'Za późno.' }))).message).toBe('leave-requests.server.already_decided');
    expect((await errorOf(await post(b, 'cancel', { reason: 'Czeka.' }))).message).toBe('leave-requests.server.not_approved');
    expect((await ola.request.post(`/api/my-leave/requests/${c}/withdraw`)).status()).toBe(200);
    expect(await errorOf(await post(c, 'approve'))).toMatchObject({ message: 'leave-requests.server.already_decided', current: 'withdrawn' });
    expect((await post(b, 'reject', { reason: 'Inwentaryzacja.' })).status()).toBe(200);
    expect((await errorOf(await post(b, 'approve'))).message).toBe('leave-requests.server.already_decided');
    expect((await errorOf(await post(b, 'cancel', { reason: 'Odrzucony.' }))).message).toBe('leave-requests.server.not_approved');

    // 3. Podrobione pola: decyzję zapisuje zalogowany administrator, status liczy serwer; HTML w powodzie to zwykły tekst.
    const cancelled = await post(a, 'cancel', { reason: '<script>alert(1)</script>', status: 'approved', decidedByName: 'Ktoś', decidedBy: 1, userId: 1 });
    expect(cancelled.status()).toBe(200);
    const saved = (await (await page.request.get(`/api/leave-requests/${a}`)).json()) as { status: string; decidedByName: string; decisionReason: string };
    expect(saved).toMatchObject({ status: 'cancelled', decidedByName: 'Test Administrator', decisionReason: '<script>alert(1)</script>' });
    let alerted = false;
    ola.on('dialog', async (dialog) => { alerted = true; await dialog.dismiss(); });
    await ola.goto('/admin/my-leave');
    await expect(ola.getByText('„<script>alert(1)</script>”').first()).toBeVisible();
    expect(alerted).toBe(false);

    // 4. Pracownik nie rozpatruje wniosków (także swoich) i nie czyta cudzych przez API wniosków.
    for (const res of [await ola.request.get('/api/leave-requests'), await ola.request.get(`/api/leave-requests/${d}`), await ola.request.post(`/api/leave-requests/${d}/approve`)]) {
      expect(res.status()).toBe(403);
    }

    // 5. Osoba w archiwum: jej czekający wniosek nadal można rozpatrzyć; dni po decyzjach: A anulowany, B odrzucony, C wycofany, D zatwierdzony.
    const list = (await (await page.request.get(`/api/employees?search=${encodeURIComponent(login)}`)).json()) as { items: { id: number }[] };
    expect((await page.request.post(`/api/employees/${list.items[0]!.id}/archive`)).status()).toBe(200);
    expect((await post(d, 'approve')).status()).toBe(200);
    expect((await (await page.request.get(`/api/leave-requests/${d}`)).json()).employeeArchived).toBe(true);
    expect((await page.request.post(`/api/employees/${list.items[0]!.id}/restore`)).status()).toBe(200);
    expect(await left()).toBe(19);
  });
});
