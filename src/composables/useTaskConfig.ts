import { computed, onMounted, onScopeDispose, ref, toRaw, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { requestApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import {
  taskPaths,
  validateTask,
  type TaskModule,
  type TaskDocuments,
  type TaskConfigDocument,
  type TaskInput,
} from '../types/tasks';

export function useTaskConfig<K extends TaskModule>(module: K) {
  const enabled = import.meta.env.VITE_TASKS_API_ENABLED !== 'false';
  const auth = useAuthStore();
  const draft = ref(module === 'watch' ? { sec: 0, coins: 0, cap: 0 } : []) as Ref<
    TaskDocuments[K]
  >;
  const document = ref<TaskConfigDocument<TaskDocuments[K]> | null>(null);
  const busy = ref(false),
    loading = ref(false),
    error = ref(''),
    message = ref(''),
    publishOpen = ref(false),
    conflict = ref(false);
  const fieldErrors = ref<Record<string, string[]>>({});
  const localEditing = ref(false);
  let snapshot = JSON.stringify(draft.value),
    disposed = false,
    sequence = 0;
  let publication: { key: string; revision: number } | undefined;
  const canRead = computed(() => auth.can('tasks.view'));
  const dirty = computed(() => JSON.stringify(draft.value) !== snapshot);
  const editable = computed(
    () =>
      enabled &&
      canRead.value &&
      !!document.value &&
      !busy.value &&
      !loading.value &&
      !conflict.value &&
      !publication &&
      auth.can('tasks.edit'),
  );
  const canSave = computed(() => module !== 'taskcfg' && editable.value && dirty.value);
  const canPublish = computed(
    () =>
      module !== 'watch' &&
      enabled &&
      canRead.value &&
      !!document.value &&
      !busy.value &&
      !loading.value &&
      !conflict.value &&
      !dirty.value &&
      !localEditing.value &&
      auth.can('tasks.publish') &&
      (publication !== undefined || document.value.revision !== document.value.published_revision),
  );
  function accept(value: TaskConfigDocument<TaskDocuments[K]>) {
    if (
      !value ||
      !Number.isSafeInteger(value.revision) ||
      value.revision < 0 ||
      !('draft' in value)
    )
      throw new Error('配置响应格式异常');
    const issue = validateTask(module, value.draft);
    if (issue) throw new Error(issue);
    document.value = value as typeof document.value;
    draft.value = structuredClone(value.draft);
    snapshot = JSON.stringify(draft.value);
    conflict.value = false;
  }
  function report(cause: unknown, ordinaryWrite = false) {
    fieldErrors.value = cause instanceof ApiError ? (cause.errors ?? {}) : {};
    const labels: Record<string, string> = {
      sec: '播放秒数',
      coins: '奖励金币',
      cap: '每日上限',
      reward: '奖励金币',
      name: '任务名称',
      group: '任务分组',
      reset: '重置周期',
      en: '启用状态',
      id: '标识',
      day: '天数',
    };
    const details = Object.entries(fieldErrors.value)
      .map(([key, values]) => {
        const parts = key.split('.');
        const label = labels[parts[parts.length - 1]!] ?? key;
        const index =
          parts.length === 3 && parts[0] === 'draft' && /^\d+$/.test(parts[1]!)
            ? `Day ${Number(parts[1]) + 1} `
            : '';
        return `${index}${label}: ${values.join('；')}`;
      })
      .join('；');
    error.value =
      (cause instanceof Error ? cause.message : '请求失败') + (details ? `：${details}` : '');
    if (
      cause instanceof ApiError &&
      (cause.status === 409 ||
        (ordinaryWrite && (cause.status === 0 || cause.status === 404 || cause.status >= 500)))
    ) {
      conflict.value = true;
      if (cause.status === 404) error.value += '。任务可能已被删除，请重新加载列表。';
      else if (cause.status !== 409)
        error.value += '。请求结果尚未确认，请先重新加载核实，勿重复提交。';
    }
  }
  async function load() {
    if (!enabled || !canRead.value || busy.value) return false;
    if ((dirty.value || localEditing.value) && !window.confirm('放弃未保存修改并重新加载？'))
      return false;
    const current = ++sequence;
    loading.value = true;
    error.value = '';
    message.value = '';
    fieldErrors.value = {};
    try {
      const value = await requestApi<TaskConfigDocument<TaskDocuments[K]>>(taskPaths[module]);
      if (disposed || current !== sequence) return false;
      accept(value);
      publication = undefined;
      localEditing.value = false;
      return true;
    } catch (cause) {
      if (!disposed && current === sequence) {
        document.value = null;
        report(cause);
      }
      return false;
    } finally {
      if (!disposed && current === sequence) loading.value = false;
    }
  }
  async function write(method: string, path: string, body: unknown) {
    if (!editable.value) return false;
    busy.value = true;
    error.value = '';
    message.value = '';
    fieldErrors.value = {};
    try {
      const value = await requestApi<TaskConfigDocument<TaskDocuments[K]>>(path, method, body);
      if (disposed) return false;
      accept(value);
      publication = undefined;
      message.value = module === 'watch' ? '已保存并生效' : '草稿已保存，尚未发布';
      return true;
    } catch (cause) {
      if (!disposed) report(cause, true);
      return false;
    } finally {
      if (!disposed) busy.value = false;
    }
  }
  async function save() {
    if (!canSave.value) return false;
    error.value = validateTask(module, draft.value);
    if (error.value) return false;
    return write('PUT', taskPaths[module], {
      revision: document.value!.revision,
      draft: structuredClone(toRaw(draft.value)),
    });
  }
  async function saveTask(input: TaskInput, id?: string) {
    if (module !== 'taskcfg' || !editable.value) return false;
    const task: TaskInput = {
      group: input.group,
      reward: input.reward,
      reset: input.reset,
      en: input.en,
      ...(input.group === '观看任务' ? { sec: input.sec } : { name: input.name?.trim() }),
    };
    error.value = validateTask('taskcfg', [{ ...task, id: id ?? '', name: task.name ?? '' }]);
    if (error.value) return false;
    return write(id ? 'PATCH' : 'POST', id ? `/tasks/${encodeURIComponent(id)}` : '/tasks', {
      revision: document.value!.revision,
      task,
    });
  }
  async function toggleTask(id: string, en: boolean) {
    if (!editable.value) return false;
    return write('PATCH', `/tasks/${encodeURIComponent(id)}`, {
      revision: document.value!.revision,
      task: { en },
    });
  }
  async function deleteTask(id: string) {
    if (!editable.value) return false;
    return write('DELETE', `/tasks/${encodeURIComponent(id)}`, {
      revision: document.value!.revision,
    });
  }
  async function publish() {
    if (!canPublish.value) return;
    publication ??= { key: crypto.randomUUID(), revision: document.value!.revision };
    busy.value = true;
    error.value = '';
    message.value = '';
    try {
      const value = await requestApi<TaskConfigDocument<TaskDocuments[K]>>(
        `${taskPaths[module]}/publish`,
        'POST',
        { revision: publication.revision },
        { 'Idempotency-Key': publication.key },
      );
      if (disposed) return;
      accept(value);
      publication = undefined;
      publishOpen.value = false;
      // An idempotent retry can return a historical snapshot; always reconcile with GET.
      try {
        const latest = await requestApi<TaskConfigDocument<TaskDocuments[K]>>(taskPaths[module]);
        if (!disposed) accept(latest);
      } catch (cause) {
        if (!disposed) {
          report(cause);
          conflict.value = true;
        }
      }
      message.value = '配置已发布';
    } catch (cause) {
      if (!disposed) report(cause);
    } finally {
      if (!disposed) busy.value = false;
    }
  }
  function reset() {
    if (
      !editable.value ||
      !document.value ||
      (dirty.value && !window.confirm('放弃当前修改并还原？'))
    )
      return;
    draft.value = structuredClone(
      toRaw(document.value.published ?? document.value.draft),
    ) as TaskDocuments[K];
    error.value = '';
    message.value = '';
  }
  onBeforeRouteLeave((to) =>
    to.name === 'login' || !auth.authenticated
      ? true
      : busy.value
        ? false
        : !(dirty.value || localEditing.value) || window.confirm('当前修改尚未保存，确认离开？'),
  );
  const unload = (event: BeforeUnloadEvent) => {
    if (dirty.value || busy.value || localEditing.value) event.preventDefault();
  };
  onMounted(() => {
    window.addEventListener('beforeunload', unload);
    void load();
  });
  onScopeDispose(() => {
    disposed = true;
    sequence++;
    window.removeEventListener('beforeunload', unload);
  });
  return {
    enabled,
    canRead,
    draft,
    document,
    busy,
    loading,
    error,
    fieldErrors,
    message,
    publishOpen,
    conflict,
    dirty,
    localEditing,
    editable,
    canSave,
    canPublish,
    load,
    save,
    saveTask,
    toggleTask,
    deleteTask,
    publish,
    reset,
  };
}
