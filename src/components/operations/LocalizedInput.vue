<script setup lang="ts">
import { ref } from 'vue';
import { locales, type Locale, type LocalizedText } from '../../types/operations';
const model = defineModel<LocalizedText>({ required: true });
defineProps<{ label: string; disabled?: boolean }>();
const locale = ref<Locale>('en');
const labels: Record<Locale, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  es: 'Español',
  pt: 'Português',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
};
</script>
<template>
  <div class="fld">
    <label>{{ label }}</label>
    <div class="lt" role="tablist" :aria-label="label + '语言'">
      <button
        v-for="code in locales"
        :key="code"
        type="button"
        role="tab"
        :aria-selected="locale === code"
        :class="{ on: locale === code }"
        @click="locale = code"
      >
        {{ labels[code] }}
      </button>
    </div>
    <input
      v-model="model[locale]"
      class="in"
      :aria-label="label + '（' + locale + '）'"
      :readonly="disabled"
      maxlength="200"
    />
  </div>
</template>
