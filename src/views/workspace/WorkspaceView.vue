<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { mountWorkspace } from '../../features/workspace/runtime.js';
import referenceCss from '../../features/workspace/reference.css?raw';
import { pageForPath, pathFor } from '../../features/workspace/navigation';

const host = ref<HTMLElement>();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const preview = inject<import('vue').Ref<boolean>>('workspacePreview', ref(false));
const previewAtMount = preview.value;
const theme = inject<import('vue').Ref<string>>('workspaceTheme');
const page = () =>
  preview.value ? String(route.params.page || 'overview') : pageForPath(route.path);
let workspace: ReturnType<typeof mountWorkspace> | undefined;
let shadow: ShadowRoot | undefined;

onMounted(() => {
  shadow = host.value!.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${referenceCss}</style><div class="workspace-body"><div hidden id="side"></div><div hidden id="crumb"></div><div hidden id="role"></div><div hidden id="av"></div><div hidden id="gsres"></div><main id="view"></main><div class="scrim" id="scrim" data-act="dclose"></div><aside class="drawer" id="drawer"></aside><div class="modal" id="modal"></div><div class="toast" id="toast" role="status" aria-live="polite"></div></div>`;
  workspace = mountWorkspace(shadow, {
    page: page(),
    userKey: preview.value ? 'preview' : auth.user?.id || auth.user?.email || 'anonymous',
    userName: preview.value ? '本地预览' : auth.user?.name || auth.user?.email,
    can: (group: string, write = false) => preview.value || auth.can(group, write),
    navigate: (id: string) => void router.push(preview.value ? '/preview/' + id : pathFor(id)),
    reset: () => window.location.reload(),
  });
});
watch(
  () => route.fullPath,
  () => {
    if (route.path.startsWith('/preview/') === previewAtMount) workspace?.update(page());
  },
  { flush: 'post' },
);
onBeforeUnmount(() => {
  workspace?.destroy();
  shadow?.replaceChildren();
  workspace = undefined;
});
</script>

<template>
  <div ref="host" :data-theme="theme" class="workspace-host" />
</template>
