import { describe, expect, it } from 'vitest';
import { canReviewAdjustment, validateCoinAdjustment } from './users';
import type { CoinAdjustment } from '../types/users';
describe('coin adjustment checks', () => {
  it('requires a UID, reason and nonzero safe integer amount', () => {
    const valid = { uid: '000123', currency: 'bonus' as const, amount: -10, reason: '纠错' };
    expect(validateCoinAdjustment(valid)).toBe('');
    for (const amount of [0, 1.5, 1000001, -1000001, Number.MAX_SAFE_INTEGER + 1, NaN])
      expect(validateCoinAdjustment({ ...valid, amount })).not.toBe('');
    expect(validateCoinAdjustment({ ...valid, reason: ' ' })).not.toBe('');
  });
  it('requires backend review permission and a different administrator', () => {
    const row: CoinAdjustment = {
      id: '1',
      uid: '123',
      currency: 'bonus',
      amount: 10,
      reason: 'test',
      status: 'pending',
      requester_id: 7,
      requester_name: 'A',
      reviewer_name: null,
      review_reason: null,
      created_at: '2026-10-20T00:00:00Z',
      version: 1,
      can_review: true,
    };
    expect(canReviewAdjustment(row, 7, true)).toBe(false);
    expect(canReviewAdjustment(row, 42, true)).toBe(true);
    expect(canReviewAdjustment(row, undefined, true)).toBe(false);
    expect(canReviewAdjustment({ ...row, can_review: false }, 42, true)).toBe(false);
    expect(canReviewAdjustment({ ...row, status: 'approved' }, 42, true)).toBe(false);
    expect(canReviewAdjustment(row, 42, false)).toBe(false);
  });
});
