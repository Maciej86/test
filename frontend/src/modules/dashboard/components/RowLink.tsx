import type { ReactNode } from 'react';
import { UnstyledButton } from '@mantine/core';
import { Link } from 'react-router';

/** Wiersz boksu Pulpitu: cały jest linkiem (Tab i Enter z klawiatury). */
export const RowLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <UnstyledButton component={Link} to={to} px="xs" py={6} mx="-xs" style={{ borderRadius: 3 }}>
    {children}
  </UnstyledButton>
);
