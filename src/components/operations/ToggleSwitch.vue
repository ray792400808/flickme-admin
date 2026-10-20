<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
defineProps<{ disabled?: boolean; label: string }>();
</script>
<template>
  <button
    type="button"
    class="sw"
    :class="{ on: model }"
    :aria-label="label"
    :aria-pressed="model"
    :disabled="disabled"
    @click.stop="model = !model"
  />
</template>
