import { useState } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { SearchField } from '../SearchField';
import { renderWithProviders } from '../../test/render';

afterEach(() => vi.useRealTimers());

describe('SearchField', () => {
  it('sends the text after a short pause, not on every letter', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<SearchField label="Szukaj pracownika" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Szukaj pracownika' });
    fireEvent.change(input, { target: { value: 'Ko' } });
    fireEvent.change(input, { target: { value: 'Kow' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Kow');
  });

  it('a new value from outside (e.g. "Wyczyść", back button) replaces the text', () => {
    const Host = () => {
      const [value, setValue] = useState('Jan');
      return (
        <>
          <SearchField label="Szukaj" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue('')}>Wyczyść</button>
        </>
      );
    };
    renderWithProviders(<Host />);
    expect(screen.getByRole('textbox', { name: 'Szukaj' })).toHaveValue('Jan');
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść' }));
    expect(screen.getByRole('textbox', { name: 'Szukaj' })).toHaveValue('');
  });

  it('a trailing space survives the pause (the address keeps the trimmed text): "Jan " then "K" gives "Jan K"', () => {
    vi.useFakeTimers();
    const Host = () => {
      const [value, setValue] = useState('');
      // Jak adres listy: schemat przycina spacje na brzegach.
      return <SearchField label="Szukaj" value={value} onChange={(s) => setValue(s.trim())} />;
    };
    renderWithProviders(<Host />);
    const input = screen.getByRole('textbox', { name: 'Szukaj' });
    fireEvent.change(input, { target: { value: 'Jan ' } });
    act(() => vi.advanceTimersByTime(300));
    expect(input).toHaveValue('Jan ');
    fireEvent.change(input, { target: { value: 'Jan K' } });
    expect(input).toHaveValue('Jan K');
  });
});
