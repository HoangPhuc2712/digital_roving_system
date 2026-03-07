<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/common/buttons/BaseButton.vue'

const props = defineProps<{
  title?: string
  message?: string
  showLoginButton?: boolean
}>()

const route = useRoute()
const router = useRouter()

const titleText = computed(() => {
  if (props.title) return props.title
  if (route.name === 'forbidden') return 'Access Restricted'
  return 'Server Maintenance'
})

const messageText = computed(() => {
  if (props.message) return props.message
  if (route.name === 'forbidden') return 'You do not have permission to access this page.'
  return 'The server is currently under maintenance. Please try again later.'
})

const showLogin = computed(() => props.showLoginButton !== false)

function goLogin() {
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="min-h-[70vh] flex items-left justify-top p-6">
    <div class="w-full max-w-xl rounded-2xl p-6">
      <div class="text-2xl font-semibold text-slate-800">{{ titleText }}</div>
      <div class="mt-2 text-slate-600">{{ messageText }}</div>

      <div v-if="showLogin" class="mt-6 flex justify-end">
        <BaseButton label="Go to Login" severity="secondary" outlined @click="goLogin" />
      </div>
    </div>
  </div>
</template>
