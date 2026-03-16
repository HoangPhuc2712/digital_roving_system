<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BasePasswordInput from '@/components/common/inputs/BasePasswordInput.vue'
import BaseMessage from '@/components/common/messages/BaseMessage.vue'

import { createUserMock, updateUserMock } from '@/modules/users/users.api'

export type UserFormMode = 'new' | 'view' | 'edit'

export type UserFormModel = {
  user_id?: string
  user_name: string
  user_code: string
  user_role_id: number
  user_area_id: number
  user_password?: string
}

type UserFormState = Omit<UserFormModel, 'user_password'> & {
  user_password: string
}

export type UserFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: UserFormMode
  model: UserFormModel | null
  roleOptions: { label: string; value: number }[]
  areaOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: UserFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')
const title = computed(() =>
  props.mode === 'new' ? 'Create New User' : props.mode === 'edit' ? 'Edit User' : 'User Detail',
)

const submitted = ref(false)

const form = reactive<UserFormState>({
  user_id: undefined,
  user_name: '',
  user_code: '',
  user_role_id: 0,
  user_area_id: 0,
  user_password: '',
})

const roleLabel = computed(() => {
  return (
    props.roleOptions.find((x) => x.value === form.user_role_id)?.label ??
    String(form.user_role_id ?? '')
  )
})

const areaLabel = computed(() => {
  return (
    props.areaOptions.find((x) => x.value === form.user_area_id)?.label ??
    String(form.user_area_id ?? '')
  )
})

const userNameError = computed(() => submitted.value && !String(form.user_name ?? '').trim())
const userCodeError = computed(() => submitted.value && !String(form.user_code ?? '').trim())
const passwordError = computed(
  () => submitted.value && isNew.value && !String(form.user_password ?? '').trim(),
)
const roleError = computed(() => submitted.value && !Number(form.user_role_id ?? 0))
const areaError = computed(() => submitted.value && !Number(form.user_area_id ?? 0))

watch(
  () => props.model,
  (m) => {
    if (!m) return

    submitted.value = false
    form.user_id = m.user_id
    form.user_name = m.user_name ?? ''
    form.user_code = m.user_code ?? ''
    form.user_role_id = Number(m.user_role_id ?? 0)
    form.user_area_id = Number(m.user_area_id ?? 0)
    form.user_password = ''
  },
  { immediate: true },
)

function close() {
  submitted.value = false
  emit('update:visible', false)
  emit('close')
}

function submit() {
  submitted.value = true

  const name = String(form.user_name ?? '').trim()
  const code = String(form.user_code ?? '').trim()
  const roleId = Number(form.user_role_id ?? 0)
  const areaId = Number(form.user_area_id ?? 0)

  if (!name || !code || !roleId || !areaId) return

  if (props.mode === 'new') {
    const pwd = String(form.user_password ?? '').trim()
    if (!pwd) return
  }

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        await createUserMock({
          user_name: name,
          user_code: code,
          user_password: String(form.user_password ?? '').trim(),
          user_role_id: roleId,
          user_area_id: areaId,
          actor_id,
        })
      } else {
        if (!form.user_id) throw new Error('USER_NOT_FOUND')

        await updateUserMock({
          user_id: form.user_id,
          user_name: name,
          user_code: code,
          user_password: String(form.user_password ?? '').trim() || undefined,
          user_role_id: roleId,
          user_area_id: areaId,
          actor_id,
        })
      }
    },
  })
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
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.user_name }}</div>
          <BaseInput
            v-else
            v-model="form.user_name"
            label=""
            size="small"
            placeholder="Enter Name"
            :hasError="userNameError"
            message="User Name is required"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">User Code</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.user_code }}</div>
          <BaseInput
            v-else
            v-model="form.user_code"
            label=""
            size="small"
            placeholder="Enter code"
            :hasError="userCodeError"
            message="User Code is required"
          />
        </div>

        <div v-if="!isView" class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Password</label>
          <BasePasswordInput
            v-model="form.user_password"
            label=""
            size="small"
            placeholder="Enter password"
            :hasError="passwordError"
            :message="isNew ? 'Password is required' : ''"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <div v-if="isView" class="text-slate-800 font-semibold">
            {{ roleLabel }}
          </div>
          <template v-else>
            <Select
              v-model="form.user_role_id"
              class="w-full"
              :class="{ 'p-invalid': roleError }"
              :options="roleOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              placeholder="Select role"
            />
            <BaseMessage
              style="margin: 8px 0px"
              :hasError="roleError"
              severity="error"
              size="small"
              variant="simple"
              message="Role is required"
            />
          </template>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Area</label>
          <div v-if="isView" class="text-slate-800 font-semibold">
            {{ areaLabel }}
          </div>
          <template v-else>
            <Select
              v-model="form.user_area_id"
              class="w-full"
              :class="{ 'p-invalid': areaError }"
              :options="areaOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              placeholder="Select area"
            />
            <BaseMessage
              style="margin: 8px 0px"
              :hasError="areaError"
              severity="error"
              size="small"
              variant="simple"
              message="Area is required"
            />
          </template>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="danger" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
