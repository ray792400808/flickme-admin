<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
const props = withDefaults(defineProps<{ open: boolean; title: string; busy?: boolean }>(), {
  busy: false,
});
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
      :aria-label="title"
      :aria-busy="busy"
      @cancel.prevent="!busy && emit('close')"
      @click="
        (event) => {
          if (event.target === dialog && !busy) emit('close');
        }
      "
    >
      <div class="native-drawer-heading">
        <h2>{{ title }}</h2>
        <button :disabled="busy" aria-label="关闭编辑抽屉" @click="emit('close')">×</button>
      </div>
      <div class="native-drawer-body"><slot /></div>
      <footer class="native-drawer-footer"><slot name="footer" /></footer></dialog
  ></Teleport>
</template>
