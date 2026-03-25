<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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
    searchPlaceholder: '',
    modelDateFrom: null,
    modelDateTo: null,
    showDateSelection: false,
    clearDisabled: false,
    searchWidthClass: 'w-full xl:w-[320px]',
    dateInputWidthClass: 'w-full min-w-0 xl:w-[280px] xl:flex-none',
  },
)

const emit = defineEmits<{
  (e: 'update:dropdown', payload: { key: string; value: any }): void
  (e: 'update:modelSearch', value: string): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'clear'): void
}>()

const { t } = useI18n()

const searchModel = computed({
  get: () => props.modelSearch ?? '',
  set: (value: string) => emit('update:modelSearch', value),
})

const dropdownGridClass = computed(() => {
  const count = props.dropdowns.length

  if (count <= 1) {
    return 'grid-cols-1 xl:grid-cols-2'
  }

  if (count === 2) {
    return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
  }

  if (count === 3) {
    return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
  }

  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
})

const desktopControlClass = computed(() => {
  if (props.showDateSelection && props.showSearch) {
    return 'grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:flex xl:flex-wrap xl:items-end'
  }

  return 'grid-cols-1 xl:flex xl:flex-wrap xl:items-end'
})

const showInlineClearWithSingleDropdown = computed(() => {
  return props.dropdowns.length === 1 && !props.showSearch && !props.showDateSelection
})
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
    <div
      v-if="props.dropdowns.length"
      class="grid gap-3 items-end"
      :class="
        showInlineClearWithSingleDropdown
          ? 'grid-cols-1 md:grid-cols-[minmax(0,50%)_auto]'
          : dropdownGridClass
      "
    >
      <div v-for="item in props.dropdowns" :key="item.key" class="min-w-0">
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
          widthClass="w-full"
          @update:modelValue="emit('update:dropdown', { key: item.key, value: $event })"
        />
      </div>
      <div
        v-if="showInlineClearWithSingleDropdown"
        class="hidden md:flex md:shrink-0 md:justify-end"
      >
        <BaseIconButton
          icon="pi pi-filter-slash"
          :label="t('common.clearFilters')"
          size="small"
          severity="secondary"
          outlined
          :disabled="props.clearDisabled"
          @click="emit('clear')"
        />
      </div>
    </div>

    <div class="space-y-3 md:hidden">
      <BaseDateSelection
        v-if="props.showDateSelection"
        :modelDateFrom="props.modelDateFrom ?? null"
        :modelDateTo="props.modelDateTo ?? null"
        wrapperClass="grid grid-cols-1 gap-3 items-end sm:grid-cols-2"
        inputWidthClass="w-full min-w-0"
        @update:modelDateFrom="emit('update:modelDateFrom', $event)"
        @update:modelDateTo="emit('update:modelDateTo', $event)"
      />

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div v-if="props.showSearch" class="w-full min-w-0 sm:flex-1">
          <BaseInput
            v-model="searchModel"
            label=""
            size="small"
            class="w-full"
            :placeholder="props.searchPlaceholder || t('common.searchPlaceholder')"
          />
        </div>

        <div class="flex justify-end sm:shrink-0 sm:justify-start">
          <BaseIconButton
            icon="pi pi-filter-slash"
            :label="t('common.clearFilters')"
            size="small"
            severity="secondary"
            outlined
            :disabled="props.clearDisabled"
            @click="emit('clear')"
          />
        </div>
      </div>
    </div>

    <div
      v-if="!showInlineClearWithSingleDropdown"
      class="hidden md:flex md:items-end md:justify-between md:gap-3"
    >
      <div class="grid gap-3 items-end flex-1 min-w-0" :class="desktopControlClass">
        <div v-if="props.showDateSelection" class="min-w-0">
          <BaseDateSelection
            :modelDateFrom="props.modelDateFrom ?? null"
            :modelDateTo="props.modelDateTo ?? null"
            wrapperClass="grid grid-cols-2 gap-3 items-end xl:flex xl:flex-wrap xl:items-end"
            :inputWidthClass="props.dateInputWidthClass"
            @update:modelDateFrom="emit('update:modelDateFrom', $event)"
            @update:modelDateTo="emit('update:modelDateTo', $event)"
          />
        </div>

        <div v-if="props.showSearch" :class="props.searchWidthClass" class="min-w-0">
          <BaseInput
            v-model="searchModel"
            label=""
            inputIcon="pi pi-search"
            size="small"
            class="w-full"
            :placeholder="props.searchPlaceholder || t('common.searchPlaceholder')"
          />
        </div>
      </div>

      <div class="flex shrink-0 justify-end">
        <BaseIconButton
          icon="pi pi-filter-slash"
          :label="t('common.clearFilters')"
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
