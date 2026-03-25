<script setup lang="ts">
import { computed } from 'vue'
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  menuOptions: { label: string; value: number }[]
  modelStatus: 'ALL' | 'ACTIVE' | 'INACTIVE'
  modelMenuId: number | null
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelStatus', v: 'ALL' | 'ACTIVE' | 'INACTIVE'): void
  (e: 'update:modelMenuId', v: number | null): void
  (e: 'update:modelSearch', v: string): void
  (e: 'clear'): void
}>()

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

const dropdowns = computed(() => [
  {
    key: 'status',
    label: 'Status',
    modelValue: props.modelStatus,
    options: statusOptions,
    showClear: false,
    widthClass: 'w-full md:w-[280px]',
  },
  {
    key: 'menuId',
    label: 'Permission',
    modelValue: props.modelMenuId,
    options: props.menuOptions,
    widthClass: 'w-full md:w-[280px]',
  },
])

function onDropdownUpdate(payload: { key: string; value: any }) {
  if (payload.key === 'status') emit('update:modelStatus', payload.value)
  if (payload.key === 'menuId') emit('update:modelMenuId', payload.value)
}
</script>

<template>
  <BaseFilter
    :dropdowns="dropdowns"
    :modelSearch="props.modelSearch"
    :showSearch="false"
    :showDateSelection="false"
    @update:modelSearch="emit('update:modelSearch', $event)"
    @update:dropdown="onDropdownUpdate"
    @clear="emit('clear')"
  />
</template>
