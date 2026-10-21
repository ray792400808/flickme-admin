import { describe, expect, it } from 'vitest';
import { validateTask } from './tasks';
const checkin = () =>
  Array.from({ length: 7 }, (_, i) => ({ id: `CK${i + 1}`, day: `Day ${i + 1}`, reward: 10 }));
describe('incentive backend contract', () => {
  it('requires canonical checkin order and bounded rewards', () => {
    expect(validateTask('checkin', checkin())).toBe('');
    const reordered = checkin();
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    expect(validateTask('checkin', reordered)).not.toBe('');
    const invalid = checkin();
    invalid[0]!.reward = 1000001;
    expect(validateTask('checkin', invalid)).not.toBe('');
  });
  it('enforces positive watch intervals, coins and the cap relationship', () => {
    expect(validateTask('watch', { sec: 5, coins: 2, cap: 600 })).toBe('');
    for (const value of [
      { sec: 0, coins: 2, cap: 600 },
      { sec: 86401, coins: 2, cap: 600 },
      { sec: 5, coins: 0, cap: 600 },
      { sec: 5, coins: 10, cap: 9 },
      { sec: 1.5, coins: 1, cap: 10 },
    ])
      expect(validateTask('watch', value)).not.toBe('');
  });
  it('allows server-generated watch names but requires names for other tasks', () => {
    const task = {
      id: 'opaque-id',
      group: '观看任务' as const,
      name: '',
      sec: 86400,
      reward: 0,
      reset: '每日' as const,
      en: true,
    };
    expect(validateTask('taskcfg', [task])).toBe('');
    expect(validateTask('taskcfg', [{ ...task, sec: 86401 }])).not.toBe('');
    expect(validateTask('taskcfg', [{ ...task, group: '日常任务' }])).not.toBe('');
  });
});
