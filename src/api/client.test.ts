import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, onUnauthorized, requestApi, setAccessToken } from './client';
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  onUnauthorized(() => {});
});
describe('API client', () => {
  it('unwraps data and sends the current bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('token');
    expect(await requestApi('/health')).toEqual({ status: 'ok' });
    expect(fetchMock.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer token');
  });
  it('clears an expired session and notifies the application', async () => {
    const expired = vi.fn();
    onUnauthorized(expired);
    setAccessToken('expired');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ message: 'expired' }, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestApi('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    await expect(requestApi('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock.mock.calls[1]?.[1].headers.Authorization).toBeUndefined();
    expect(expired).toHaveBeenCalledOnce();
  });
  it('does not expire a session on invalid login credentials', async () => {
    const expired = vi.fn();
    onUnauthorized(expired);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ message: 'invalid' }, { status: 401 })),
    );
    await expect(requestApi('/auth/login', 'POST', {})).rejects.toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled();
  });
  it('normalizes network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(requestApi('/health')).rejects.toMatchObject({
      status: 0,
      message: '网络连接失败，请检查服务是否可用',
    });
  });
});
