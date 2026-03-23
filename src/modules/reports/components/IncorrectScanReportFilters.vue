<script setup lang="ts">
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  modelDateFrom: Date | null
  modelDateTo: Date | null
  modelSearch: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()
</script>

<template>
  <BaseFilter
    :dropdowns="[]"
    :showSearch="true"
    :showDateSelection="true"
    :modelSearch="props.modelSearch"
    :modelDateFrom="props.modelDateFrom"
    :modelDateTo="props.modelDateTo"
    :clearDisabled="props.loading"
    @update:modelSearch="emit('update:modelSearch', $event)"
    @update:modelDateFrom="emit('update:modelDateFrom', $event)"
    @update:modelDateTo="emit('update:modelDateTo', $event)"
    @clear="emit('clear')"
  />
</template>
