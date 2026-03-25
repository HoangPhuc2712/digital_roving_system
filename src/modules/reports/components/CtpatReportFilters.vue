<script setup lang="ts">
import { computed } from 'vue'
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  areaOptions: { label: string; value: string }[]
  modelAreaName: string | null
  modelDateFrom: Date | null
  modelDateTo: Date | null
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelAreaName', value: string | null): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()

const dropdowns = computed(() => [
  {
    key: 'areaName',
    label: 'Area',
    modelValue: props.modelAreaName,
    options: props.areaOptions,
    widthClass: 'w-full md:w-[280px]',
  },
])

function onDropdownUpdate(payload: { key: string; value: any }) {
  if (payload.key === 'areaName') emit('update:modelAreaName', payload.value)
}
</script>

<template>
  <BaseFilter
    :dropdowns="dropdowns"
    :modelSearch="props.modelSearch"
    :showSearch="false"
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
