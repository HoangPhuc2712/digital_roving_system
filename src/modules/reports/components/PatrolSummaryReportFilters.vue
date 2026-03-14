<script setup lang="ts">
import BaseFilter from '@/components/common/filters/BaseFilter.vue'

const props = defineProps<{
  modelDateFrom: Date | null
  modelDateTo: Date | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'clear'): void
}>()
</script>

<template>
  <BaseFilter
    :dropdowns="[]"
    :showSearch="false"
    :showDateSelection="true"
    :modelDateFrom="props.modelDateFrom"
    :modelDateTo="props.modelDateTo"
    :clearDisabled="props.loading"
    @update:modelDateFrom="emit('update:modelDateFrom', $event)"
    @update:modelDateTo="emit('update:modelDateTo', $event)"
    @clear="emit('clear')"
  />
</template>
