<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BasePasswordInput from '@/components/common/inputs/BasePasswordInput.vue'

export type ChangePasswordSubmitPayload = {
  currentPassword: string
  newPassword: string
}

const props = defineProps<{
  visible: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', payload: ChangePasswordSubmitPayload): void
  (e: 'close'): void
}>()

const submitted = ref(false)
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})

const currentPasswordError = computed(
  () => submitted.value && !String(form.currentPassword ?? '').trim(),
)
const newPasswordError = computed(() => submitted.value && !String(form.newPassword ?? '').trim())
const confirmPasswordError = computed(
  () => submitted.value && !String(form.confirmNewPassword ?? '').trim(),
)
const passwordMismatchError = computed(
  () =>
    submitted.value &&
    !!String(form.newPassword ?? '').trim() &&
    !!String(form.confirmNewPassword ?? '').trim() &&
    form.newPassword !== form.confirmNewPassword,
)
const samePasswordError = computed(
  () =>
    submitted.value &&
    !!String(form.currentPassword ?? '').trim() &&
    !!String(form.newPassword ?? '').trim() &&
    form.currentPassword === form.newPassword,
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      submitted.value = false
      form.currentPassword = ''
      form.newPassword = ''
      form.confirmNewPassword = ''
    }
  },
)

function close() {
  submitted.value = false
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmNewPassword = ''
  emit('update:visible', false)
  emit('close')
}

function submit() {
  submitted.value = true

  const currentPassword = String(form.currentPassword ?? '').trim()
  const newPassword = String(form.newPassword ?? '').trim()
  const confirmNewPassword = String(form.confirmNewPassword ?? '').trim()

  if (!currentPassword || !newPassword || !confirmNewPassword) return
  if (newPassword !== confirmNewPassword) return
  if (currentPassword === newPassword) return

  emit('submit', { currentPassword, newPassword })
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Change Password"
    :style="{ width: '720px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Your Current Password</label>
          <BasePasswordInput
            v-model="form.currentPassword"
            label=""
            size="small"
            placeholder="Enter your current password"
            :hasError="currentPasswordError"
            message="Current Password is required"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Your New Password</label>
          <BasePasswordInput
            v-model="form.newPassword"
            label=""
            size="small"
            placeholder="Enter your new password"
            :hasError="newPasswordError || samePasswordError"
            :message="
              samePasswordError
                ? 'New Password must be different from Current Password'
                : 'New Password is required'
            "
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Confirm New Password</label>
          <BasePasswordInput
            v-model="form.confirmNewPassword"
            label=""
            size="small"
            placeholder="Confirm your new password"
            :hasError="confirmPasswordError || passwordMismatchError"
            :message="
              passwordMismatchError
                ? 'Confirm New Password does not match'
                : 'Confirm New Password is required'
            "
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="danger" outlined @click="close" />
        <BaseButton label="Confirm" severity="success" :loading="loading" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
