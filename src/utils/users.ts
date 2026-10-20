import type { CoinAdjustment, CoinAdjustmentInput } from '../types/users';
export function validateCoinAdjustment(input: CoinAdjustmentInput) {
  if (!input.uid.trim()) return '请填写用户 UID';
  if (!Number.isSafeInteger(input.amount) || input.amount === 0)
    return '调整数量必须是非零安全整数';
  if (!input.reason.trim() || input.reason.length > 500) return '请填写 1–500 字的调整原因';
  return '';
}
export function canReviewAdjustment(
  row: CoinAdjustment,
  actorId: number | undefined,
  writable: boolean,
) {
  return (
    writable &&
    actorId !== undefined &&
    row.requester_id !== actorId &&
    row.status === 'pending' &&
    row.can_review === true
  );
}
