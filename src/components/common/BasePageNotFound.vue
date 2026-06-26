<script setup lang="ts">
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const router = useRouter()
const { t } = useI18n()

function goDashboard() {
  router.replace({ name: 'dashboard' })
}
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="w-full max-w-xl rounded-2xl p-6 flex flex-col items-center">
      <!-- <div class="text-5xl font-semibold text-slate-800">404</div>
      <div class="mt-2 text-lg text-slate-600">{{ t('restricted.status404Detail') }}.</div> -->
      <DotLottieVue
        class="login-lottie-background"
        autoplay
        loop
        src="/lottie/404-not-found.lottie"
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
    </div>
  </div>
</template>
<style scoped>
.login-lottie-background {
  margin-top: 2rem;
  display: block;
  width: 60vw;
}
</style>
