import { reactive, readonly } from 'vue'

type SessionExpiredConfirmHandler = () => void | Promise<void>

type ShowSessionExpiredDialogOptions = {
  seconds?: number
  onConfirm?: SessionExpiredConfirmHandler
}

const DEFAULT_COUNTDOWN_SECONDS = 3

const state = reactive({
  visible: false,
  countdown: DEFAULT_COUNTDOWN_SECONDS,
  seconds: DEFAULT_COUNTDOWN_SECONDS,
  onConfirm: null as SessionExpiredConfirmHandler | null,
})

export function useSessionExpiredDialogState() {
  return readonly(state)
}

export function setSessionExpiredCountdown(value: number) {
  state.countdown = Math.max(0, Math.trunc(value))
}

export function showSessionExpiredDialog(options: ShowSessionExpiredDialogOptions = {}) {
  const seconds = Math.max(0, Math.trunc(options.seconds ?? DEFAULT_COUNTDOWN_SECONDS))

  state.seconds = seconds
  state.countdown = seconds
  state.onConfirm = options.onConfirm ?? null
  state.visible = true
}

export async function confirmSessionExpiredDialog() {
  const onConfirm = state.onConfirm

  state.visible = false
  state.onConfirm = null

  await onConfirm?.()
}
