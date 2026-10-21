<script setup lang="ts">
import { metrics, sources, revenue, dau } from '../../mocks/dashboard';
import { computed, ref } from 'vue';
import { useContentStore } from '../../stores/content';
const content = useContentStore();
const period = ref(14);
const showRevenue = ref(true);
const showDau = ref(true);
const trendRevenue = computed(() => revenue.slice(-period.value));
const trendDau = computed(() => dau.slice(-period.value));
const hover = ref(-1);
const chartDates = computed(() =>
  Array.from(
    { length: period.value },
    (_, i) => `10-${String(20 - period.value + i).padStart(2, '0')}`,
  ),
);
const line = (values: number[], max: number) =>
  values
    .map((v, i) => `${45 + (i * 559) / (values.length - 1)},${240 - (v / max) * 200}`)
    .join(' ');
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>数据概览</h1>
      <p>核心指标与待办。以下为示例数据。</p>
    </div>
    <select v-model.number="period" aria-label="统计周期" @change="hover = -1">
      <option :value="14">近 14 天 · USD</option>
      <option :value="7">近 7 天 · USD</option>
    </select>
  </div>
  <div class="metrics">
    <article v-for="m in metrics" :key="m[0]" class="card metric">
      <p>{{ m[0] }}</p>
      <strong>{{ m[1] }}</strong
      ><small :class="m[2]?.startsWith('-') ? 'negative' : 'positive'"
        >{{ m[2] }} <span>较昨日</span></small
      >
    </article>
  </div>
  <div class="dashboard-grid">
    <section class="card chart">
      <h2>近 {{ period }} 天收入与 DAU</h2>
      <p>收入（USD）与日活跃用户趋势</p>
      <div class="chart-legend">
        <button :aria-pressed="showRevenue" class="negative" @click="showRevenue = !showRevenue">
          {{ showRevenue ? '●' : '○' }} 收入</button
        ><button :aria-pressed="showDau" class="blue" @click="showDau = !showDau">
          {{ showDau ? '●' : '○' }} DAU
        </button>
      </div>
      <svg
        viewBox="0 0 650 280"
        role="img"
        aria-label="近十四天收入由九千八百美元增至一万八千四百美元，日活由九万六千增至十二万八千"
      >
        <g v-for="n in 5" :key="n">
          <line
            x1="45"
            :y1="40 + (n - 1) * 50"
            x2="604"
            :y2="40 + (n - 1) * 50"
            stroke="var(--line)"
          />
          <text x="0" :y="44 + (n - 1) * 50">{{ 20 - (n - 1) * 5 }}K</text>
          <text x="615" :y="44 + (n - 1) * 50">{{ 140 - (n - 1) * 35 }}K</text>
        </g>
        <polygon
          v-if="showRevenue"
          :points="`45,240 ${line(trendRevenue, 20)} 604,240`"
          fill="var(--accent-soft)"
        />
        <polyline
          v-if="showRevenue"
          :points="line(trendRevenue, 20)"
          fill="none"
          stroke="var(--accent)"
          stroke-width="3"
        />
        <polyline
          v-if="showDau"
          :points="line(trendDau, 140)"
          fill="none"
          stroke="#4379b9"
          stroke-width="2"
          stroke-dasharray="6 5"
        />
        <text x="45" y="270">{{ chartDates[0] }}</text>
        <text x="560" y="270">10-19</text>
        <g v-for="(date, i) in chartDates" :key="date">
          <rect
            :x="32 + (i * 559) / (period - 1)"
            y="30"
            :width="559 / (period - 1)"
            height="210"
            fill="transparent"
            @mouseenter="hover = i"
            @mouseleave="hover = -1"
          />
          <circle
            v-if="hover === i && showRevenue"
            :cx="45 + (i * 559) / (period - 1)"
            :cy="240 - ((trendRevenue[i] || 0) / 20) * 200"
            r="5"
            fill="var(--accent)"
          />
        </g>
      </svg>
      <p class="trend-detail" role="status">
        {{
          hover >= 0
            ? `${chartDates[hover]} · 收入 $${((trendRevenue[hover] || 0) * 1000).toLocaleString()} · DAU ${trendDau[hover]}K`
            : '悬停图表查看每日数据；点击图例切换曲线。'
        }}
      </p>
    </section>
    <div class="dashboard-side">
      <section class="card">
        <h2>待办</h2>
        <RouterLink class="todo actionable" to="/characters"
          ><strong>{{ content.characters.filter((r) => r.status === '待审核').length }}</strong>
          <div>待审核角色<small>查看角色资料并完成审核</small></div>
          <span>查看 →</span></RouterLink
        >
        <div
          v-for="t in [
            ['3', '待审批', '金币调整、价格变更、推送群发'],
            ['46', '待审核评论', '含 7 条被多次举报'],
            ['18', '未处理工单', '播放反馈与 Chat 反馈'],
            ['2', '即将到期配置', '搜索推荐词、优惠券'],
          ]"
          :key="t[1]"
          class="todo"
        >
          <strong>{{ t[0] }}</strong>
          <div>
            {{ t[1] }}<small>{{ t[2] }}</small>
          </div>
          <span class="pill">待接入</span>
        </div>
      </section>
      <section class="card">
        <h2>金币消耗构成</h2>
        <p>今日，按场景占比。</p>
        <div v-for="s in sources" :key="s[0]" class="source">
          <div>
            {{ s[0] }}<b>{{ s[1] }}%</b>
          </div>
          <div class="bar"><i :style="{ width: s[1] + '%' }" /></div>
        </div>
      </section>
    </div>
  </div>
  <section class="card recent-content">
    <div class="page-heading">
      <h2>内容概况</h2>
      <RouterLink to="/dramas">管理短剧 →</RouterLink>
    </div>
    <div class="content-summary">
      <div>
        <strong>{{ content.dramas.length }}</strong>
        <p>短剧总数</p>
      </div>
      <div>
        <strong>{{ content.dramas.filter((r) => r.status === '上架').length }}</strong>
        <p>已上架短剧</p>
      </div>
      <div>
        <strong>{{ content.characters.length }}</strong>
        <p>角色总数</p>
      </div>
      <div>
        <strong>{{ content.characters.filter((r) => r.status === '上架').length }}</strong>
        <p>已上架角色</p>
      </div>
    </div>
  </section>
</template>
