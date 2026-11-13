import { render } from '@testing-library/react';
import { ACCOUNT_NAVIGATION, NAVIGATION, flattenNav } from '@app/shared';
import { NAV_ICONS, NavIcon } from './icons';

const used = [...flattenNav(NAVIGATION), ...flattenNav(ACCOUNT_NAVIGATION)]
  .map((item) => item.icon)
  .filter((name): name is string => Boolean(name));

describe('NavIcon', () => {
  it.each(used)('has the Lucide icon "%s" used in navigation.config.ts', (name) => {
    expect(NAV_ICONS[name]).toBeDefined();
  });

  it('draws a Lucide icon', () => {
    const { container } = render(<NavIcon name="house" />);
    expect(container.querySelector('svg.lucide')).not.toBeNull();
  });
});
