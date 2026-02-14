<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BasePasswordInput from '@/components/common/inputs/BasePasswordInput.vue'

import { createUserMock, updateUserMock } from '@/modules/users/users.api'

export type UserFormMode = 'new' | 'view' | 'edit'

export type UserFormModel = {
  user_id?: string
  user_name: string
  user_code: string
  user_role_id: number
  user_status: number
  user_password?: string
}

type UserFormState = Omit<UserFormModel, 'user_password'> & {
  user_password: string
  confirm_password: string
}

export type UserFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: UserFormMode
  model: UserFormModel | null
  roleOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: UserFormSubmitPayload): void
  (e: 'close'): void
}>()
const toast = useToast()

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')
const title = computed(() =>
  props.mode === 'new' ? 'New User' : props.mode === 'edit' ? 'Edit User' : 'User Detail',
)

const form = reactive<UserFormState>({
  user_id: undefined,
  user_name: '',
  user_code: '',
  user_role_id: 0,
  user_status: 1,
  user_password: '',
  confirm_password: '',
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    form.user_id = m.user_id
    form.user_name = m.user_name ?? ''
    form.user_code = m.user_code ?? ''
    form.user_role_id = m.user_role_id ?? props.roleOptions[0]?.value ?? 0
    form.user_status = m.user_status ?? 1
    form.user_password = ''
    form.confirm_password = ''
  },
  { immediate: true },
)

function close() {
  emit('update:visible', false)
  emit('close')
}

function submit() {
  const name = (form.user_name ?? '').trim()
  const code = (form.user_code ?? '').trim()

  if (!name || !code || !form.user_role_id) {
    toastError(mapValidationError('MISSING_FIELDS'))
    return
  }

  if (props.mode === 'new') {
    const pwd = (form.user_password ?? '').trim()
    const confirmPwd = (form.confirm_password ?? '').trim()

    if (!pwd) {
      toastError(mapValidationError('MISSING_PASSWORD'))
      return
    }
    if (!confirmPwd) {
      toastError(mapValidationError('MISSING_CONFIRM_PASSWORD'))
      return
    }
    if (pwd !== confirmPwd) {
      toastError(mapValidationError('PASSWORD_MISMATCH'))
      return
    }
  }

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        const pwd = (form.user_password ?? '').trim()

        await createUserMock({
          user_name: name,
          user_code: code,
          user_password: pwd,
          user_role_id: form.user_role_id,
          actor_id,
        })
      } else {
        if (!form.user_id) throw new Error('USER_NOT_FOUND')

        await updateUserMock({
          user_id: form.user_id,
          user_name: name,
          user_code: code,
          user_password: (form.user_password ?? '').trim() || undefined, // blank = keep
          user_role_id: form.user_role_id,
          user_status: form.user_status,
          actor_id,
        })
      }
    },
  })
}

function toastError(detail: string) {
  toast.add({
    severity: 'error',
    summary: 'Validation',
    detail,
    life: 2500,
  })
}

function mapValidationError(code: string) {
  switch (code) {
    case 'MISSING_FIELDS':
      return 'Please fill User Name, User Code and Role.'
    case 'MISSING_PASSWORD':
      return 'Please enter Password.'
    case 'MISSING_CONFIRM_PASSWORD':
      return 'Please Confirm your Password.'
    case 'PASSWORD_MISMATCH':
      return 'Confirm Password does not match.'
    default:
      return 'Please check your input.'
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :style="{ width: '860px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">User Name</label>
          <BaseInput
            v-model="form.user_name"
            label=""
            placeholder="Enter Name"
            :disabled="isView"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">User Code</label>
          <BaseInput
            v-model="form.user_code"
            label=""
            placeholder="Enter code"
            :disabled="isView"
          />
        </div>

        <div v-if="!isView">
          <label class="block text-sm text-slate-600 mb-1">Password</label>
          <BasePasswordInput
            v-model="form.user_password"
            :label="isNew ? '' : ''"
            placeholder="Enter password"
            :disabled="isView"
          />
        </div>

        <div v-if="!isView && isNew">
          <label class="block text-sm text-slate-600 mb-1">Confirm Password</label>
          <BasePasswordInput
            v-model="form.confirm_password"
            label=""
            placeholder="Re-enter password"
            :disabled="isView"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <Dropdown
            v-model="form.user_role_id"
            class="w-full"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select role"
            :disabled="isView"
          />
        </div>

        <div v-if="!isNew">
          <label class="block text-sm text-slate-600 mb-1">Status</label>
          <Dropdown
            v-model="form.user_status"
            class="w-full"
            :options="[
              { label: 'Active', value: 1 },
              { label: 'Inactive', value: 0 },
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="Select status"
            :disabled="isView"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="secondary" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
