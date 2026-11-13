import { fireEvent, screen } from '@testing-library/react';
import { Question, Questions } from './Question';
import { renderWithProviders } from '../test/render';

const two = (
  <Questions>
    <Question number={1} about="Kalendarz" options={[{ id: 'a', text: 'Tak' }, { id: 'b', text: 'Nie' }]} recommended="a">
      Czy szef może wpisać urlop za pracownika?
    </Question>
    <Question number={2}>Czy można złożyć wniosek wstecz?</Question>
  </Questions>
);

describe('Questions', () => {
  it('groups all questions in one panel with their count', () => {
    renderWithProviders(two);
    expect(screen.getByText('Pytania do tej makiety (2)')).toBeInTheDocument();
    expect(screen.getByText('Czy szef może wpisać urlop za pracownika?')).toBeInTheDocument();
    expect(screen.getByText('Czy można złożyć wniosek wstecz?')).toBeInTheDocument();
  });

  it('says which part of the screen a question is about', () => {
    renderWithProviders(two);
    expect(screen.getByText('Dotyczy: Kalendarz')).toBeInTheDocument();
  });

  it('marks the recommended option', () => {
    renderWithProviders(two);
    expect(screen.getByText('(polecam)')).toBeInTheDocument();
  });

  it('can be collapsed to look at the screen and opened again', () => {
    renderWithProviders(two);
    fireEvent.click(screen.getByRole('button', { name: 'Zwiń pytania' }));
    expect(screen.queryByText('Czy można złożyć wniosek wstecz?')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż pytania' }));
    expect(screen.getByText('Czy można złożyć wniosek wstecz?')).toBeVisible();
  });
});
