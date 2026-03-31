<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toolbar from 'primevue/toolbar'
import { useI18n } from 'vue-i18n'

import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import PatrolSummaryReportFilters from '@/modules/reports/components/PatrolSummaryReportFilters.vue'
import PatrolSummaryTable from '@/modules/reports/components/PatrolSummaryTable.vue'
import PatrolSummaryChartCard from '@/modules/reports/components/PatrolSummaryChartCard.vue'
import PatrolSummaryMissedPatrolDialog from '@/modules/reports/components/PatrolSummaryMissedPatrolDialog.vue'
import PatrolSummaryTimeProblemDialog from '@/modules/reports/components/PatrolSummaryTimeProblemDialog.vue'
import PatrolSummaryInsufficientPatrolDialog from '@/modules/reports/components/PatrolSummaryInsufficientPatrolDialog.vue'
import PatrolSummaryShiftProblemDialog from '@/modules/reports/components/PatrolSummaryShiftProblemDialog.vue'
import { usePatrolSummaryReportsStore } from '@/modules/reports/patrolSummaryReports.store'
import type { PatrolSummaryReportRow } from '@/modules/reports/reports.types'
import { exportPatrolSummaryReportXlsx } from '@/services/export/patrolSummaryReport.export'

type PatrolSummaryChartExpose = {
  getBase64Image: () => string
}

const toast = useToast()
const router = useRouter()
const store = usePatrolSummaryReportsStore()
const { t, locale } = useI18n()
const exporting = ref(false)
const autoLoadEnabled = ref(false)
const chartCardRef = ref<PatrolSummaryChartExpose | null>(null)
const missedDialogVisible = ref(false)
const slowTimeProblemDialogVisible = ref(false)
const fastTimeProblemDialogVisible = ref(false)
const insufficientDialogVisible = ref(false)
const shiftProblemDialogVisible = ref(false)
const selectedMissedRow = ref<PatrolSummaryReportRow | null>(null)
const selectedSlowTimeProblemRow = ref<PatrolSummaryReportRow | null>(null)
const selectedFastTimeProblemRow = ref<PatrolSummaryReportRow | null>(null)
const selectedInsufficientRow = ref<PatrolSummaryReportRow | null>(null)
const selectedShiftProblemRow = ref<PatrolSummaryReportRow | null>(null)

let filterLoadTimer: ReturnType<typeof setTimeout> | null = null

const groupedRows = computed(() => store.groupedRows)
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
  missedDialogVisible.value = false
  slowTimeProblemDialogVisible.value = false
  fastTimeProblemDialogVisible.value = false
  insufficientDialogVisible.value = false
  shiftProblemDialogVisible.value = false
  selectedMissedRow.value = null
  selectedSlowTimeProblemRow.value = null
  selectedFastTimeProblemRow.value = null
  selectedInsufficientRow.value = null
  selectedShiftProblemRow.value = null
  store.clearFilters()
}

const selectedMissedPatrolDate = computed(() => selectedMissedRow.value?.date_label ?? '')
const selectedMissedPatrolRows = computed(
  () => selectedMissedRow.value?.missed_patrol_details ?? [],
)
const selectedSlowTimeProblemDate = computed(
  () => selectedSlowTimeProblemRow.value?.date_label ?? '',
)
const selectedSlowTimeProblemRows = computed(
  () => selectedSlowTimeProblemRow.value?.time_slow_problem_details ?? [],
)
const selectedFastTimeProblemDate = computed(
  () => selectedFastTimeProblemRow.value?.date_label ?? '',
)
const selectedFastTimeProblemRows = computed(
  () => selectedFastTimeProblemRow.value?.time_fast_problem_details ?? [],
)

const selectedInsufficientDate = computed(() => selectedInsufficientRow.value?.date_label ?? '')
const selectedInsufficientRows = computed(
  () => selectedInsufficientRow.value?.insufficient_patrol_details ?? [],
)
const selectedShiftProblemDate = computed(() => selectedShiftProblemRow.value?.date_label ?? '')
const selectedShiftProblemRows = computed(
  () => selectedShiftProblemRow.value?.shift_problem_details ?? [],
)

function openMissedDetails(row: PatrolSummaryReportRow) {
  selectedMissedRow.value = row
  missedDialogVisible.value = true
}

function openSlowTimeProblemDetails(row: PatrolSummaryReportRow) {
  selectedSlowTimeProblemRow.value = row
  slowTimeProblemDialogVisible.value = true
}

