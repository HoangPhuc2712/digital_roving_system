<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import PatrolSummaryReportFilters from '@/modules/reports/components/PatrolSummaryReportFilters.vue'
import PatrolSummaryTable from '@/modules/reports/components/PatrolSummaryTable.vue'
import PatrolSummaryChartCard from '@/modules/reports/components/PatrolSummaryChartCard.vue'
import { usePatrolSummaryReportsStore } from '@/modules/reports/patrolSummaryReports.store'
import { exportPatrolSummaryReportXlsx } from '@/services/export/patrolSummaryReport.export'

type PatrolSummaryChartExpose = {
  getBase64Image: () => string
}

const toast = useToast()
const router = useRouter()
const store = usePatrolSummaryReportsStore()
const exporting = ref(false)
const autoLoadEnabled = ref(false)
const chartCardRef = ref<PatrolSummaryChartExpose | null>(null)

let filterLoadTimer: ReturnType<typeof setTimeout> | null = null

const groupedRows = computed(() => store.groupedRows)
const reportSwitchButtons = computed(() => [
  {
    label: 'Patrol Detail Report',
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'patrol-detail-reports' }),
  },
  {
    label: 'Patrol Summary Report',
    icon: 'pi pi-chart-line',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'patrol-summary-reports' }),
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
  if (filterLoadTimer) {
    clearTimeout(filterLoadTimer)
    filterLoadTimer = null
  }
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

async function onExport() {
  exporting.value = true
  try {
    const chartBase64 = chartCardRef.value?.getBase64Image() || ''
    await exportPatrolSummaryReportXlsx({
      rows: store.rows,
      fileName: `patrol_summary_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
      chartBase64,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export patrol summary report.'),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="text-[26px] font-semibold text-slate-800">Patrol Summary Report</div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <PatrolSummaryReportFilters
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      :loading="store.loading"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @clear="onClear"
    />

    <div class="card space-y-4">
      <div class="flex justify-end">
        <BaseIconButton
          icon="pi pi-file-excel"
          label="Export"
          size="small"
          severity="secondary"
          outlined
          :loading="exporting"
          :disabled="store.loading"
          @click="onExport"
        />
      </div>

      <PatrolSummaryTable :groupedRows="groupedRows" :loading="store.loading" />
    </div>

    <PatrolSummaryChartCard
      ref="chartCardRef"
      :labels="store.chartLabels"
      :datasets="store.chartDatasets"
    />
  </div>
</template>
