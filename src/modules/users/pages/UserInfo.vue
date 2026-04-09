<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import ChangePasswordForm from '@/modules/users/components/ChangePasswordForm.vue'
import { changeCurrentUserPassword } from '@/modules/users/users.api'
import { useAuthStore } from '@/stores/auth.store'
import { translateRoleName } from '@/utils/dataI18n'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()

const loading = computed(() => auth.loading)
const changingPassword = ref(false)
const changePasswordVisible = ref(false)

const currentPasswordInvalid = ref(false)
const userInfo = computed(() => ({
  user_name: String(auth.user?.user_name ?? ''),
  user_code: String(auth.user?.user_code ?? ''),
  area_name: String((auth.user as any)?.area_name ?? ''),
  role_name: String(auth.user?.role?.role_name ?? ''),
}))

const userId = computed(() => String(auth.user?.user_id ?? ''))
const userCode = computed(() => String(auth.user?.user_code ?? ''))
const PASSWORD_CHANGED_LOGOUT_LIFE = 3000
const PASSWORD_CHANGED_LOGOUT_SECONDS = Math.max(1, Math.ceil(PASSWORD_CHANGED_LOGOUT_LIFE / 1000))

let passwordChangedLogoutTimer: number | undefined
let passwordChangedCountdownTimer: number | undefined
const displayRoleName = computed(() =>
  translateRoleName(String(userInfo.value?.role_name ?? ''), t),
)

function resetCurrentPasswordValidation() {
  currentPasswordInvalid.value = false
}

function clearPasswordChangedLogoutCountdown() {
  if (passwordChangedCountdownTimer != null) {
    window.clearInterval(passwordChangedCountdownTimer)
    passwordChangedCountdownTimer = undefined
  }

  if (passwordChangedLogoutTimer != null) {
    window.clearTimeout(passwordChangedLogoutTimer)
    passwordChangedLogoutTimer = undefined
  }
}

function startPasswordChangedLogoutCountdown(successMessage: string) {
  clearPasswordChangedLogoutCountdown()

  const toastMessage = reactive({
    severity: 'success',
    summary: successMessage,
    detail: t('userInfo.success.autoLogout', { seconds: PASSWORD_CHANGED_LOGOUT_SECONDS }),
    life: PASSWORD_CHANGED_LOGOUT_LIFE,
  })

  toast.add(toastMessage)

  let remainingSeconds = PASSWORD_CHANGED_LOGOUT_SECONDS

  passwordChangedCountdownTimer = window.setInterval(() => {
    remainingSeconds -= 1
    if (remainingSeconds <= 0) {
      if (passwordChangedCountdownTimer != null) {
        window.clearInterval(passwordChangedCountdownTimer)
        passwordChangedCountdownTimer = undefined
      }
      return
    }

    toastMessage.detail = t('userInfo.success.autoLogout', { seconds: remainingSeconds })
  }, 1000)

  passwordChangedLogoutTimer = window.setTimeout(async () => {
    clearPasswordChangedLogoutCountdown()
    auth.logout?.()
    await router.replace({ name: 'login' })
  }, PASSWORD_CHANGED_LOGOUT_LIFE)
}

async function onSubmitChangePassword(payload: { currentPassword: string; newPassword: string }) {
  if (!userId.value || !userCode.value) return

  changingPassword.value = true
  currentPasswordInvalid.value = false

  try {
    const result = await changeCurrentUserPassword({
      user_id: userId.value,
      user_code: userCode.value,
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
      actor_id: userId.value,
    })

    changePasswordVisible.value = false
    startPasswordChangedLogoutCountdown(String(result?.message ?? t('userInfo.success.password')))
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    const lower = msg.toLowerCase()

    if (lower.includes('mật khẩu') || lower.includes('password')) {
      currentPasswordInvalid.value = true
      return
    }

    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: msg || t('userInfo.error.password'),
      life: 3500,
    })
  } finally {
    changingPassword.value = false
  }
}

watch(changePasswordVisible, (visible) => {
  if (!visible) resetCurrentPasswordValidation()
})
</script>

<template>
  <div class="space-y-4">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('userInfo.title') }}</div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}...</div>

      <div v-else class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div class="text-sm text-slate-500 mb-1">{{ t('userInfo.userName') }}</div>
            <div class="text-lg text-slate-800 font-semibold">{{ userInfo?.user_name || '-' }}</div>
          </div>

          <div>
            <div class="text-sm text-slate-500 mb-1">{{ t('userInfo.userCode') }}</div>
            <div class="text-lg text-slate-800 font-semibold">{{ userInfo?.user_code || '-' }}</div>
          </div>

          <div>
            <div class="text-sm text-slate-500 mb-1">{{ t('userInfo.area') }}</div>
            <div class="text-lg text-slate-800 font-semibold">{{ userInfo?.area_name || '-' }}</div>
          </div>

          <div>
            <div class="text-sm text-slate-500 mb-1">{{ t('userInfo.role') }}</div>
            <div class="text-lg text-slate-800 font-semibold">
              {{ userInfo?.role_name ? displayRoleName : '-' }}
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200">
          <BaseButton
            :label="t('userInfo.changePassword')"
            severity="secondary"
            @click="changePasswordVisible = true"
          />
        </div>
      </div>
    </div>

    <ChangePasswordForm
      v-model:visible="changePasswordVisible"
      :loading="changingPassword"
      :currentPasswordInvalid="currentPasswordInvalid"
      @current-password-input="resetCurrentPasswordValidation"
      @submit="onSubmitChangePassword"
    />
  </div>
</template>
