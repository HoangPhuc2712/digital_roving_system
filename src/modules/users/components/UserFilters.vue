<script setup lang="ts">
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

type StatusOption = { label: string; value: 'ALL' | 'ACTIVE' | 'INACTIVE' }

const props = defineProps<{
  roleOptions: { label: string; value: number }[]
  modelRoleId: number | null
  modelStatus: 'ALL' | 'ACTIVE' | 'INACTIVE'
}>()

const emit = defineEmits<{
  (e: 'update:modelRoleId', v: number | null): void
  (e: 'update:modelStatus', v: 'ALL' | 'ACTIVE' | 'INACTIVE'): void
  (e: 'clear'): void
}>()

const statusOptions: StatusOption[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3">
    <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <div class="md:col-span-3">
        <label class="block text-sm text-slate-600 mb-1">Role</label>
        <Dropdown
          :modelValue="props.modelRoleId"
          class="w-full"
          :options="props.roleOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          @update:modelValue="emit('update:modelRoleId', $event)"
        />
      </div>

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
    </div>

    <div class="mt-3 flex justify-end">
      <BaseButton label="Clear Filters" severity="secondary" outlined @click="emit('clear')" />
    </div>
  </div>
</template>
