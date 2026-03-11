<script setup lang="ts">
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'

import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const props = defineProps<{
  areaOptions: { label: string; value: string }[]
  modelAreaName: string | null
  modelDateFrom: Date | null
  modelDateTo: Date | null
}>()

const emit = defineEmits<{
  (e: 'update:modelAreaName', value: string | null): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'clear'): void
}>()
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3">
    <div class="grid grid-cols-1 lg:grid-cols-[400px_320px_320px_auto] gap-3 items-end">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Area</label>
        <Dropdown
          :modelValue="props.modelAreaName"
          class="w-full"
          :options="props.areaOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          @update:modelValue="emit('update:modelAreaName', $event)"
        />
      </div>

      <div>
        <label class="block text-sm text-slate-600 mb-1">From</label>
        <Calendar
          :modelValue="props.modelDateFrom"
          class="w-full"
          dateFormat="dd/mm/yy"
          showTime
          hourFormat="12"
          :manualInput="false"
          showButtonBar
          showIcon
          placeholder="Select start date"
          @update:modelValue="emit('update:modelDateFrom', $event)"
        />
      </div>

      <div>
        <label class="block text-sm text-slate-600 mb-1">To</label>
        <Calendar
          :modelValue="props.modelDateTo"
          class="w-full"
          dateFormat="dd/mm/yy"
          showTime
          hourFormat="12"
          :manualInput="false"
          showButtonBar
          showIcon
          placeholder="Select end date"
          @update:modelValue="emit('update:modelDateTo', $event)"
        />
      </div>

      <div class="flex xl:justify-end">
        <BaseIconButton
          icon="pi pi-filter-slash"
          label="Clear Filters"
          severity="secondary"
          outlined
          @click="emit('clear')"
        />
      </div>
    </div>
  </div>
</template>
