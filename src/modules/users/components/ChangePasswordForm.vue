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

const { t, locale } = useI18n()
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
    :header="t('changePasswordForm.title')"
    :style="{ width: '720px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
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
            :hasError="currentPasswordError"
            :message="t('changePasswordForm.error.currPasswordRequired')"
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
                : t('changePasswordForm.confirmPasswordRequired')
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
          @click="close"
        />
        <BaseButton
          :label="t('common.submit')"
          size="small"
          severity="success"
          :loading="loading"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>
