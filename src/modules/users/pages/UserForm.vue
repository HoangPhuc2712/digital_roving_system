<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'

import { useToast } from 'primevue/usetoast'

import { useUsersStore } from '@/modules/users/users.store'
import { useAuthStore } from '@/stores/auth.store'
import { createUserMock, updateUserMock, fetchUserById } from '@/modules/users/users.api'
// import BasePasswordInput from '@/components/common/inputs/BasePasswordInput.vue'
import { BaseButton } from '@/components/common/buttons'
import { BaseInput, BasePasswordInput } from '@/components/common/inputs'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const store = useUsersStore()
const auth = useAuthStore()

const userName = ref('')
const userCode = ref('')
const password = ref('')
const roleId = ref<number | null>(null)
const status = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE')

const submitting = ref(false)
const loading = ref(false)

const canManage = computed(() => auth.canAccess('users.manage'))

const isEditMode = computed(() => route.name === 'users-edit')
const userId = computed(() => String(route.params.id ?? ''))

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

const pageTitle = computed(() => (isEditMode.value ? 'Edit User' : 'Create User'))

function backToList() {
  router.push({ name: 'users' })
}

function validate() {
  if (!userName.value.trim()) return 'USER_NAME_REQUIRED'
  if (!userCode.value.trim()) return 'USER_CODE_REQUIRED'
  if (!roleId.value) return 'ROLE_REQUIRED'

  if (!isEditMode.value) {
    if (!password.value.trim()) return 'PASSWORD_REQUIRED'
  }

  return ''
}

async function loadEditData() {
  if (!isEditMode.value) return
  if (!userId.value) return

  loading.value = true
  try {
    const u = await fetchUserById(userId.value)
    if (!u) {
      toast.add({
        severity: 'warn',
        summary: 'Not Found',
        detail: 'User not found.',
        life: 2500,
      })
      backToList()
      return
    }

    userName.value = u.user_name ?? ''
    userCode.value = u.user_code ?? ''
    roleId.value = u.user_role_id ?? null
    status.value = u.user_status === 1 ? 'ACTIVE' : 'INACTIVE'
    password.value = ''
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load user.',
      life: 3000,
    })
    backToList()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (store.roleOptions.length === 0) {
    await store.load()
  }
  await loadEditData()
})

async function onSubmit() {
  if (!canManage.value) return

  const err = validate()
  if (err) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail:
        err === 'USER_NAME_REQUIRED'
          ? 'User Name is required.'
          : err === 'USER_CODE_REQUIRED'
            ? 'User Code is required.'
            : err === 'PASSWORD_REQUIRED'
              ? 'Password is required.'
              : 'Role is required.',
      life: 2500,
    })
    return
  }

  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  submitting.value = true
  try {
    if (!isEditMode.value) {
      await createUserMock({
        user_name: userName.value,
        user_code: userCode.value,
        user_password: password.value,
        user_role_id: roleId.value!,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'User has been created.',
        life: 2000,
      })
    } else {
      await updateUserMock({
        user_id: userId.value,
        user_name: userName.value,
        user_code: userCode.value,
        user_password: password.value.trim() ? password.value : undefined,
        user_role_id: roleId.value!,
        user_status: status.value === 'ACTIVE' ? 1 : 0,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'User has been updated.',
        life: 2000,
      })
    }

    await store.load()
    backToList()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        e?.message === 'USER_CODE_EXISTS'
          ? 'User Code already exists.'
          : (e?.message ?? 'Failed to save user.'),
      life: 3000,
    })
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  backToList()
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xl font-semibold text-slate-800">{{ pageTitle }}</div>
    </div>

    <Card>
      <template #content>
        <div v-if="loading" class="text-slate-600">Loading...</div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-slate-600 mb-1">User Name</label>
            <BaseInput v-model="userName" label="" class="w-full" />
          </div>

          <div>
            <label class="block text-sm text-slate-600 mb-1">User Code</label>
            <BaseInput v-model="userCode" label="" class="w-full" />
          </div>

          <div>
            <label class="block text-sm text-slate-600 mb-1">
              Password
              <span v-if="isEditMode" class="text-slate-500">(leave blank to keep)</span>
            </label>
            <BasePasswordInput
              v-model="password"
              label=""
              message="Password is required"
              size="medium"
              :feedback="false"
              :toggleMask="true"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-600 mb-1">Role</label>
            <Dropdown
              v-model="roleId"
              class="w-full"
              :options="store.roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select role"
            />
          </div>

          <div v-if="isEditMode" class="md:col-span-2">
            <label class="block text-sm text-slate-600 mb-1">Status</label>
            <Dropdown
              v-model="status"
              class="w-full md:w-60"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
            />
          </div>
        </div>

        <div class="flex gap-2 justify-end mt-4">
          <BaseButton
            label="Cancel"
            severity="secondary"
            outlined
            :disabled="submitting || loading"
            @click="onCancel"
          />
          <BaseButton
            label="Submit"
            severity="success"
            :disabled="submitting || loading || !canManage"
            @click="onSubmit"
          />
        </div>
      </template>
    </Card>
  </div>
</template>
