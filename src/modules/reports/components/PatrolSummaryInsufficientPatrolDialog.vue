<script setup lang="ts">
import { computed } from 'vue'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { PatrolSummaryInsufficientPatrolDetailRow } from '@/modules/reports/reports.types'

const props = defineProps<{
  visible: boolean
  shiftDate: string
  rows: PatrolSummaryInsufficientPatrolDetailRow[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const dialogTitle = computed(() => `Shift: ${props.shiftDate || '-'}`)

function getPatrolTimeClass(value: string) {
  if (value.includes('17:00 - 17:59')) {
    return 'bg-amber-100 text-amber-700'
  }

  if (value.includes('20:00 - 20:59')) {
    return 'bg-sky-100 text-sky-700'
  }

  return 'bg-slate-100 text-slate-700'
}
</script>

<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="dialogTitle"
    :style="{ width: '1180px', maxWidth: '95vw' }"
    :contentStyle="{ padding: '1rem 1rem 1.25rem' }"
  >
    <BaseDataTable
      title=""
      :showSearch="false"
      :value="props.rows"
      dataKey="row_id"
      :paginator="false"
      :rows="props.rows.length || 10"
    >
      <Column field="area_name" header="Area" style="min-width: 10rem">
        <template #body="{ data }">
          <div class="text-left">{{ data.area_name || '-' }}</div>
        </template>
      </Column>

      <Column field="cp_name" header="Check Point" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="text-left text-slate-800 font-medium">{{ data.cp_name || '-' }}</div>
        </template>
      </Column>

      <Column field="patrol_time" header="Patrol Time" sortable>
        <template #body="{ data }">
          <span
            class="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium"
            :class="getPatrolTimeClass(data.patrol_time)"
          >
            {{ data.patrol_time }}
          </span>
        </template>
      </Column>

      <Column field="actual_time" header="Actual Time" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="text-left text-red-500">{{ data.actual_time || 'No Data' }}</div>
        </template>
      </Column>

      <Column field="guard_name" header="Guard Name" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="text-left">{{ data.guard_name || '-' }}</div>
        </template>
      </Column>

      <Column field="event_information" header="Event Information" style="min-width: 15rem">
        <template #body="{ data }">
          <div class="text-left">{{ data.event_information || '' }}</div>
        </template>
      </Column>

      <template #empty>
        <div class="py-6 text-left text-slate-500">No data</div>
      </template>
    </BaseDataTable>
  </Dialog>
</template>
