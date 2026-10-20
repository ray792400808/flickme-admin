<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import ReferenceTable from '../../components/operations/ReferenceTable.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
import { usersApi, usersEnabled } from '../../api/users';
import { usePagedList } from '../../composables/usePagedList';
import { useAuthStore } from '../../stores/auth';
import type { AppUser } from '../../types/users';
const auth = useAuthStore(),
  filters = reactive({ q: '', status: '', membership: '' });
const list = reactive(usePagedList(usersEnabled, usersApi.list, filters));
const writable = computed(() => usersEnabled && auth.can('users', true));
const selected = ref<AppUser | null>(null),
  open = ref(false),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  status = ref<AppUser['status']>('active'),
  reason = ref('');
const columns = [
  { key: 'uid', label: 'UID' },
  { key: 'login_provider', label: '登录方式' },
  { key: 'member_coins', label: 'Member coins' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'membership', label: '会员' },
  { key: 'unlocked_episodes', label: '已解锁集' },
  { key: 'registered_at', label: '注册' },
  { key: 'status', label: '状态' },
];
const membershipNames = { none: '无', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
let sequence = 0,
  timer: ReturnType<typeof setTimeout> | undefined;
async function detail(row: AppUser) {
  if (!usersEnabled || busy.value) return;
  const id = ++sequence;
  selected.value = null;
  open.value = true;
  loading.value = true;
  error.value = '';
  reason.value = '';
  try {
    const result = await usersApi.detail(row.id);
    if (id === sequence) {
      selected.value = result;
      status.value = result.status;
    }
  } catch (cause) {
    if (id === sequence) error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    if (id === sequence) loading.value = false;
  }
}
function close() {
  if (busy.value) return;
  sequence++;
  open.value = false;
  loading.value = false;
}
async function save() {
  if (!selected.value || !writable.value || busy.value) return;
  if (status.value === selected.value.status) {
    close();
    return;
  }
  if (!reason.value.trim() || reason.value.length > 500) {
    error.value = '请填写 1–500 字的变更原因';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    selected.value = await usersApi.status(selected.value, status.value, reason.value.trim());
    open.value = false;
    message.value = '已保存';
    clearTimeout(timer);
    timer = setTimeout(() => (message.value = ''), 2200);
    await list.reload();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败';
  } finally {
    busy.value = false;
  }
}
onBeforeUnmount(() => {
  sequence++;
  clearTimeout(timer);
});
</script>
<template>
  <div class="op-page">
    <div class="ph">
      <div>
        <h1>用户列表</h1>
        <p>按 UID 查询用户,查看余额、会员、解锁与封禁状态。</p>
      </div>
      <div v-if="!writable && usersEnabled" class="act">
        <span class="pill warn">当前角色只读</span>
      </div>
    </div>
    <div v-if="!usersEnabled" class="banner warn">业务接口尚未接入，操作暂不可用。</div>
    <div v-if="message" class="toast on" role="status">{{ message }}</div>
    <ReferenceTable
      v-model:search="filters.q"
      :columns="columns"
      :rows="list.rows"
      :total="list.total"
      :page="list.page"
      :page-size="list.pageSize"
      :loading="list.loading"
      :error="list.error"
      :disabled="!usersEnabled"
      clickable
      @open="detail"
      @search="list.search"
      @page="list.changePage"
      @retry="list.reload"
      ><template #filters
        ><select
          v-model="filters.membership"
          aria-label="会员"
          :disabled="!usersEnabled"
          @change="list.search"
        >
          <option value="">会员:全部</option>
          <option v-for="(name, key) in membershipNames" :key="key" :value="key">
            {{ name }}
          </option></select
        ><select
          v-model="filters.status"
          aria-label="状态"
          :disabled="!usersEnabled"
          @change="list.search"
        >
          <option value="">状态:全部</option>
          <option value="active">正常</option>
          <option value="banned">封禁</option>
        </select></template
      ><template #uid="{ row }"
        ><span class="mono">{{ row.uid }}</span></template
      ><template #membership="{ row }"
        ><span v-if="row.membership !== 'none'" class="pill info">{{
          membershipNames[row.membership]
        }}</span
        ><template v-else>—</template></template
      ><template #registered_at="{ row }">{{ row.registered_at.slice(0, 10) }}</template
      ><template #status="{ row }"
        ><span
          class="pill"
          :class="{ good: row.status === 'active', bad: row.status === 'banned' }"
          >{{ row.status === 'active' ? '正常' : '封禁' }}</span
        ></template
      ></ReferenceTable
    >
    <FormDrawer
      reference
      :open="open"
      :title="selected?.uid || '用户详情'"
      :subtitle="selected ? 'ID ' + selected.id : ''"
      :busy="busy"
      @close="close"
      ><div v-if="loading" role="status">正在加载…</div>
      <form v-if="selected" id="user-status-form" class="op-form" @submit.prevent="save">
        <div class="fld"><label>UID</label><input class="in" :value="selected.uid" readonly /></div>
        <div class="fld">
          <label>登录方式</label><input class="in" :value="selected.login_provider" readonly />
        </div>
        <div class="fld">
          <label>Member coins</label><input class="in" :value="selected.member_coins" readonly />
        </div>
        <div class="fld">
          <label>Bonus</label><input class="in" :value="selected.bonus" readonly />
        </div>
        <div class="fld">
          <label>会员</label
          ><input class="in" :value="membershipNames[selected.membership]" readonly />
        </div>
        <div class="fld">
          <label>账号状态</label
          ><select v-model="status" class="in" aria-label="账号状态" :disabled="!writable || busy">
            <option value="active">正常</option>
            <option value="banned">封禁</option></select
          ><span class="hint">封禁后用户无法登录与消耗金币,需填写原因并记入日志</span>
        </div>
        <div v-if="status !== selected.status" class="fld">
          <label>原因(必填)</label
          ><textarea v-model="reason" class="in" aria-label="原因(必填)" required maxlength="500" />
        </div>
      </form>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <template #footer
        ><template v-if="writable"
          ><button class="btn" :disabled="busy" @click="close">取消</button
          ><button class="btn pri" form="user-status-form" :disabled="busy || loading || !selected">
            保存
          </button></template
        ><button v-else class="btn" @click="close">关闭</button></template
      ></FormDrawer
    >
  </div>
</template>
