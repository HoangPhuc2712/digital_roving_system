<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'primevue/chart'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/modules/dashboard/dashboard.store'
import type {
  DashboardCardMeta,
  DashboardTotalAppItem,
  DashboardTotalPointReportByStatusItem,
} from '@/modules/dashboard/dashboard.types'

const auth = useAuthStore()
const store = useDashboardStore()
const router = useRouter()

function normalizeMenuName(input?: string) {
  return String(input ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

const allowCodeSet = computed(() => {
  const list = (auth.user as any)?.allowViews ?? (auth.user as any)?.allow_views ?? []
  const set = new Set<string>()
  for (const x of list) {
    if (x?.mcActive === true && x?.mcName) {
      set.add(normalizeMenuName(x.mcName))
    }
  }
  return set
})

function canSeeMc(mcCode?: string) {
  if (!mcCode) return true
  return allowCodeSet.value.has(mcCode.toUpperCase())
}

function normalizeName(name: string) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

function cardMetaOf(item: DashboardTotalAppItem): DashboardCardMeta {
  switch (normalizeName(item.name)) {
    case 'ROLES':
      return { mcCode: 'ROLES', to: '/roles' }
    case 'USERS':
      return { mcCode: 'USERS', to: '/users' }
    case 'MENUCATEGORIES':
      return { mcCode: 'MENUCATEGORIES', to: '/menuCategories' }
    case 'AREAS':
      return { mcCode: 'AREAS', to: '/areas' }
    case 'CHECKPOINTS':
      return { mcCode: 'AREAS', to: '/areas' }
    case 'ROUTES':
      return { mcCode: 'ROUTES', to: '/routes' }
    default:
      return {}
  }
}

const cards = computed(() => {
  return store.cards
    .map((item) => ({
      ...item,
      ...cardMetaOf(item),
    }))
    .filter((item) => canSeeMc(item.mcCode))
    .sort((a, b) => a.stt - b.stt)
})

const pointReportStatusCards = computed(() => {
  return (store.totalPointReportsByStatus ?? [])
    .filter((item) => Number(item.total_problem ?? 0) >= 0)
    .sort((a, b) => Number(a.pr_status ?? 0) - Number(b.pr_status ?? 0))
})

function openStatusCard(card: DashboardTotalPointReportByStatusItem) {
  router.push({
    name: 'reports',
    query: {
      result: 'NOT_OK',
      issueStatus: String(card.pr_status),
      fromDashboard: '1',
    },
  })
}

function statusCardStyle(card: DashboardTotalPointReportByStatusItem) {
  const colorMap: Record<number, string> = {
    0: '#FE9A37',
    1: '#3BB8DB',
    2: '#37BC7D',
    3: '#F76E6E',
  }

  return {
    backgroundColor: colorMap[Number(card.pr_status ?? -1)] || '#64748b',
  }
}

function open(card: DashboardTotalAppItem & DashboardCardMeta) {
  if (!card.to) return
  router.push(card.to)
}

function cardStyle(card: DashboardTotalAppItem) {
  return {
    backgroundColor: card.color || '#ffffff',
  }
}

const chartOptions = computed(() => {
  const textColor = '#334155'
  const mutedTextColor = '#64748b'

  return {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label(context: any) {
            const label = String(context.label ?? '')
            const value = Number(context.raw ?? 0)
            return `${label}: ${value}`
          },
        },
      },
    },
    cutout: '60%',
    maintainAspectRatio: false,
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 900,
    },
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
    layout: {
      padding: 4,
    },
    color: mutedTextColor,
  }
})

const roleChartData = computed(() => ({
  labels: store.totalUsersByRole.map((x) => x.role_name || x.role_code || `Role ${x.role_id}`),
  datasets: [
    {
      data: store.totalUsersByRole.map((x) => x.total_user),
      backgroundColor: ['#FE9A37', '#F0B13B', '#37BC7D', '#3BB8DB', '#8E51FF', '#F76E6E'],
      hoverBackgroundColor: ['#FE9A37', '#F0B13B', '#37BC7D', '#3BB8DB', '#8E51FF', '#F76E6E'],
    },
  ],
}))

const areaUserChartData = computed(() => ({
  labels: store.totalUsersByArea.map((x) => x.area_name || x.area_code || `Area ${x.area_id}`),
  datasets: [
    {
      data: store.totalUsersByArea.map((x) => x.total_user),
      backgroundColor: ['#36BBA7', '#3BB8DB', '#8E51FF', '#FE9A37', '#F76E6E', '#9CA3AF'],
      hoverBackgroundColor: ['#36BBA7', '#3BB8DB', '#8E51FF', '#FE9A37', '#F76E6E', '#9CA3AF'],
    },
  ],
}))

