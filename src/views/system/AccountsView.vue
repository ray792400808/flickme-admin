<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { accountsApi, type Account, type Role, type Page } from '../../api/accounts';
import { useAuthStore } from '../../stores/auth';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
const auth = useAuthStore();
const result = ref<Page<Account>>({ data: [], current_page: 1, last_page: 1, total: 0 });
const roles = ref<Role[]>([]);
const query = ref('');
const status = ref('');
const role = ref('');
const busy = ref(false);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const editing = ref(false);
const selected = ref<Account | null>(null);
const draft = reactive({ name: '', email: '', role_key: 'ops', status: 'pending', note: '' });
const invitation = ref('');
const expires = ref('');
const copied = ref(false);
const pending = ref<{ row: Account; action: 'delete' | 'reset' } | null>(null);
const canWrite = computed(() => auth.can('system', true));
const statusNames = { active: '启用', pending: '待激活', disabled: '停用' };
let sequence = 0;
async function load(page = 1) {
  const current = ++sequence;
  busy.value = true;
  error.value = '';
  try {
    const data = await accountsApi.list(
      new URLSearchParams({
        page: String(page),
        search: query.value,
        role: role.value,
        status: status.value,
      }),
    );
    if (current === sequence) result.value = data;
  } catch (cause) {
    if (current === sequence) error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    if (current === sequence) busy.value = false;
  }
}
function edit(row?: Account) {
  selected.value = row ?? null;
  Object.assign(draft, {
    name: row?.name ?? '',
    email: row?.email ?? '',
    role_key: row?.role_key ?? 'ops',
    status: row?.status ?? 'pending',
    note: row?.note ?? '',
  });
  formError.value = '';
  editing.value = true;
}
function showLink(token: string, expiry: string) {
  invitation.value = `${location.origin}${location.pathname}#/activate?token=${encodeURIComponent(token)}`;
  expires.value = expiry;
  copied.value = false;
}
async function save() {
  if (saving.value) return;
  saving.value = true;
  formError.value = '';
  try {
    if (selected.value) {
      await accountsApi.update(selected.value.id, { ...draft });
    } else {
      const data = await accountsApi.create({ ...draft });
      showLink(data.activationToken, data.expiresAt);
    }
    editing.value = false;
    await load();
    await auth.refresh();
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : '保存失败';
  } finally {
    saving.value = false;
  }
}
async function confirmAction() {
  if (!pending.value || saving.value) return;
  const { row, action } = pending.value;
  saving.value = true;
  error.value = '';
  try {
    if (action === 'delete') await accountsApi.remove(row.id);
    else {
      const data = await accountsApi.reset(row.id);
      showLink(data.activationToken, data.expiresAt);
    }
    pending.value = null;
    await load(result.value.current_page);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '操作失败';
    pending.value = null;
  } finally {
    saving.value = false;
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(invitation.value);
    copied.value = true;
  } catch {
    error.value = '无法自动复制，请手动选中链接复制';
  }
}
onMounted(async () => {
  await load();
  try {
    roles.value = (await accountsApi.roles()).roles;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '角色加载失败';
  }
});
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>账号管理</h1>
      <p>管理后台成员、角色与账号状态。权限由角色决定。</p>
    </div>
    <button v-if="canWrite" class="primary" @click="edit()">＋ 新增账号</button>
  </div>
  <p class="info-note">邀请链接由管理员复制后私下发送，邮件投递和两步验证尚未接入。</p>
  <p v-if="error" class="form-error" role="alert">
    {{ error }} <button :disabled="busy" @click="load()">重试</button>
  </p>
  <section v-if="invitation" class="card invitation">
    <h2>一次性激活 / 密码重置链接</h2>
    <p>有效至 {{ new Date(expires).toLocaleString() }}。请安全地发送给对应成员，勿公开分享。</p>
    <input
      :value="invitation"
      readonly
      aria-label="一次性链接"
      @focus="($event.target as HTMLInputElement).select()"
    /><button @click="copy">{{ copied ? '已复制' : '复制链接' }}</button
    ><button @click="invitation = ''">关闭</button>
  </section>
  <section class="card table-card">
    <form class="toolbar" @submit.prevent="load()">
      <input v-model="query" placeholder="搜索姓名或邮箱" aria-label="搜索账号" /><select
        v-model="role"
        aria-label="角色"
      >
        <option value="">全部角色</option>
        <option v-for="r in roles" :key="r.id" :value="r.key">{{ r.name }}</option></select
      ><select v-model="status" aria-label="状态">
        <option value="">全部状态</option>
        <option v-for="(name, key) in statusNames" :key="key" :value="key">
          {{ name }}
        </option></select
      ><button :disabled="busy">查询</button
      ><button
        type="button"
        @click="
          query = '';
          role = '';
          status = '';
          load();
        "
      >
        重置
      </button>
    </form>
    <div class="table-scroll" :aria-busy="busy">
      <table>
        <thead>
          <tr>
            <th>账号</th>
            <th>角色</th>
            <th>状态</th>
            <th>最近登录</th>
            <th>两步验证</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.data" :key="row.id">
            <td>
              <b>{{ row.name }}</b
              ><small class="episode-file"
                >{{ row.email }} {{ row.id === auth.user?.id ? '（当前）' : '' }}</small
              >
            </td>
            <td>{{ roles.find((r) => r.key === row.role_key)?.name || row.role_key }}</td>
            <td>
              <span class="pill" :class="{ positive: row.status === 'active' }">{{
                statusNames[row.status]
              }}</span>
            </td>
            <td>{{ row.last_login_at ? new Date(row.last_login_at).toLocaleString() : '—' }}</td>
            <td class="muted">未接入</td>
            <td>
              <div class="row-actions">
                <button v-if="canWrite" @click="edit(row)">编辑</button
                ><template v-if="canWrite && row.id !== auth.user?.id"
                  ><button :disabled="saving" @click="pending = { row, action: 'reset' }">
                    {{ row.status === 'active' ? '重置密码' : '重新邀请' }}</button
                  ><button
                    class="negative"
                    :disabled="saving"
                    @click="pending = { row, action: 'delete' }"
                  >
                    删除
                  </button></template
                >
              </div>
            </td>
          </tr>
          <tr v-if="!result.data.length">
            <td colspan="6" class="empty">{{ busy ? '加载中…' : '暂无账号' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="pagination">
      <span>共 {{ result.total }} 条</span
      ><button :disabled="busy || result.current_page <= 1" @click="load(result.current_page - 1)">
        上一页</button
      ><span>{{ result.current_page }} / {{ result.last_page }}</span
      ><button
        :disabled="busy || result.current_page >= result.last_page"
        @click="load(result.current_page + 1)"
      >
        下一页
      </button>
    </footer>
  </section>
  <Teleport to="body"
    ><div v-if="editing" class="drawer-overlay">
      <section class="drawer" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <header>
          <h2 id="account-title">{{ selected ? '编辑账号' : '新增账号' }}</h2>
          <button :disabled="saving" @click="editing = false">关闭</button>
        </header>
        <form id="account-form" class="drawer-body" @submit.prevent="save">
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <label>姓名<input v-model="draft.name" required maxlength="100" /></label
          ><label
            >邮箱<input
              v-model="draft.email"
              type="email"
              required
              maxlength="254"
              :disabled="!!selected" /></label
          ><label
            >角色<select v-model="draft.role_key" :disabled="selected?.id === auth.user?.id">
              <option v-for="r in roles" :key="r.id" :value="r.key">{{ r.name }}</option>
            </select></label
          ><label v-if="selected"
            >状态<select v-model="draft.status" :disabled="selected.id === auth.user?.id">
              <option
                v-for="(name, key) in statusNames"
                :key="key"
                :value="key"
                :disabled="
                  (key === 'pending' && selected.status !== 'pending') ||
                  (key === 'active' && selected.status === 'pending')
                "
              >
                {{ name }}
              </option>
            </select></label
          ><label>备注<textarea v-model="draft.note" rows="4" maxlength="1000" /></label>
          <p v-if="!selected">创建后生成一次性链接，由成员设置密码并激活账号。</p>
        </form>
        <footer>
          <button :disabled="saving" @click="editing = false">取消</button
          ><button class="primary" form="account-form" :disabled="saving">
            {{ saving ? '保存中…' : selected ? '保存修改' : '创建并生成邀请' }}
          </button>
        </footer>
      </section>
    </div></Teleport
  >
  <ConfirmDialog
    :open="!!pending"
    :title="pending?.action === 'delete' ? '删除账号' : '生成新的激活链接'"
    :message="
      pending
        ? `${pending.row.email}：${pending.action === 'delete' ? '删除后不可恢复，历史操作日志保留。' : '旧密码、旧链接和已登录会话会立即失效。'}`
        : ''
    "
    @cancel="pending = null"
    @confirm="confirmAction"
  />
</template>
