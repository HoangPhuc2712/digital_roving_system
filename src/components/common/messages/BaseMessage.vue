<template>
  <div>
    <Message
      :style="style"
      v-if="hasError && message"
      :severity="severity"
      :icon="icon"
      :variant="variant"
      :size="size"
      >{{ message }}</Message
    >
  </div>
</template>

<script setup lang="ts">
import Message from 'primevue/message'
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    style?: string | CSSProperties
    severity?: string
    icon?: string
    variant?: string
    size?: string
    message?: string
    hasError?: boolean
  }>(),
  {
    hasError: false,
  },
)
</script>
