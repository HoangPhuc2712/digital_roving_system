<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import ChangePasswordForm from '@/modules/users/components/ChangePasswordForm.vue'
import {
  fetchUserById,
  changeCurrentUserPassword,
  validateCurrentUserPassword,
} from '@/modules/users/users.api'
import { useAuthStore } from '@/stores/auth.store'
import { translateRoleName } from '@/utils/dataI18n'

const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const changingPassword = ref(false)
const changePasswordVisible = ref(false)

const currentPasswordInvalid = ref(false)
const userInfo = ref<{
  user_name: string
  user_code: string
  area_name: string
  role_name: string
} | null>(null)

const userId = computed(() => String(auth.user?.user_id ?? ''))
const userCode = computed(() => String(auth.user?.user_code ?? ''))
const displayRoleName = computed(() =>
  translateRoleName(String(userInfo.value?.role_name ?? ''), t),
)

async function loadUserInfo() {
  if (!userId.value) return

  loading.value = true
  try {
    const user = await fetchUserById(userId.value)
    userInfo.value = user
      ? {
          user_name: String(user.user_name ?? ''),
          user_code: String(user.user_code ?? ''),
          area_name: String(user.area_name ?? ''),
          role_name: String(user.role_name ?? ''),
        }
      : {
          user_name: String(auth.user?.user_name ?? ''),
          user_code: String(auth.user?.user_code ?? ''),
          area_name: '',
          role_name: String(auth.user?.role?.role_name ?? ''),
        }
  } catch {
    userInfo.value = {
      user_name: String(auth.user?.user_name ?? ''),
      user_code: String(auth.user?.user_code ?? ''),
      area_name: '',
      role_name: String(auth.user?.role?.role_name ?? ''),
    }
  } finally {
    loading.value = false
  }
}

function resetCurrentPasswordValidation() {
  currentPasswordInvalid.value = false
}

async function onSubmitChangePassword(payload: { currentPassword: string; newPassword: string }) {
  if (!userId.value || !userCode.value) return

  changingPassword.value = true
  currentPasswordInvalid.value = false

  try {
    await validateCurrentUserPassword({
      user_code: userCode.value,
      current_password: payload.currentPassword,
    })

    const result = await changeCurrentUserPassword({
      user_id: userId.value,
      user_code: userCode.value,
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
      actor_id: userId.value,
    })

    await auth.fetchMe()
    changePasswordVisible.value = false
    toast.add({
      severity: 'success',
      summary: t('common.save'),
      detail: String(result?.message ?? t('userInfo.success.password')),
      life: 2500,
    })
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

onMounted(async () => {
  await loadUserInfo()
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
