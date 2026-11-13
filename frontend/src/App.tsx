import { useMemo } from 'react';
import { Center, Loader } from '@mantine/core';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AREAS } from '@app/shared';
import { useAuth } from './core/auth/AuthProvider';
import { buildAppRoutes } from './core/routes/buildAppRoutes';
import { PAGES } from './core/routes/pages';

export function App() {
  const { user, loading } = useAuth();
  const router = useMemo(() => createBrowserRouter(buildAppRoutes(AREAS, PAGES, user)), [user]);
  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  return <RouterProvider router={router} />;
}
