<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BasePasswordInput from '@/components/common/inputs/BasePasswordInput.vue'

export type ChangePasswordSubmitPayload = {
  currentPassword: string
  newPassword: string
}

const { t } = useI18n()
const props = defineProps<{
  visible: boolean
  loading?: boolean
  currentPasswordInvalid?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', payload: ChangePasswordSubmitPayload): void
  (e: 'close'): void
  (e: 'current-password-input', value: string): void
}>()

const submitted = ref(false)
const submitLocked = ref(false)
const isSubmitting = computed(() => submitLocked.value || Boolean(props.loading))

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})

const currentPasswordError = computed(
  () => submitted.value && !String(form.currentPassword ?? '').trim(),
)
const newPasswordError = computed(() => submitted.value && !String(form.newPassword ?? '').trim())

const currentPasswordHasError = computed(
  () => currentPasswordError.value || Boolean(props.currentPasswordInvalid),
)
const currentPasswordMessage = computed(() =>
  props.currentPasswordInvalid
    ? t('changePasswordForm.error.currentPasswordIncorrect')
    : t('changePasswordForm.error.currPasswordRequired'),
)

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
  () => props.loading,
  (loading) => {
    if (!loading) {
      submitLocked.value = false
    }
  },
)

watch(
  () => form.currentPassword,
  (value) => {
    emit('current-password-input', value)
  },
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      submitted.value = false
      submitLocked.value = false
      form.currentPassword = ''
      form.newPassword = ''
      form.confirmNewPassword = ''
    }
  },
)

function handleDialogVisibleChange(nextVisible: boolean) {
  if (isSubmitting.value) return
  emit('update:visible', nextVisible)
}

function close() {
  submitted.value = false
  submitLocked.value = false
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmNewPassword = ''
  emit('update:visible', false)
  emit('close')
}

function submit() {
  if (isSubmitting.value) return

  submitted.value = true

  const currentPassword = String(form.currentPassword ?? '').trim()
  const newPassword = String(form.newPassword ?? '').trim()
  const confirmNewPassword = String(form.confirmNewPassword ?? '').trim()

  if (!currentPassword || !newPassword || !confirmNewPassword) return
  if (newPassword !== confirmNewPassword) return
  if (currentPassword === newPassword) return
  submitLocked.value = true
  emit('submit', { currentPassword, newPassword })
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('changePasswordForm.title')"
    :style="{ width: '720px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    @update:visible="handleDialogVisibleChange"
    @hide="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">{{
            t('changePasswordForm.currentPassword')
          }}</label>
          <BasePasswordInput
            v-model="form.currentPassword"
            label=""
            size="small"
            :placeholder="t('changePasswordForm.entercurrent')"
            :hasError="currentPasswordHasError"
            :message="currentPasswordMessage"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">{{
            t('changePasswordForm.newPassword')
          }}</label>
          <BasePasswordInput
            v-model="form.newPassword"
            label=""
            size="small"
            :placeholder="t('changePasswordForm.enterNew')"
            :hasError="newPasswordError || samePasswordError"
            :message="
              samePasswordError
                ? t('changePasswordForm.error.passwordRepeatable')
                : t('changePasswordForm.error.newPasswordRequired')
            "
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">{{
            t('changePasswordForm.confirmPassword')
          }}</label>
          <BasePasswordInput
            v-model="form.confirmNewPassword"
            label=""
            size="small"
            :placeholder="t('changePasswordForm.enterConfirm')"
            :hasError="confirmPasswordError || passwordMismatchError"
            :message="
              passwordMismatchError
                ? t('changePasswordForm.error.passwordMismatch')
                : t('changePasswordForm.error.confirmPasswordRequired')
            "
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton
          :label="t('common.cancel')"
          size="small"
          severity="danger"
          outlined
          :disabled="isSubmitting"
          @click="close"
        />
        <BaseButton
          :label="t('common.submit')"
          size="small"
          severity="success"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>
