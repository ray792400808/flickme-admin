<script setup lang="ts">
import { computed } from 'vue';
const model = defineModel<string | null>({ required: true });
defineProps<{ label: string; disabled?: boolean }>();
const value = computed(() => {
  if (!model.value) return '';
  const d = new Date(model.value);
  if (!Number.isFinite(d.getTime())) return model.value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
});
function change(event: Event) {
  const input = event.target as HTMLInputElement,
    text = input.value.trim();
  input.setCustomValidity('');
  if (!text) {
    model.value = null;
    return;
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, y, m, d, h, min] = match.map(Number);
    const date = new Date(y!, m! - 1, d!, h!, min!);
    if (
      date.getFullYear() === y &&
      date.getMonth() === m! - 1 &&
      date.getDate() === d &&
      date.getHours() === h &&
      date.getMinutes() === min
    ) {
      model.value = date.toISOString();
      return;
    }
  }
  input.setCustomValidity('请输入有效的 YYYY-MM-DD HH:mm 时间');
  model.value = 'invalid:' + text;
}
</script>
<template>
  <div class="fld">
    <label>{{ label }}</label
    ><input
      class="in"
      :aria-label="label"
      :value="value"
      :readonly="disabled"
      placeholder="YYYY-MM-DD HH:mm"
      @change="change"
    />
  </div>
</template>
