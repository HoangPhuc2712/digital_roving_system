<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import InputNumber from 'primevue/inputnumber'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseMessage from '@/components/common/messages/BaseMessage.vue'

import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'
import { createCheckpointMock, updateCheckpointMock } from '@/modules/checkpoints/checkpoints.api'

export type CheckpointFormMode = 'new' | 'view' | 'edit'

export type CheckpointFormModel = {
  cp_id?: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  area_id: number
  role_ids: number[]
  role_names?: string[]
}

type FormState = {
  cp_id?: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  area_id: number
  role_ids: number[]
}

export type CheckpointFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: CheckpointFormMode
  model: CheckpointFormModel | null
  areaOptions: { label: string; value: number }[]
  roleOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: CheckpointFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')

const title = computed(() =>
  props.mode === 'new'
    ? 'New Check Point'
    : props.mode === 'edit'
      ? 'Edit Check Point'
      : 'Check Point Detail',
)

const submitted = ref(false)

const form = reactive<FormState>({
  cp_id: undefined,
  cp_code: '',
  cp_name: '',
  cp_qr: '',
  cp_description: '',
  cp_priority: 1,
  area_id: 0,
  role_ids: [],
})

const cpNameError = computed(() => submitted.value && !String(form.cp_name ?? '').trim())
const areaError = computed(() => submitted.value && !Number(form.area_id ?? 0))
const roleError = computed(
  () => submitted.value && (!Array.isArray(form.role_ids) || form.role_ids.length === 0),
)
const priorityError = computed(() => {
  if (!submitted.value) return false
  const priority = Number(form.cp_priority ?? 0)
  return !Number.isFinite(priority) || priority < 1
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    submitted.value = false
    form.cp_id = m.cp_id
    form.cp_code = m.cp_code ?? ''
    form.cp_name = m.cp_name ?? ''
    form.cp_qr = m.cp_qr ?? ''
    form.cp_description = m.cp_description ?? ''
    form.cp_priority = m.cp_priority ?? 1
    form.area_id = Number(m.area_id ?? props.areaOptions[0]?.value ?? 0)
    form.role_ids = Array.isArray(m.role_ids) ? [...m.role_ids] : []
  },
  { immediate: true },
)

const areaLabel = computed(() => {
  return (
    props.areaOptions.find((x) => x.value === form.area_id)?.label ?? String(form.area_id ?? '')
  )
})

const roleLabels = computed(() => {
  if (props.model?.role_names?.length) return props.model.role_names

  const map = new Map(props.roleOptions.map((x) => [x.value, x.label]))
  return form.role_ids.map((id) => map.get(id) ?? String(id))
})

function close() {
  submitted.value = false
  emit('update:visible', false)
  emit('close')
}

function normalizeQr(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}

function submit() {
  submitted.value = true

  const name = (form.cp_name ?? '').trim()
  const desc = (form.cp_description ?? '').trim()
  const areaId = Number(form.area_id ?? 0)
  const priority = Number(form.cp_priority ?? 0)
  const roleIds = (form.role_ids ?? []).map((x) => Number(x)).filter((x) => x > 0)

  if (!name || !areaId || !roleIds.length) return
  if (!Number.isFinite(priority) || priority < 1) return

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        await createCheckpointMock({
          cp_name: name,
          cp_description: desc,
          cp_priority: priority,
          area_id: areaId,
          role_ids: roleIds,
          actor_id,
        })
        return
      }

      if (!form.cp_id) throw new Error('CHECKPOINT_NOT_FOUND')

      await updateCheckpointMock({
        cp_id: form.cp_id,
        cp_name: name,
        cp_description: desc,
        cp_priority: priority,
        area_id: areaId,
        role_ids: roleIds,
        actor_id,
      })
    },
  })
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :style="{ width: '980px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '72vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-if="isView">
          <label class="block text-sm text-slate-600 mb-1">Check Point Code</label>
          <div class="text-slate-800 font-semibold">{{ form.cp_code }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Check Point Name</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.cp_name }}</div>
          <BaseInput
            v-else
            v-model="form.cp_name"
            label=""
            size="small"
            placeholder="Enter name"
            :hasError="cpNameError"
            message="Check Point Name is required"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <div v-if="isView" class="text-slate-800 font-semibold">
            {{ roleLabels.length ? roleLabels.join(', ') : '—' }}
          </div>
          <template v-else>
            <MultiSelect
              v-model="form.role_ids"
              class="w-full"
              :class="{ 'p-invalid': roleError }"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              size="small"
              placeholder="Select role"
              display="chip"
              filter
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

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Description</label>
          <div v-if="isView" class="text-slate-800 font-semibold">
            {{ form.cp_description || '—' }}
          </div>
          <BaseInput
            v-else
            v-model="form.cp_description"
            label=""
            size="small"
            placeholder="Enter description"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Area</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ areaLabel }}</div>
          <template v-else>
            <Select
              v-model="form.area_id"
              class="w-full"
              :class="{ 'p-invalid': areaError }"
              :options="areaOptions"
              optionLabel="label"
              optionValue="value"
              size="small"
              placeholder="Select area"
              disabled
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

        <div>
          <label class="block text-sm text-slate-600 mb-1">Priority</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.cp_priority }}</div>
          <template v-else>
            <InputNumber
              v-model="form.cp_priority"
              class="w-full"
              :class="{ 'p-invalid': priorityError }"
              size="small"
              :min="1"
              :step="1"
              showButtons
              buttonLayout="horizontal"
              decrementButtonIcon="pi pi-minus"
              incrementButtonIcon="pi pi-plus"
            />
            <BaseMessage
              style="margin: 8px 0px"
              :hasError="priorityError"
              severity="error"
              size="small"
              variant="simple"
              message="Priority must be greater than or equal to 1"
            />
          </template>
        </div>
      </div>

      <div>
        <label class="block text-sm text-slate-600 mb-2">QR Image</label>

        <div class="mb-3">
          <QrPreview v-if="normalizeQr(form.cp_qr)" :value="normalizeQr(form.cp_qr)" :size="72" />
          <div v-else class="text-sm text-slate-500">
            {{ isNew ? 'QR will be generated after saving.' : 'No QR available.' }}
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
