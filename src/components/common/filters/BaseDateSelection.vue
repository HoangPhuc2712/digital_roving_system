<script setup lang="ts">
import DatePicker from 'primevue/datepicker'
import BaseButton from '../buttons/BaseButton.vue'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const draftDateFrom = ref<SingleDateValue>(props.modelDateFrom)
const draftDateTo = ref<SingleDateValue>(props.modelDateTo)
const rawInputFrom = ref('')
const rawInputTo = ref('')
const fromInputHandler = ref<EventListener | null>(null)
const toInputHandler = ref<EventListener | null>(null)
const fromTimeWheelCleanup = ref<(() => void) | null>(null)
const toTimeWheelCleanup = ref<(() => void) | null>(null)

watch(
  () => props.modelDateFrom,
  (value) => {
    draftDateFrom.value = value
    rawInputFrom.value = ''
  },
)

watch(
  () => props.modelDateTo,
  (value) => {
    draftDateTo.value = value
    rawInputTo.value = ''
  },
)

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

function getPickerInputElement(kind: 'from' | 'to') {
  const container = getPickerContainer(kind)
  return (container?.querySelector('input') as HTMLInputElement | null) ?? null
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

function getDraftValue(kind: 'from' | 'to') {
  return kind === 'from' ? draftDateFrom.value : draftDateTo.value
}

function setDraftValue(kind: 'from' | 'to', value: SingleDateValue) {
  if (kind === 'from') {
    draftDateFrom.value = value
    return
  }

  draftDateTo.value = value
}

function emitDraftValue(kind: 'from' | 'to', value: SingleDateValue) {
  if (kind === 'from') {
    emit('update:modelDateFrom', value)
    return
  }

  emit('update:modelDateTo', value)
}

function getRawInputValue(kind: 'from' | 'to') {
  return kind === 'from' ? rawInputFrom.value : rawInputTo.value
}

function setRawInputValue(kind: 'from' | 'to', value: string) {
  if (kind === 'from') {
    rawInputFrom.value = value
    return
  }

  rawInputTo.value = value
}

function isIncomplete12HourTimeInput(raw: string) {
  if (!props.showTime) return false

  const input = String(raw ?? '').trim()
  if (!input) return false

  const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(.*))?$/)
  if (!match) return false

  const timePart = match[4]
  if (timePart == null) return false

  return !/^\d{2}:\d{2}\s*([AaPp][Mm])$/.test(timePart.trim())
}

function parseDateInput(raw: string, fallback: SingleDateValue): SingleDateValue {
  const input = String(raw ?? '').trim()
  if (!input) return null

  const match = input.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{2}):(\d{2})\s*([AaPp][Mm]))?$/,
  )

  if (!match) return fallback

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  const rawHour = match[4] == null ? null : Number(match[4])
  const rawMinute = match[5] == null ? null : Number(match[5])
  const meridiem = String(match[6] ?? '').toUpperCase()

  if (String(match[3]).length === 2) {
    year += year >= 70 ? 1900 : 2000
  }

  let hours = props.showTime ? (fallback?.getHours?.() ?? 0) : 0
  let minutes = props.showTime ? (fallback?.getMinutes?.() ?? 0) : 0

  if (props.showTime) {
    if (rawHour != null && rawMinute != null) {
      hours = rawHour
      minutes = rawMinute

      if (meridiem) {
        if (hours < 1 || hours > 12) return fallback
        if (meridiem === 'AM') {
          hours = hours === 12 ? 0 : hours
        } else {
          hours = hours === 12 ? 12 : hours + 12
        }
      }
    }
  }

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) {
    return fallback
  }

  if (parsed.getTime() > maxSelectableDate.getTime()) {
    return fallback
  }

  return parsed
}

function applyParsedInputToDraft(kind: 'from' | 'to', rawValue: string) {
  setRawInputValue(kind, rawValue)

  if (isIncomplete12HourTimeInput(rawValue)) {
    return getDraftValue(kind)
  }

  const parsed = parseDateInput(rawValue, getDraftValue(kind))
  if (parsed !== getDraftValue(kind)) {
    setDraftValue(kind, parsed)
  }
  return parsed
}

