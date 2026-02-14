<template>
  <Button
    type="button"
    :label="label"
    :badge="badge"
    :icon="icon"
    :severity="severity"
    v-bind="badgeSeverity ? { badgeSeverity } : {}"
    :size="size"
    :raised="raised"
    :rounded="rounded"
    :outlined="outlined"
    :text="text"
    :plain="plain"
    :loading="loading"
    :disabled="disabled"
    @click="handleClick"
  />
</template>

<script lang="ts" setup>
import Button from 'primevue/button'

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

const props = withDefaults(
  defineProps<{
    label?: string
    icon?: string
    badge?: string
    severity?: Severity
    badgeSeverity?: Severity
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
