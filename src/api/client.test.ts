import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getTraceId,
  onUnauthorized,
  requestApi,
  resetTraceId,
  setAccessToken,
} from './client';

/** 项目未安装 jsdom，这里用最小 stub 提供 localStorage / location，够本文件覆盖的用例使用。 */
function stubBrowser(search = ''): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
  vi.stubGlobal('window', { location: { search } });
  return store;
}

beforeEach(() => stubBrowser());

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(() => {});
});

describe('API client', () => {
  it('sends an idempotency header without overriding authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { id: '1' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('real-token');
    await requestApi(
      '/coin-adjustments',
      'POST',
      { amount: 1 },
      { 'Idempotency-Key': 'stable-key', Authorization: 'wrong' },
    );
    expect(fetchMock.mock.calls[0]?.[1].headers).toMatchObject({
      'Idempotency-Key': 'stable-key',
      Authorization: 'Bearer real-token',
    });
  });
  it('unwraps data and sends the current bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('token');
    try {
      expect(await requestApi('/health')).toEqual({ status: 'ok' });
      expect(fetchMock.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer token');
    } finally {
      setAccessToken(null);
    }
  });

  it('always sends a 32-char Trace-Id header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);
    await requestApi('/health');
    expect(fetchMock.mock.calls[0]?.[1].headers['Trace-Id']).toMatch(/^[0-9a-f]{32}$/);
  });

  it('reuses the same Trace-Id across requests within a session', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({ data: { status: 'ok' } })));
    vi.stubGlobal('fetch', fetchMock);
    await requestApi('/health');
    await requestApi('/auth/me');
    expect(fetchMock.mock.calls[0]?.[1].headers['Trace-Id']).toBe(
      fetchMock.mock.calls[1]?.[1].headers['Trace-Id'],
    );
  });

  it('lets an explicit ?trace_id= query override the stored value', () => {
    stubBrowser('?trace_id=from-url');
    expect(getTraceId()).toBe('from-url');
  });

  it('issues a fresh Trace-Id after reset', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({ data: { status: 'ok' } })));
    vi.stubGlobal('fetch', fetchMock);
    await requestApi('/health');
    const first = fetchMock.mock.calls[0]?.[1].headers['Trace-Id'];
    resetTraceId();
    await requestApi('/health');
    expect(fetchMock.mock.calls[1]?.[1].headers['Trace-Id']).not.toBe(first);
  });

  it('clears an expired session and notifies the application', async () => {
    const expired = vi.fn();
    onUnauthorized(expired);
    // 每次都返回新的 Response：同一个 Response 对象的 body 只能读一次
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ message: 'expired' }, { status: 401 })),
      );
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('expired');
    await expect(requestApi('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    await expect(requestApi('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock.mock.calls[1]?.[1].headers.Authorization).toBeUndefined();
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
