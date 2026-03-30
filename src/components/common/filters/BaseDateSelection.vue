<script setup lang="ts">
import DatePicker from 'primevue/datepicker'
import { onBeforeUnmount, onMounted, ref } from 'vue'
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
    appendTo?: string
  }>(),
  {
    wrapperClass: 'flex flex-wrap gap-3 items-end',
    inputWidthClass: 'w-full md:w-[280px]',
    showTime: true,
    disabled: false,
    appendTo: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:modelDateFrom', value: SingleDateValue): void
  (e: 'update:modelDateTo', value: SingleDateValue): void
}>()

const { t } = useI18n()
const fromDatePickerRef = ref<any>(null)
const toDatePickerRef = ref<any>(null)
const fromPickerContainerRef = ref<HTMLElement | null>(null)
const toPickerContainerRef = ref<HTMLElement | null>(null)

function getPickerContainer(kind: 'from' | 'to') {
  return kind === 'from' ? fromPickerContainerRef.value : toPickerContainerRef.value
}

function getPickerRef(kind: 'from' | 'to') {
  return kind === 'from' ? fromDatePickerRef.value : toDatePickerRef.value
}

function getPickerOverlayElement(kind: 'from' | 'to') {
  const picker = getPickerRef(kind)
  const overlay =
    picker?.overlay ??
    picker?.overlayRef ??
    picker?.panel ??
    picker?.$el?.querySelector?.('.p-datepicker-panel, .p-datepicker-overlay, .p-connected-overlay')

  return (overlay as HTMLElement | null) ?? null
}

function isPickerTriggerTarget(target: HTMLElement | null, container: HTMLElement | null) {
  if (!target || !container) return false

  const trigger = target.closest(
    'input, button, .p-inputtext, .p-datepicker-input-icon-container, .p-datepicker-input-icon, .p-datepicker-dropdown, .p-datepicker-dropdown-icon, .p-inputicon',
  )

  return !!trigger && container.contains(trigger)
}

function isOverlayVisible(kind: 'from' | 'to') {
  const picker = getPickerRef(kind)
  const container = getPickerContainer(kind)
  const overlay = getPickerOverlayElement(kind)

  return Boolean(picker?.overlayVisible ?? picker?.d_overlayVisible ?? overlay)
}

function hidePickerOverlay(kind: 'from' | 'to') {
  const picker = getPickerRef(kind)

  if (typeof picker?.hideOverlay === 'function') {
    picker.hideOverlay()
  }

  if (typeof picker?.hide === 'function') {
    picker.hide()
  }

  if (picker && 'overlayVisible' in picker) {
    picker.overlayVisible = false
  }

  if (picker && 'd_overlayVisible' in picker) {
    picker.d_overlayVisible = false
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null

  if (!target) return
  ;(['from', 'to'] as const).forEach((kind) => {
    if (!isOverlayVisible(kind)) return

    const container = getPickerContainer(kind)
    const overlay = getPickerOverlayElement(kind)

    if (overlay?.contains(target)) return
    if (isPickerTriggerTarget(target, container)) return

    hidePickerOverlay(kind)
  })
}

function normalizeDateValue(value: DatePickerValue): SingleDateValue {
  return value instanceof Date ? value : null
}

function onUpdateDateFrom(value: DatePickerValue) {
  emit('update:modelDateFrom', normalizeDateValue(value))
}

function onUpdateDateTo(value: DatePickerValue) {
  emit('update:modelDateTo', normalizeDateValue(value))
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<template>
  <div :class="props.wrapperClass">
    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.from') }}</label>
      <div ref="fromPickerContainerRef">
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
          :appendTo="props.appendTo"
          :disabled="props.disabled"
          :maxDate="maxSelectableDate"
          :placeholder="t('dateFilter.selectStartDate')"
          ref="fromDatePickerRef"
          @update:modelValue="onUpdateDateFrom"
        />
      </div>
    </div>

    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.to') }}</label>
      <div ref="toPickerContainerRef">
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
          :appendTo="props.appendTo"
          :disabled="props.disabled"
          :maxDate="maxSelectableDate"
          :placeholder="t('dateFilter.selectEndDate')"
          ref="toDatePickerRef"
          @update:modelValue="onUpdateDateTo"
        />
      </div>
    </div>
  </div>
</template>
