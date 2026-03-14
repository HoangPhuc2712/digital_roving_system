<script setup lang="ts">
import { computed } from 'vue'
import Select from 'primevue/select'

const props = withDefaults(
  defineProps<{
    modelValue: any
    options: any[]
    optionLabel?: string
    optionValue?: string
    placeholder?: string
    showClear?: boolean
    filter?: boolean
    disabled?: boolean
    widthClass?: string
  }>(),
  {
    optionLabel: 'label',
    optionValue: 'value',
    placeholder: 'All',
    showClear: true,
    filter: false,
    disabled: false,
    widthClass: 'w-full md:w-[280px]',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <div :class="props.widthClass">
    <Select
      v-model="model"
      class="w-full base-dropdown"
      size="small"
      :options="props.options"
      :optionLabel="props.optionLabel"
      :optionValue="props.optionValue"
      :placeholder="props.placeholder"
      :showClear="props.showClear"
      :filter="props.filter"
      :disabled="props.disabled"
    />
  </div>
</template>

<style scoped>
:deep(.base-dropdown.p-dropdown) {
  min-height: 42px;
  border-radius: 12px;
}

:deep(.base-dropdown .p-dropdown-label) {
  padding: 0.72rem 0.9rem;
  font-size: 0.95rem;
}

:deep(.base-dropdown .p-dropdown-trigger) {
  width: 2.75rem;
}
</style>
