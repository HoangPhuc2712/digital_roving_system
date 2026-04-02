<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'primevue/chart'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/modules/dashboard/dashboard.store'
import type {
  DashboardCardMeta,
  DashboardTotalAppItem,
  DashboardTotalPointReportByStatusItem,
} from '@/modules/dashboard/dashboard.types'
import {
  translateIssueStatusName,
  translateMenuCategoryName,
  translateRoleName,
} from '@/utils/dataI18n'

const auth = useAuthStore()
const store = useDashboardStore()
const router = useRouter()
const { t } = useI18n()

const canSeeAdminDashboardSummary = computed(() => auth.isAdminUser)

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
    .filter((item) => normalizeName(item.name) !== 'MENUCATEGORIES')
    .map((item) => ({
      ...item,
      ...cardMetaOf(item),
      displayName: translateMenuCategoryName(String(item.name ?? ''), t),
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
    responsive: true,
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1400,
      easing: 'easeOutCubic',
    },
    transitions: {
      active: {
        animation: {
          duration: 200,
        },
      },
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
  labels: store.totalUsersByRole.map((x) => {
    const rawRoleName = String(x.role_name ?? '').trim()
    return rawRoleName ? translateRoleName(rawRoleName, t) : x.role_code || `Role ${x.role_id}`
  }),
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

const animatedCardTotals = ref<Record<string, number>>({})
const animatedStatusTotals = ref<Record<string, number>>({})

function animateNumber(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
) {
  const start = performance.now()

  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const nextValue = Math.round(from + (to - from) * eased)
    onUpdate(nextValue)

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

function runCardAnimations() {
  const nextTotals: Record<string, number> = {}

  for (const card of cards.value) {
    const key = `${card.stt}-${card.name}`
    nextTotals[key] = 0
    animateNumber(0, Number(card.totalItem ?? 0), 900, (value) => {
      animatedCardTotals.value = {
        ...animatedCardTotals.value,
        [key]: value,
      }
    })
  }

  animatedCardTotals.value = nextTotals
}

function runStatusCardAnimations() {
  const nextTotals: Record<string, number> = {}

  for (const card of pointReportStatusCards.value) {
    const key = `${card.pr_status}-${card.pr_status_name}`
    nextTotals[key] = 0
    animateNumber(0, Number(card.total_problem ?? 0), 900, (value) => {
      animatedStatusTotals.value = {
        ...animatedStatusTotals.value,
        [key]: value,
      }
    })
  }

  animatedStatusTotals.value = nextTotals
}

function getAnimatedCardTotal(card: DashboardTotalAppItem) {
  const key = `${card.stt}-${card.name}`
  return animatedCardTotals.value[key] ?? 0
}

function getAnimatedStatusTotal(card: DashboardTotalPointReportByStatusItem) {
  const key = `${card.pr_status}-${card.pr_status_name}`
  return animatedStatusTotals.value[key] ?? 0
}

const chartsReady = ref(false)
let chartMountTimeout: number | null = null

function scheduleChartsRender() {
  chartsReady.value = false

  if (chartMountTimeout != null) {
    window.clearTimeout(chartMountTimeout)
    chartMountTimeout = null
  }

  chartMountTimeout = window.setTimeout(() => {
    requestAnimationFrame(() => {
      chartsReady.value = true
      chartMountTimeout = null
    })
  }, 80)
}

watch(
  () => store.loading,
  async (loading) => {
    if (loading) return

    runCardAnimations()
    runStatusCardAnimations()

    await nextTick()
    if (canSeeAdminDashboardSummary.value) {
      scheduleChartsRender()
    }
  },
  { immediate: false },
)

watch(canSeeAdminDashboardSummary, async (visible) => {
  if (!visible) {
    chartsReady.value = false
    return
  }

  if (store.loading) return

  await nextTick()
  scheduleChartsRender()
})

onMounted(async () => {
  await store.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('dashboard.title') }}</div>

    <div v-if="store.error" class="p-4">
      <div class="text-slate-800 font-semibold text-lg">Server Maintenance</div>
      <div class="text-slate-600 mt-1">{{ store.error }}</div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <button
        v-for="card in cards"
        :key="`${card.stt}-${card.name}`"
        type="button"
        class="dashboard-card rounded-2xl shadow-sm hover:shadow transition p-4 text-left"
        :class="card.to ? 'cursor-pointer' : 'cursor-default'"
        :style="cardStyle(card)"
        @click="open(card)"
      >
        <div class="text-md font-semibold text-white/85">{{ card.displayName || card.name }}</div>

        <div class="mt-2 text-3xl font-semibold text-white">
          <span v-if="store.loading">—</span>
          <span v-else>{{ getAnimatedCardTotal(card) }}</span>
        </div>

        <div class="mt-2 text-xs text-white/80">{{ t('dashboard.clickToView') }}</div>
      </button>
    </div>

    <div v-if="canSeeAdminDashboardSummary" class="mt-20 flex flex-col gap-3">
      <div class="text-xl font-semibold text-slate-800">{{ t('dashboard.reportSummary') }}</div>
      <div
        v-if="pointReportStatusCards.length"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <button
          v-for="card in pointReportStatusCards"
          :key="`problem-${card.pr_status}-${card.pr_status_name}`"
          type="button"
          class="dashboard-card rounded-2xl shadow-sm hover:shadow transition p-4 text-left cursor-pointer"
          :style="statusCardStyle(card)"
          @click="openStatusCard(card)"
        >
          <div class="text-md font-semibold text-white/85">
            {{ translateIssueStatusName(String(card.pr_status_name ?? ''), t) }}
          </div>

          <div class="mt-2 text-3xl font-semibold text-white">
            <span v-if="store.loading">—</span>
            <span v-else>{{ getAnimatedStatusTotal(card) }}</span>
          </div>

          <div class="mt-2 text-xs text-white/80">{{ t('dashboard.clickToView') }}</div>
        </button>
      </div>
    </div>

    <div v-if="canSeeAdminDashboardSummary" class="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="text-base font-semibold text-slate-800">
          {{ t('dashboard.totalUsersByRole') }}
        </div>
        <div class="mt-4 h-[320px]">
          <Chart
            v-if="chartsReady"
            type="doughnut"
            :data="roleChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
          <div v-else class="h-full w-full" />
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="text-base font-semibold text-slate-800">
          {{ t('dashboard.totalUsersByArea') }}
        </div>
        <div class="mt-4 h-[320px]">
          <Chart
            v-if="chartsReady"
            type="doughnut"
            :data="areaUserChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
          <div v-else class="h-full w-full" />
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="text-base font-semibold text-slate-800">
          {{ t('dashboard.totalCheckpointsByArea') }}
        </div>
        <div class="mt-4 h-[320px]">
          <Chart
            v-if="chartsReady"
            type="doughnut"
            :data="checkpointChartData"
            :options="chartOptions"
            class="h-full w-full"
          />
          <div v-else class="h-full w-full" />
        </div>
      </div>
    </div>
  </div>
</template>
