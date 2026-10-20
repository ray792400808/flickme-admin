<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import ReferenceTable from '../../components/operations/ReferenceTable.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
import { coinAdjustmentsApi, coinsEnabled } from '../../api/users';
import { ApiError } from '../../api/client';
import { usePagedList } from '../../composables/usePagedList';
import { useAuthStore } from '../../stores/auth';
import { canReviewAdjustment, validateCoinAdjustment } from '../../utils/users';
import type { CoinAdjustment, CoinAdjustmentInput } from '../../types/users';
const auth = useAuthStore(),
  filters = reactive({ uid: '', status: '' });
const list = reactive(usePagedList(coinsEnabled, coinAdjustmentsApi.list, filters));
const writable = computed(() => coinsEnabled && auth.can('users', true));
const open = ref(false),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  discard = ref(false),
  selected = ref<CoinAdjustment | null>(null);
const form = reactive<CoinAdjustmentInput>({
  uid: '',
  currency: 'member_coins',
  amount: 0,
  reason: '',
});
const reviewing = ref<CoinAdjustment | null>(null),
  decision = ref<'approve' | 'reject'>('approve'),
  submittedPayload = ref('');
let key = '',
  reviewKey = '',
  snapshot = '',
  leaveResolve: ((value: boolean) => void) | undefined,
  timer: ReturnType<typeof setTimeout> | undefined;
