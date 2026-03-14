<script setup lang="ts">
import DatePicker from 'primevue/datepicker'

type SingleDateValue = Date | null
type DatePickerValue = Date | Date[] | (Date | null)[] | null | undefined

const props = withDefaults(
  defineProps<{
    modelDateFrom: SingleDateValue
    modelDateTo: SingleDateValue
    inputWidthClass?: string
    showTime?: boolean
    disabled?: boolean
  }>(),
  {
    inputWidthClass: 'w-full md:w-[280px]',
    showTime: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelDateFrom', value: SingleDateValue): void
  (e: 'update:modelDateTo', value: SingleDateValue): void
}>()

function normalizeDateValue(value: DatePickerValue): SingleDateValue {
  return value instanceof Date ? value : null
}

function onUpdateDateFrom(value: DatePickerValue) {
  emit('update:modelDateFrom', normalizeDateValue(value))
}

function onUpdateDateTo(value: DatePickerValue) {
  emit('update:modelDateTo', normalizeDateValue(value))
}
</script>

<template>
  <div class="flex flex-wrap gap-3 items-end">
    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">From</label>
      <DatePicker
        :modelValue="props.modelDateFrom"
        class="w-full base-date-selection"
        dateFormat="dd/mm/yy"
        :showTime="props.showTime"
        hourFormat="12"
        size="small"
        :manualInput="false"
        showButtonBar
        showIcon
        :disabled="props.disabled"
        placeholder="Select start date"
        @update:modelValue="onUpdateDateFrom"
      />
    </div>

    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">To</label>
      <DatePicker
        :modelValue="props.modelDateTo"
        class="w-full base-date-selection"
        dateFormat="dd/mm/yy"
        :showTime="props.showTime"
        hourFormat="12"
        size="small"
        :manualInput="false"
        showButtonBar
        showIcon
        :disabled="props.disabled"
        placeholder="Select end date"
        @update:modelValue="onUpdateDateTo"
      />
    </div>
  </div>
</template>
