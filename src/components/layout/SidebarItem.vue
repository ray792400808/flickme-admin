<template>
  <!-- 有子菜单的分组 -->
  <div v-if="hasChildren" class="ng" :class="{ open: isOpen }">
    <button class="nav-group" @click="toggle">
      <el-icon v-if="item.icon"><component :is="resolveIcon(item.icon)" /></el-icon>
      <span>{{ item.meta.title }}</span>
      <svg class="ch" viewBox="0 0 24 24">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
    <div class="sub" :class="{ open: isOpen }">
      <RouterLink
        v-for="child in visibleChildren"
        :key="child.id"
        :to="child.path"
        class="ni"
        active-class="on"
        @click="$emit('navigate')"
      >
        <el-icon v-if="child.icon"><component :is="resolveIcon(child.icon)" /></el-icon>
        <span>{{ child.meta.title }}</span>
      </RouterLink>
    </div>
  </div>

  <!-- 叶子菜单项 -->
  <RouterLink
    v-else
    :to="item.path"
    class="ni"
    active-class="on"
    @click="$emit('navigate')"
  >
    <el-icon v-if="item.icon"><component :is="resolveIcon(item.icon)" /></el-icon>
    <span>{{ item.meta.title }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import type { Menu } from '../../types/auth';

// icon 名字 → Element Plus 图标组件
const iconCache: Record<string, unknown> = {};
function resolveIcon(name: string | null) {
  if (!name) return undefined;
  if (!iconCache[name]) iconCache[name] = ElementPlusIconsVue[name as keyof typeof ElementPlusIconsVue];
  return iconCache[name];
}

const props = defineProps<{ item: Menu }>();
defineEmits<{ navigate: [] }>();

const route = useRoute();

// 有可见子节点才渲染分组
const visibleChildren = computed(() =>
  (props.item.children ?? []).filter((c) => !c.meta.isHidden)
);

const hasChildren = computed(() => visibleChildren.value.length > 0);

// 路由激活时自动展开分组
const isOpen = ref(
  hasChildren.value && visibleChildren.value.some((c) => route.path.startsWith(c.path))
);

function toggle() {
  isOpen.value = !isOpen.value;
}
</script>

<style scoped>
/* 与 prototype .ni / .ng / .sub 1:1 对应 */
.ng {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-group {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  background: none;
  border-radius: 8px;
  text-align: left;
  color: var(--fg);
  font-size: 13.5px;
  cursor: pointer;
}
.nav-group:hover {
  background: var(--surface2);
}
.nav-group .el-icon {
  width: 17px;
  height: 17px;
  flex: none;
  stroke: var(--muted);
  fill: none;
  stroke-width: 1.7;
}
.nav-group .ch {
  width: 14px;
  height: 14px;
  margin-left: auto;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.15s;
  flex: none;
}
.ng.open .ch {
  transform: rotate(90deg);
}

.sub {
  display: none;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 6px 27px;
  padding-left: 10px;
  border-left: 1px solid var(--line);
}
.sub.open {
  display: flex;
}
.sub .ni {
  padding: 6px 10px;
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.sub .ni:hover {
  background: var(--surface2);
  color: var(--fg);
}
.sub .ni.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}
.sub .ni .el-icon {
  width: 17px;
  height: 17px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 1.7;
  flex: none;
}

/* 叶子节点 */
.ni {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  background: none;
  border-radius: 8px;
  text-align: left;
  color: var(--fg);
  font-size: 13.5px;
  text-decoration: none;
}
.ni:hover {
  background: var(--surface2);
}
.ni.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}
.ni .el-icon {
  width: 17px;
  height: 17px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: none;
}
.ni.on .el-icon,
.ng.cur .el-icon,
.ng.open .el-icon {
  stroke: var(--accent);
}
.ni span,
.nav-group span {
  flex: 1;
}
</style>