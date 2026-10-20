<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    busy?: boolean;
    reference?: boolean;
    subtitle?: string;
  }>(),
  {
    busy: false,
  },
);
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
let previousFocus: HTMLElement | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    const element = dialog.value;
    if (open) {
      clearTimeout(closeTimer);
      element?.classList.remove('closing');
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element?.showModal();
    } else {
      if (!element || !element.open) {
        previousFocus?.focus();
        return;
      }
      element.classList.add('closing');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        element.classList.remove('closing');
        element.close();
        previousFocus?.focus();
      }, 200);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  clearTimeout(closeTimer);
  dialog.value?.close();
});
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="native-drawer"
      :class="{ 'op-drawer': reference }"
      :aria-label="title"
      :aria-busy="busy"
      @cancel.prevent="!busy && emit('close')"
      @mousedown="
        (event) => {
          if (event.target === dialog && !busy) emit('close');
        }
      "
    >
      <div class="native-drawer-heading" :class="{ dh: reference }">
        <div>
          <h2>{{ title }}</h2>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <button
          :class="{ ic: reference }"
          :disabled="busy"
          aria-label="关闭编辑抽屉"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="native-drawer-body" :class="{ db: reference }"><slot /></div>
      <footer class="native-drawer-footer" :class="{ df: reference }">
        <slot name="footer" />
      </footer></dialog
  ></Teleport>
</template>
