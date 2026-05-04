<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import {
  confirmSessionExpiredDialog,
  setSessionExpiredCountdown,
  useSessionExpiredDialogState,
} from '@/services/sessionExpiredDialog'
import BaseButton from '../common/buttons/BaseButton.vue'

const { t } = useI18n()
const state = useSessionExpiredDialogState()
let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown() {
  clearCountdownTimer()
  setSessionExpiredCountdown(state.seconds)

  if (state.seconds <= 0) {
    void confirmSessionExpiredDialog()
    return
  }

  countdownTimer = setInterval(() => {
    if (state.countdown <= 1) {
      setSessionExpiredCountdown(0)
      clearCountdownTimer()
      void confirmSessionExpiredDialog()
      return
    }

    setSessionExpiredCountdown(state.countdown - 1)
  }, 1000)
}

async function handleOk() {
  clearCountdownTimer()
  await confirmSessionExpiredDialog()
}

watch(
  () => state.visible,
  (visible) => {
    if (visible) {
      startCountdown()
      return
    }

    clearCountdownTimer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearCountdownTimer()
})
</script>

<template>
  <Dialog
    :visible="state.visible"
    modal
    :closable="false"
    :closeOnEscape="false"
    :draggable="false"
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 2rem)' }"
    header="Thông báo"
  >
    <div class="space-y-3 text-slate-700">
      <p class="text-md font-medium text-slate-800">
        {{ t('common.sessionExpired') }} {{ state.countdown }} {{ t('common.second') }}
      </p>
      <p class="text-sm text-slate-500">{{ t('common.loginRequired') }}</p>
    </div>

    <template #footer>
      <BaseButton label="OK" size="small" severity="success" @click="handleOk" />
    </template>
  </Dialog>
</template>
