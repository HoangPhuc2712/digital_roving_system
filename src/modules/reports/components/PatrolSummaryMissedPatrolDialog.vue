<script setup lang="ts">
import { computed } from 'vue'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { PatrolSummaryMissedPatrolDetailRow } from '@/modules/reports/reports.types'

const { t, locale } = useI18n()
const props = defineProps<{
  visible: boolean
  patrolDate: string
  rows: PatrolSummaryMissedPatrolDetailRow[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const dialogTitle = computed(() => `Patrol Date: ${props.patrolDate || '-'}`)

const tableRows = computed(() =>
  (props.rows ?? []).map((row, index) => ({
    ...row,
    sequence_no: index + 1,
  })),
)
</script>

<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="dialogTitle"
    :style="{ width: '1050px', maxWidth: '95vw' }"
    :contentStyle="{ padding: '1rem 1rem 1.25rem' }"
  >
    <BaseDataTable
      :key="`missed-patrol-report-list-table-${locale}`"
      title=""
      :value="tableRows"
      dataKey="row_id"
      :paginator="false"
      :rows="tableRows.length || 10"
    >
      <Column field="sequence_no" header="#" style="width: 5rem; min-width: 5rem">
        <template #body="{ data }">
          <div class="text-center">{{ data.sequence_no }}</div>
        </template>
      </Column>

      <Column field="route_name" header="Route Name" style="min-width: 15rem">
        <template #body="{ data }">
          <div class="text-slate-800 font-medium">{{ data.route_name || '-' }}</div>
        </template>
      </Column>

      <Column field="patrol_time" header="Patrol Time" style="min-width: 14rem">
        <template #body="{ data }">
          <div class="text-left">{{ data.patrol_time || '-' }}</div>
        </template>
      </Column>

      <Column header="Patrol Detail" style="min-width: 14rem">
        <template #body>
          <div class="text-left text-red-500">No Data</div>
        </template>
      </Column>

      <template #empty>
        <div class="py-6 text-left text-slate-500">No data</div>
      </template>
    </BaseDataTable>
  </Dialog>
</template>
