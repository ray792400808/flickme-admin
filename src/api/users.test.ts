import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { coinAdjustmentsApi } from './users';
import { API_BASE_URL, setAccessToken } from './client';
import { stubBrowser } from './testBrowser';

beforeEach(() => stubBrowser());

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

it('creates pending requests with the exact YAML body and stable retry key', async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(() =>
      Response.json({ data: { id: 'request', status: 'pending' } }, { status: 201 }),
    );
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken('test-token');
  const input = { uid: '000123', currency: 'bonus' as const, amount: -10, reason: '余额纠错' };
  for (let i = 0; i < 2; i++) await coinAdjustmentsApi.create(input, 'same-key');
  for (const [url, options] of fetchMock.mock.calls) {
    expect(url).toBe(`${API_BASE_URL}/coin-adjustments`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(options.headers).toMatchObject({
      'Idempotency-Key': 'same-key',
      Authorization: 'Bearer test-token',
    });
  }
  expect('update' in coinAdjustmentsApi).toBe(false);
});

it('uses uid rather than q for coin list filtering', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { data: [] } }));
  vi.stubGlobal('fetch', fetchMock);
  await coinAdjustmentsApi.list(
    new URLSearchParams({ uid: '000123', status: 'pending', page: '1', per_page: '10' }),
  );
  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    `${API_BASE_URL}/coin-adjustments?uid=000123&status=pending&page=1&per_page=10`,
  );
});
