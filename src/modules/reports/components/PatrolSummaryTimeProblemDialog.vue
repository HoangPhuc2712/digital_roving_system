<script setup lang="ts">
import { computed } from 'vue'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { PatrolSummaryTimeProblemDetailRow } from '@/modules/reports/reports.types'

const props = defineProps<{
  visible: boolean
  patrolDate: string
  rows: PatrolSummaryTimeProblemDetailRow[]
  standardTimeLabel?: string
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
  () => `${t('PatrolSummaryTimeProblemDialog.title')}: ${props.patrolDate || '-'}`,
)

const standardHeader = computed(
  () => props.standardTimeLabel || t('PatrolSummaryTimeProblemDialog.standardTime'),
)
</script>

<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="dialogTitle"
    :style="{ width: '980px', maxWidth: '95vw' }"
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
        field="patrol_time"
        :header="t('PatrolSummaryTimeProblemDialog.patrolTime')"
        style="min-width: 18rem"
      >
        <template #body="{ data }">
          <div class="text-left">{{ data.patrol_time || '-' }}</div>
        </template>
      </Column>

      <Column
        field="actual_patrol_time"
        :header="t('PatrolSummaryTimeProblemDialog.actualTime')"
        style="min-width: 14rem"
      >
        <template #body="{ data }">
          <div class="text-left text-red-500 font-semibold">
            {{ data.actual_patrol_time || '-' }}
          </div>
        </template>
      </Column>

      <Column field="standard_patrol_time" :header="standardHeader" style="min-width: 14rem">
        <template #body="{ data }">
          <div class="text-left font-semibold">{{ data.standard_patrol_time || '-' }}</div>
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
