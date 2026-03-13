<script setup lang="ts">
import { computed } from 'vue'
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  areaOptions: { label: string; value: number }[]
  checkPointOptions: { label: string; value: string }[]
  guardOptions: { label: string; value: string }[]
  modelAreaId: number | null
  modelCheckPointName: string | null
  modelGuardName: string | null
  modelDateFrom: Date | null
  modelDateTo: Date | null
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelAreaId', value: number | null): void
  (e: 'update:modelCheckPointName', value: string | null): void
  (e: 'update:modelGuardName', value: string | null): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()

const dropdowns = computed(() => [
  {
    key: 'areaId',
    label: 'Area',
    modelValue: props.modelAreaId,
    options: props.areaOptions,
    widthClass: 'w-full md:w-[260px]',
  },
  {
    key: 'checkPointName',
    label: 'Check Point',
    modelValue: props.modelCheckPointName,
    options: props.checkPointOptions,
    filter: true,
    widthClass: 'w-full md:w-[260px]',
  },
  {
    key: 'guardName',
    label: 'Guard Name',
    modelValue: props.modelGuardName,
    options: props.guardOptions,
    filter: true,
    widthClass: 'w-full md:w-[260px]',
  },
])

function onDropdownUpdate(payload: { key: string; value: any }) {
  if (payload.key === 'areaId') emit('update:modelAreaId', payload.value)
  if (payload.key === 'checkPointName') emit('update:modelCheckPointName', payload.value)
  if (payload.key === 'guardName') emit('update:modelGuardName', payload.value)
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
