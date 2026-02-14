<template>
  <Button
    :label="label"
    v-bind="severity ? { severity } : {}"
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
</template>

<script lang="ts" setup>
import Button from 'primevue/button'

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

const props = withDefaults(
  defineProps<{
    label?: string
    severity?: Severity
    size?: string
    raised?: boolean
    rounded?: boolean
    outlined?: boolean
    text?: boolean
    plain?: boolean
    loading?: boolean
    disabled?: boolean
    onClick?: () => void
  }>(),
  {
    raised: false,
    rounded: false,
    outlined: false,
    text: false,
    plain: false,
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()

function handleClick(ev: MouseEvent) {
  props.onClick?.()
  emit('click', ev)
}
</script>