function openFastTimeProblemDetails(row: PatrolSummaryReportRow) {
  selectedFastTimeProblemRow.value = row
  fastTimeProblemDialogVisible.value = true
}

function openInsufficientDetails(row: PatrolSummaryReportRow) {
  selectedInsufficientRow.value = row
  insufficientDialogVisible.value = true
}

function openShiftProblemDetails(row: PatrolSummaryReportRow) {
  selectedShiftProblemRow.value = row
  shiftProblemDialogVisible.value = true
}

function onMissedDialogVisibleChange(value: boolean) {
  missedDialogVisible.value = value
  if (!value) {
    selectedMissedRow.value = null
  }
}

function onSlowTimeProblemDialogVisibleChange(value: boolean) {
  slowTimeProblemDialogVisible.value = value
  if (!value) {
    selectedSlowTimeProblemRow.value = null
  }
}

function onFastTimeProblemDialogVisibleChange(value: boolean) {
  fastTimeProblemDialogVisible.value = value
  if (!value) {
    selectedFastTimeProblemRow.value = null
  }
}

function onInsufficientDialogVisibleChange(value: boolean) {
  insufficientDialogVisible.value = value
  if (!value) {
    selectedInsufficientRow.value = null
  }
}

function onShiftProblemDialogVisibleChange(value: boolean) {
  shiftProblemDialogVisible.value = value
  if (!value) {
    selectedShiftProblemRow.value = null
  }
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
      <div class="text-[26px] font-semibold text-slate-800">
        {{ t('patrolSummaryReportList.title') }}
      </div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <Toolbar class="mb-4">
      <template #end>
        <BaseIconButton
          icon="pi pi-file-excel"
          :label="t('common.export')"
          size="small"
          severity="secondary"
          outlined
          :loading="exporting"
          :disabled="store.loading || exporting"
          @click="onExport"
        />
      </template>
    </Toolbar>

    <div class="card space-y-4">
      <PatrolSummaryReportFilters
        :modelDateFrom="store.filterDateFrom"
        :modelDateTo="store.filterDateTo"
        :loading="store.loading"
        @update:modelDateFrom="store.filterDateFrom = $event"
        @update:modelDateTo="store.filterDateTo = $event"
        @clear="onClear"
      />

      <PatrolSummaryTable
        :groupedRows="groupedRows"
        :loading="store.loading"
        @open-missed-details="openMissedDetails"
        @open-slow-time-problem-details="openSlowTimeProblemDetails"
        @open-fast-time-problem-details="openFastTimeProblemDetails"
        @open-insufficient-details="openInsufficientDetails"
        @open-shift-problem-details="openShiftProblemDetails"
      />
    </div>

    <PatrolSummaryMissedPatrolDialog
      :visible="missedDialogVisible"
      :patrolDate="selectedMissedPatrolDate"
      :rows="selectedMissedPatrolRows"
      @update:visible="onMissedDialogVisibleChange"
    />

    <PatrolSummaryTimeProblemDialog
      :visible="slowTimeProblemDialogVisible"
      :patrolDate="selectedSlowTimeProblemDate"
      :rows="selectedSlowTimeProblemRows"
      :standardTimeLabel="t('PatrolSummaryTimeProblemDialog.minimumTime')"
      @update:visible="onSlowTimeProblemDialogVisibleChange"
    />

    <PatrolSummaryTimeProblemDialog
      :visible="fastTimeProblemDialogVisible"
      :patrolDate="selectedFastTimeProblemDate"
      :rows="selectedFastTimeProblemRows"
      :standardTimeLabel="t('PatrolSummaryTimeProblemDialog.maximumTime')"
      @update:visible="onFastTimeProblemDialogVisibleChange"
    />

    <PatrolSummaryInsufficientPatrolDialog
      :visible="insufficientDialogVisible"
      :shiftDate="selectedInsufficientDate"
      :rows="selectedInsufficientRows"
      @update:visible="onInsufficientDialogVisibleChange"
    />

    <PatrolSummaryShiftProblemDialog
      :visible="shiftProblemDialogVisible"
      :patrolDate="selectedShiftProblemDate"
      :rows="selectedShiftProblemRows"
      @update:visible="onShiftProblemDialogVisibleChange"
    />

    <PatrolSummaryChartCard
      ref="chartCardRef"
      :labels="store.chartLabels"
      :datasets="store.chartDatasets"
    />
  </div>
</template>
