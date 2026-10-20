import { computed, ref } from 'vue';
import type { Ref } from 'vue';
export function useConfigEditor<T extends { id: string }>(rows: Ref<T[]>, empty: () => T) {
  const open = ref(false),
    draft = ref(empty()) as Ref<T>,
    isNew = ref(true),
    discardOpen = ref(false);
  let snapshot = '';
  const dirty = computed(() => open.value && JSON.stringify(draft.value) !== snapshot);
  function edit(row?: T) {
    draft.value = row ? JSON.parse(JSON.stringify(row)) : empty();
    isNew.value = !row;
    snapshot = JSON.stringify(draft.value);
    open.value = true;
  }
  function close() {
    if (dirty.value) discardOpen.value = true;
    else open.value = false;
  }
  function discard() {
    discardOpen.value = false;
    open.value = false;
  }
  function apply() {
    const row = JSON.parse(JSON.stringify(draft.value)) as T;
    const index = rows.value.findIndex((item) => item.id === row.id);
    if (index < 0) rows.value.unshift(row);
    else rows.value[index] = row;
  }
  return { open, draft, isNew, dirty, discardOpen, edit, close, discard, apply };
}
