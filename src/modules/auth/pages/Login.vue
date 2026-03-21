<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="relative w-full max-w-md">
      <div class="absolute -top-14 right-0">
        <AppLanguageSwitcher />
      </div>

      <form class="w-full p-6 rounded-2xl shadow bg-white" @submit.prevent="onLogin">
        <h1 class="text-2xl text-gray-700 font-semibold mb-1 flex justify-center">
          {{ t('login.title') }}
        </h1>

        <div class="space-y-4 mt-6">
          <BaseInput
            v-model="code"
            :label="t('login.userCode')"
            :hasError="submitted && !code.trim()"
            :message="t('login.userCodeRequired')"
            size="medium"
          />

          <BasePasswordInput
            v-model="password"
            :label="t('login.password')"
            :hasError="submitted && !password"
            :message="t('login.passwordRequired')"
            size="medium"
            :feedback="false"
            :toggleMask="true"
          />

          <BaseButton
            class="w-full"
            :label="t('login.button')"
            :loading="auth.loading"
            @click="onLogin"
          />
          <button type="submit" class="hidden" aria-hidden="true"></button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import AppLanguageSwitcher from '@/components/app/AppLanguageSwitcher.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { BaseInput, BasePasswordInput } from '@/components/common/inputs'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const code = ref('')
const password = ref('')
const submitted = ref(false)

async function onLogin() {
  submitted.value = true
  if (!code.value.trim() || !password.value) return

  try {
    auth.clearSession()
    await auth.login(code.value.trim(), password.value)
    await router.push({ name: 'dashboard' })
  } catch (e: any) {
    auth.clearSession()
    const msg =
      e?.message === 'USER_NOT_FOUND'
        ? t('login.errors.userNotFound')
        : e?.message === 'INVALID_PASSWORD'
          ? t('login.errors.invalidPassword')
          : e?.message === 'USER_INACTIVE'
            ? t('login.errors.inactive')
            : t('login.errors.failed')

    toast.add({ severity: 'error', summary: t('login.toastTitle'), detail: msg, life: 2500 })
  }
}
</script>
