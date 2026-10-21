import { describe, it, expect } from 'vitest';
import { formatUnix, toDate, formatFriendly, formatDateOnly } from './datetime';

describe('toDate', () => {
  it('treats 10-digit number as unix seconds', () => {
    // 2025-10-21T11:24:32 (UTC+8)
    const d = toDate(1761026672);
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBe(1761026672 * 1000);
  });

  it('treats 13-digit number as unix milliseconds', () => {
    const v = 1761026672123;
    const d = toDate(v);
    expect(d!.getTime()).toBe(v);
  });

  it('treats numeric strings as unix timestamps', () => {
    expect(toDate('1761026672')!.getTime()).toBe(1761026672 * 1000);
    expect(toDate('1761026672123')!.getTime()).toBe(1761026672123);
  });

  it('parses ISO strings as dates', () => {
    const d = toDate('2025-10-21T11:24:32+08:00');
    expect(d).toBeInstanceOf(Date);
    // 2025-10-21T11:24:32+08:00 === 2025-10-21T03:24:32Z === 1761017072 seconds
    expect(d!.getTime()).toBe(1761017072 * 1000);
  });

  it('returns null for empty / null / undefined', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate('   ')).toBeNull();
    expect(toDate(NaN)).toBeNull();
  });
});

describe('formatUnix', () => {
  it('renders unix seconds as local time', () => {
    // 2025-10-21 11:24:32 in cn / Asia/Shanghai
    const out = formatUnix(1761026672);
    expect(out).toMatch(/^2025-10-21 \d{2}:\d{2}:\d{2}$/);
  });

  it('renders ISO strings', () => {
    const out = formatUnix('2025-10-21T03:24:32.000Z');
    expect(out).toMatch(/^2025-10-21 \d{2}:\d{2}:\d{2}$/);
  });

  it('renders dash for empty values', () => {
    expect(formatUnix(null)).toBe('-');
    expect(formatUnix(undefined)).toBe('-');
    expect(formatUnix(0)).toBe('-'); // 0 is the unix epoch — but toDate returns null only for empty string
  });
});

describe('formatDateOnly', () => {
  it('strips the time portion', () => {
    expect(formatDateOnly(1761026672)).toBe('2025-10-21');
  });
});

describe('formatFriendly', () => {
  it('shows time-only for today', () => {
    const now = Math.floor(Date.now() / 1000);
    const out = formatFriendly(now);
    expect(out).toMatch(/^\d{2}:\d{2}$/);
  });

  it('shows full date for non-today', () => {
    // 2025-01-01 timestamp
    const out = formatFriendly(1735689600);
    expect(out).toMatch(/^2025-01-01 \d{2}:\d{2}:\d{2}$/);
  });
});
