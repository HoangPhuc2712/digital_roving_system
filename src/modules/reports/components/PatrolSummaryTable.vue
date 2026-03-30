<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import type { PatrolSummaryReportRow } from '@/modules/reports/reports.types'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const props = defineProps<{
  groupedRows: Array<{
    date_key: string
    date_label: string
    items: PatrolSummaryReportRow[]
  }>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-missed-details', row: PatrolSummaryReportRow): void
  (e: 'open-time-problem-details', row: PatrolSummaryReportRow): void
  (e: 'open-insufficient-details', row: PatrolSummaryReportRow): void
  (e: 'open-shift-problem-details', row: PatrolSummaryReportRow): void
}>()

function formatRate(rate: number) {
  const value = Number(rate ?? 0)
  return `${value.toFixed(2)}%`
}

function actualCountClass(row: PatrolSummaryReportRow) {
  return row.actual_count !== row.required_count ? 'text-red-500 font-medium' : ''
}

function abnormalCountClass(value: number) {
  return Number(value ?? 0) > 0 ? 'text-red-500 font-medium' : ''
}

function canOpenMissedDetails(row: PatrolSummaryReportRow) {
  return Number(row.missed_count ?? 0) > 0
}

function openMissedDetails(row: PatrolSummaryReportRow) {
  if (!canOpenMissedDetails(row)) return
  emit('open-missed-details', row)
}

function canOpenTimeProblemDetails(row: PatrolSummaryReportRow) {
  return Number(row.time_problem_count ?? 0) > 0
}

function openTimeProblemDetails(row: PatrolSummaryReportRow) {
  if (!canOpenTimeProblemDetails(row)) return
  emit('open-time-problem-details', row)
}

function canOpenInsufficientDetails(row: PatrolSummaryReportRow) {
  return Number(row.insufficient_count ?? 0) > 0
}

function openInsufficientDetails(row: PatrolSummaryReportRow) {
  if (!canOpenInsufficientDetails(row)) return
  emit('open-insufficient-details', row)
}

function canOpenShiftProblemDetails(row: PatrolSummaryReportRow) {
  return Number(row.shift_problem_count ?? 0) > 0
}

function openShiftProblemDetails(row: PatrolSummaryReportRow) {
  if (!canOpenShiftProblemDetails(row)) return
  emit('open-shift-problem-details', row)
}
</script>

<template>
  <div class="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <div
      v-if="props.loading"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/75 backdrop-blur-[1px]"
    >
      <ProgressSpinner
        strokeWidth="4"
        style="width: 44px; height: 44px"
        animationDuration=".8s"
        class="summary-loading-spinner"
      />
      <div class="text-sm text-slate-500">{{ t('patrolSummaryReportList.loadingData') }}...</div>
    </div>

    <table class="w-full min-w-[1100px] border-collapse text-[0.95rem] text-slate-700">
      <thead>
        <tr class="bg-slate-50 text-slate-800">
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.patrolDate') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.patrolArea') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.requiredNumberOfPatrols') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.actualPatrolCount') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.missedPatrolCount') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.timeProblemCount') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.insufficientNumberOfPatrol') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.shiftProblemCount') }}
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            {{ t('patrolSummaryReportList.abnormalRate') }}
          </th>
        </tr>
      </thead>

      <tbody v-if="groupedRows.length">
        <template v-for="group in groupedRows" :key="group.date_key">
          <tr v-for="(row, index) in group.items" :key="`${group.date_key}-${row.area_id}`">
            <td
              v-if="index === 0"
              class="border border-slate-200 px-4 py-3 text-center align-middle"
              :rowspan="group.items.length"
            >
              {{ group.date_label }}
            </td>

            <td class="border border-slate-200 px-4 py-3 text-center">{{ row.area_name }}</td>
            <td class="border border-slate-200 px-4 py-3 text-center">
              {{ row.required_count }}
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="actualCountClass(row)"
            >
              {{ row.actual_count }}
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.missed_count)"
            >
              <button
                v-if="canOpenMissedDetails(row)"
                type="button"
                class="font-medium text-red-500 hover:text-red-800 hover:cursor-pointer"
                @click="openMissedDetails(row)"
              >
                {{ row.missed_count }}
              </button>
              <span v-else>{{ row.missed_count }}</span>
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.time_problem_count)"
            >
              <button
                v-if="canOpenTimeProblemDetails(row)"
                type="button"
                class="font-medium text-red-500 hover:text-red-800 hover:cursor-pointer"
                @click="openTimeProblemDetails(row)"
              >
                {{ row.time_problem_count }}
              </button>
              <span v-else>{{ row.time_problem_count }}</span>
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.insufficient_count)"
            >
              <button
                v-if="canOpenInsufficientDetails(row)"
                type="button"
                class="font-medium text-red-500 hover:text-red-800 hover:cursor-pointer"
                @click="openInsufficientDetails(row)"
              >
                {{ row.insufficient_count }}
              </button>
              <span v-else>{{ row.insufficient_count }}</span>
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.shift_problem_count)"
            >
              <button
                v-if="canOpenShiftProblemDetails(row)"
                type="button"
                class="font-medium text-red-500 hover:text-red-800 hover:cursor-pointer"
                @click="openShiftProblemDetails(row)"
              >
                {{ row.shift_problem_count }}
              </button>
              <span v-else>{{ row.shift_problem_count }}</span>
            </td>
            <td class="border border-slate-200 px-4 py-3 text-center">
              {{ formatRate(row.abnormal_rate) }}
            </td>
          </tr>
        </template>
      </tbody>

      <tbody v-else-if="!props.loading">
        <tr>
          <td colspan="9" class="border border-slate-200 px-4 py-8 text-center text-slate-500">
            {{ t('patrolSummaryReportList.noReportFound') }}.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
:deep(.summary-loading-spinner svg) {
  width: 44px;
  height: 44px;
}

:deep(.summary-loading-spinner .p-progress-spinner-circle) {
  stroke: #cbd5e1 !important;
}
</style>
