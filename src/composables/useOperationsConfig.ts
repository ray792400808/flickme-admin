import { computed, onMounted, onScopeDispose, ref, toRaw, watch, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { operationsApi, operationsEnabled } from '../api/operations';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { validateOperations } from '../utils/operations';
import type {
  Channel,
  ConfigDocument,
  OperationsDocuments,
  OperationsModule,
} from '../types/operations';

export function useOperationsConfig<K extends OperationsModule>(
  module: K,
  initial: () => OperationsDocuments[K],
  channel?: Ref<Channel>,
) {
  const auth = useAuthStore();
  const draft = ref(initial()) as Ref<OperationsDocuments[K]>;
  const document = ref<ConfigDocument<OperationsDocuments[K]> | null>(null);
  const loading = ref(false),
    busy = ref(false),
    error = ref(''),
    message = ref(''),
    publishOpen = ref(false),
    discardOpen = ref(false),
    conflict = ref(false);
  const loadedChannel = ref<Channel>();
  let snapshot = '',
    sequence = 0,
    disposed = false,
    publishKey = '';
  let afterDiscard: (() => void) | undefined;
  const loaded = computed(
    () => document.value !== null && (!channel || loadedChannel.value === channel.value),
  );
  const dirty = computed(() => loaded.value && JSON.stringify(draft.value) !== snapshot);
  const editable = computed(
    () =>
      operationsEnabled &&
      loaded.value &&
      !loading.value &&
      !busy.value &&
      !conflict.value &&
      auth.can('ops', true),
  );
  const publishable = computed(
    () =>
      editable.value &&
      !dirty.value &&
      document.value!.revision !== document.value!.published_revision,
  );
  function accept(value: ConfigDocument<OperationsDocuments[K]>, target?: Channel) {
    document.value = value as typeof document.value;
    draft.value = structuredClone(value.draft);
    snapshot = JSON.stringify(draft.value);
    loadedChannel.value = target;
    conflict.value = false;
    publishKey = '';
  }
  async function load() {
    if (!operationsEnabled) return;
    const request = ++sequence,
      target = channel?.value;
    loading.value = true;
    error.value = '';
    message.value = '';
    try {
      const result = await operationsApi.read(module, target);
      if (!disposed && request === sequence) accept(result, target);
    } catch (cause) {
      if (!disposed && request === sequence) {
        document.value = null;
        error.value = cause instanceof Error ? cause.message : '加载失败';
      }
    } finally {
      if (!disposed && request === sequence) loading.value = false;
    }
  }
  async function save() {
    if (!editable.value || !dirty.value) return;
    error.value = validateOperations(module, draft.value);
    if (error.value) return;
    busy.value = true;
    message.value = '';
    try {
      accept(
        await operationsApi.save(
          module,
          document.value!.revision,
          structuredClone(toRaw(draft.value)),
          loadedChannel.value,
        ),
        loadedChannel.value,
      );
      publishKey = '';
      message.value = '草稿已保存，尚未发布';
      return true;
    } catch (cause) {
      conflict.value = cause instanceof ApiError && cause.status === 409;
      error.value = cause instanceof Error ? cause.message : '保存失败';
      return false;
    } finally {
      busy.value = false;
    }
  }
  async function publish() {
    if (!publishable.value) return;
    error.value = validateOperations(module, draft.value);
    if (error.value) {
      publishOpen.value = false;
      return;
    }
    publishKey ||= crypto.randomUUID();
    busy.value = true;
    message.value = '';
    try {
      accept(
        await operationsApi.publish(
          module,
          document.value!.revision,
          publishKey,
          loadedChannel.value,
        ),
        loadedChannel.value,
      );
      publishOpen.value = false;
      publishKey = '';
      message.value = '配置已发布，以服务端生效时间为准';
      return true;
    } catch (cause) {
      conflict.value = cause instanceof ApiError && cause.status === 409;
      error.value = cause instanceof Error ? cause.message : '发布失败';
      return false;
    } finally {
      busy.value = false;
    }
  }
  function discardThen(action: () => void) {
    if (dirty.value) {
      afterDiscard = action;
      discardOpen.value = true;
    } else action();
  }
  function confirmDiscard() {
    discardOpen.value = false;
    const action = afterDiscard;
    afterDiscard = undefined;
    action?.();
  }
  function cancelDiscard() {
    discardOpen.value = false;
    afterDiscard = undefined;
  }
  function reset() {
    if (!document.value || busy.value) return;
    discardThen(() => {
      draft.value = structuredClone(
        toRaw(document.value!.published ?? document.value!.draft),
      ) as OperationsDocuments[K];
    });
  }
  function refresh() {
    if (!busy.value) discardThen(() => void load());
  }
  function switchChannel(target: Channel) {
    if (!channel || busy.value || loading.value || target === channel.value) return;
    discardThen(() => {
      channel.value = target;
    });
  }
  onBeforeRouteLeave((to) => {
    if (to.name === 'login' || !auth.authenticated) return true;
    if (busy.value) return false;
    if (!dirty.value) return true;
    return new Promise<boolean>((resolve) => {
      afterDiscard = () => resolve(true);
      discardOpen.value = true;
      leaveCancel = () => resolve(false);
    });
  });
  let leaveCancel: (() => void) | undefined;
  function cancel() {
    leaveCancel?.();
    leaveCancel = undefined;
    cancelDiscard();
  }
  function confirm() {
    leaveCancel = undefined;
    confirmDiscard();
  }
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty.value || busy.value) event.preventDefault();
  };
  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload);
    void load();
  });
  if (channel) watch(channel, () => void load());
  onScopeDispose(() => {
    disposed = true;
    sequence++;
    window.removeEventListener('beforeunload', beforeUnload);
    leaveCancel?.();
    clearTimeout(messageTimer);
  });
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  watch(message, (value) => {
    clearTimeout(messageTimer);
    if (value)
      messageTimer = setTimeout(() => {
        message.value = '';
      }, 2200);
  });
  async function persist(publishNow = false) {
    if (dirty.value && !(await save())) return false;
    if (publishNow && publishable.value) return !!(await publish());
    return !error.value;
  }
  return {
    draft,
    document,
    loading,
    busy,
    error,
    message,
    loaded,
    editable,
    dirty,
    publishable,
    publishOpen,
    discardOpen,
    conflict,
    load,
    save,
    persist,
    publish,
    reset,
    refresh,
    switchChannel,
    cancelDiscard: cancel,
    confirmDiscard: confirm,
    enabled: operationsEnabled,
  };
}
