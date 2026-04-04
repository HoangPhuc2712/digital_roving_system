<template>
  <div class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
    <BaseIconButton
      v-for="option in options"
      :key="String(option.value)"
      :label="option.label"
      :icon="option.icon"
      :size="size"
      :severity="isSelected(option.value) ? selectedSeverity : unselectedSeverity"
      :outlined="isSelected(option.value) ? false : outlined"
      :disabled="disabled || option.disabled"
      class="!rounded-lg"
      @click="select(option.value)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseIconButton from './BaseIconButton.vue'

export type BaseSelectButtonValue = string | number | boolean | null

export type BaseSelectButtonOption = {
  label: string
  value: BaseSelectButtonValue
  icon?: string
  disabled?: boolean
}

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

const props = withDefaults(
  defineProps<{
    modelValue: BaseSelectButtonValue
    options: BaseSelectButtonOption[]
    size?: string
    disabled?: boolean
    outlined?: boolean
    selectedSeverity?: Severity
    unselectedSeverity?: Severity
  }>(),
  {
    size: 'small',
    disabled: false,
    outlined: true,
    selectedSeverity: 'info',
    unselectedSeverity: 'secondary',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: BaseSelectButtonValue): void
  (e: 'change', value: BaseSelectButtonValue): void
}>()

function isSelected(value: BaseSelectButtonValue) {
  return props.modelValue === value
}

function select(value: BaseSelectButtonValue) {
  if (props.disabled || props.modelValue === value) return
  emit('update:modelValue', value)
  emit('change', value)
}
</script>
