import { computed, onMounted, onScopeDispose, ref, toRaw, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { requestApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { ConfigDocument } from '../types/operations';
import { validateTask, type TaskModule, type TaskDocuments } from '../types/tasks';
export function useTaskConfig<K extends TaskModule>(module: K, initial: () => TaskDocuments[K]) {
  const enabled = import.meta.env.VITE_TASKS_API_ENABLED === 'true';
  const preview = !enabled && import.meta.env.DEV;
  const auth = useAuthStore();
  const draft = ref(
    preview ? initial() : module === 'watch' ? { sec: 0, coins: 0, cap: 0 } : [],
  ) as Ref<TaskDocuments[K]>;
  const document = ref<ConfigDocument<TaskDocuments[K]> | null>(null);
  const busy = ref(false),
    loading = ref(false),
    error = ref(''),
    message = ref(''),
    publishOpen = ref(false),
    conflict = ref(false);
  let snapshot = JSON.stringify(draft.value),
    disposed = false,
    key = '';
  const dirty = computed(() => JSON.stringify(draft.value) !== snapshot);
  const editable = computed(
    () =>
      !busy.value &&
      !loading.value &&
      !conflict.value &&
      (preview || !!document.value) &&
      auth.can('tasks.edit'),
  );
  const canSave = computed(() => enabled && !!document.value && editable.value && dirty.value);
  const canPublish = computed(
    () =>
      enabled &&
      !!document.value &&
      !busy.value &&
      !loading.value &&
      !conflict.value &&
      auth.can('tasks.publish') &&
      !dirty.value &&
      document.value.revision !== document.value.published_revision,
  );
  function accept(value: ConfigDocument<TaskDocuments[K]>) {
    if (!value || !Number.isSafeInteger(value.revision) || !('draft' in value))
      throw new Error('配置响应格式异常');
    const issue = validateTask(module, value.draft);
    if (issue) throw new Error(issue);
    document.value = value as typeof document.value;
    draft.value = structuredClone(value.draft);
    snapshot = JSON.stringify(draft.value);
    conflict.value = false;
    key = '';
  }
  async function load() {
    if (!enabled || busy.value) return;
    if (dirty.value && !window.confirm('放弃未保存修改并重新加载？')) return;
    loading.value = true;
    error.value = '';
    message.value = '';
    try {
      const value = await requestApi<ConfigDocument<TaskDocuments[K]>>(`/tasks/${module}`);
      if (!disposed) accept(value);
    } catch (e) {
      if (!disposed) {
        document.value = null;
        error.value = e instanceof Error ? e.message : '加载失败';
      }
    } finally {
      if (!disposed) loading.value = false;
    }
  }
  async function save() {
    if (!canSave.value) return;
    error.value = validateTask(module, draft.value);
    if (error.value) return;
    busy.value = true;
    message.value = '';
    try {
      accept(
        await requestApi<ConfigDocument<TaskDocuments[K]>>(`/tasks/${module}`, 'PUT', {
          revision: document.value!.revision,
          draft: structuredClone(toRaw(draft.value)),
        }),
      );
      message.value = '草稿已保存，尚未发布';
    } catch (e) {
      conflict.value = e instanceof ApiError && e.status === 409;
      error.value = e instanceof Error ? e.message : '保存失败';
    } finally {
      busy.value = false;
    }
  }
  async function publish() {
    if (!canPublish.value) return;
    busy.value = true;
    error.value = '';
    message.value = '';
    key ||= crypto.randomUUID();
    try {
      accept(
        await requestApi<ConfigDocument<TaskDocuments[K]>>(`/tasks/${module}/publish`, 'POST', {
          revision: document.value!.revision,
          idempotency_key: key,
        }),
      );
      publishOpen.value = false;
      message.value = '配置已发布，以服务端生效时间为准';
    } catch (e) {
      conflict.value = e instanceof ApiError && e.status === 409;
      error.value = e instanceof Error ? e.message : '发布失败';
    } finally {
      busy.value = false;
    }
  }
  function reset() {
    if (!editable.value || (dirty.value && !window.confirm('放弃当前修改并还原？'))) return;
    draft.value = structuredClone(
      document.value ? toRaw(document.value.published ?? document.value.draft) : initial(),
    ) as TaskDocuments[K];
    error.value = '';
    message.value = '';
  }
  onBeforeRouteLeave(() =>
    busy.value ? false : !dirty.value || window.confirm('当前修改尚未保存，确认离开？'),
  );
  const unload = (e: BeforeUnloadEvent) => {
    if (dirty.value || busy.value) e.preventDefault();
  };
  onMounted(() => {
    window.addEventListener('beforeunload', unload);
    void load();
  });
  onScopeDispose(() => {
    disposed = true;
    window.removeEventListener('beforeunload', unload);
  });
  return {
    enabled,
    preview,
    draft,
    document,
    busy,
    loading,
    error,
    message,
    publishOpen,
    conflict,
    dirty,
    editable,
    canSave,
    canPublish,
    load,
    save,
    publish,
    reset,
  };
}
