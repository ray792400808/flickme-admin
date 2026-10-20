import {
  locales,
  type LocalizedText,
  type OperationsDocuments,
  type OperationsModule,
} from '../types/operations';
export function validNames(names: LocalizedText) {
  return !!names.en.trim() && locales.every((locale) => names[locale].length <= 200);
}
export function validPeriod(start: number | null, end: number | null) {
  return (
    (start === null || Number.isSafeInteger(start)) &&
    (end === null || Number.isSafeInteger(end)) &&
    (start === null || end === null || start < end)
  );
}
const integer = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
const unique = (values: string[]) => new Set(values).size === values.length;
export function validateOperations<K extends OperationsModule>(
  module: K,
  value: OperationsDocuments[K],
): string {
  if (module === 'chips') {
    const rows = value as OperationsDocuments['chips'];
    if (
      !rows.length ||
      !rows[0]?.locked ||
      !rows[0].enabled ||
      rows.filter((row) => row.locked).length !== 1
    )
      return '系统首页分类必须固定在首位且保持启用';
    if (!unique(rows.map((row) => row.id)) || !unique(rows.map((row) => row.key)))
      return '分类标识不能重复';
    if (
      rows.some(
        (row) =>
          !validNames(row.names) || !row.key.trim() || !validPeriod(row.starts_at, row.ends_at),
      )
    )
      return '请填写英文分类名称、稳定标识及有效的生效时段';
  }
  if (module === 'hot') {
    const config = value as OperationsDocuments['hot'];
    if (
      !integer(config.pool_size, 1, 1000) ||
      !integer(config.short_count, 1, 100) ||
      !integer(config.stories_count, 1, 100) ||
      !integer(config.page_size, 1, 100) ||
      ![1, 6, 24].includes(config.refresh_hours)
    )
      return '池大小应为 1–1000，展示数量和每页数量应为 1–100 的整数';
    if (config.overrides.some((row) => row.pinned && row.blocked))
      return '同一剧集不能同时置顶和屏蔽';
    if (!unique(config.overrides.map((row) => String(row.drama_id)))) return '剧集不能重复';
  }
  if (module === 'launch') {
    const config = value as OperationsDocuments['launch'];
    if (!validNames(config.button_text)) return '请填写英文按钮文案';
    if (
      config.enabled &&
      (!config.fallback_drama_id || !integer(config.fallback_drama_id, 1, Number.MAX_SAFE_INTEGER))
    )
      return '启用弹窗时必须指定有效的兜底剧集 ID';
    if (config.cover_url) {
      try {
        const url = new URL(config.cover_url);
        if (url.protocol !== 'https:' || !url.hostname || url.username || url.password)
          return '封面地址必须为不含账号信息的有效 HTTPS URL';
      } catch {
        return '封面地址必须为有效 HTTPS URL';
      }
    }
  }
  if (module === 'words') {
    const rows = value as OperationsDocuments['words'];
    if (!unique(rows.map((row) => row.id))) return '推荐词标识不能重复';
    if (
      rows.some(
        (row) =>
          !validNames(row.names) ||
          !validPeriod(row.starts_at, row.ends_at) ||
          !integer(row.sort, 0, 100000),
      )
    )
      return '请填写英文推荐词，并确保结束时间晚于开始时间';
  }
  if (module === 'filters') {
    const rows = value as OperationsDocuments['filters'];
    if (!unique(rows.map((row) => row.key))) return '标签分组标识不能重复';
    if (
      rows.some(
        (row) =>
          !integer(row.order, 0, 100000) ||
          !validNames(row.names) ||
          !row.key.trim() ||
          !row.tag_keys.length ||
          !unique(row.tag_keys) ||
          row.tag_keys.some((key) => !key.trim()),
      )
    )
      return '请填写分组标识、英文名称和不重复的标签 key';
  }
  if (module === 'recs') {
    const rows = value as OperationsDocuments['recs'];
    if (!unique(rows.map((row) => row.placement))) return '推荐位置不能重复';
    if (
      rows.some(
        (row) =>
          !integer(row.count, 1, 50) ||
          (row.pinned_drama_id !== null &&
            !integer(row.pinned_drama_id, 1, Number.MAX_SAFE_INTEGER)),
      )
    )
      return '推荐数量应为 1–50；置顶剧集 ID 必须为正整数';
  }
  return '';
}
export function moveItem<T>(rows: T[], index: number, delta: -1 | 1, minimum = 0) {
  const next = index + delta;
  if (index < minimum || next < minimum || next >= rows.length) return;
  const [item] = rows.splice(index, 1);
  rows.splice(next, 0, item!);
}
