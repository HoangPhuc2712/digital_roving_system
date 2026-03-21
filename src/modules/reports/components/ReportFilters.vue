<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseFilter from '@/components/common/filters/BaseFilter.vue'
import type { ResultFilter } from '@/modules/reports/reports.types'

const props = defineProps<{
  areaOptions: { label: string; value: number }[]
  guardOptions: { label: string; value: string }[]
  resultOptions: { label: string; value: ResultFilter }[]
  issueStatusOptions: { label: string; value: number | null }[]
  modelAreaId: number | null
  modelIssueStatus: number | null
  modelResult: ResultFilter
  modelGuardId: string
  modelDateFrom: Date | null
  modelDateTo: Date | null
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelAreaId', value: number | null): void
  (e: 'update:modelIssueStatus', value: number | null): void
  (e: 'update:modelResult', value: ResultFilter): void
  (e: 'update:modelGuardId', value: string): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()

const { t } = useI18n()

const dropdowns = computed(() => [
  {
    key: 'areaId',
    label: t('reportList.filters.area'),
    modelValue: props.modelAreaId,
    options: props.areaOptions,
    widthClass: 'w-full md:w-[260px]',
  },
  {
    key: 'issueStatus',
    label: t('reportList.filters.issueStatus'),
    modelValue: props.modelIssueStatus,
    options: props.issueStatusOptions,
    widthClass: 'w-full md:w-[260px]',
  },
  {
    key: 'result',
    label: t('reportList.filters.inspectionResult'),
    modelValue: props.modelResult,
    options: props.resultOptions,
    showClear: false,
    widthClass: 'w-full md:w-[260px]',
  },
  {
    key: 'guardId',
    label: t('reportList.filters.guardName'),
    modelValue: props.modelGuardId,
    options: props.guardOptions,
    filter: true,
    widthClass: 'w-full md:w-[260px]',
  },
])

function onDropdownUpdate(payload: { key: string; value: any }) {
  if (payload.key === 'areaId') emit('update:modelAreaId', payload.value)
  if (payload.key === 'issueStatus') emit('update:modelIssueStatus', payload.value)
  if (payload.key === 'result') emit('update:modelResult', payload.value)
  if (payload.key === 'guardId') emit('update:modelGuardId', payload.value)
}
</script>

<template>
  <BaseFilter
    :dropdowns="dropdowns"
    :modelSearch="props.modelSearch"
    :showSearch="true"
    :showDateSelection="true"
    :modelDateFrom="props.modelDateFrom"
    :modelDateTo="props.modelDateTo"
    @update:modelSearch="emit('update:modelSearch', $event)"
    @update:modelDateFrom="emit('update:modelDateFrom', $event)"
    @update:modelDateTo="emit('update:modelDateTo', $event)"
    @update:dropdown="onDropdownUpdate"
    @clear="emit('clear')"
  />
</template>
