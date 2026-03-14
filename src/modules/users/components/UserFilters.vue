<script setup lang="ts">
import { computed } from 'vue'
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  roleOptions: { label: string; value: number }[]
  areaOptions: { label: string; value: number }[]
  modelRoleId: number | null
  modelAreaId: number | null
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelRoleId', value: number | null): void
  (e: 'update:modelAreaId', value: number | null): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()

const dropdowns = computed(() => [
  {
    key: 'roleId',
    label: 'Role',
    modelValue: props.modelRoleId,
    options: props.roleOptions,
    widthClass: 'w-full md:w-[280px]',
  },
  {
    key: 'areaId',
    label: 'Area',
    modelValue: props.modelAreaId,
    options: props.areaOptions,
    widthClass: 'w-full md:w-[280px]',
  },
])

function onDropdownUpdate(payload: { key: string; value: any }) {
  if (payload.key === 'roleId') emit('update:modelRoleId', payload.value)
  if (payload.key === 'areaId') emit('update:modelAreaId', payload.value)
}
</script>

<template>
  <BaseFilter
    :dropdowns="dropdowns"
    :modelSearch="props.modelSearch"
    :showSearch="true"
    :showDateSelection="false"
    @update:modelSearch="emit('update:modelSearch', $event)"
    @update:dropdown="onDropdownUpdate"
    @clear="emit('clear')"
  />
</template>
