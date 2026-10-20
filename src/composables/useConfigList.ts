import { computed, ref, watch, type Ref } from 'vue';
export function useConfigList<T extends { id: string }>(
  rows: Ref<T[]>,
  filter?: (row: T) => boolean,
) {
  const search = ref(''),
    page = ref(1),
    pageSize = 8;
  const matched = computed(() =>
    rows.value.filter(
      (row) =>
        (!search.value || JSON.stringify(row).toLowerCase().includes(search.value.toLowerCase())) &&
        (!filter || filter(row)),
    ),
  );
  const visible = computed(() =>
    matched.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  );
  watch(
    () => matched.value.length,
    (count) => {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(count / pageSize)));
    },
  );
  function resetPage() {
    page.value = 1;
  }
  function changePage(value: number) {
    page.value = value;
  }
  return { search, page, pageSize, matched, visible, resetPage, changePage };
}
