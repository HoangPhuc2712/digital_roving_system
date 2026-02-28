<script setup lang="ts">
import Dropdown from 'primevue/dropdown'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const props = defineProps<{
  roleOptions: { label: string; value: number }[]
  areaOptions: { label: string; value: number }[]
  modelRoleId: number | null
  modelAreaId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelRoleId', v: number | null): void
  (e: 'update:modelAreaId', v: number | null): void
  (e: 'clear'): void
}>()
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
