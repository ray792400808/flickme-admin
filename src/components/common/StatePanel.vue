<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    kind?: 'empty' | 'error' | 'pending' | 'loading';
  }>(),
  { kind: 'empty' },
);
</script>
<template>
  <div
    class="state-panel"
    :class="`state-${kind}`"
    :role="kind === 'error' ? 'alert' : 'status'"
    :aria-busy="kind === 'loading'"
  >
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>