const checkpointChartData = computed(() => ({
  labels: store.totalCheckpointsByArea.map(
    (x) => x.area_name || x.area_code || `Area ${x.area_id}`,
  ),
  datasets: [
    {
      data: store.totalCheckpointsByArea.map((x) => x.total_check_point),
      backgroundColor: ['#3BB8DB', '#8E51FF', '#37BC7D', '#F0B13B', '#FE9A37', '#F76E6E'],
      hoverBackgroundColor: ['#3BB8DB', '#8E51FF', '#37BC7D', '#F0B13B', '#FE9A37', '#F76E6E'],
    },
  ],
}))

onMounted(async () => {
  await store.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-xl font-semibold text-slate-800">Dashboard</div>

    <div v-if="store.error" class="p-4">
      <div class="text-slate-800 font-semibold text-lg">Server Maintenance</div>
      <div class="text-slate-600 mt-1">{{ store.error }}</div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <button
        v-for="(card, idx) in cards"
        :key="`${card.stt}-${card.name}`"
        v-animateonscroll="{
          enterClass: 'dashboard-card-enter',
          leaveClass: 'dashboard-card-leave',
        }"
        type="button"
        class="dashboard-card rounded-2xl shadow-sm hover:shadow transition p-4 text-left"
        :class="card.to ? 'cursor-pointer' : 'cursor-default'"
        :style="{ ...cardStyle(card), animationDelay: `${idx * 100}ms` }"
        @click="open(card)"
      >
        <div class="text-md font-semibold text-white/85">{{ card.name }}</div>

        <div class="mt-2 text-3xl font-semibold text-white">
          <span v-if="store.loading">—</span>
          <span v-else>{{ card.totalItem }}</span>
        </div>

        <div class="mt-2 text-xs text-white/80">Click to view</div>
      </button>
    </div>

    <div class="mt-20 flex flex-col gap-3">
      <div class="text-xl font-semibold text-slate-800">Report Summary</div>
      <div
        v-if="pointReportStatusCards.length"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <button
          v-for="(card, idx) in pointReportStatusCards"
          :key="`problem-${card.pr_status}-${card.pr_status_name}`"
          v-animateonscroll="{
            enterClass: 'dashboard-card-enter',
            leaveClass: 'dashboard-card-leave',
          }"
          type="button"
          class="dashboard-card rounded-2xl shadow-sm hover:shadow transition p-4 text-left cursor-pointer"
          :style="{ ...statusCardStyle(card), animationDelay: `${idx * 100}ms` }"
          @click="openStatusCard(card)"
        >
          <div class="text-md font-semibold text-white/85">{{ card.pr_status_name }}</div>

          <div class="mt-2 text-3xl font-semibold text-white">
            <span v-if="store.loading">—</span>
            <span v-else>{{ card.total_problem }}</span>
          </div>

          <div class="mt-2 text-xs text-white/80">Click to view</div>
        </button>
      </div>
    </div>

    <div class="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div
        v-animateonscroll="{
          enterClass: 'dashboard-chart-enter',
          leaveClass: 'dashboard-chart-leave',
        }"
        class="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div class="text-base font-semibold text-slate-800">Total Users by Roles</div>
        <div class="mt-4 h-[320px]">
          <Chart
            type="doughnut"
            :data="roleChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
        </div>
      </div>

      <div
        v-animateonscroll="{
          enterClass: 'dashboard-chart-enter',
          leaveClass: 'dashboard-chart-leave',
        }"
        class="rounded-2xl border border-slate-200 bg-white p-4"
        style="animation-delay: 100ms"
      >
        <div class="text-base font-semibold text-slate-800">Total Users by Area</div>
        <div class="mt-4 h-[320px]">
          <Chart
            type="doughnut"
            :data="areaUserChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
        </div>
      </div>

      <div
        v-animateonscroll="{
          enterClass: 'dashboard-chart-enter',
          leaveClass: 'dashboard-chart-leave',
        }"
        class="rounded-2xl border border-slate-200 bg-white p-4"
        style="animation-delay: 200ms"
      >
        <div class="text-base font-semibold text-slate-800">Total Checkpoints by Area</div>
        <div class="mt-4 h-[320px]">
          <Chart
            type="doughnut"
            :data="checkpointChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-card-enter {
  animation: dashboard-fade-in-left 0.7s ease-out both;
}

.dashboard-card-leave {
  animation: dashboard-fade-out 0.2s ease-in both;
}

.dashboard-chart-enter {
  animation: dashboard-pop-center 0.7s ease-out both;
}

.dashboard-chart-leave {
  animation: dashboard-fade-out 0.2s ease-in both;
}

@keyframes dashboard-fade-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes dashboard-pop-center {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes dashboard-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
</style>
