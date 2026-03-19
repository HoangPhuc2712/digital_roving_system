<script setup lang="ts">
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goDashboard() {
  router.replace({ name: 'dashboard' })
}
</script>

<template>
  <div class="min-h-[70vh] flex items-left justify-top p-6">
    <div class="w-full max-w-xl rounded-2xl p-6">
      <div class="text-2xl font-semibold text-slate-800">404 NOT FOUND</div>
      <div class="mt-2 text-slate-600">This page doesn't seem to exist.</div>

      <div class="mt-6 flex justify-start">
        <BaseButton
          label="Go to Dashboard"
          severity="secondary"
          size="large"
          outlined
          @click="goDashboard"
        />
      </div>
    </div>
  </div>
</template>