function onNativeInput(kind: 'from' | 'to', event: Event) {
  const target = event.target as HTMLInputElement | null
  const rawValue = target?.value ?? ''
  applyParsedInputToDraft(kind, rawValue)
}

function attachNativeInputListener(kind: 'from' | 'to') {
  detachNativeInputListener(kind)

  const input = getPickerInputElement(kind)
  if (!input) return

  const handler: EventListener = (event) => onNativeInput(kind, event)
  input.addEventListener('input', handler)

  if (kind === 'from') {
    fromInputHandler.value = handler
  } else {
    toInputHandler.value = handler
  }
}

function detachNativeInputListener(kind: 'from' | 'to') {
  const input = getPickerInputElement(kind)
  const handler = kind === 'from' ? fromInputHandler.value : toInputHandler.value
  if (!input || !handler) return
  input.removeEventListener('input', handler)

  if (kind === 'from') {
    fromInputHandler.value = null
  } else {
    toInputHandler.value = null
  }
}

function getTimeWheelCleanup(kind: 'from' | 'to') {
  return kind === 'from' ? fromTimeWheelCleanup.value : toTimeWheelCleanup.value
}

function setTimeWheelCleanup(kind: 'from' | 'to', cleanup: (() => void) | null) {
  if (kind === 'from') {
    fromTimeWheelCleanup.value = cleanup
    return
  }

  toTimeWheelCleanup.value = cleanup
}

function unbindTimeWheelListeners(kind: 'from' | 'to') {
  getTimeWheelCleanup(kind)?.()
  setTimeWheelCleanup(kind, null)
}

function pressSpinnerButton(button: HTMLButtonElement | null) {
  if (!button || button.disabled) return

  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
}

function clickToggleButton(button: HTMLButtonElement | null) {
  if (!button || button.disabled) return

  button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

function addWheelStepperListener(
  target: HTMLElement | null,
  onWheelUp: () => void,
  onWheelDown: () => void,
) {
  if (!target) return () => {}

  const handler = (event: WheelEvent) => {
    if (props.disabled) return

    if (event.deltaY === 0) return

    event.preventDefault()
    event.stopPropagation()

    if (event.deltaY < 0) {
      onWheelUp()
      return
    }

    onWheelDown()
  }

  target.addEventListener('wheel', handler, { passive: false })

  return () => {
    target.removeEventListener('wheel', handler)
  }
}

function bindTimeWheelListeners(kind: 'from' | 'to') {
  unbindTimeWheelListeners(kind)

  if (!props.showTime) return

  const overlay = getPickerOverlayElement(kind)
  if (!overlay) return

  const buttons = Array.from(
    overlay.querySelectorAll('button[data-pc-group-section="timepickerbutton"]'),
  ) as HTMLButtonElement[]

  if (buttons.length < 4) return

  const hourIncrementButton = buttons[0] ?? null
  const hourDecrementButton = buttons[1] ?? null
  const minuteIncrementButton = buttons[2] ?? null
  const minuteDecrementButton = buttons[3] ?? null

  const ampmIncrementButton = buttons.length >= 6 ? buttons[buttons.length - 2] : null
  const ampmDecrementButton = buttons.length >= 6 ? buttons[buttons.length - 1] : null

  const hourTarget = (hourIncrementButton?.closest('div') as HTMLElement | null) ?? null
  const minuteTarget = (minuteIncrementButton?.closest('div') as HTMLElement | null) ?? null
  const ampmTarget = (ampmIncrementButton?.closest('div') as HTMLElement | null) ?? null

  const cleanups: Array<() => void> = []

  cleanups.push(
    addWheelStepperListener(
      hourTarget,
      () => pressSpinnerButton(hourIncrementButton),
      () => pressSpinnerButton(hourDecrementButton),
    ),
  )

  cleanups.push(
    addWheelStepperListener(
      minuteTarget,
      () => pressSpinnerButton(minuteIncrementButton),
      () => pressSpinnerButton(minuteDecrementButton),
    ),
  )

  if (ampmTarget && ampmIncrementButton && ampmDecrementButton) {
    cleanups.push(
      addWheelStepperListener(
        ampmTarget,
        () => clickToggleButton(ampmIncrementButton),
        () => clickToggleButton(ampmDecrementButton),
      ),
    )
  }

  setTimeWheelCleanup(kind, () => {
    cleanups.forEach((cleanup) => cleanup())
  })
}

async function onPickerShow(kind: 'from' | 'to') {
  await nextTick()
  requestAnimationFrame(() => {
    bindTimeWheelListeners(kind)
  })
}

function onPickerHide(kind: 'from' | 'to') {
  unbindTimeWheelListeners(kind)
}

function onUpdateDateFrom(value: DatePickerValue) {
  const normalized = normalizeDateValue(value)
  draftDateFrom.value = normalized
  rawInputFrom.value = ''
  emit('update:modelDateFrom', normalized)
}

function onUpdateDateTo(value: DatePickerValue) {
  const normalized = normalizeDateValue(value)
  draftDateTo.value = normalized
  rawInputTo.value = ''
  emit('update:modelDateTo', normalized)
}

async function onApply(kind: 'from' | 'to') {
  const input = getPickerInputElement(kind)
  const cachedRawValue = getRawInputValue(kind).trim()
  const currentInputValue = input?.value ?? ''
  const rawValue = cachedRawValue || currentInputValue

  const parsed = applyParsedInputToDraft(kind, rawValue)
  emitDraftValue(kind, parsed)

  await nextTick()
  hidePickerOverlay(kind)
}

function onToday(kind: 'from' | 'to', todayCallback: (event: Event) => void, event: Event) {
  todayCallback(event)

  nextTick(() => {
    const currentDraft = getDraftValue(kind)
    emitDraftValue(kind, currentDraft)
  })
}

onMounted(async () => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  await nextTick()
  attachNativeInputListener('from')
  attachNativeInputListener('to')
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  detachNativeInputListener('from')
  detachNativeInputListener('to')
  unbindTimeWheelListeners('from')
  unbindTimeWheelListeners('to')
})
</script>

