<script setup lang="ts">
import { computed, reactive, ref, toRef } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useOperationsConfig } from '../../composables/useOperationsConfig';
import { useConfigEditor } from '../../composables/useConfigEditor';
import { useConfigList } from '../../composables/useConfigList';
import ReferenceTable from '../../components/operations/ReferenceTable.vue';
import ConfigFeedback from '../../components/operations/ConfigFeedback.vue';
import ToggleSwitch from '../../components/operations/ToggleSwitch.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
import { emptyLocalizedText } from '../../types/operations';
import { validateOperations } from '../../utils/operations';
import DateTimeField from '../../components/operations/DateTimeField.vue';
import type { SearchWord } from '../../types/operations';
const c = reactive(useOperationsConfig('words', () => [])),
  auth = useAuthStore();
const list = reactive(useConfigList(toRef(c, 'draft')));
const e = reactive(
  useConfigEditor<SearchWord>(toRef(c, 'draft'), () => ({
    id: crypto.randomUUID(),
    names: emptyLocalizedText(),
    sort: 5,
    status: 'draft',
    enabled: true,
    starts_at: null,
    ends_at: null,
  })),
);
const editorError = ref('');
const columns = [
  { key: 'word', label: '推荐词' },
  { key: 'sort', label: '顺序' },
  { key: 'period', label: '生效' },
  { key: 'enabled', label: '启用' },
  { key: 'status', label: '状态' },
];
const writable = computed(() => c.enabled && auth.can('ops', true));
function edit(row?: SearchWord) {
  editorError.value = '';
  e.edit(row);
}
function date(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('sv-SE').slice(0, 16) : value;
}
async function save(published: boolean) {
  if (!c.editable) return;
  e.draft.status = published ? 'published' : 'draft';
  const copy = JSON.parse(JSON.stringify(c.draft)) as SearchWord[];
  const index = copy.findIndex((row) => row.id === e.draft.id);
  if (index < 0) copy.unshift(e.draft);
  else copy[index] = e.draft;
  editorError.value = validateOperations('words', copy);
  if (editorError.value) return;
  e.apply();
  c.draft.sort((a, b) => a.sort - b.sort);
  if (await c.persist(published)) {
    e.open = false;
    list.resetPage();
    c.message = published ? '已发布,线上配置将在缓存到期后生效' : '已保存为草稿';
  }
}
async function toggle(row: SearchWord) {
  row.enabled = !row.enabled;
  await c.persist(true);
}
async function publish() {
  await c.persist(true);
}
</script>
<template>
  <div class="op-page">
    <div class="ph">
      <div>
        <h1>搜索推荐词</h1>
        <p>搜索框占位推荐词,前台每 3 秒轮换一次。支持定时上下线与多语言。</p>
      </div>
      <div class="act">
        <span v-if="!writable && c.loaded" class="pill warn">当前角色只读</span
        ><button class="btn pri" :disabled="!c.editable" @click="edit()">新增推荐词</button>
      </div>
    </div>
    <ConfigFeedback
      :enabled="c.enabled"
      :loading="c.loading"
      :error="c.error"
      :message="c.message"
      :busy="c.busy"
      :discard-open="c.discardOpen"
      :publish-open="c.publishOpen"
      @discard="c.confirmDiscard"
      @cancel-discard="c.cancelDiscard"
      @publish="publish"
      @cancel-publish="c.publishOpen = false"
    />
    <ReferenceTable
      v-model:search="list.search"
      :columns="columns"
      :rows="list.visible"
      :total="list.matched.length"
      :page="list.page"
      :loading="c.loading"
      :disabled="!c.enabled"
      clickable
      @open="edit"
      @search="list.resetPage"
      @page="list.changePage"
      ><template #word="{ row }">{{ row.names.en }}</template
      ><template #period="{ row }"
        ><span class="mono">{{ date(row.starts_at) }} → {{ date(row.ends_at) }}</span></template
      ><template #enabled="{ row }"
        ><button
          class="sw"
          :class="{ on: row.enabled }"
          :aria-pressed="row.enabled"
          :aria-label="row.names.en + '启用'"
          :disabled="!c.editable"
          @click.stop="toggle(row)" /></template
      ><template #status="{ row }"
        ><span
          class="pill"
          :class="{ good: row.status === 'published', warn: row.status === 'draft' }"
          >{{ row.status === 'published' ? '已发布' : '草稿' }}</span
        ></template
      ></ReferenceTable
    >
    <FormDrawer
      reference
      :open="e.open"
      :title="e.isNew ? '新增推荐词' : e.draft.names.en"
      :subtitle="e.isNew ? '' : 'ID ' + e.draft.id"
      :busy="c.busy"
      @close="e.close"
      ><form id="word-form" class="op-form" @submit.prevent="save(true)">
        <div class="fld">
          <label>推荐词</label
          ><input
            v-model="e.draft.names.en"
            class="in"
            aria-label="推荐词"
            :readonly="!writable"
            required
            maxlength="200"
          />
        </div>
        <div class="fld">
          <label>顺序</label
          ><input
            v-model.number="e.draft.sort"
            class="in"
            aria-label="顺序"
            type="number"
            min="0"
            step="1"
            :readonly="!writable"
          />
        </div>
        <DateTimeField
          v-model="e.draft.starts_at"
          label="开始时间"
          :disabled="!writable"
        /><DateTimeField v-model="e.draft.ends_at" label="结束时间" :disabled="!writable" />
        <div class="fld">
          <label>启用</label
          ><label class="sf"
            ><input v-model="e.draft.enabled" type="checkbox" :disabled="!writable" /><span
              >启用</span
            ></label
          >
        </div>
        <p v-if="editorError || c.error" class="form-error" role="alert">
          {{ editorError || c.error }}
        </p>
      </form>
      <template #footer
        ><template v-if="writable"
          ><button class="btn" :disabled="c.busy" @click="e.close">取消</button
          ><button class="btn" :disabled="!c.editable" @click="save(false)">保存草稿</button
          ><button class="btn pri" form="word-form" :disabled="!c.editable">发布</button></template
        ><button v-else class="btn" @click="e.close">关闭</button></template
      ></FormDrawer
    ><ConfirmDialog
      :open="e.discardOpen"
      title="放弃未保存修改？"
      @confirm="e.discard"
      @cancel="e.discardOpen = false"
    />
  </div>
</template>
