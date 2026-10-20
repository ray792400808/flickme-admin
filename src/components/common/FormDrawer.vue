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
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.value?.showModal();
    } else {
      dialog.value?.close();
      previousFocus?.focus();
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => dialog.value?.close());
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
      @click="
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
