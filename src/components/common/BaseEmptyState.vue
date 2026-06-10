<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const props = defineProps<{
  title?: string
  message?: string
  showLoginButton?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const titleText = computed(() => {
  if (props.title) return props.title
  if (route.name === 'forbidden') return t('restricted.accessRestricted')
  return t('restricted.serverMaintenance')
})

const messageText = computed(() => {
  if (props.message) return props.message
  if (route.name === 'forbidden') return t('restricted.accessRestrictedDetail')
  return t('serverMaintenanceDetail')
})

const showLogin = computed(() => props.showLoginButton !== false)

function goLogin() {
  router.replace({ name: 'login' })
}

function goDashboard() {
  router.replace({ name: 'dashboard' })
}
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="w-full max-w-xl rounded-2xl p-6 flex flex-col items-center">
      <div class="text-4xl font-semibold text-slate-800">{{ titleText }}</div>
      <div class="mt-2 text-md text-slate-600">{{ messageText }}</div>
      <DotLottieVue
        class="login-lottie-background"
        autoplay
        loop
        src="/lottie/access-denied.lottie"
      />

      <div class="mt-6 flex justify-start">
        <BaseIconButton
          :label="t('common.goToDashboard')"
          icon="pi pi-home"
          severity="secondary"
          size="large"
          outlined
          @click="goDashboard"
        />
      </div>
      <div v-if="showLogin" class="mt-6 flex justify-end">
        <BaseButton :label="t('common.goToLogin')" severity="secondary" outlined @click="goLogin" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-lottie-background {
  margin-top: 2rem;
  display: block;
  width: 40vw;
}
</style>
