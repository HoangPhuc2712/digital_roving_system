<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

import { createRole, updateRole } from '@/modules/roles/roles.api'

export type RoleFormMode = 'new' | 'view' | 'edit'

export type RoleFormModel = {
  role_id?: number
  role_code: string
  role_name: string
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

const toast = useToast()

const isView = computed(() => props.mode === 'view')
const title = computed(() =>
  props.mode === 'new' ? 'Create New Role' : props.mode === 'edit' ? 'Edit Role' : 'Role Detail',
)

const form = reactive<RoleFormModel>({
  role_id: undefined,
  role_code: '',
  role_name: '',
  mc_ids: [],
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    form.role_id = m.role_id
    form.role_code = m.role_code ?? ''
    form.role_name = m.role_name ?? ''
    form.mc_ids = Array.isArray(m.mc_ids) ? [...m.mc_ids] : []
  },
  { immediate: true },
)

const permissionLabels = computed(() => {
  const ids = new Set<number>((form.mc_ids ?? []).map((x) => Number(x)))
  return (props.menuOptions ?? []).filter((x) => ids.has(Number(x.value))).map((x) => x.label)
})

function close() {
  emit('update:visible', false)
  emit('close')
}

function toastError(detail: string) {
  toast.add({ severity: 'error', summary: 'Validation', detail, life: 2500 })
}

function submit() {
  const code = (form.role_code ?? '').trim()
  const name = (form.role_name ?? '').trim()
  const mcIds = Array.isArray(form.mc_ids) ? form.mc_ids : []

  if (!code || !name) {
    toastError('Please fill Role Code and Role Name.')
    return
  }

  if (!mcIds.length) {
    toastError('Please select at least one permission.')
    return
  }

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        await createRole({
          role_code: code,
          role_name: name,
          mc_ids: mcIds,
          actor_id,
        })
      } else {
        if (!form.role_id) throw new Error('ROLE_NOT_FOUND')
        await updateRole({
          role_id: form.role_id,
          role_code: code,
          role_name: name,
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Role Code</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.role_code }}</div>
          <BaseInput v-else v-model="form.role_code" label="" placeholder="Enter code" />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Role Name</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.role_name }}</div>
          <BaseInput v-else v-model="form.role_name" label="" placeholder="Enter name" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Permissions</label>

          <div v-if="isView" class="text-slate-800 font-semibold">
            <span v-if="permissionLabels.length">{{ permissionLabels.join(', ') }}</span>
            <span v-else class="text-slate-500 font-normal">—</span>
          </div>

          <MultiSelect
            v-else
            v-model="form.mc_ids"
            class="w-full"
            :options="menuOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select permissions"
            display="chip"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="danger" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
