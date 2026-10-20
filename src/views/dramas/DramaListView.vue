<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import PageHeading from '../../components/common/PageHeading.vue';
import StatePanel from '../../components/common/StatePanel.vue';
import DataTable from '../../components/common/DataTable.vue';
import PaginationBar from '../../components/common/PaginationBar.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
import DramaEditor from '../../components/dramas/DramaEditor.vue';
import { useDramaLibrary } from '../../features/dramas/useDramaLibrary';
import { DRAMA_INTEGRATION_MESSAGE } from '../../features/dramas/repository';
import type { Drama, DramaInput } from '../../features/dramas/types';
const auth = useAuthStore();
const {
  available,
  query,
  rows,
  total,
  loading,
  saving,
  error,
  load,
  save,
  changeStatus,
  search,
  changePage,
  canQuery,
} = useDramaLibrary();
const writable = computed(() => available && auth.can('content', true));
const editing = ref(false);
const selected = ref<Drama | null>(null);
const pending = ref<Drama | null>(null);
const message = ref('');
const columns = [
  { key: 'title', label: '剧集' },
  { key: 'tags', label: '标签' },
  { key: 'badge', label: '角标' },
  { key: 'episodes', label: '上架集 / 总集' },
  { key: 'freeEpisodes', label: '免费集' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
];
const labels = { draft: '草稿', published: '上架', unpublished: '下架' };
function edit(drama: Drama | null) {
  if (!available || saving.value) return;
  selected.value = drama;
  editing.value = true;
  error.value = '';
  message.value = '';
}
async function submit(input: DramaInput) {
  if (!writable.value) return;
  if (await save(input, selected.value?.id)) {
    editing.value = false;
    message.value = '剧集已保存';
  }
}
async function confirmStatus() {
  if (!writable.value || !pending.value) return;
  const target = pending.value.status === 'published' ? '下架' : '上架';
  if (await changeStatus(pending.value)) {
    pending.value = null;
    message.value = `剧集已${target}`;
  }
}
onMounted(load);
</script>
<template>
  <PageHeading title="Short 剧库" description="管理剧集信息、标签、角标与上下架状态。"
    ><button
      class="primary"
      :disabled="!writable || saving"
      :title="available ? undefined : DRAMA_INTEGRATION_MESSAGE"
      @click="edit(null)"
    >
      新建剧集
    </button></PageHeading
  >
  <StatePanel
    v-if="!available"
    kind="pending"
    title="剧库接口尚未接入"
    :description="DRAMA_INTEGRATION_MESSAGE"
  />
  <p v-if="message" role="status" class="info-note">{{ message }}</p>
  <p v-if="error && !editing" role="alert" class="form-error">{{ error }}</p>
  <section class="card table-card">
    <form class="native-toolbar" @submit.prevent="search">
      <input
        v-model="query.search"
        type="search"
        placeholder="搜索剧名或 ID"
        aria-label="搜索剧集"
        :disabled="!canQuery"
      />
      <select v-model="query.status" aria-label="剧集状态" :disabled="!canQuery">
        <option value="">状态：全部</option>
        <option value="draft">草稿</option>
        <option value="published">上架</option>
        <option value="unpublished">下架</option>
      </select>
      <select v-model="query.badge" aria-label="剧集角标" :disabled="!canQuery">
        <option value="">角标：全部</option>
        <option>HOT</option>
        <option>NEW</option>
        <option>EXCLUSIVE</option>
      </select>
      <button :disabled="!canQuery">查询</button
      ><button type="button" :disabled="!canQuery" @click="load">刷新</button>
    </form>
    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :error="error && !editing ? error : ''"
      :empty-title="available ? '暂无符合条件的剧集' : '等待接入真实剧集数据'"
      :empty-description="
        available ? '可调整搜索条件后重新查询。' : '当前不会使用示例剧集填充列表。'
      "
      @retry="load"
    >
      <template #title="{ row }"
        ><button class="text-button" @click="edit(row)">{{ row.title }}</button
        ><small class="record-id">{{ row.id }}</small></template
      >
      <template #tags="{ row }"
        ><span v-for="tag in row.tags" :key="tag" class="pill">{{ tag }}</span></template
      >
      <template #episodes="{ row }"
        >{{ row.publishedEpisodeCount }} / {{ row.episodeCount }}</template
      >
      <template #status="{ row }"
        ><span class="pill">{{ labels[row.status] }}</span></template
      >
      <template #actions="{ row }"
        ><div class="row-actions">
          <button :disabled="saving" @click="edit(row)">{{ writable ? '编辑' : '查看' }}</button
          ><button :disabled="!writable || saving" @click="pending = row">
            {{ row.status === 'published' ? '下架' : '上架' }}
          </button>
        </div></template
      >
    </DataTable>
    <PaginationBar
      :page="query.page"
      :page-size="query.pageSize"
      :total="total"
      :disabled="!canQuery"
      @change="changePage"
    />
  </section>
  <DramaEditor
    :open="editing"
    :drama="selected"
    :busy="saving"
    :writable="writable"
    :error="error"
    @close="editing = false"
    @save="submit"
  />
  <ConfirmDialog
    :open="!!pending"
    :busy="saving"
    :title="pending?.status === 'published' ? '确认下架剧集' : '确认上架剧集'"
    message="操作结果以上架条件校验及服务端返回为准。"
    @cancel="pending = null"
    @confirm="confirmStatus"
  />
</template>
