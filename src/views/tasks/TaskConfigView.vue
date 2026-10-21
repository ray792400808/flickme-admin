<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useTaskConfig } from '../../composables/useTaskConfig';
import { validateTask, type RewardTask } from '../../types/tasks';
import TaskConfigStatus from '../../components/tasks/TaskConfigStatus.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
const c = reactive(useTaskConfig('taskcfg'));
const deleting = ref<RewardTask | null>(null);
const groups = ['新手任务', '观看任务', '日常任务'] as const;
const search = ref(''),
  group = ref(''),
  page = ref(1),
  open = ref(false),
  error = ref(''),
  isNew = ref(false);
const blank = (): RewardTask => ({
  id: '',
  group: '日常任务',
  name: '',
  reward: 5,
  reset: '每日',
  en: true,
});
const row = ref<RewardTask>(blank());
watch(
  () => [row.value.group, row.value.sec],
  () => {
    if (row.value.group === '观看任务')
      row.value.name =
        row.value.sec && row.value.sec > 0
          ? `Watch dramas for ${Math.round(row.value.sec / 6) / 10} min`
          : '';
  },
);
const filtered = computed(() =>
  c.draft.filter(
    (r) =>
      (!group.value || r.group === group.value) &&
      r.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 8)));
const rows = computed(() => filtered.value.slice((page.value - 1) * 8, page.value * 8));
watch([search, group], () => (page.value = 1));
watch(pages, (value) => {
  page.value = Math.min(page.value, value);
});
watch(open, (value) => {
  if (!value) c.localEditing = false;
});
watch(
  () => c.document?.revision,
  () => {
    if (c.message === '') open.value = false;
  },
);
function groupChanged() {
  row.value.reset = row.value.group === '新手任务' ? '一次性' : '每日';
  if (row.value.group !== '观看任务') {
    delete row.value.sec;
    row.value.name = '';
  }
}
function edit(item?: RewardTask) {
  isNew.value = !item;
  row.value = item ? { ...item } : blank();
  error.value = '';
  open.value = true;
  c.localEditing = true;
}
async function apply() {
  if (!c.editable) return;
  const value = { ...row.value, name: row.value.name.trim() };
  if (value.group === '观看任务')
    value.name = `Watch dramas for ${Math.round((value.sec || 0) / 6) / 10} min`;
  else delete value.sec;
  error.value = validateTask('taskcfg', [value]);
  if (error.value) return;
  if (await c.saveTask(value, isNew.value ? undefined : value.id)) open.value = false;
  else error.value = c.error;
}
async function remove() {
  if (deleting.value && (await c.deleteTask(deleting.value.id))) deleting.value = null;
}
async function toggle(item: RewardTask, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.checked;
  input.checked = item.en;
  await c.toggleTask(item.id, value);
}
</script>
<template>
  <div class="op-page task-page">
    <div class="ph">
      <div>
        <h1>任务配置</h1>
        <p>
          Reward bonus 页中的新手、观看、日常任务。奖励计入
          Bonus，按重置周期刷新。观看任务按用户当日累计有效播放秒数结算，与播放器实时奖励共用播放时长，奖励分开计算。
        </p>
      </div>
      <div class="act">
        <button class="btn" :disabled="!c.editable" @click="edit()">新增任务</button
        ><button class="btn pri" :disabled="!c.canPublish" @click="c.publishOpen = true">
          发布
        </button>
      </div>
    </div>
    <TaskConfigStatus
      v-bind="c"
      :revision="c.document?.revision"
      :published-revision="c.document?.published_revision"
      :published-at="c.document?.published_at"
      @publish="c.publish"
      @cancel="c.publishOpen = false"
      @reload="c.load"
    />
    <div class="card">
      <div class="tb">
        <input
          v-model="search"
          type="search"
          maxlength="100"
          placeholder="搜索任务"
          aria-label="搜索任务"
        /><select v-model="group" aria-label="任务分组">
          <option value="">分组：全部</option>
          <option v-for="g in groups" :key="g">{{ g }}</option></select
        ><span class="n">共 {{ filtered.length }} 条</span>
      </div>
      <div class="tw">
        <table>
          <thead>
            <tr>
              <th>分组</th>
              <th>任务</th>
              <th>触发条件</th>
              <th>奖励</th>
              <th>重置</th>
              <th>启用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in rows" :key="item.id">
              <td>{{ item.group }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.group === '观看任务' ? '累计播放 ' + item.sec + ' 秒' : '—' }}</td>
              <td class="num">+{{ item.reward }}</td>
              <td>{{ item.reset }}</td>
              <td>
                <input
                  :checked="item.en"
                  @change="toggle(item, $event)"
                  type="checkbox"
                  role="switch"
                  :aria-label="item.name + '启用'"
                  :disabled="!c.editable"
                />
              </td>
              <td>
                <button class="btn sm" :disabled="!c.editable" @click="edit(item)">编辑</button>
                <button class="btn sm dg" :disabled="!c.editable" @click="deleting = item">
                  删除
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="empty">没有符合条件的记录</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="task-pagination">
        <span>共 {{ filtered.length }} 条 · 第 {{ page }} / {{ pages }} 页</span
        ><button class="btn sm" :disabled="page <= 1" @click="page--">上一页</button
        ><button class="btn sm" :disabled="page >= pages" @click="page++">下一页</button>
      </div>
    </div>
    <FormDrawer
      reference
      :open="open"
      :title="isNew ? '新增任务' : '编辑任务'"
      :busy="c.busy"
      @close="open = false"
      ><form id="task-form" @submit.prevent="apply">
        <fieldset class="op-form task-editor-fields" :disabled="!c.editable">
          <div class="fld">
            <label for="task-group">分组</label
            ><select
              id="task-group"
              v-model="row.group"
              class="in"
              :disabled="c.busy"
              @change="groupChanged"
            >
              <option v-for="g in groups" :key="g">{{ g }}</option>
            </select>
          </div>
          <div class="fld">
            <label for="task-name">任务名称</label
            ><input
              id="task-name"
              v-model="row.name"
              class="in"
              :readonly="row.group === '观看任务'"
              :required="row.group !== '观看任务'"
              maxlength="200"
            /><span v-if="row.group === '观看任务'" class="hint"
              >观看任务的名称随累计秒数自动生成</span
            >
          </div>
          <div v-if="row.group === '观看任务'" class="fld">
            <label for="task-sec">累计播放秒数</label
            ><input
              id="task-sec"
              v-model.number="row.sec"
              class="in"
              type="number"
              min="1"
              max="86400"
              step="1"
              required
            /><span class="hint">按用户当日累计有效播放秒数结算，前台显示为分钟</span>
          </div>
          <div class="fld">
            <label for="task-reward">奖励金币</label
            ><input
              id="task-reward"
              v-model.number="row.reward"
              class="in"
              type="number"
              min="0"
              max="1000000"
              step="1"
              required
            />
          </div>
          <div class="fld">
            <label for="task-reset">重置周期</label
            ><select id="task-reset" v-model="row.reset" class="in">
              <option>一次性</option>
              <option>每日</option>
            </select>
          </div>
          <label><input v-model="row.en" type="checkbox" /> 启用</label>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        </fieldset>
      </form>
      <template #footer
        ><button class="btn" :disabled="c.busy" @click="open = false">取消</button
        ><button class="btn pri" form="task-form" :disabled="!c.editable">
          保存草稿
        </button></template
      ></FormDrawer
    >
    <ConfirmDialog
      :open="!!deleting"
      title="删除任务"
      :message="
        '确认删除任务“' + (deleting?.name ?? '') + '”？删除仅修改草稿，发布后才影响线上配置。'
      "
      :busy="c.busy"
      :error="c.error"
      confirm-label="删除"
      @confirm="remove"
      @cancel="deleting = null"
    />
  </div>
</template>
