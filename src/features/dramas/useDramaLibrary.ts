import { computed, inject, onScopeDispose, reactive, ref, watch } from 'vue';
import { dramaRepositoryKey, unavailableDramaRepository } from './repository';
import type { Drama, DramaInput, DramaQuery } from './types';

export function useDramaLibrary() {
  const repository = inject(dramaRepositoryKey, unavailableDramaRepository);
  const available = repository.available;
  const query = reactive<DramaQuery>({ search: '', status: '', badge: '', page: 1, pageSize: 10 });
  const rows = ref<Drama[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref('');
  let revision = 0;
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    revision++;
  });
  async function load() {
    if (!available) return;
    const request = ++revision;
    loading.value = true;
    error.value = '';
    try {
      const page = await repository.list({ ...query });
      if (disposed || request !== revision) return;
      rows.value = page.items;
      total.value = page.total;
      query.page = page.page;
      query.pageSize = page.pageSize;
    } catch (cause) {
      if (!disposed && request === revision) {
        rows.value = [];
        total.value = 0;
        error.value = cause instanceof Error ? cause.message : '加载失败，请重试';
      }
    } finally {
      if (!disposed && request === revision) loading.value = false;
    }
  }
  async function save(input: DramaInput, id?: number) {
    if (!available || saving.value) return false;
    saving.value = true;
    error.value = '';
    try {
      if (id === undefined) await repository.create(input);
      else await repository.update(id, input);
      await load();
      return true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '保存失败';
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function changeStatus(row: Drama) {
    if (!available || saving.value) return false;
    saving.value = true;
    error.value = '';
    try {
      if (row.status === 'published') await repository.unpublish(row.id);
      else await repository.publish(row.id);
      await load();
      return true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '状态更新失败';
      return false;
    } finally {
      saving.value = false;
    }
  }
  function search() {
    query.page = 1;
    void load();
  }
  function changePage(page: number) {
    query.page = page;
    void load();
  }
  watch(() => [query.status, query.badge], search);
  return {
    available,
    query,
    rows,
    total,
    loading,
    saving,
    error,
    load,
    save,
    changeStatus,
    search,
    changePage,
    canQuery: computed(() => available && !loading.value && !saving.value),
  };
}
