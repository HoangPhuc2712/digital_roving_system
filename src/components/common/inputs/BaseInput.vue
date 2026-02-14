<template>
  <div class="w-full">
    <FloatLabel variant="on" class="w-full">
      <IconField v-if="inputIcon" class="w-full">
        <InputIcon :class="inputIcon" />
        <InputText
          :id="inputId"
          v-model="model"
          autocomplete="off"
          :disabled="disabled"
          :placeholder="placeholder"
          :size="size"
          class="w-full"
          :class="{ 'p-invalid': hasErrorComputed }"
        />
      </IconField>

      <InputText
        v-else
        :id="inputId"
        v-model="model"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="placeholder"
        :size="size"
        class="w-full"
        :class="{ 'p-invalid': hasErrorComputed }"
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
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import BaseMessage from '../messages/baseMessage.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    inputIcon?: string
    id?: string
    disabled?: boolean
    placeholder?: string
    size?: string
    hasError?: boolean
    message?: string
    messageIcon?: string
  }>(),
  {
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

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2, 9)}`)

const hasErrorComputed = computed(() => props.hasError ?? false)
</script>
