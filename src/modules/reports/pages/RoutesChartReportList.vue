<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import Toolbar from 'primevue/toolbar'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseDateSelection from '@/components/common/filters/BaseDateSelection.vue'
import RoutesChartCard from '@/modules/reports/components/RoutesChartCard.vue'
import { useRoutesChartReportsStore } from '@/modules/reports/routesChartReports.store'

const router = useRouter()
const { t } = useI18n()
const store = useRoutesChartReportsStore()
const autoLoadEnabled = ref(false)
let filterLoadTimer: ReturnType<typeof setTimeout> | null = null

const reportSwitchButtons = computed(() => [
  {
    label: t('reportDataButtonSwitch.switchPatrolDetailReport'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'patrol-detail-reports' }),
  },
  {
    label: t('reportDataButtonSwitch.switchPatrolSummaryReport'),
    icon: 'pi pi-chart-line',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'patrol-summary-reports' }),
  },
  {
    label: t('reportDataButtonSwitch.switchRoutesChartReport'),
    icon: 'pi pi-chart-bar',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'routes-chart-reports' }),
  },
])

onMounted(async () => {
  await store.load()
  autoLoadEnabled.value = true
})

onBeforeRouteLeave(() => {
  resetPageState()
})

onBeforeUnmount(() => {
  resetPageState()
})

watch(
  () => [store.filterDateFrom?.getTime() ?? null, store.filterDateTo?.getTime() ?? null],
  () => {
    if (!autoLoadEnabled.value) return
    if (!store.filterDateFrom || !store.filterDateTo) return

    clearFilterLoadTimer()
    filterLoadTimer = setTimeout(async () => {
      await store.load()
    }, 250)
  },
)

function clearFilterLoadTimer() {
  if (!filterLoadTimer) return
  clearTimeout(filterLoadTimer)
  filterLoadTimer = null
}

function resetPageState() {
  autoLoadEnabled.value = false
  clearFilterLoadTimer()
  store.clearFilters()
}

async function onClear() {
  autoLoadEnabled.value = false
  clearFilterLoadTimer()
  store.clearFilters()
  await store.load()
  autoLoadEnabled.value = true
}
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="text-[26px] font-semibold text-slate-800">
        {{ t('routesChartReportList.title') }}
      </div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <Toolbar class="card">
      <template #start>
        <BaseDateSelection
          :modelDateFrom="store.filterDateFrom"
          :modelDateTo="store.filterDateTo"
          wrapperClass="grid grid-cols-1 gap-3 items-end md:grid-cols-2 xl:flex xl:flex-wrap xl:items-end"
          inputWidthClass="w-full min-w-0 xl:w-[280px] xl:flex-none"
          @update:modelDateFrom="store.filterDateFrom = $event"
          @update:modelDateTo="store.filterDateTo = $event"
        />
      </template>
      <template #end>
        <BaseButton
          :label="t('common.clearFilters')"
          size="small"
          severity="secondary"
          outlined
          :disabled="store.loading"
          @click="onClear"
        />
      </template>
    </Toolbar>

    <div class="space-y-4">
      <RoutesChartCard
        v-for="routeRow in store.rows"
        :key="routeRow.route_id"
        :routeCode="routeRow.route_code"
        :routeName="routeRow.route_name"
        :minMinute="routeRow.route_min_minute"
        :maxMinute="routeRow.route_max_minute"
        :averageMinute="routeRow.average_minute"
        :labels="routeRow.labels"
        :values="routeRow.values"
        :tooltipTitles="routeRow.tooltip_titles"
      />
    </div>
  </div>
</template>
