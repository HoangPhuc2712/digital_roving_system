<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <form class="w-full max-w-md p-6 rounded-2xl shadow bg-white" @submit.prevent="onLogin">
      <h1 class="text-2xl text-gray-700 font-semibold mb-1 flex justify-center">
        Internal Patrol System
      </h1>

      <div class="space-y-4 mt-6">
        <BaseInput
          v-model="code"
          label="User Code"
          :hasError="submitted && !code.trim()"
          message="User Code is required"
          size="medium"
        />

        <BasePasswordInput
          v-model="password"
          label="Password"
          :hasError="submitted && !password"
          message="Password is required"
          size="medium"
          :feedback="false"
          :toggleMask="true"
        />

        <BaseButton class="w-full" label="Login" :loading="auth.loading" @click="onLogin" />
        <button type="submit" class="hidden" aria-hidden="true"></button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { BaseInput, BasePasswordInput } from '@/components/common/inputs'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

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
        ? 'User not found'
        : e?.message === 'INVALID_PASSWORD'
          ? 'Invalid password'
          : e?.message === 'USER_INACTIVE'
            ? 'Your account is not activated'
            : 'Login failed'

    toast.add({ severity: 'error', summary: 'Login', detail: msg, life: 2500 })
  }
}
</script>
