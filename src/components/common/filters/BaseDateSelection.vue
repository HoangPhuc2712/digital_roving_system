<script setup lang="ts">
import Calendar from 'primevue/calendar'

const props = withDefaults(
  defineProps<{
    modelDateFrom: Date | null
    modelDateTo: Date | null
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
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
}>()
</script>

<template>
  <div class="flex flex-wrap gap-3 items-end">
    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">From</label>
      <Calendar
        :modelValue="props.modelDateFrom"
        class="w-full base-date-selection"
        dateFormat="dd/mm/yy"
        :showTime="props.showTime"
        hourFormat="12"
        :manualInput="false"
        showButtonBar
        showIcon
        :disabled="props.disabled"
        placeholder="Select start date"
        @update:modelValue="emit('update:modelDateFrom', $event)"
      />
    </div>

    <div :class="props.inputWidthClass">
      <label class="block text-sm text-slate-600 mb-1">To</label>
      <Calendar
        :modelValue="props.modelDateTo"
        class="w-full base-date-selection"
        dateFormat="dd/mm/yy"
        :showTime="props.showTime"
        hourFormat="12"
        :manualInput="false"
        showButtonBar
        showIcon
        :disabled="props.disabled"
        placeholder="Select end date"
        @update:modelValue="emit('update:modelDateTo', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.base-date-selection .p-inputtext) {
  min-height: 42px;
  border-radius: 12px;
  font-size: 0.95rem;
}

:deep(.base-date-selection .p-datepicker-trigger) {
  min-width: 2.75rem;
}
</style>
