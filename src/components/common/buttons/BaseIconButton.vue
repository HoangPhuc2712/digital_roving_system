<template>
  <Button
    v-if="!imageSrc"
    :label="label"
    :icon="icon"
    :type="type"
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
    :pt="buttonPt"
    @click="handleClick"
  />

  <Button
    v-else
    :type="type"
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
    @click="handleClick"
  >
    <span :class="contentClassName">
      <img :src="imageSrc" :alt="resolvedImageAlt" :class="imageClassName" />
      <span v-if="label" :class="labelClassName">{{ label }}</span>
      <i v-if="trailingIcon" :class="trailingIconClassName" aria-hidden="true"></i>
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
    iconClass?: string
    imageSrc?: string
    imageAlt?: string
    imageClass?: string
    trailingIcon?: string
    trailingIconClass?: string
    contentClass?: string
    labelClass?: string
    ariaLabel?: string
    type?: 'button' | 'submit' | 'reset'
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
const labelClassName = computed(() =>
  ['p-button-label', props.labelClass].filter(Boolean).join(' '),
)
const trailingIconClassName = computed(() =>
  [props.trailingIcon, props.trailingIconClass].filter(Boolean).join(' '),
)

const iconClassName = computed(() => {
  return [props.icon, props.iconClass].filter(Boolean).join(' ')
})

const buttonPt = computed(() => {
  const iconClass = iconClassName.value
  const labelClass = props.labelClass

  if (!iconClass && !labelClass) return undefined

  return {
    ...(iconClass
      ? {
          icon: {
            class: iconClass,
          },
        }
      : {}),
    ...(labelClass
      ? {
          label: {
            class: labelClass,
          },
        }
      : {}),
  }
})

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()

function handleClick(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur()
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  emit('click', event)
}
</script>
