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
import type { Recommendation } from '../../types/operations';
const c = reactive(useOperationsConfig('recs', () => [])),
  auth = useAuthStore();
const list = reactive(useConfigList(toRef(c, 'draft')));
const e = reactive(
  useConfigEditor<Recommendation>(toRef(c, 'draft'), () => ({
    id: '',
    name: '',
    placement: '',
    source: 'trending',
    count: 1,
    fallback: 'none',
    pinned_drama_id: null,
    enabled: false,
  })),
);
const editorError = ref('');
const writable = computed(() => c.enabled && auth.can('ops', true));
const columns = [
  { key: 'position', label: '位置' },
  { key: 'source', label: '数据来源' },
  { key: 'count', label: '展示数量' },
  { key: 'fallback', label: '不足时补位' },
  { key: 'pinned', label: '固定第 1 位' },
  { key: 'enabled', label: '启用' },
];
const sourceNames = {
  personalized: '个性化推荐',
  trending: '全站热榜',
  similar: '与当前剧相近',
  recent: '用户最近观看',
};
function edit(row: Recommendation) {
  editorError.value = '';
  e.edit(row);
}
function title(id: number | null) {
  return c.document?.options?.dramas.find((row) => row.id === id)?.title ?? (id ? 'ID ' + id : '—');
}
async function save(published: boolean) {
  if (!c.editable) return;
  const copy = c.draft.map((row) => (row.id === e.draft.id ? e.draft : row));
  editorError.value = validateOperations('recs', copy);
  if (editorError.value) return;
  e.apply();
  if (await c.persist(published)) {
    e.open = false;
    c.message = published ? '已发布,线上配置将在缓存到期后生效' : '已保存为草稿';
  }
}
async function toggle(row: Recommendation) {
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
        <h1>推荐位配置</h1>
        <p>
          App 里有 5
          个"给用户推荐剧"的位置。这里不选具体的剧,只设规则:每个位置展示几部、从哪里挑、数据不够时用什么补。也可以把某部剧固定放在第
          1 位。
        </p>
      </div>
      <div v-if="!writable && c.loaded" class="act">
        <span class="pill warn">当前角色只读</span>
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
      ><template #position="{ row }"
        ><b>{{ row.name }}</b
        ><small style="display: block; color: var(--muted); max-width: 360px">{{
          row.description
        }}</small></template
      ><template #source="{ row }">{{ sourceNames[row.source] }}</template
      ><template #fallback="{ row }">{{
        row.fallback === 'trending' ? '全站热榜' : '不补位'
      }}</template
      ><template #pinned="{ row }">{{ title(row.pinned_drama_id) }}</template
      ><template #enabled="{ row }"
        ><button
          class="sw"
          :class="{ on: row.enabled }"
          :aria-pressed="row.enabled"
          :aria-label="row.name + '启用'"
          :disabled="!c.editable"
          @click.stop="toggle(row)" /></template
    ></ReferenceTable>
    <FormDrawer
      reference
      :open="e.open"
      :title="e.draft.name"
      :subtitle="'ID ' + e.draft.id"
      :busy="c.busy"
      @close="e.close"
      ><form id="recommendation-form" class="op-form" @submit.prevent="save(true)">
        <div class="fld">
          <label>位置</label><input class="in" :value="e.draft.name" readonly />
        </div>
        <div class="fld">
          <label>出现在哪里</label><input class="in" :value="e.draft.description" readonly />
        </div>
        <div class="fld">
          <label>数据来源</label
          ><select v-model="e.draft.source" class="in" aria-label="数据来源" :disabled="!writable">
            <option v-for="(name, key) in sourceNames" :key="key" :value="key">
              {{ name }}
            </option></select
          ><span class="hint">个性化推荐:按用户观看与喜好;相近:按标签重合度</span>
        </div>
        <div class="fld">
          <label>展示数量</label
          ><input
            v-model.number="e.draft.count"
            class="in"
            aria-label="展示数量"
            type="number"
            min="1"
            max="50"
            :readonly="!writable"
          />
        </div>
        <div class="fld">
          <label>不足时补位</label
          ><select
            v-model="e.draft.fallback"
            class="in"
            aria-label="不足时补位"
            :disabled="!writable"
          >
            <option value="trending">全站热榜</option>
            <option value="none">不补位</option></select
          ><span class="hint">来源数据不够数量时用什么补</span>
        </div>
        <div class="fld">
          <label>固定第 1 位的剧(可空)</label
          ><select
            v-model="e.draft.pinned_drama_id"
            class="in"
            aria-label="固定第 1 位的剧(可空)"
            :disabled="!writable"
          >
            <option :value="null"></option>
            <option v-for="drama in c.document?.options?.dramas" :key="drama.id" :value="drama.id">
              {{ drama.title }}
            </option>
          </select>
        </div>
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
          ><button class="btn pri" form="recommendation-form" :disabled="!c.editable">
            发布
          </button></template
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
