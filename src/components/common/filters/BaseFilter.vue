<script setup lang="ts">
import { computed } from 'vue'

import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseDropdown from '@/components/common/filters/BaseDropdown.vue'
import BaseDateSelection from '@/components/common/filters/BaseDateSelection.vue'

type FilterDropdownItem = {
  key: string
  label: string
  modelValue: any
  options: any[]
  optionLabel?: string
  optionValue?: string
  placeholder?: string
  showClear?: boolean
  filter?: boolean
  disabled?: boolean
  widthClass?: string
}

const props = withDefaults(
  defineProps<{
    dropdowns?: FilterDropdownItem[]
    modelSearch?: string
    showSearch?: boolean
    searchPlaceholder?: string
    modelDateFrom?: Date | null
    modelDateTo?: Date | null
    showDateSelection?: boolean
    clearDisabled?: boolean
    searchWidthClass?: string
    dateInputWidthClass?: string
  }>(),
  {
    dropdowns: () => [],
    modelSearch: '',
    showSearch: true,
    searchPlaceholder: 'Search...',
    modelDateFrom: null,
    modelDateTo: null,
    showDateSelection: false,
    clearDisabled: false,
    searchWidthClass: 'w-full md:w-[320px]',
    dateInputWidthClass: 'w-full md:w-[280px]',
  },
)

const emit = defineEmits<{
  (e: 'update:dropdown', payload: { key: string; value: any }): void
  (e: 'update:modelSearch', value: string): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'clear'): void
}>()

const searchModel = computed({
  get: () => props.modelSearch ?? '',
  set: (value: string) => emit('update:modelSearch', value),
})
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
    <div v-if="props.dropdowns.length" class="flex flex-wrap gap-3 items-end">
      <div v-for="item in props.dropdowns" :key="item.key">
        <label class="block text-sm text-slate-600 mb-1">{{ item.label }}</label>
        <BaseDropdown
          :modelValue="item.modelValue"
          :options="item.options"
          :optionLabel="item.optionLabel"
          :optionValue="item.optionValue"
          :placeholder="item.placeholder"
          :showClear="item.showClear"
          :filter="item.filter"
          :disabled="item.disabled"
          :widthClass="item.widthClass"
          @update:modelValue="emit('update:dropdown', { key: item.key, value: $event })"
        />
      </div>
    </div>

    <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
      <div class="flex flex-wrap gap-3 items-end">
        <BaseDateSelection
          v-if="props.showDateSelection"
          :modelDateFrom="props.modelDateFrom ?? null"
          :modelDateTo="props.modelDateTo ?? null"
          :inputWidthClass="props.dateInputWidthClass"
          @update:modelDateFrom="emit('update:modelDateFrom', $event)"
          @update:modelDateTo="emit('update:modelDateTo', $event)"
        />

        <div v-if="props.showSearch" :class="props.searchWidthClass">
          <BaseInput
            v-model="searchModel"
            label=""
            size="small"
            class="w-full"
            :placeholder="props.searchPlaceholder"
          />
        </div>
      </div>

      <div class="flex xl:justify-end">
        <BaseIconButton
          icon="pi pi-filter-slash"
          label="Clear Filters"
          size="small"
          severity="secondary"
          outlined
          :disabled="props.clearDisabled"
          @click="emit('clear')"
        />
      </div>
    </div>
  </div>
</template>
