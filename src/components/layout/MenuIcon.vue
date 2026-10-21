<script setup lang="ts">
import { computed } from 'vue';
import * as ElementIcons from '@element-plus/icons-vue';
import { icons } from '../../features/workspace/navigation';
const props = defineProps<{ name?: string | null; title?: string }>();
const aliases: Record<string, string> = {
  DataAnalysis: 'chart',
  Histogram: 'chart',
  TrendCharts: 'chart',
  Film: 'film',
  VideoCamera: 'film',
  Grid: 'grid',
  Menu: 'grid',
  User: 'user',
  UserFilled: 'user',
  Coin: 'coin',
  Money: 'coin',
  MagicStick: 'spark',
  Cpu: 'spark',
  Present: 'gift',
  Gift: 'gift',
  Bell: 'bell',
  Notification: 'bell',
  ChatDotSquare: 'chat',
  ChatLineSquare: 'chat',
  Setting: 'gear',
  SetUp: 'gear',
};
const titles: Record<string, string> = {
  数据概览: 'chart',
  内容管理: 'film',
  运营位: 'grid',
  用户管理: 'user',
  账户管理: 'user',
  商业化: 'coin',
  'AI 配置': 'spark',
  AI配置: 'spark',
  激励任务: 'gift',
  消息与推送: 'bell',
  客服与反馈: 'chat',
  系统设置: 'gear',
  系统管理: 'gear',
};
const path = computed(() => {
  const name = props.name ?? '';
  const key = icons[name] ? name : (aliases[name] ?? titles[props.title ?? '']);
  return key ? icons[key] : undefined;
});
const component = computed(() =>
  props.name ? ElementIcons[props.name as keyof typeof ElementIcons] : undefined,
);
</script>
<template>
  <svg v-if="path" class="menu-icon outline" viewBox="0 0 24 24" aria-hidden="true">
    <path :d="path" />
  </svg>
  <component :is="component" v-else-if="component" class="menu-icon filled" aria-hidden="true" />
  <svg v-else class="menu-icon outline" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M4 10h16M10 10v10" />
  </svg>
</template>
<style scoped>
.menu-icon {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  color: inherit;
}
.outline {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.filled {
  fill: currentColor;
  stroke: none;
}
</style>
