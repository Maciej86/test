import { useMutation } from '@tanstack/react-query';
import type { LoginInput, NewPasswordInput, SessionUser } from '@app/shared';
import { api } from '../../core/api/client';

/** Logowanie: serwer ustawia ciasteczko sesji i zwraca zalogowaną osobę. */
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: SessionUser }>('/auth/login', input).then((r) => r.data.user),
  });
}

/** Własne hasło zamiast tymczasowego. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: NewPasswordInput) =>
      api.post<{ user: SessionUser }>('/auth/change-password', input).then((r) => r.data.user),
  });
}
