import { computed, ref, watch, type Ref } from 'vue';

/**
 * 内容管理列表页的通用分页 / 筛选状态。
 *
 * 后端返回 Laravel paginator 结构（data + current_page + last_page + total），
 * 这里统一维护查询条件与翻页，并在条件变化时回到第 1 页。
 */
export interface ListQueryState {
  keyword: Ref<string>;
  page: Ref<number>;
  perPage: Ref<number>;
  total: Ref<number>;
  lastPage: Ref<number>;
  loading: Ref<boolean>;
  error: Ref<string>;
}

export function useListQuery(keyword: Ref<string>, perPage = 10) {
  const page = ref(1);
  const size = ref(perPage);
  const total = ref(0);
  const lastPage = ref(1);
  const loading = ref(false);
  const error = ref('');

  // 任一筛选条件变化都回到第一页
  watch(keyword, () => {
    page.value = 1;
  });

  function applyMeta(meta: { total: number; last_page: number; current_page: number }): void {
    total.value = meta.total;
    lastPage.value = Math.max(1, meta.last_page);
    // 删完最后一页的最后一条后回退一页
    if (page.value > lastPage.value) page.value = lastPage.value;
  }

  return { page, size, total, lastPage, loading, error, applyMeta };
}

/** 统一的「封面渐变」占位色，跟随行序号变化 */
export function coverGradient(index: number): string {
  return `linear-gradient(145deg,hsl(${335 + index * 29} 25% 27%),hsl(${15 + index * 23} 35% 56%))`;
}

/** 秒 → mm:ss */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Unix 秒 → YYYY-MM-DD */
export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('sv-SE');
}

/** Unix 秒 → YYYY-MM-DD HH:mm */
export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString('sv-SE').slice(0, 16);
}

/** 剧集状态 pill 样式类 */
export function statusPillClass(status: number): string {
  if (status === 1) return 'positive';
  if (status === 2) return 'negative';
  return 'warning';
}
