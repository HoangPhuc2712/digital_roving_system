<script setup lang="ts">
import DatePicker from 'primevue/datepicker'
import { useI18n } from 'vue-i18n'

type SingleDateValue = Date | null
type DatePickerValue = Date | Date[] | (Date | null)[] | null | undefined

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

const maxSelectableDate = endOfToday()

const props = withDefaults(
  defineProps<{
    modelDateFrom: SingleDateValue
    modelDateTo: SingleDateValue
    wrapperClass?: string
    inputWidthClass?: string
    showTime?: boolean
    disabled?: boolean
  }>(),
  {
    wrapperClass: 'flex flex-wrap gap-3 items-end',
    inputWidthClass: 'w-full md:w-[280px]',
    showTime: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelDateFrom', value: SingleDateValue): void
  (e: 'update:modelDateTo', value: SingleDateValue): void
}>()

const { t } = useI18n()

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
  <div :class="props.wrapperClass">
    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.from') }}</label>
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
        :maxDate="maxSelectableDate"
        :placeholder="t('dateFilter.selectStartDate')"
        @update:modelValue="onUpdateDateFrom"
      />
    </div>

    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.to') }}</label>
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
        :maxDate="maxSelectableDate"
        :placeholder="t('dateFilter.selectEndDate')"
        @update:modelValue="onUpdateDateTo"
      />
    </div>
  </div>
</template>
