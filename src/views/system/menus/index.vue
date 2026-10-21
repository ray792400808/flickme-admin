<template>
  <div>
    <div class="ph">
      <div>
        <h1>菜单管理</h1>
        <p>
          菜单决定侧栏导航与前端路由。组件路径需与 <span class="code">src/views</span> 下的文件对应，
          例如 <span class="code">/system/users/index</span>。
        </p>
      </div>
      <div class="act">
        <span v-if="!auth.can('menu.create')" class="readonly-pill">当前角色只读</span>
        <button v-if="auth.can('menu.create')" class="btn pri" @click="handleAdd(null)">
          新增菜单
        </button>
      </div>
    </div>

    <div class="two-col">
      <!-- 左：菜单树 -->
      <div class="card">
        <div class="toolbar">
          <input v-model="searchKeyword" class="search-input" type="search" placeholder="搜索菜单" />
          <span class="count">{{ menuTree.length }} 个顶级</span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>

        <ul v-else class="tree">
          <li v-for="node in visibleTree" :key="node.id">
            <div
              class="li"
              :class="{ on: selected?.id === node.id, dim: node.is_hidden }"
              @click="selected = node"
            >
              <span class="hd">{{ node.is_hidden ? '○' : '▸' }}</span>
              <div class="nm">
                <b>{{ node.title }}</b>
                <small>{{ node.path }}</small>
              </div>
              <span v-if="node.is_hidden" class="pill">隐藏</span>
              <span class="row-actions">
                <button
                  v-if="auth.can('menu.create')"
                  class="btn sm"
                  title="添加子菜单"
                  @click.stop="handleAdd(node)"
                >
                  添加
                </button>
                <button v-if="auth.can('menu.edit')" class="btn sm" @click.stop="handleEdit(node)">
                  编辑
                </button>
                <button
                  v-if="auth.can('menu.delete')"
                  class="btn sm dg"
                  @click.stop="handleDelete(node)"
                >
                  删除
                </button>
              </span>
            </div>

            <ul v-if="node.children?.length" class="sub">
              <li v-for="child in node.children" :key="child.id">
                <div
                  class="li"
                  :class="{ on: selected?.id === child.id, dim: child.is_hidden }"
                  @click="selected = child"
                >
                  <span class="hd">·</span>
                  <div class="nm">
                    <b>{{ child.title }}</b>
                    <small>{{ child.path }}</small>
                  </div>
                  <span v-if="child.is_hidden" class="pill">隐藏</span>
                  <span class="row-actions">
                    <button
                      v-if="auth.can('menu.create')"
                      class="btn sm"
                      title="添加子菜单"
                      @click.stop="handleAdd(child)"
                    >
                      添加
                    </button>
                    <button v-if="auth.can('menu.edit')" class="btn sm" @click.stop="handleEdit(child)">
                      编辑
                    </button>
                    <button
                      v-if="auth.can('menu.delete')"
                      class="btn sm dg"
                      @click.stop="handleDelete(child)"
                    >
                      删除
                    </button>
                  </span>
                </div>
              </li>
            </ul>
          </li>
          <li v-if="!visibleTree.length">
            <div class="empty">没有匹配的菜单</div>
          </li>
        </ul>
      </div>

      <!-- 右：详情 -->
      <div class="card" style="padding: 16px 18px">
        <template v-if="selected">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px">菜单详情</h3>
          <dl class="kv">
            <dt>菜单标题</dt>
            <dd>{{ selected.title }}</dd>

            <dt>路由路径</dt>
            <dd><span class="code">{{ selected.path }}</span></dd>

            <dt>路由名称</dt>
            <dd>{{ selected.name || '—' }}</dd>

            <dt>组件路径</dt>
            <dd>
              <span v-if="selected.component" class="code">{{ selected.component }}</span>
              <span v-else class="text-muted">目录节点（无组件）</span>
            </dd>

            <dt>权限绑定</dt>
            <dd>
              <span v-if="selected.permission_code" class="code">{{ selected.permission_code }}</span>
              <span v-else class="text-muted">未绑定权限（所有可见角色可见）</span>
            </dd>

            <dt>菜单图标</dt>
            <dd>
              <span v-if="selected.icon">
                <span class="dot-avatar dim" style="display: inline-grid; width: 22px; height: 22px">
                  {{ selected.icon.charAt(0) }}
                </span>
                <span class="code" style="margin-left: 6px">{{ selected.icon }}</span>
              </span>
              <span v-else class="text-muted">—</span>
            </dd>

            <dt>排序</dt>
            <dd class="num">{{ selected.sort }}</dd>

            <dt>是否隐藏</dt>
            <dd>
              <span class="pill" :class="selected.is_hidden ? 'warn' : 'good'">
                {{ selected.is_hidden ? '隐藏' : '显示' }}
              </span>
            </dd>

            <dt>是否固定</dt>
            <dd>{{ selected.is_affix ? '是（固定标签页）' : '否' }}</dd>

            <dt>是否缓存</dt>
            <dd>{{ selected.is_keep_alive ? '是（keep-alive）' : '否' }}</dd>

            <template v-if="selected.redirect">
              <dt>重定向</dt>
              <dd><span class="code">{{ selected.redirect }}</span></dd>
            </template>
          </dl>
        </template>

        <div v-else class="empty" style="padding: 60px 20px">
          从左侧选择一个菜单查看详情
        </div>
      </div>
    </div>

    <MenuEditDialog
      v-model="editDialogVisible"
      :menu="currentMenu"
      :parent-menu="parentMenu"
      @success="loadMenus"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { menuApi } from '../../../api/admin';
