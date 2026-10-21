<template>
  <div>
    <div class="ph">
      <div>
        <h1>操作日志</h1>
        <p>记录所有写操作，包含操作用户、请求路径与入参。日志保留 180 天。</p>
      </div>
      <div class="act">
        <button class="btn" @click="handleSearch">刷新</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="queryForm.keyword"
          class="search-input"
          type="search"
          placeholder="搜索用户或路径"
          @keyup.enter="handleSearch"
          @search="handleSearch"
        />
        <select v-model="queryForm.method" class="filter-select" aria-label="请求方法" @change="handleSearch">
          <option value="">方法：全部</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          v-model="queryForm.start_date"
          class="filter-select"
          type="date"
          aria-label="开始日期"
          @change="handleSearch"
        />
        <span class="text-muted">至</span>
        <input
          v-model="queryForm.end_date"
          class="filter-select"
          type="date"
          aria-label="结束日期"
          @change="handleSearch"
        />
        <button class="btn sm" @click="handleReset">重置</button>
        <span class="count">共 {{ total }} 条</span>
      </div>

      <div v-if="loading" class="empty">加载中…</div>

      <div v-else class="tw">
        <table>
          <thead>
            <tr>
              <th>操作用户</th>
              <th style="width: 90px">方法</th>
              <th style="width: 260px">请求路径</th>
              <th>描述</th>
              <th style="width: 130px">IP</th>
              <th style="width: 165px">时间</th>
              <th style="width: 70px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.id">
              <td>
                <div class="cell-stack">
                  <span class="t">{{ row.username || '—' }}</span>
                  <span v-if="row.user" class="sub">{{ row.user.email }}</span>
                </div>
              </td>
              <td>
                <span class="pill" :class="methodClass(row.method)">{{ row.method }}</span>
              </td>
              <td><span class="code">{{ row.path }}</span></td>
              <td class="text-muted ellipsis">{{ row.description || '—' }}</td>
              <td class="mono">{{ row.ip || '—' }}</td>
              <td class="mono">{{ formatDate(row.created_at) }}</td>
              <td>
                <button class="btn sm" @click="openDetail(row)">详情</button>
              </td>
            </tr>
            <tr v-if="!tableData.length">
              <td colspan="7" class="empty">没有符合条件的日志</td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePager
        v-model:page="queryForm.page"
        v-model:per-page="queryForm.per_page"
        :total="total"
        :page-sizes="[20, 50, 100]"
        @update:page="loadData"
        @update:per-page="handleSearch"
      />
    </div>

    <!-- 详情抽屉 -->
    <div class="scrim" :class="{ on: detailOpen }" @click="detailOpen = false" />
    <aside class="drawer" :class="{ on: detailOpen }" role="dialog" aria-label="操作详情">
      <div class="dh">
        <div>
          <h2>操作详情</h2>
          <p>{{ current?.path }}</p>
        </div>
        <button class="btn sm ic" style="margin-left: auto" aria-label="关闭" @click="detailOpen = false">
          ✕
        </button>
      </div>

      <div v-if="current" class="db">
        <dl class="kv">
          <dt>操作用户</dt>
          <dd>{{ current.username || '—' }}</dd>

          <dt>用户邮箱</dt>
          <dd>{{ current.user?.email || '—' }}</dd>

          <dt>请求方法</dt>
          <dd>
            <span class="pill" :class="methodClass(current.method)">{{ current.method }}</span>
          </dd>

          <dt>IP 地址</dt>
          <dd class="mono">{{ current.ip || '—' }}</dd>

          <dt>操作描述</dt>
          <dd>{{ current.description || '—' }}</dd>

          <dt>操作时间</dt>
          <dd class="mono">{{ formatDate(current.created_at) }}</dd>
        </dl>

        <div class="fld">
          <label>请求参数</label>
          <pre class="json">{{ formatInput(current.input) }}</pre>
        </div>
      </div>

      <div class="df">
        <button class="btn" @click="detailOpen = false">关闭</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { logApi } from '../../../api/admin';
import type { OperationLog } from '../../../types/auth';
import TablePager from '../../../components/common/TablePager.vue';

const loading = ref(false);
const tableData = ref<OperationLog[]>([]);
const total = ref(0);

const queryForm = reactive({
  start_date: '',
  end_date: '',
  method: '',
  keyword: '',
  page: 1,
  per_page: 20,
});

const detailOpen = ref(false);
const current = ref<OperationLog | null>(null);

function methodClass(method: string): string {
  switch (method) {
    case 'POST':
      return 'good';
    case 'PUT':
    case 'PATCH':
      return 'warn';
    case 'DELETE':
      return 'bad';
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

function formatInput(input: unknown): string {
  if (input === null || input === undefined) return '（无请求参数）';
  if (typeof input === 'string') {
    try {
      return JSON.stringify(JSON.parse(input), null, 2);
    } catch {
      return input;
    }
  }
  return JSON.stringify(input, null, 2);
}

async function loadData() {
  loading.value = true;
  try {
    const res = await logApi.list({ ...queryForm });
    tableData.value = res.data;
    total.value = res.total;
  } catch (error) {
    ElMessage.error((error as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryForm.page = 1;
  loadData();
}

function handleReset() {
  queryForm.start_date = '';
  queryForm.end_date = '';
  queryForm.method = '';
  queryForm.keyword = '';
  handleSearch();
}

function openDetail(log: OperationLog) {
  current.value = log;
  detailOpen.value = true;
}

onMounted(loadData);
</script>

<style scoped>
.ellipsis {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>