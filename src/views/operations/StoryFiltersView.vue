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
import type { StoryFilter } from '../../types/operations';
const c = reactive(useOperationsConfig('filters', () => [])),
  auth = useAuthStore();
const list = reactive(useConfigList(toRef(c, 'draft')));
const e = reactive(
  useConfigEditor<StoryFilter>(toRef(c, 'draft'), () => ({
    id: crypto.randomUUID(),
    key: crypto.randomUUID(),
    names: emptyLocalizedText(),
    tag_keys: [],
    order: 5,
    enabled: true,
  })),
);
const editorError = ref(''),
  tagText = ref('');
const writable = computed(() => c.enabled && auth.can('ops', true));
const columns = [
  { key: 'group', label: '分组' },
  { key: 'tags', label: '标签' },
  { key: 'order', label: '顺序' },
  { key: 'enabled', label: '启用' },
];
function edit(row?: StoryFilter) {
  editorError.value = '';
  e.edit(row);
  tagText.value = e.draft.tag_keys.join(',');
}
async function save(published: boolean) {
  if (!c.editable) return;
  e.draft.tag_keys = tagText.value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const copy = JSON.parse(JSON.stringify(c.draft)) as StoryFilter[];
  const index = copy.findIndex((row) => row.id === e.draft.id);
  if (index < 0) copy.unshift(e.draft);
  else copy[index] = e.draft;
  editorError.value = validateOperations('filters', copy);
  if (editorError.value) return;
  e.apply();
  c.draft.sort((a, b) => a.order - b.order);
  if (await c.persist(published)) {
    e.open = false;
    list.resetPage();
    c.message = published ? '已发布,线上配置将在缓存到期后生效' : '已保存为草稿';
  }
}
async function toggle(row: StoryFilter) {
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
        <h1>Stories 筛选标签</h1>
        <p>筛选半屏中的 4 组标签,可多选,组内标签之间为"任一匹配"。</p>
      </div>
      <div class="act">
        <span v-if="!writable && c.loaded" class="pill warn">当前角色只读</span
        ><button class="btn pri" :disabled="!c.editable" @click="edit()">新增分组</button>
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
      ><template #group="{ row }">{{ row.names.en }}</template
      ><template #tags="{ row }"
        ><span class="tg"
          ><span v-for="tag in row.tag_keys" :key="tag" class="pill">{{ tag }}</span></span
        ></template
      ><template #enabled="{ row }"
        ><button
          class="sw"
          :class="{ on: row.enabled }"
          :aria-pressed="row.enabled"
          :aria-label="row.names.en + '启用'"
          :disabled="!c.editable"
          @click.stop="toggle(row)" /></template
    ></ReferenceTable>
    <FormDrawer
      reference
      :open="e.open"
      :title="e.isNew ? '新增分组' : e.draft.names.en"
      :subtitle="e.isNew ? '' : 'ID ' + e.draft.id"
      :busy="c.busy"
      @close="e.close"
      ><form id="filter-form" class="op-form" @submit.prevent="save(true)">
        <div class="fld">
          <label>分组名称</label
          ><input
            v-model="e.draft.names.en"
            class="in"
            aria-label="分组名称"
            :readonly="!writable"
            required
            maxlength="200"
          />
        </div>
        <div class="fld">
          <label>标签(逗号分隔)</label
          ><textarea
            v-model="tagText"
            class="in"
            aria-label="标签(逗号分隔)"
            :readonly="!writable"
          />
        </div>
        <div class="fld">
          <label>顺序</label
          ><input
            v-model.number="e.draft.order"
            class="in"
            aria-label="顺序"
            type="number"
            min="0"
            step="1"
            :readonly="!writable"
          />
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
          ><button class="btn pri" form="filter-form" :disabled="!c.editable">
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
