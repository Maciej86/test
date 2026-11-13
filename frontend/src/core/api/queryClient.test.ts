import { AxiosError, AxiosHeaders } from 'axios';
import { shouldRetry } from './queryClient';

const withStatus = (status: number) =>
  new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('shouldRetry', () => {
  it('does not retry answers like 403 or 404', () => {
    expect(shouldRetry(0, withStatus(403))).toBe(false);
    expect(shouldRetry(0, withStatus(404))).toBe(false);
  });

  it('retries server and network errors twice', () => {
    expect(shouldRetry(0, withStatus(503))).toBe(true);
    expect(shouldRetry(1, new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true);
    expect(shouldRetry(2, withStatus(503))).toBe(false);
  });
});
