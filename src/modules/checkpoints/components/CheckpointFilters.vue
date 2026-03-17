<script setup lang="ts">
import { computed } from 'vue'
import MultiSelect from 'primevue/multiselect'

import BaseDropdown from '@/components/common/filters/BaseDropdown.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

const props = defineProps<{
  roleOptions: { label: string; value: number }[]
  modelStatus: 'ALL' | 'ACTIVE' | 'INACTIVE'
  modelRoleIds: number[]
  modelSearch: string
}>()

const emit = defineEmits<{
  (e: 'update:modelStatus', value: 'ALL' | 'ACTIVE' | 'INACTIVE'): void
  (e: 'update:modelRoleIds', value: number[]): void
  (e: 'update:modelSearch', value: string): void
  (e: 'clear'): void
}>()

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

const roleIdsModel = computed({
  get: () => (Array.isArray(props.modelRoleIds) ? props.modelRoleIds : []),
  set: (value: number[]) => emit('update:modelRoleIds', Array.isArray(value) ? value : []),
})

const searchModel = computed({
  get: () => props.modelSearch ?? '',
  set: (value: string) => emit('update:modelSearch', value),
})
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
    <div class="grid grid-cols-1 gap-3 items-end sm:grid-cols-2 xl:grid-cols-2">
      <div class="min-w-0">
        <label class="block text-sm text-slate-600 mb-1">Status</label>
        <BaseDropdown
          :modelValue="props.modelStatus"
          :options="statusOptions"
          widthClass="w-full"
          :showClear="false"
          @update:modelValue="emit('update:modelStatus', $event)"
        />
      </div>

      <div class="min-w-0">
        <label class="block text-sm text-slate-600 mb-1">Role</label>
        <MultiSelect
          v-model="roleIdsModel"
          class="w-full"
          :options="props.roleOptions"
          optionLabel="label"
          optionValue="value"
          size="small"
          placeholder="Select role"
          filter
          :maxSelectedLabels="2"
        />
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="w-full min-w-0 sm:flex-1 xl:max-w-[320px]">
        <BaseInput
          v-model="searchModel"
          label=""
          size="small"
          class="w-full"
          placeholder="Search..."
        />
      </div>

      <div class="flex justify-end sm:shrink-0">
        <BaseIconButton
          icon="pi pi-filter-slash"
          label="Clear Filters"
          size="small"
          severity="secondary"
          outlined
          @click="emit('clear')"
        />
      </div>
    </div>
  </div>
</template>
