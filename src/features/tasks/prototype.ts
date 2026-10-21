import type { CheckinReward, RewardTask, WatchReward } from '../../types/tasks';
// Reference values from workspace/runtime.js, never treated as server configuration.
export const checkinPrototype = (): CheckinReward[] =>
  [10, 15, 20, 25, 30, 50, 100].map((reward, i) => ({ id: `CK${i + 1}`, day: i + 1, reward }));
export const watchPrototype = (): WatchReward => ({ sec: 5, coins: 2, cap: 600 });
export function taskPrototype(): RewardTask[] {
  const starter = [
    ['Log in to Flickme', 30],
    ['Link your WhatsApp account', 50],
    ['Bind your email', 30],
    ['Follow Flickme on Facebook', 20],
    ['Follow Flickme on YouTube', 20],
  ] as const;
  const watching = [
    [180, 5],
    [300, 10],
    [480, 15],
    [720, 25],
    [900, 40],
  ] as const;
  const daily = [
    ['Watch an ad (每日 10 次)', 5],
    ['Rate a drama', 5],
    ['Share a drama', 10],
  ] as const;
  return [
    ...starter.map(([name, reward], i): RewardTask => ({
      id: `TK${i + 1}`,
      name,
      reward,
      group: '新手任务',
      reset: '一次性',
      en: true,
    })),
    ...watching.map(([sec, reward], i): RewardTask => ({
      id: `TK${i + 6}`,
      name: `Watch dramas for ${sec / 60} min`,
      sec,
      reward,
      group: '观看任务',
      reset: '每日',
      en: true,
    })),
    ...daily.map(([name, reward], i): RewardTask => ({
      id: `TK${i + 11}`,
      name,
      reward,
      group: '日常任务',
      reset: '每日',
      en: true,
    })),
  ];
}
