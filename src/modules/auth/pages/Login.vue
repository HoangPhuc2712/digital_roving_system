<template>
  <div
    class="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 p-4"
  >
    <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-white">
      <DotLottieVue
        class="login-lottie-background opacity-85"
        autoplay
        loop
        src="/lottie/login-background-7.lottie"
      />
      <div class="absolute inset-0 bg-slate-950/5"></div>
    </div>
    <div class="relative w-full max-w-md">
      <form
        class="w-full p-6 rounded-2xl shadow bg-white border border-slate-200"
        @submit.prevent="onLogin"
      >
        <div class="mb-6 flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <img
              src="/src/styles/logo/JiaHsinLogo.png"
              alt="Jia Hsin"
              class="h-10 w-10 shrink-0 object-contain"
            />
            <div class="min-w-0 leading-tight">
              <p class="truncate text-sm font-bold text-[#0b5ca8]">佳新責任有限公司</p>
              <p class="truncate text-xs font-bold uppercase text-[#0b5ca8]">
                CÔNG TY TNHH JIA HSIN
              </p>
            </div>
          </div>

          <AppLanguageSwitcher class="shrink-0" />
        </div>

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
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

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

<style scoped>
/* .login-lottie-background {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  width: max(100vw, 261.4vh);
  height: max(100vh, 38.26vw);
  transform: translate(-50%, -50%);
} */
.login-lottie-background {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  width: 100%;
  /* height: 38.26vw; */
  /* min-height: 360px; */
  transform: translate(-50%, -50%);
}
</style>
