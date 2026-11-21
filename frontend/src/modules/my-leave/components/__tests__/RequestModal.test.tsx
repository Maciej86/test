import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { MyLeaveOverview } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { renderWithProviders } from '../../../../test/render';
import { RequestModal } from '../RequestModal';

const overview: MyLeaveOverview = {
  pool: { year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 0, usedAnnual: 7, pendingDays: 2, pendingCarried: 0, leftDays: 21, leftCarriedDays: 4 },
  types: [
    { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, dayCount: 'working', requiresApproval: true, usedOfLimit: 0 },
    { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, dayCount: 'working', requiresApproval: true, usedOfLimit: 1 },
    { id: 3, name: 'Okolicznościowy', deductsPool: false, yearlyLimit: null, dayCount: 'working', requiresApproval: true, usedOfLimit: 0 },
    { id: 7, name: 'Chorobowe', deductsPool: false, yearlyLimit: null, dayCount: 'calendar', requiresApproval: false, usedOfLimit: 0 },
  ],
  years: [2026],
  busy: [{ dateFrom: '2026-11-26', dateTo: '2026-11-27', leaveTypeName: 'Wypoczynkowy', status: 'pending' }],
};

const show = (o: Partial<MyLeaveOverview> = {}) => {
  const onClose = vi.fn();
  renderWithProviders(<RequestModal overview={{ ...overview, ...o }} onClose={onClose} />);
  return onClose;
};
const setDates = (from: string, to?: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: /^Od/ }), { target: { value: from } });
  if (to) fireEvent.change(screen.getByRole('textbox', { name: /^Do/ }), { target: { value: to } });
};
const chooseType = async (name: string) => {
  fireEvent.click(screen.getByDisplayValue('Wypoczynkowy'));
  fireEvent.click(await screen.findByRole('option', { name }));
};
const submitButton = () => screen.getByRole('button', { name: 'Złóż wniosek' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('RequestModal', () => {
  it('first type chosen with its hint; no dates → hint to choose dates, submit disabled', () => {
    show();
    expect(screen.getByDisplayValue('Wypoczynkowy')).toBeInTheDocument();
    expect(screen.getByText('Odejmuje dni z puli')).toBeInTheDocument();
    expect(screen.getByText('Wybierz termin, a policzę dni wniosku.')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('21–31.12 shows 7 working days, split and what is left; Do follows Od', async () => {
    show();
    setDates('21.12.2026');
    expect(screen.getByRole('textbox', { name: /^Do/ })).toHaveValue('21.12.2026');
    setDates('21.12.2026', '31.12.2026');
    expect(await screen.findByText('7 dni roboczych')).toBeInTheDocument();
    expect(screen.getByText('4 z zaległego urlopu, 3 z puli na 2026. Po zatwierdzeniu zostanie Ci 14.')).toBeInTheDocument();
    expect(screen.getByLabelText('Dni wybranego terminu')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('type with a limit shows used of limit; over the limit → red box, submit disabled', async () => {
    show();
    await chooseType('Na żądanie');
    expect(screen.getByText('Odejmuje dni z puli, w 2026 wykorzystano 1 z 4 dni')).toBeInTheDocument();
    setDates('30.11.2026', '03.12.2026');
    expect(await screen.findByText('Przekroczony limit: Na żądanie')).toBeInTheDocument();
    expect(screen.getByText('Limit to 4 dni w 2026. Wykorzystano już 1, a wniosek ma 4. Skróć termin albo wybierz inny typ.')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('overlap → box with the other request; next year → yellow box; weekend → no working days', async () => {
    show();
    setDates('27.11.2026', '27.11.2026');
    expect(await screen.findByText('Ten termin jest już we wniosku')).toBeInTheDocument();
    expect(screen.getByText(/Zachodzi na wniosek „Wypoczynkowy” \(Czeka na decyzję\)/)).toHaveTextContent('26.11.2026 – 27.11.2026');
    setDates('11.01.2027', '15.01.2027');
    expect(await screen.findByText('Pula na 2027 nie jest jeszcze ustalona')).toBeInTheDocument();
    setDates('21.11.2026', '22.11.2026');
    expect(await screen.findByText('W tym terminie nie ma dni roboczych')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('not enough days → red box with what is left and pending days', async () => {
    show({ pool: { ...overview.pool, annualDays: 5, carriedDays: 0, usedAnnual: 1, pendingDays: 1, leftDays: 3, leftCarriedDays: 0 } });
    setDates('30.11.2026', '03.12.2026');
    expect(await screen.findByText('Za mało dni: wniosek ma 4')).toBeInTheDocument();
    expect(screen.getByText(/Możesz wykorzystać jeszcze 3. Dni z wniosków czekających na decyzję \(1\)/)).toBeInTheDocument();
  });

  it('type that does not deduct → no pool sentence', async () => {
    show();
    await chooseType('Okolicznościowy');
    expect(screen.getByText('Nie odejmuje dni z puli')).toBeInTheDocument();
    setDates('30.11.2026', '30.11.2026');
    expect(await screen.findByText('Ten typ nie odejmuje dni z puli.')).toBeInTheDocument();
  });

  it('type without approval (sick leave): hints, "Zgłoś" button, start 7 days back, weekend counts, toast "Zgłoszono"', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 34 } });
    const success = vi.spyOn(notify, 'success');
    const onClose = show();
    await chooseType('Chorobowe');
    expect(screen.getByText(/Liczone w dniach kalendarzowych: weekendy i święta też się liczą/)).toBeInTheDocument();
    expect(screen.getByText(/Możesz zacząć do 7 dni wstecz/)).toBeInTheDocument();
    // Każda podpowiedź w osobnej linii, nie sklejona przecinkiem z poprzednią.
    expect(screen.queryByText(/puli, Liczone/)).not.toBeInTheDocument();
    expect(screen.getByText(/Liczone w dniach kalendarzowych/).closest('p')!.querySelectorAll('br')).toHaveLength(2);
    setDates('10.11.2026', '16.11.2026');
    expect(await screen.findByText('7 dni kalendarzowych')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Złóż wniosek' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zgłoś' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/my-leave/requests', { leaveTypeId: '7', dateFrom: '2026-11-10', dateTo: '2026-11-16', comment: '' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(success).toHaveBeenCalledWith('Zgłoszono. Administrator dostał powiadomienie.');
  });

  it('type without approval: 8 days back cannot be chosen; the weekend counts', async () => {
    show();
    await chooseType('Chorobowe');
    setDates('09.11.2026', '10.11.2026');
    expect(screen.queryByText(/dni kalendarzow/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zgłoś' })).toBeDisabled();
    setDates('14.11.2026', '15.11.2026');
    expect(await screen.findByText('2 dni kalendarzowe')).toBeInTheDocument();
    expect(screen.getByLabelText('15.11.2026: Liczy się do wniosku (dni kalendarzowe)')).toHaveAttribute('data-off', 'false');
  });


  it('sends only schema fields, closes with a toast', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 33 } });
    const success = vi.spyOn(notify, 'success');
    const onClose = show();
    setDates('21.12.2026', '31.12.2026');
    fireEvent.change(screen.getByLabelText('Komentarz dla administratora'), { target: { value: 'Święta u rodziców.' } });
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/my-leave/requests', { leaveTypeId: '1', dateFrom: '2026-12-21', dateTo: '2026-12-31', comment: 'Święta u rodziców.' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(success).toHaveBeenCalledWith('Wniosek złożony. Administrator dostał powiadomienie.');
  });

  it('409 from server keeps the window open and shows the message with numbers', async () => {
    const config = { url: '/my-leave/requests', headers: new AxiosHeaders() };
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('fail', 'ERR', config, undefined, {
        status: 409, statusText: 'Conflict', headers: {}, config, data: { error: { message: 'my-leave.server.not_enough_days', days: 7, left: 3 } },
      }),
    );
    const onClose = show();
    setDates('21.12.2026', '31.12.2026');
    fireEvent.click(submitButton());
    expect(await screen.findByText('Za mało dni: wniosek ma 7, a możesz wykorzystać jeszcze 3.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('400 with a field error shows it under the field', async () => {
    const config = { url: '/my-leave/requests', headers: new AxiosHeaders() };
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('fail', 'ERR', config, undefined, {
        status: 400, statusText: 'Bad', headers: {}, config,
        data: { error: { message: 'my-leave.validation.past_date', fields: { dateFrom: 'my-leave.validation.past_date' } } },
      }),
    );
    show();
    setDates('21.12.2026', '31.12.2026');
    fireEvent.click(submitButton());
    expect(await screen.findByText('Data „Od” nie może być wcześniejsza niż dziś.')).toBeInTheDocument();
  });
});
