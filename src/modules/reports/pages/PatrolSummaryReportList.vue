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
const timeProblemDialogVisible = ref(false)
const insufficientDialogVisible = ref(false)
const selectedMissedRow = ref<PatrolSummaryReportRow | null>(null)
const selectedTimeProblemRow = ref<PatrolSummaryReportRow | null>(null)
const selectedInsufficientRow = ref<PatrolSummaryReportRow | null>(null)

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
  timeProblemDialogVisible.value = false
  insufficientDialogVisible.value = false
  selectedMissedRow.value = null
  selectedTimeProblemRow.value = null
  selectedInsufficientRow.value = null
  store.clearFilters()
}

const selectedMissedPatrolDate = computed(() => selectedMissedRow.value?.date_label ?? '')
const selectedMissedPatrolRows = computed(
  () => selectedMissedRow.value?.missed_patrol_details ?? [],
)
const selectedTimeProblemDate = computed(() => selectedTimeProblemRow.value?.date_label ?? '')
const selectedTimeProblemRows = computed(
  () => selectedTimeProblemRow.value?.time_problem_details ?? [],
)

const selectedInsufficientDate = computed(() => selectedInsufficientRow.value?.date_label ?? '')
const selectedInsufficientRows = computed(
  () => selectedInsufficientRow.value?.insufficient_patrol_details ?? [],
)

function openMissedDetails(row: PatrolSummaryReportRow) {
  selectedMissedRow.value = row
  missedDialogVisible.value = true
}

function openTimeProblemDetails(row: PatrolSummaryReportRow) {
  selectedTimeProblemRow.value = row
  timeProblemDialogVisible.value = true
}

function openInsufficientDetails(row: PatrolSummaryReportRow) {
  selectedInsufficientRow.value = row
  insufficientDialogVisible.value = true
}

function onMissedDialogVisibleChange(value: boolean) {
  missedDialogVisible.value = value
  if (!value) {
    selectedMissedRow.value = null
  }
}

function onTimeProblemDialogVisibleChange(value: boolean) {
  timeProblemDialogVisible.value = value
  if (!value) {
    selectedTimeProblemRow.value = null
  }
}

function onInsufficientDialogVisibleChange(value: boolean) {
  insufficientDialogVisible.value = value
  if (!value) {
    selectedInsufficientRow.value = null
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
        @open-time-problem-details="openTimeProblemDetails"
        @open-insufficient-details="openInsufficientDetails"
      />
    </div>

    <PatrolSummaryMissedPatrolDialog
      :visible="missedDialogVisible"
      :patrolDate="selectedMissedPatrolDate"
      :rows="selectedMissedPatrolRows"
      @update:visible="onMissedDialogVisibleChange"
    />

    <PatrolSummaryTimeProblemDialog
      :visible="timeProblemDialogVisible"
      :patrolDate="selectedTimeProblemDate"
      :rows="selectedTimeProblemRows"
      @update:visible="onTimeProblemDialogVisibleChange"
    />

    <PatrolSummaryInsufficientPatrolDialog
      :visible="insufficientDialogVisible"
      :shiftDate="selectedInsufficientDate"
      :rows="selectedInsufficientRows"
      @update:visible="onInsufficientDialogVisibleChange"
    />

    <PatrolSummaryChartCard
      ref="chartCardRef"
      :labels="store.chartLabels"
      :datasets="store.chartDatasets"
    />
  </div>
</template>