import type { Menu } from '../../../types/auth';
import { useAuthStore } from '../../../stores/auth';
import MenuEditDialog from './components/MenuEditDialog.vue';

const auth = useAuthStore();

const loading = ref(false);
const menuTree = ref<Menu[]>([]);
const searchKeyword = ref('');
const selected = ref<Menu | null>(null);
const editDialogVisible = ref(false);
const currentMenu = ref<Menu | null>(null);
const parentMenu = ref<Menu | null>(null);

/** 搜索时对树做保留匹配，命中的父级一并保留 */
const visibleTree = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  if (!kw) return menuTree.value;

  const match = (n: Menu): boolean =>
    n.title.toLowerCase().includes(kw) ||
    n.path.toLowerCase().includes(kw) ||
    (n.component ?? '').toLowerCase().includes(kw);

  const filter = (list: Menu[]): Menu[] =>
    list
      .map((n) => ({ ...n, children: n.children ? filter(n.children) : undefined }))
      .filter((n) => match(n) || (n.children?.length ?? 0) > 0);

  return filter(menuTree.value);
});

async function loadMenus() {
  loading.value = true;
  try {
    menuTree.value = await menuApi.list();
  } catch (error) {
    ElMessage.error((error as Error).message || '加载菜单失败');
  } finally {
    loading.value = false;
  }
}

function handleAdd(parent: Menu | null) {
  currentMenu.value = null;
  parentMenu.value = parent;
  editDialogVisible.value = true;
}

function handleEdit(menu: Menu) {
  currentMenu.value = { ...menu };
  parentMenu.value = menu.parent_id ? findMenuById(menuTree.value, menu.parent_id) : null;
  editDialogVisible.value = true;
}

function findMenuById(menus: Menu[], id: number): Menu | null {
  for (const m of menus) {
    if (m.id === id) return m;
    const found = m.children ? findMenuById(m.children, id) : null;
    if (found) return found;
  }
  return null;
}

async function handleDelete(menu: Menu) {
  if (menu.children?.length) {
    ElMessage.warning('请先删除该菜单下的子菜单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定删除菜单「${menu.title}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    await menuApi.delete(menu.id);
    ElMessage.success('已删除');
    if (selected.value?.id === menu.id) selected.value = null;
    loadMenus();
  } catch (error) {
    ElMessage.error((error as Error).message || '删除失败');
  }
}

// 刷新后保持选中项（后端会回填默认展开）
watch(menuTree, () => {
  if (!selected.value && menuTree.value.length) selected.value = menuTree.value[0];
});

onMounted(loadMenus);
</script>

<style scoped>
/* 树形列表 */
.tree,
.tree .sub {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree {
  padding: 6px;
}
.tree .sub {
  margin-left: 18px;
  padding-left: 10px;
  border-left: 1px solid var(--line);
}

.li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 40px;
}
.li:hover {
  background: var(--surface2);
}
.li.on {
  background: var(--accent-soft);
}
.li.on .nm b {
  color: var(--accent);
}
.li.dim {
  opacity: 0.55;
}
.li .hd {
  color: var(--muted2);
  font-size: 12px;
  width: 12px;
  flex: none;
  text-align: center;
}
.li .nm {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.li .nm b {
  font-weight: 500;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.li .nm small {
  font-size: 11.5px;
  color: var(--muted);
  font-family: var(--mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.li .row-actions {
  opacity: 0;
  transition: opacity 0.12s;
  flex: none;
}
.li:hover .row-actions,
.li.on .row-actions {
  opacity: 1;
}
</style>