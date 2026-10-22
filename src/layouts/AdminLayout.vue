<template>
  <div class="shell" :class="{ navopen: mobileNavOpen }">
    <!-- 遮罩（窄屏） -->
    <div v-if="mobileNavOpen" class="nav-scrim" @click="mobileNavOpen = false" />

    <!-- 侧栏 -->
    <aside class="side" :class="{ open: mobileNavOpen }">
      <div class="brand">
        <i><span class="brand-mark">F</span></i>
        <span class="brand-text">
          Flickme
          <small>运营控制台</small>
        </span>
      </div>
      <nav class="nav" aria-label="主导航">
        <SidebarItem v-for="node in menuTree" :key="node.id" :item="node" />
      </nav>
    </aside>

    <div class="main">
      <header class="top">
        <button class="ic burger" aria-label="菜单" @click="mobileNavOpen = !mobileNavOpen">
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div class="crumb">
          <template v-for="(c, i) in crumbs" :key="i">
            <span v-if="i < crumbs.length - 1">{{ c }} · </span>
            <b v-else>{{ c }}</b>
          </template>
        </div>

        <div class="gs">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            v-model="searchTerm"
            placeholder="搜索功能,如 优惠券、Chips"
            aria-label="搜索功能"
            autocomplete="off"
          />
          <div v-if="searchResults.length" class="res">
            <button v-for="r in searchResults" :key="r.path" class="search-result" @click="goto(r)">
              <el-icon><component :is="resolveLayoutIcon(r.icon)" /></el-icon>
              <span>{{ r.title }}</span>
              <span class="path mono">{{ r.path }}</span>
            </button>
          </div>
        </div>

        <el-dropdown trigger="click" @command="onCommand">
          <button class="user-trigger" aria-label="账号菜单">
            <span class="uname">{{ currentIdentity }}</span>
            <svg viewBox="0 0 24 24" class="chev"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <div class="profile-card">
                  <b>{{ auth.user?.name }}</b>
                  <small>{{ auth.user?.email }}</small>
                  <small>{{ roleNames || '未分配角色' }}</small>
                </div>
              </el-dropdown-item>
              <el-dropdown-item command="password" divided>
                <el-icon><Lock /></el-icon> 修改密码
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button
          class="ic theme-toggle"
          :aria-label="darkTheme ? '切换浅色主题' : '切换深色主题'"
          :title="darkTheme ? '切换浅色主题' : '切换深色主题'"
          @click="toggleTheme"
        >
          <svg v-if="!darkTheme" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
            />
          </svg>
        </button>
        <span class="av" :title="auth.user?.name">{{ (auth.user?.name ?? 'A').charAt(0) }}</span>
      </header>

      <main id="view" class="page">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 修改密码 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="420px">
      <el-form ref="pwdRef" :model="pwdForm" :rules="pwdRules" label-width="84px">
        <el-form-item label="原密码" prop="old_password">
          <el-input v-model="pwdForm.old_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="pwdForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="password_confirmation">
          <el-input v-model="pwdForm.password_confirmation" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="submitPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Lock, SwitchButton } from '@element-plus/icons-vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import SidebarItem from '../components/layout/SidebarItem.vue';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api/admin';
import { buildRoutesFromMenus } from '../router';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mobileNavOpen = ref(false);
const darkTheme = ref(false);
try {
  const saved = localStorage.getItem('flickme_admin_theme');
  darkTheme.value = saved
    ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
} catch {
  darkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
}
document.documentElement.dataset.theme = darkTheme.value ? 'dark' : 'light';
function toggleTheme() {
  darkTheme.value = !darkTheme.value;
  const theme = darkTheme.value ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('flickme_admin_theme', theme);
  } catch {
    /* Theme still works without storage. */
  }
}

// icon 名字 → Element Plus 图标组件
const iconCache: Record<string, unknown> = {};
function resolveLayoutIcon(name: string | null | undefined) {
  if (!name) return undefined;
  if (!iconCache[name])
    iconCache[name] = ElementPlusIconsVue[name as keyof typeof ElementPlusIconsVue];
  return iconCache[name];
}

// 顶部面包屑：路径切成层级
const crumbs = computed(() => {
  const find = (nodes: typeof auth.menus, parents: string[] = []): string[] | undefined => {
    for (const node of nodes) {
      const chain = [...parents, node.meta.title];
      if (node.path === route.path) return chain;
      const found = node.children?.length ? find(node.children, chain) : undefined;
      if (found) return found;
    }
  };
  return find(auth.menus) ?? [String(route.meta.title ?? '运营后台')];
});

const menuTree = computed(() => auth.menus);

const roleNames = computed(() => auth.user?.roles.map((r) => r.name).join('、'));
const currentIdentity = computed(() =>
  auth.user?.is_super_admin ? '超级管理员' : roleNames.value || auth.user?.name || '未登录',
);

// ────── 搜索 ──────
const searchTerm = ref('');
interface SearchHit {
  path: string;
  title: string;
  icon?: string | null;
}

const flatMenus = computed<SearchHit[]>(() => {
  const walk = (list: typeof auth.menus, out: SearchHit[] = []) => {
    for (const m of list) {
      if (!m.meta.isHidden) out.push({ path: m.path, title: m.meta.title, icon: m.icon });
      if (m.children?.length) walk(m.children, out);
    }
    return out;
  };
  return walk(auth.menus);
});

