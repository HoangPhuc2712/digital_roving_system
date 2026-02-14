<template>
  <ButtonGroup>
    <Button
      v-for="(btn, index) in buttons"
      :key="index"
      :label="btn.label"
      :icon="btn.icon"
      :severity="btn.severity"
      :size="btn.size"
      :raised="btn.raised"
      :rounded="btn.rounded"
      :outlined="btn.outlined"
      :text="btn.text"
      :plain="btn.plain"
      :loading="btn.loading"
      :disabled="btn.disabled"
      @click="btn.onClick"
    />
  </ButtonGroup>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

interface GroupButton {
  label?: string
  icon?: string
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
}

defineProps<{
  buttons: GroupButton[]
}>()
</script>
