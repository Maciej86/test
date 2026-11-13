import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { theme } from '@app/shared/theme';
import { i18n } from '../test/render';
import { DateText } from './DateText';

function show(ui: React.ReactElement) {
  render(
    <I18nextProvider i18n={i18n}>
      <MantineProvider theme={theme}>{ui}</MantineProvider>
    </I18nextProvider>,
  );
}

describe('DateText', () => {
  it('shows a date as DD.MM.YYYY', () => {
    show(<DateText value="2026-11-12" />);
    expect(screen.getByText('12.11.2026')).toBeInTheDocument();
  });

  it('shows date and time in the app time zone', () => {
    show(<DateText value="2026-11-12T13:05:00.000Z" withTime />);
    expect(screen.getByText('12.11.2026 14:05')).toBeInTheDocument();
  });

  it('shows "brak" for an empty value', () => {
    show(<DateText value={null} />);
    expect(screen.getByText('brak')).toBeInTheDocument();
  });
});
