<script setup lang="ts">
import type { PatrolSummaryReportRow } from '@/modules/reports/reports.types'

defineProps<{
  groupedRows: Array<{
    date_key: string
    date_label: string
    items: PatrolSummaryReportRow[]
  }>
  loading?: boolean
}>()

function formatRate(rate: number) {
  const value = Number(rate ?? 0)
  return `${value.toFixed(2)}%`
}

function actualCountClass(row: PatrolSummaryReportRow) {
  return row.actual_count < row.required_count ? 'text-red-500 font-medium' : ''
}

function abnormalCountClass(value: number) {
  return Number(value ?? 0) > 0 ? 'text-red-500 font-medium' : ''
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table class="w-full min-w-[1100px] border-collapse text-[0.95rem] text-slate-700">
      <thead>
        <tr class="bg-slate-50 text-slate-800">
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">Patrol Date</th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">Patrol Area</th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            Required Number of Patrols
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            Actual Patrol Count
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            Missed Patrols Count
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            Time Problem Count
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">
            Insufficient Number of Patrols
          </th>
          <th class="border border-slate-200 px-4 py-3 text-center font-semibold">Abnormal Rate</th>
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
              {{ row.missed_count }}
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.time_problem_count)"
            >
              {{ row.time_problem_count }}
            </td>
            <td
              class="border border-slate-200 px-4 py-3 text-center"
              :class="abnormalCountClass(row.insufficient_count)"
            >
              {{ row.insufficient_count }}
            </td>
            <td class="border border-slate-200 px-4 py-3 text-center">
              {{ formatRate(row.abnormal_rate) }}
            </td>
          </tr>
        </template>
      </tbody>

      <tbody v-else>
        <tr>
          <td colspan="8" class="border border-slate-200 px-4 py-8 text-center text-slate-500">
            {{ loading ? 'Loading data...' : 'No reports found.' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
