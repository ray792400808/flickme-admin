import type { DramaInput } from './types';
export function emptyDrama(): DramaInput {
  return { title: '', synopsis: '', tags: [], badge: '', freeEpisodes: 6, scheduledAt: null };
}
export function validateDrama(input: DramaInput): Partial<Record<keyof DramaInput, string>> {
  const errors: Partial<Record<keyof DramaInput, string>> = {};
  if (!input.title.trim()) errors.title = '请填写剧名';
  else if (input.title.trim().length > 200) errors.title = '剧名不能超过 200 字';
  if (!Number.isInteger(input.freeEpisodes) || input.freeEpisodes < 0)
    errors.freeEpisodes = '免费集数必须为非负整数';
  if (input.scheduledAt && !Number.isFinite(Date.parse(input.scheduledAt)))
    errors.scheduledAt = '请选择有效的上架时间';
  return errors;
}
