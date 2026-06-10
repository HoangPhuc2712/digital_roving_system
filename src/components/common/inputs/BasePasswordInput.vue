<template>
  <div class="w-full">
    <FloatLabel variant="on" class="w-full">
      <Password
        :id="inputId"
        v-model="model"
        :toggleMask="toggleMask"
        :feedback="feedback"
        :placeholder="placeholder"
        :disabled="disabled"
        :size="size"
        class="w-full"
        :inputClass="passwordInputClass"
        :class="{ 'p-invalid': hasErrorComputed }"
        :invalid="hasErrorComputed"
      />
      <label :for="inputId">{{ label }}</label>
    </FloatLabel>

    <BaseMessage
      style="margin: 8px 0px"
      :hasError="hasErrorComputed"
      severity="error"
      :size="size"
      variant="simple"
      :message="message"
      :icon="messageIcon"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FloatLabel from 'primevue/floatlabel'
import Password from 'primevue/password'
import BaseMessage from '../messages/BaseMessage.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    placeholder?: string
    size?: string
    toggleMask?: boolean
    feedback?: boolean
    disabled?: boolean
    id?: string
    hasError?: boolean
    message?: string
    messageIcon?: string
  }>(),
  {
    toggleMask: true,
    feedback: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const inputId = computed(() => props.id ?? `password-${Math.random().toString(36).slice(2, 9)}`)

const hasErrorComputed = computed(() => props.hasError ?? false)

const passwordInputClass = computed(() => ['w-full', { 'p-invalid': hasErrorComputed.value }])
</script>
