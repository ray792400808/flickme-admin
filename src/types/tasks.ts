export interface CheckinReward {
  id: string;
  day: string;
  reward: number;
}
export interface RewardTask {
  id: string;
  group: '新手任务' | '观看任务' | '日常任务';
  name: string;
  sec?: number;
  reward: number;
  reset: '一次性' | '每日';
  en: boolean;
}
export interface WatchReward {
  sec: number;
  coins: number;
  cap: number;
}
export interface TaskDocuments {
  checkin: CheckinReward[];
  taskcfg: RewardTask[];
  watch: WatchReward;
}
export type TaskModule = keyof TaskDocuments;
export type TaskInput = Omit<RewardTask, 'id' | 'name'> & { name?: string };
export interface TaskConfigDocument<T> {
  revision: number;
  published_revision: number | null;
  published_at: number | null;
  draft: T;
  published: T | null;
}
export const taskPaths = {
  checkin: '/check-in-rewards',
  taskcfg: '/tasks',
  watch: '/watch-rewards',
} as const;
export const nonnegative = (n: number) => Number.isSafeInteger(n) && n >= 0;
export function validateTask(module: TaskModule, value: TaskDocuments[TaskModule]): string {
  if (module === 'watch') {
    const v = value as WatchReward;
    if (!nonnegative(v.sec) || !v.sec || v.sec > 86400)
      return '观看奖励间隔必须为 1～86,400 的整数秒';
    if (!nonnegative(v.coins) || !v.coins || v.coins > 1000000)
      return '奖励金币必须为 1～1,000,000 的整数';
    if (!nonnegative(v.cap) || v.cap < v.coins || v.cap > 1000000)
      return '每日上限必须为不小于单次奖励且不超过 1,000,000 的整数';
  } else if (module === 'checkin') {
    const rows = value as CheckinReward[];
    if (rows.length !== 7 || rows.some((r, i) => r.id !== `CK${i + 1}` || r.day !== `Day ${i + 1}`))
      return '签到必须包含 Day 1 至 Day 7';
    if (rows.some((r) => !nonnegative(r.reward) || r.reward > 1000000))
      return '奖励金币必须为 0～1,000,000 的整数';
  } else
    for (const r of value as RewardTask[]) {
      if (
        !['新手任务', '观看任务', '日常任务'].includes(r.group) ||
        !['一次性', '每日'].includes(r.reset)
      )
        return '请选择有效的分组和重置周期';
      if (r.group !== '观看任务' && (!r.name.trim() || r.name.length > 200))
        return '任务名称必填且不能超过 200 字符';
      if (!nonnegative(r.reward) || r.reward > 1000000) return '奖励金币必须为 0～1,000,000 的整数';
      if (typeof r.en !== 'boolean') return '启用状态必须为布尔值';
      if (r.group === '观看任务' && (!nonnegative(r.sec ?? 0) || !r.sec || r.sec > 86400))
        return '累计播放秒数必须为 1～86,400 的整数';
    }
  return '';
}