const editable = computed(() => writable.value && !selected.value);
const frozen = computed(() => busy.value || !!submittedPayload.value || !editable.value);
const dirty = computed(() => open.value && editable.value && JSON.stringify(form) !== snapshot);
const statusNames = { pending: '待审批', approved: '已发布', rejected: '驳回' };
const columns = [
  { key: 'uid', label: 'UID' },
  { key: 'currency', label: '币种' },
  { key: 'amount', label: '变动' },
  { key: 'reason', label: '原因' },
  { key: 'requester_name', label: '发起人' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
];
function notify(text: string) {
  message.value = text;
  clearTimeout(timer);
  timer = setTimeout(() => (message.value = ''), 2200);
}
function edit(row?: CoinAdjustment) {
  if (busy.value || !coinsEnabled) return;
  selected.value = row ?? null;
  Object.assign(
    form,
    row
      ? { uid: row.uid, currency: row.currency, amount: row.amount, reason: row.reason }
      : { uid: '', currency: 'member_coins', amount: 0, reason: '' },
  );
  key = '';
  submittedPayload.value = '';
  error.value = '';
  snapshot = JSON.stringify(form);
  open.value = true;
}
function close() {
  if (busy.value) return;
  if (dirty.value) discard.value = true;
  else open.value = false;
}
async function submit() {
  if (!editable.value || busy.value) return;
  error.value = validateCoinAdjustment(form);
  if (error.value) return;
  const input = { ...form, uid: form.uid.trim(), reason: form.reason.trim() },
    payload = JSON.stringify(input);
  if (submittedPayload.value && submittedPayload.value !== payload) {
    error.value = '请使用原请求重试，避免重复提交';
    return;
  }
  submittedPayload.value = payload;
  key ||= crypto.randomUUID();
  busy.value = true;
  try {
    await coinAdjustmentsApi.create(input, key);
    open.value = false;
    notify('已提交,等待第二位管理员审批');
    await list.reload();
  } catch (cause) {
    if (
      cause instanceof ApiError &&
      cause.status >= 400 &&
      cause.status < 500 &&
      cause.status !== 409
    ) {
      submittedPayload.value = '';
      key = '';
    }
    error.value = cause instanceof Error ? cause.message : '提交失败';
  } finally {
    busy.value = false;
  }
}
function review(row: CoinAdjustment, value: 'approve' | 'reject') {
  if (!canReviewAdjustment(row, auth.user?.id, writable.value) || busy.value) return;
  reviewing.value = row;
  decision.value = value;
  reviewKey = crypto.randomUUID();
  error.value = '';
}
async function confirmReview(reason: string) {
  const row = reviewing.value;
  if (!row || !canReviewAdjustment(row, auth.user?.id, writable.value) || busy.value) return;
  if (decision.value === 'reject' && !reason.trim()) return;
  busy.value = true;
  error.value = '';
  try {
    await coinAdjustmentsApi.review(row, decision.value, reason.trim(), reviewKey);
    reviewing.value = null;
    notify(decision.value === 'approve' ? '已批准' : '已驳回');
    await list.reload();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '审批失败';
  } finally {
    busy.value = false;
  }
}
function discardForm() {
  open.value = false;
  discard.value = false;
  leaveResolve?.(true);
  leaveResolve = undefined;
}
function keepForm() {
  discard.value = false;
  leaveResolve?.(false);
  leaveResolve = undefined;
}
onBeforeRouteLeave((to) => {
  if (to.name === 'login' || !auth.authenticated) return true;
  if (busy.value) return false;
  if (!dirty.value) return true;
  discard.value = true;
  return new Promise<boolean>((resolve) => (leaveResolve = resolve));
});
onBeforeUnmount(() => {
  leaveResolve?.(false);
  clearTimeout(timer);
});
</script>
<template>
  <div class="op-page">
    <div class="ph">
      <div>
        <h1>金币调整</h1>
        <p>手动增减用户金币。所有调整需由另一位管理员审批后生效,并记入操作日志。</p>
      </div>
      <div class="act">
        <span v-if="!writable && coinsEnabled" class="pill warn">当前角色只读</span
        ><button class="btn pri" :disabled="!writable || busy" @click="edit()">发起调整</button>
      </div>
    </div>
    <div v-if="!coinsEnabled" class="banner warn">业务接口尚未接入，操作暂不可用。</div>
    <p v-if="error && !open && !reviewing" class="banner warn" role="alert">{{ error }}</p>
    <div v-if="message" class="toast on" role="status">{{ message }}</div>
    <ReferenceTable
      v-model:search="filters.uid"
      :columns="columns"
      :rows="list.rows"
      :total="list.total"
      :page="list.page"
      :page-size="list.pageSize"
      :loading="list.loading"
      :error="list.error"
      :disabled="!coinsEnabled || busy"
      clickable
      @open="edit"
      @search="list.search"
      @page="list.changePage"
      @retry="list.reload"
      ><template #filters
        ><select
          v-model="filters.status"
          aria-label="状态"
          :disabled="!coinsEnabled || busy"
          @change="list.search"
        >
          <option value="">状态:全部</option>
          <option value="pending">待审批</option>
          <option value="approved">已发布</option>
          <option value="rejected">驳回</option>
        </select></template
      ><template #uid="{ row }"
        ><span class="mono">{{ row.uid }}</span></template
      ><template #currency="{ row }">{{
        row.currency === 'member_coins' ? 'Member coins' : 'Bonus'
      }}</template
      ><template #amount="{ row }"
        ><b class="num" :class="row.amount > 0 ? 'up' : 'dn'"
          >{{ row.amount > 0 ? '+' : '' }}{{ row.amount }}</b
        ></template
      ><template #status="{ row }"
        ><span
          class="pill"
          :class="
            row.status === 'approved'
              ? 'good'
              : row.status === 'pending'
                ? 'warn'
                : row.status === 'rejected'
                  ? 'bad'
                  : ''
          "
          >{{ statusNames[row.status] }}</span
        ></template
      ><template #actions="{ row }"
        ><template v-if="row.status === 'pending'"
          ><button
            class="btn sm"
            :disabled="!canReviewAdjustment(row, auth.user?.id, writable) || busy"
            @click.stop="review(row, 'approve')"
          >
            批准
          </button>
          <button
            class="btn sm dg"
            :disabled="!canReviewAdjustment(row, auth.user?.id, writable) || busy"
            @click.stop="review(row, 'reject')"
          >
            驳回
          </button></template
        ></template
      ></ReferenceTable
    >
    <FormDrawer
      reference
      :open="open"
      :title="selected ? selected.id : '发起调整'"
      :subtitle="selected ? 'ID ' + selected.id : ''"
      :busy="busy"
      @close="close"
      ><div v-if="editable" class="banner">此对象的发布需要另一位管理员审批。</div>
      <form id="coin-form" class="op-form" @submit.prevent="submit()">
        <div class="fld">
          <label>用户 UID</label
          ><input v-model="form.uid" class="in" aria-label="用户 UID" :readonly="frozen" required />
        </div>
        <div class="fld">
          <label>币种</label
          ><select v-model="form.currency" class="in" aria-label="币种" :disabled="frozen">
            <option value="member_coins">Member coins</option>
            <option value="bonus">Bonus</option>
          </select>
        </div>
        <div class="fld">
          <label>变动数量</label
          ><input
            v-model.number="form.amount"
            class="in"
            aria-label="变动数量"
            type="number"
            step="1"
            :readonly="frozen"
            required
          /><span class="hint">正数增加,负数扣减</span>
        </div>
        <div class="fld">
          <label>原因(必填)</label
          ><textarea
            v-model="form.reason"
            class="in"
            aria-label="原因(必填)"
            :readonly="frozen"
            maxlength="500"
            required
          />
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </form>
      <template #footer
        ><template v-if="editable"
          ><button class="btn" :disabled="busy" @click="close">取消</button
          ><button class="btn pri" form="coin-form" :disabled="busy">提交审批</button></template
        ><button v-else class="btn" @click="close">关闭</button></template
      ></FormDrawer
    >
    <ConfirmDialog
      :open="!!reviewing"
      :title="decision === 'approve' ? '确认批准调整' : '驳回调整申请'"
      :message="
        reviewing
          ? '用户 ' +
            reviewing.uid +
            '，变动 ' +
            reviewing.amount +
            ' ' +
            reviewing.currency +
            '。批准后由服务端执行账本入账。'
          : ''
      "
      :require-reason="decision === 'reject'"
      :busy="busy"
      :error="error"
      @confirm="confirmReview"
      @cancel="reviewing = null"
    /><ConfirmDialog
      :open="discard"
      title="放弃未保存修改？"
      message="如请求已发送，请先查询核对，关闭页面不会撤回服务端请求。"
      @confirm="discardForm"
      @cancel="keepForm"
    />
  </div>
</template>