const searchResults = computed<SearchHit[]>(() => {
  const kw = searchTerm.value.trim().toLowerCase();
  if (!kw) return [];
  return flatMenus.value
    .filter((m) => m.title.toLowerCase().includes(kw) || m.path.toLowerCase().includes(kw))
    .slice(0, 8);
});

function goto(item: SearchHit) {
  searchTerm.value = '';
  router.push(item.path);
  mobileNavOpen.value = false;
}

// ────── 修改密码 ──────
const pwdVisible = ref(false);
const pwdSaving = ref(false);
const pwdRef = ref<FormInstance>();

const pwdForm = reactive({
  old_password: '',
  password: '',
  password_confirmation: '',
});

const pwdRules: FormRules = {
  old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 64, message: '密码 8-64 位', trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_r, v: string, cb) =>
        v === pwdForm.password ? cb() : cb(new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
};

async function submitPassword() {
  if (!pwdRef.value) return;
  await pwdRef.value.validate();

  pwdSaving.value = true;
  try {
    await authApi.changePassword(pwdForm);
    ElMessage.success('密码已修改，请重新登录');
    pwdVisible.value = false;
    await auth.logout();
    await router.replace('/login');
  } catch (error) {
    ElMessage.error((error as Error).message ?? '修改失败');
  } finally {
    pwdSaving.value = false;
  }
}

// ────── 下拉菜单 ──────
async function onCommand(cmd: string) {
  if (cmd === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '退出', { type: 'warning' });
    } catch {
      return;
    }
    await auth.logout();
    await router.replace('/login');
  } else if (cmd === 'password') {
    pwdForm.old_password = '';
    pwdForm.password = '';
    pwdForm.password_confirmation = '';
    pwdVisible.value = true;
  }
}

onMounted(() => {
  // 菜单已在 login/refresh 时灌入 auth.menus，此时构建路由最安全
  buildRoutesFromMenus();
});
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}

/* ─── 侧栏 ─── */
.side {
  width: 232px;
  flex: none;
  background: var(--surface);
  border-right: 1px solid var(--line);
  position: fixed;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  z-index: 30;
  overflow-y: auto;
  transition: transform 0.2s;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.2px;
  color: var(--fg);
}
.brand i {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--accent);
  display: grid;
  place-items: center;
  font-style: normal;
}
.brand-mark {
  color: var(--accent-fg);
  font-weight: 700;
  font-size: 14px;
}
.brand-text small {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--muted);
}
.nav {
  padding: 4px 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ─── 主区 ─── */
.main {
  margin-left: 232px;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ─── 顶栏 ─── */
.top {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
}
.crumb {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}
.crumb b {
  color: var(--fg);
  font-weight: 500;
}

.gs {
  margin-left: auto;
  position: relative;
  width: 260px;
  max-width: 30vw;
}
.gs input {
  width: 100%;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface2);
  padding: 0 10px 0 32px;
  outline: none;
}
.gs input:focus {
  background: var(--surface);
  border-color: var(--accent);
}
.gs > svg {
  position: absolute;
  left: 10px;
  top: 9px;
  width: 16px;
  height: 16px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 1.8;
}
.gs .res {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 4px;
  z-index: 80;
}
.gs .res .search-result {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--fg);
}
.gs .res .search-result:hover {
  background: var(--surface2);
}
.gs .res .search-result .path {
  margin-left: auto;
}

.spacer {
  margin-left: auto;
  flex: 0 0 0;
}

.ic {
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.ic svg {
  width: 16px;
  height: 16px;
  stroke: var(--fg);
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.burger {
  display: none;
}

.api-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--muted);
  cursor: default;
}
.api-tag i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.api-tag.ok {
  color: var(--good);
  border-color: transparent;
  background: var(--good-soft);
}
.api-tag.ok i {
  background: var(--good);
}
.api-tag.bad {
  color: var(--bad);
  border-color: transparent;
  background: var(--bad-soft);
}
.api-tag.bad i {
  background: var(--bad);
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  height: 34px;
  padding: 0 10px;
  white-space: nowrap;
  outline: none;
}
.av {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 12px;
}
.uname {
  font-size: 13px;
}
.theme-toggle {
  flex: 0 0 34px;
}
.chev {
  width: 14px;
  height: 14px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  font-size: 12px;
}
.profile-card b {
  font-size: 13px;
}
.profile-card small {
  color: var(--muted);
}

/* ─── 路由切换 ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─── 窄屏 ─── */
.nav-scrim {
  display: none;
}

@media (max-width: 900px) {
  .side {
    transform: translateX(-102%);
    box-shadow: var(--shadow);
  }
  .side.open {
    transform: none;
  }
  .navopen .nav-scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(10, 6, 6, 0.4);
    z-index: 25;
  }
  .main {
    margin-left: 0;
  }
  .top {
    padding: 0 16px;
    gap: 8px;
  }
  .gs,
  .crumb {
    display: none;
  }
  .user-trigger {
    max-width: 160px;
  }
  .uname {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .top > .el-dropdown {
    margin-left: auto;
  }
  .burger {
    display: grid;
  }
}
</style>
