<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md p-6 rounded-2xl shadow bg-white">
      <h1 class="text-2xl text-gray-700 font-semibold mb-1 flex justify-center">
        Digital Patrol System
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth.store'
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
    await auth.login(code.value.trim(), password.value)
    await router.push({ name: 'reports' })
  } catch (e: any) {
    const msg =
      e?.message === 'USER_NOT_FOUND'
        ? 'User not found'
        : e?.message === 'INVALID_PASSWORD'
          ? 'Invalid password'
          : 'Login failed'

    toast.add({ severity: 'error', summary: 'Login', detail: msg, life: 2500 })
  }
}
</script>
