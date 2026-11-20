import { screen } from '@testing-library/react';
import { MorePeopleAvatar, PersonAvatar } from '../PersonAvatar';
import { renderWithProviders } from '../../test/render';

describe('PersonAvatar', () => {
  it('shows initials and the name for screen readers', () => {
    renderWithProviders(<PersonAvatar name="Anna Kowalska" />);
    expect(screen.getByText('AK')).toBeInTheDocument();
    expect(screen.getByLabelText('Anna Kowalska')).toBeInTheDocument();
  });

  it('tooltip text becomes the label (e.g. "on leave")', () => {
    renderWithProviders(<PersonAvatar name="Anna Kowalska" tooltip="Anna Kowalska, urlop" />);
    expect(screen.getByLabelText('Anna Kowalska, urlop')).toBeInTheDocument();
  });

  it('archived person is dimmed', () => {
    renderWithProviders(<PersonAvatar name="Anna Kowalska" archived />);
    expect(screen.getByLabelText('Anna Kowalska')).toHaveStyle({ opacity: '0.6' });
  });

  it('more-people circle shows its label', () => {
    renderWithProviders(<MorePeopleAvatar label="+3" />);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });
});
