import { Suspense } from 'react';
import { act, render } from '@testing-library/react';
import { z } from 'zod';
import { listQuerySchema } from '@app/shared';
import { useListParams } from '../useListParams';

// Router zmienia adres w trybie przejścia (startTransition). Pod obciążeniem React zaczyna rysować ekran z nowym
// adresem, przerywa to rysowanie (np. bo właśnie przyszły dane listy) i rysuje ekran jeszcze raz ze starym adresem;
// nowy pokaże się dopiero później. Tu sterujemy adresem ręcznie, a przerwane rysowanie udaje komponent, który
// w trakcie rysowania „zawiesza się” (Suspense), więc React je odrzuca.
let shown = new URLSearchParams();
const setSearchParams = vi.fn();
vi.mock('react-router', () => ({ useSearchParams: () => [shown, setSearchParams] }));

const schema = listQuerySchema(['name', 'hired_on']).extend({ role: z.enum(['admin', 'employee']).optional().catch(undefined) });
const defaults = { page: 1, search: '', sort: 'name', dir: 'asc' } as const;
const lastSent = () => new URLSearchParams((setSearchParams.mock.lastCall?.[0] as URLSearchParams).toString());

const setup = () => {
  let update!: ReturnType<typeof useListParams<typeof schema>>[1];
  let interrupt = false;
  const Hook = () => {
    update = useListParams(schema, defaults)[1];
    if (interrupt) throw new Promise(() => {});
    return null;
  };
  const ui = () => (
    <Suspense fallback={null}>
      <Hook />
    </Suspense>
  );
  const view = render(ui());
  const draw = (address: string, interrupted = false) => {
    shown = new URLSearchParams(address);
    interrupt = interrupted;
    act(() => view.rerender(ui()));
  };
  return { update: () => update, draw };
};

describe('useListParams during a router transition', () => {
  beforeEach(() => {
    shown = new URLSearchParams();
    setSearchParams.mockClear();
  });

  it('an interrupted drawing of the new address followed by the old one does not undo the waiting change', () => {
    const { update, draw } = setup();
    update()({ role: 'admin' });
    draw('role=admin');
    // Wybór osoby: React zaczyna rysować nowy adres, przerywa, rysuje jeszcze raz stary.
    update()({ sort: 'hired_on' });
    draw('sort=hired_on&role=admin', true);
    draw('role=admin');
    // Spóźnione wyszukiwanie (300 ms) liczy adres od najnowszego wyboru, nie od narysowanego starego.
    update()({ search: 'kowal' });
    expect(lastSent().get('sort')).toBe('hired_on');
    expect(lastSent().get('role')).toBe('admin');
    expect(lastSent().get('search')).toBe('kowal');
  });

  it('a different address after the change has shown (back button, link) is taken from outside', () => {
    const { update, draw } = setup();
    update()({ role: 'admin' });
    draw('role=admin');
    draw('search=nowak');
    update()({ page: 2 });
    expect(lastSent().toString()).toBe('page=2&search=nowak');
  });
});
