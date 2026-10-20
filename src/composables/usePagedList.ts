import { onMounted, onScopeDispose, ref } from 'vue';
import type { PageResult } from '../types/users';
export function usePagedList<T>(
  enabled: boolean,
  request: (params: URLSearchParams) => Promise<PageResult<T>>,
  filters: Record<string, string>,
) {
  const rows = ref<T[]>([]) as import('vue').Ref<T[]>;
  const loading = ref(false),
    error = ref(''),
    page = ref(1),
    total = ref(0),
    pageSize = ref(10);
  let sequence = 0,
    disposed = false;
  async function reload() {
    if (!enabled) return;
    const id = ++sequence;
    loading.value = true;
    error.value = '';
    const params = new URLSearchParams({
      page: String(page.value),
      per_page: String(pageSize.value),
    });
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    try {
      const result = await request(params);
      if (disposed || id !== sequence) return;
      rows.value = result.data;
      page.value = result.current_page;
      total.value = result.total;
      pageSize.value = result.per_page;
    } catch (cause) {
      if (!disposed && id === sequence) {
        rows.value = [];
        total.value = 0;
        error.value = cause instanceof Error ? cause.message : '加载失败';
      }
    } finally {
      if (!disposed && id === sequence) loading.value = false;
    }
  }
  function search() {
    page.value = 1;
    return reload();
  }
  function changePage(value: number) {
    page.value = value;
    return reload();
  }
  onMounted(reload);
  onScopeDispose(() => {
    disposed = true;
    sequence++;
  });
  return { rows, loading, error, page, total, pageSize, reload, search, changePage, enabled };
}
