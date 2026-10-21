<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useTaskConfig } from '../../composables/useTaskConfig';
import { taskPrototype } from '../../features/tasks/prototype';
import { validateTask, type RewardTask } from '../../types/tasks';
import TaskConfigStatus from '../../components/tasks/TaskConfigStatus.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
const c = reactive(useTaskConfig('taskcfg', taskPrototype));
const groups = ['新手任务', '观看任务', '日常任务'] as const;
const search = ref(''),
  group = ref(''),
  page = ref(1),
  open = ref(false),
  error = ref(''),
  isNew = ref(false);
const blank = (): RewardTask => ({
  id: crypto.randomUUID(),
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
function edit(item?: RewardTask) {
  isNew.value = !item;
  row.value = item ? { ...item } : blank();
  error.value = '';
  open.value = true;
}
function apply() {
  if (!c.editable) return;
  const value = { ...row.value, name: row.value.name.trim() };
  if (value.group === '观看任务')
    value.name = `Watch dramas for ${Math.round((value.sec || 0) / 6) / 10} min`;
  else delete value.sec;
  error.value = validateTask('taskcfg', [value]);
  if (error.value) return;
  if (isNew.value) c.draft.push(value);
  else {
    const index = c.draft.findIndex((r) => r.id === value.id);
    if (index >= 0) c.draft[index] = value;
  }
  open.value = false;
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
        ><button class="btn" :disabled="!c.canSave" @click="c.save">保存草稿</button
        ><button class="btn pri" :disabled="!c.canPublish" @click="c.publishOpen = true">
          发布
        </button>
      </div>
    </div>
    <TaskConfigStatus
      v-bind="c"
      :revision="c.document?.revision"
      :published-revision="c.document?.published_revision"
      @publish="c.publish"
      @cancel="c.publishOpen = false"
      @reload="c.load"
    />
    <div class="card">
      <div class="tb">
        <input v-model="search" type="search" placeholder="搜索任务" aria-label="搜索任务" /><select
          v-model="group"
          aria-label="任务分组"
        >
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
                  v-model="item.en"
                  type="checkbox"
                  role="switch"
                  :aria-label="item.name + '启用'"
                  :disabled="!c.editable"
                />
              </td>
              <td>
                <button class="btn sm" :disabled="!c.editable" @click="edit(item)">编辑</button>
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
      @close="open = false"
      ><form id="task-form" class="op-form" @submit.prevent="apply">
        <div class="fld">
          <label for="task-group">分组</label
          ><select id="task-group" v-model="row.group" class="in">
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
      </form>
      <template #footer
        ><button class="btn" @click="open = false">取消</button
        ><button class="btn pri" form="task-form" :disabled="!c.editable">
          {{ c.preview ? '应用到预览' : '应用到草稿' }}
        </button></template
      ></FormDrawer
    >
  </div>
</template>
