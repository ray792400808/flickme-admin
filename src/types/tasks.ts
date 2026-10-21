export interface CheckinReward {
  id: string;
  day: number;
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
export const nonnegative = (n: number) => Number.isSafeInteger(n) && n >= 0;
export function validateTask(module: TaskModule, value: TaskDocuments[TaskModule]): string {
  if (module === 'watch') {
    const v = value as WatchReward;
    if (!nonnegative(v.sec) || !v.sec) return '观看奖励间隔必须为大于 0 的整数秒';
    if (!nonnegative(v.coins) || !nonnegative(v.cap)) return '金币数量和每日上限必须为非负整数';
  } else if (module === 'checkin') {
    const rows = value as CheckinReward[];
    if (
      rows.length !== 7 ||
      new Set(rows.map((r) => r.day)).size !== 7 ||
      rows.some((r) => !Number.isInteger(r.day) || r.day < 1 || r.day > 7)
    )
      return '签到必须包含 Day 1 至 Day 7';
    if (rows.some((r) => !nonnegative(r.reward))) return '奖励金币必须为非负整数';
  } else
    for (const r of value as RewardTask[]) {
      if (
        !['新手任务', '观看任务', '日常任务'].includes(r.group) ||
        !['一次性', '每日'].includes(r.reset)
      )
        return '请选择有效的分组和重置周期';
      if (!r.name.trim()) return '请输入任务名称';
      if (!nonnegative(r.reward)) return '奖励金币必须为非负整数';
      if (r.group === '观看任务' && (!nonnegative(r.sec ?? 0) || !r.sec))
        return '累计播放秒数必须为大于 0 的整数';
    }
  return '';
}
