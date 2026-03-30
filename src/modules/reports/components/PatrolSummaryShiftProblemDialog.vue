<script setup lang="ts">
import { computed } from 'vue'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { PatrolSummaryShiftProblemDetailRow } from '@/modules/reports/reports.types'

const props = defineProps<{
  visible: boolean
  patrolDate: string
  rows: PatrolSummaryShiftProblemDetailRow[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const { t } = useI18n()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const dialogTitle = computed(
  () => `${t('patrolSummaryShiftProblemDialog.title')}: ${props.patrolDate || '-'}`,
)

function rowCellClass(row: PatrolSummaryShiftProblemDetailRow) {
  return [
    '-mx-4 -my-3 px-4 py-3 min-h-[calc(100%+1.5rem)] flex items-center',
    row.is_out_of_shift ? 'bg-red-50 text-red-500 font-medium' : 'text-slate-700',
  ]
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
      <Column
        field="route_name"
        :header="t('patrolSummaryShiftProblemDialog.routeName')"
        style="min-width: 14rem"
      >
        <template #body="{ data }">
          <div :class="rowCellClass(data)">{{ data.route_name || '-' }}</div>
        </template>
      </Column>

      <Column
        field="cp_name"
        :header="t('patrolSummaryShiftProblemDialog.checkPoint')"
        style="min-width: 14rem"
      >
        <template #body="{ data }">
          <div :class="rowCellClass(data)">{{ data.cp_name || '-' }}</div>
        </template>
      </Column>

      <Column
        field="patrol_time"
        :header="t('patrolSummaryShiftProblemDialog.patrolTime')"
        style="min-width: 12rem"
      >
        <template #body="{ data }">
          <div :class="rowCellClass(data)">{{ data.patrol_time || '-' }}</div>
        </template>
      </Column>

      <Column
        field="actual_time"
        :header="t('patrolSummaryShiftProblemDialog.actualTime')"
        style="min-width: 12rem"
      >
        <template #body="{ data }">
          <div :class="rowCellClass(data)">{{ data.actual_time || '-' }}</div>
        </template>
      </Column>

      <Column
        field="guard_name"
        :header="t('patrolSummaryShiftProblemDialog.guardName')"
        style="min-width: 12rem"
      >
        <template #body="{ data }">
          <div :class="rowCellClass(data)">{{ data.guard_name || '-' }}</div>
        </template>
      </Column>

      <template #empty>
        <div class="py-6 text-left text-slate-500">
          {{ t('patrolSummaryMissedPatrolDialog.noData') }}
        </div>
      </template>
    </BaseDataTable>
  </Dialog>
</template>
