<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import MultiSelect from 'primevue/multiselect'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseMessage from '@/components/common/messages/BaseMessage.vue'

import { createRole, updateRole } from '@/modules/roles/roles.api'

export type RoleFormMode = 'new' | 'view' | 'edit'

export type RoleFormModel = {
  role_id?: number
  role_code: string
  role_name: string
  role_hour_report: boolean
  role_is_admin: boolean
  mc_ids: number[]
}

export type RoleFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: RoleFormMode
  model: RoleFormModel | null
  menuOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: RoleFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const title = computed(() =>
  props.mode === 'new' ? 'Create New Role' : props.mode === 'edit' ? 'Edit Role' : 'Role Detail',
)

const submitted = ref(false)

const form = reactive<RoleFormModel>({
  role_id: undefined,
  role_code: '',
  role_name: '',
  role_hour_report: false,
  role_is_admin: false,
  mc_ids: [],
})

const roleNameError = computed(() => submitted.value && !String(form.role_name ?? '').trim())
const permissionsError = computed(
  () => submitted.value && (!Array.isArray(form.mc_ids) || form.mc_ids.length === 0),
)

watch(
  () => props.model,
  (m) => {
    if (!m) return

    submitted.value = false
    form.role_id = m.role_id
    form.role_code = m.role_code ?? ''
    form.role_name = m.role_name ?? ''
    form.role_hour_report = Boolean(m.role_hour_report)
    form.role_is_admin = Boolean(m.role_is_admin)
    form.mc_ids = Array.isArray(m.mc_ids) ? [...m.mc_ids] : []
  },
  { immediate: true },
)

const permissionLabels = computed(() => {
  const ids = new Set<number>((form.mc_ids ?? []).map((x) => Number(x)))
  return (props.menuOptions ?? []).filter((x) => ids.has(Number(x.value))).map((x) => x.label)
})

function close() {
  submitted.value = false
  emit('update:visible', false)
  emit('close')
}

function submit() {
  submitted.value = true

  const name = String(form.role_name ?? '').trim()
  const mcIds = Array.isArray(form.mc_ids) ? form.mc_ids : []

  if (!name || !mcIds.length) return

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        await createRole({
          role_name: name,
          role_hour_report: Boolean(form.role_hour_report),
          role_is_admin: Boolean(form.role_is_admin),
          mc_ids: mcIds,
          actor_id,
        })
      } else {
        if (!form.role_id) throw new Error('ROLE_NOT_FOUND')
        await updateRole({
          role_id: form.role_id,
          role_name: name,
          role_hour_report: Boolean(form.role_hour_report),
          role_is_admin: Boolean(form.role_is_admin),
          mc_ids: mcIds,
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
      <div v-if="isView" class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Role Code</label>
          <div class="text-slate-800 font-semibold">{{ form.role_code || '—' }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Role Name</label>
          <div class="text-slate-800 font-semibold">{{ form.role_name }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Administration Permission</label>
          <div class="text-slate-800 font-semibold">
            {{ form.role_is_admin ? 'Yes' : 'No' }}
          </div>
        </div>

        <div class="md:col-span-3">
          <label class="block text-sm text-slate-600 mb-1">Permissions</label>
          <div class="text-slate-800 font-semibold">
            <span v-if="permissionLabels.length">{{ permissionLabels.join(', ') }}</span>
            <span v-else class="text-slate-500 font-normal">—</span>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Role Name</label>
          <BaseInput
            v-model="form.role_name"
            label=""
            size="small"
            placeholder="Enter name"
            :hasError="roleNameError"
            message="Role Name is required"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Access Permissions</label>
          <MultiSelect
            v-model="form.mc_ids"
            class="w-full"
            :class="{ 'p-invalid': permissionsError }"
            :options="menuOptions"
            optionLabel="label"
            size="small"
            optionValue="value"
            placeholder="Select access permissions"
            display="chip"
          />
          <BaseMessage
            style="margin: 8px 0px"
            :hasError="permissionsError"
            severity="error"
            size="small"
            variant="simple"
            message="Please select at least one access permission"
          />
        </div>

        <div class="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center min-h-[42px]">
          <div class="flex items-center gap-2 bg-transparent">
            <Checkbox v-model="form.role_hour_report" inputId="role-hour-report" binary />
            <label for="role-hour-report" class="text-sm text-slate-700">
              Hour Report Permission
            </label>
          </div>

          <div class="flex items-center gap-2 bg-transparent">
            <Checkbox v-model="form.role_is_admin" inputId="role-is-admin" binary />
            <label for="role-is-admin" class="text-sm text-slate-700">
              Administration Permission
            </label>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="danger" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
