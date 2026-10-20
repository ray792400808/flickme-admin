import { describe, expect, it } from 'vitest';
import { emptyLocalizedText, type HomeCategory } from '../types/operations';
import { moveItem, validateOperations, validPeriod } from './operations';
const names = () => ({ ...emptyLocalizedText(), en: 'For you' });
describe('operations publication validation', () => {
  it('keeps the locked system category first, enabled and unique', () => {
    const locked: HomeCategory = {
      id: 'system',
      key: 'for_you',
      type: 'system',
      locked: true,
      names: names(),
      enabled: true,
      starts_at: null,
      ends_at: null,
    };
    expect(validateOperations('chips', [locked])).toBe('');
    expect(validateOperations('chips', [{ ...locked, enabled: false }])).not.toBe('');
    expect(validateOperations('chips', [locked, { ...locked }])).not.toBe('');
    const rows = [locked, { ...locked, id: 'other', key: 'romance', locked: false }];
    moveItem(rows, 1, -1, 1);
    expect(rows[0]).toBe(locked);
  });
  it('compares unix-second instants rather than local strings', () => {
    expect(validPeriod(1792468800, 1792472400)).toBe(true);
    expect(validPeriod(1792468800, 1792465200)).toBe(false);
  });
  it('rejects mutually exclusive ranking flags and fractional counts', () => {
    const hot = {
      pool_size: 50,
      refresh_hours: 1 as const,
      short_count: 9,
      stories_count: 8,
      page_size: 20,
      overrides: [{ drama_id: 1, title: 'A', heat: 1, pinned: true, blocked: true }],
    };
    expect(validateOperations('hot', hot)).not.toBe('');
    expect(validateOperations('hot', { ...hot, overrides: [], page_size: 1.5 })).not.toBe('');
    const launch = {
      enabled: false,
      fallback_drama_id: null,
      button_text: names(),
      cover_url: 'https://',
    };
    expect(validateOperations('launch', launch)).not.toBe('');
    expect(
      validateOperations('launch', {
        ...launch,
        cover_url: 'https://media.example.test/cover.jpg',
      }),
    ).toBe('');
  });
});
