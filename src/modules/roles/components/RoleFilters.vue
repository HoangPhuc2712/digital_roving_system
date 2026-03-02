<script setup lang="ts">
import Dropdown from 'primevue/dropdown'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const props = defineProps<{
  menuOptions: { label: string; value: number }[]
  modelStatus: 'ALL' | 'ACTIVE' | 'INACTIVE'
  modelMenuId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelStatus', v: 'ALL' | 'ACTIVE' | 'INACTIVE'): void
  (e: 'update:modelMenuId', v: number | null): void
  (e: 'clear'): void
}>()

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3">
    <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <div class="md:col-span-3">
        <label class="block text-sm text-slate-600 mb-1">Status</label>
        <Dropdown
          :modelValue="props.modelStatus"
          class="w-full"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          @update:modelValue="emit('update:modelStatus', $event)"
        />
      </div>

      <div class="md:col-span-3">
        <label class="block text-sm text-slate-600 mb-1">Permission</label>
        <Dropdown
          :modelValue="props.modelMenuId"
          class="w-full"
          :options="props.menuOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          @update:modelValue="emit('update:modelMenuId', $event)"
        />
      </div>
    </div>

    <div class="mt-3 flex justify-end">
      <BaseIconButton
        label="Clear Filters"
        severity="secondary"
        outlined
        icon="pi pi-filter-slash"
        @click="emit('clear')"
      />
    </div>
  </div>
</template>
