import { AxiosError, AxiosHeaders } from 'axios';
import { apiErrorFields, apiErrorKey, apiErrorMessage, handleSessionError, sessionRedirect } from '../client';
import { i18n } from '../../../test/render';

const axiosError = (data: unknown, status = 403, url = '/orders') => {
  return new AxiosError('fail', 'ERR', { url, headers: new AxiosHeaders() }, undefined, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: { url, headers: new AxiosHeaders() },
  });
};

describe('apiErrorMessage', () => {
  it('translates the key sent by the server', () => {
    expect(apiErrorMessage(axiosError({ error: { message: 'server.no_access' } }), i18n.t)).toBe(
      'Nie masz dostępu do tej części aplikacji.',
    );
  });

  it('explains a missing connection', () => {
    expect(apiErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), i18n.t)).toBe(
      'Brak połączenia z serwerem. Czy backend działa? (npm run dev)',
    );
  });
});

describe('apiErrorKey', () => {
  it('returns the key sent by the server or null', () => {
    expect(apiErrorKey(axiosError({ error: { message: 'server.login_failed' } }, 401))).toBe('server.login_failed');
    expect(apiErrorKey(new AxiosError('Network Error', 'ERR_NETWORK'))).toBeNull();
    expect(apiErrorKey(new Error('x'))).toBeNull();
  });
});

describe('apiErrorFields', () => {
  it('returns field keys sent by the server or null', () => {
    const fields = { newPassword: 'validation.password_same_as_temporary' };
    expect(apiErrorFields(axiosError({ error: { message: 'server.invalid_data', fields } }, 400))).toEqual(fields);
    expect(apiErrorFields(axiosError({ error: { message: 'server.no_access' } }))).toBeNull();
  });
});

describe('handleSessionError', () => {
  const go = vi.spyOn(sessionRedirect, 'go').mockImplementation(() => {});
  beforeEach(() => go.mockClear());

  it('sends an expired session to the login screen and passes the error on', async () => {
    const err = axiosError({ error: { message: 'server.login_required' } }, 401);
    await expect(handleSessionError(err)).rejects.toBe(err);
    expect(go).toHaveBeenCalledWith('/login?reason=expired');
  });

  it('does not redirect on 401 from /auth/me and /auth/login', async () => {
    await expect(handleSessionError(axiosError({}, 401, '/auth/me'))).rejects.toBeDefined();
    await expect(handleSessionError(axiosError({}, 401, '/auth/login'))).rejects.toBeDefined();
    expect(go).not.toHaveBeenCalled();
  });

  it('sends a person who must change the password to /change-password', async () => {
    await expect(
      handleSessionError(axiosError({ error: { message: 'server.password_change_required' } }, 403)),
    ).rejects.toBeDefined();
    expect(go).toHaveBeenCalledWith('/change-password');
  });

  it('leaves other errors to the screen', async () => {
    await expect(handleSessionError(axiosError({ error: { message: 'server.no_access' } }, 403))).rejects.toBeDefined();
    expect(go).not.toHaveBeenCalled();
  });
});