<template>
  <div :class="props.wrapperClass">
    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.from') }}</label>
      <div ref="fromPickerContainerRef">
        <DatePicker
          :modelValue="draftDateFrom"
          class="w-full base-date-selection"
          dateFormat="dd/mm/yy"
          :showTime="props.showTime"
          hourFormat="12"
          size="small"
          :manualInput="true"
          showButtonBar
          showIcon
          :appendTo="props.appendTo"
          :disabled="props.disabled"
          :maxDate="maxSelectableDate"
          :placeholder="t('dateFilter.selectStartDate')"
          ref="fromDatePickerRef"
          @update:modelValue="onUpdateDateFrom"
          @show="() => onPickerShow('from')"
          @hide="() => onPickerHide('from')"
        >
          <template #buttonbar="{ todayCallback }">
            <div class="flex w-full items-center justify-between gap-2 px-1 py-1">
              <BaseButton
                :label="t('common.today')"
                size="small"
                severity="secondary"
                outlined
                @click="(event) => onToday('from', todayCallback, event)"
              />
              <BaseButton
                :label="t('common.apply')"
                size="small"
                severity="info"
                @click="() => onApply('from')"
              />
            </div>
          </template>
        </DatePicker>
      </div>
    </div>

    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">{{ t('dateFilter.to') }}</label>
      <div ref="toPickerContainerRef">
        <DatePicker
          :modelValue="draftDateTo"
          class="w-full base-date-selection"
          dateFormat="dd/mm/yy"
          :showTime="props.showTime"
          hourFormat="12"
          size="small"
          :manualInput="true"
          showButtonBar
          showIcon
          :appendTo="props.appendTo"
          :disabled="props.disabled"
          :maxDate="maxSelectableDate"
          :placeholder="t('dateFilter.selectEndDate')"
          ref="toDatePickerRef"
          @update:modelValue="onUpdateDateTo"
          @show="() => onPickerShow('to')"
          @hide="() => onPickerHide('to')"
        >
          <template #buttonbar="{ todayCallback }">
            <div class="flex w-full items-center justify-between gap-2 px-1 py-1">
              <BaseButton
                :label="t('common.today')"
                size="small"
                severity="secondary"
                outlined
                @click="(event) => onToday('to', todayCallback, event)"
              />
              <BaseButton
                :label="t('common.apply')"
                size="small"
                severity="info"
                @click="() => onApply('to')"
              />
            </div>
          </template>
        </DatePicker>
      </div>
    </div>
  </div>
</template>
