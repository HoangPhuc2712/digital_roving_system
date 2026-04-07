<template>
  <Button
    v-if="!imageSrc"
    :label="label"
    :icon="icon"
    :aria-label="resolvedAriaLabel"
    :severity="severity"
    :size="size"
    :raised="raised"
    :rounded="rounded"
    :outlined="outlined"
    :text="text"
    :plain="plain"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click', $event)"
  />

  <Button
    v-else
    :aria-label="resolvedAriaLabel"
    :severity="severity"
    :size="size"
    :raised="raised"
    :rounded="rounded"
    :outlined="outlined"
    :text="text"
    :plain="plain"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span :class="contentClassName">
      <img :src="imageSrc" :alt="resolvedImageAlt" :class="imageClassName" />
      <span v-if="label" class="p-button-label">{{ label }}</span>
    </span>
  </Button>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import Button from 'primevue/button'

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

const props = withDefaults(
  defineProps<{
    label?: string
    icon?: string
    imageSrc?: string
    imageAlt?: string
    imageClass?: string
    contentClass?: string
    ariaLabel?: string
    severity?: Severity
    size?: string
    raised?: boolean
    rounded?: boolean
    outlined?: boolean
    text?: boolean
    plain?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    imageClass: 'h-4 w-4 shrink-0',
    contentClass: 'inline-flex items-center gap-2',
    raised: false,
    rounded: false,
    outlined: false,
    text: false,
    plain: false,
    loading: false,
    disabled: false,
  },
)

const resolvedAriaLabel = computed(() => {
  return props.ariaLabel || props.label || undefined
})

const resolvedImageAlt = computed(() => {
  return props.imageAlt || props.label || ''
})

const imageClassName = computed(() => props.imageClass)
const contentClassName = computed(() => props.contentClass)

defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()
</script>
