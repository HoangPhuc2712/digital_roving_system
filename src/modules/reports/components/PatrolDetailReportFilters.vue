<script setup lang="ts">
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'

import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const props = defineProps<{
  areaOptions: { label: string; value: number }[]
  checkPointOptions: { label: string; value: string }[]
  guardOptions: { label: string; value: string }[]
  modelAreaId: number | null
  modelCheckPointName: string | null
  modelGuardName: string | null
  modelDateFrom: Date | null
  modelDateTo: Date | null
}>()

const emit = defineEmits<{
  (e: 'update:modelAreaId', value: number | null): void
  (e: 'update:modelCheckPointName', value: string | null): void
  (e: 'update:modelGuardName', value: string | null): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'clear'): void
}>()
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-end">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Area</label>
        <Dropdown
          :modelValue="props.modelAreaId"
          class="w-full"
          :options="props.areaOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          @update:modelValue="emit('update:modelAreaId', $event)"
        />
      </div>

      <div>
        <label class="block text-sm text-slate-600 mb-1">Check Point</label>
        <Dropdown
          :modelValue="props.modelCheckPointName"
          class="w-full"
          :options="props.checkPointOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          filter
          @update:modelValue="emit('update:modelCheckPointName', $event)"
        />
      </div>

      <div>
        <label class="block text-sm text-slate-600 mb-1">Guard Name</label>
        <Dropdown
          :modelValue="props.modelGuardName"
          class="w-full"
          :options="props.guardOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          filter
          @update:modelValue="emit('update:modelGuardName', $event)"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_320px_auto] gap-3 items-end">
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

      <div class="flex lg:justify-end">
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
