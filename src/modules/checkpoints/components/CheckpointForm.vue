<script setup lang="ts">
import { computed, reactive, watch, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

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
  cp_status: number
}

type FormState = {
  cp_id?: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority_text: string
  area_id: number
  cp_status: number
}

export type CheckpointFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: CheckpointFormMode
  model: CheckpointFormModel | null
  areaOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: CheckpointFormSubmitPayload): void
  (e: 'close'): void
}>()

const qrFileEl = ref<HTMLInputElement | null>(null)

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')

const title = computed(() =>
  props.mode === 'new'
    ? 'New Scan Point'
    : props.mode === 'edit'
      ? 'Edit Scan Point'
      : 'Scan Point Detail',
)

const form = reactive<FormState>({
  cp_id: undefined,
  cp_code: '',
  cp_name: '',
  cp_qr: '',
  cp_description: '',
  cp_priority_text: '1',
  area_id: 0,
  cp_status: 1,
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    form.cp_id = m.cp_id
    form.cp_code = m.cp_code ?? ''
    form.cp_name = m.cp_name ?? ''
    form.cp_qr = m.cp_qr ?? ''
    form.cp_description = m.cp_description ?? ''
    form.cp_priority_text = String(m.cp_priority ?? 1)
    form.area_id = Number(m.area_id ?? props.areaOptions[0]?.value ?? 0)
    form.cp_status = Number(m.cp_status ?? 1)
  },
  { immediate: true },
)

function close() {
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

function openQrPicker() {
  qrFileEl.value?.click()
}

async function fileToDataUrl(f: File) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(new Error('READ_FILE_FAILED'))
    r.readAsDataURL(f)
  })
}

async function onChooseQr(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const f = files[0]
  if (!f) return
  form.cp_qr = await fileToDataUrl(f)
}

function submit() {
  emit('submit', {
    submit: async (actor_id: string) => {
      const code = (form.cp_code ?? '').trim()
      const name = (form.cp_name ?? '').trim()
      const desc = (form.cp_description ?? '').trim()
      const areaId = Number(form.area_id ?? 0)
      const priority = Number(form.cp_priority_text ?? 0)
      const qr = (form.cp_qr ?? '').trim()

      const missing: string[] = []
      if (!code) missing.push('Scan Point Code')
      if (!name) missing.push('Scan Point Name')
      if (!areaId) missing.push('Area')

      if (missing.length) {
        throw new Error(`MISSING_FIELDS:${missing.join(', ')}`)
      }

      if (!Number.isFinite(priority) || priority < 1) {
        throw new Error('PRIORITY_MIN_1')
      }

      if (props.mode === 'new' && !qr) throw new Error('MISSING_QR')

      if (props.mode === 'new') {
        await createCheckpointMock({
          cp_code: code,
          cp_name: name,
          cp_qr: qr,
          cp_description: desc,
          cp_priority: priority,
          area_id: areaId,
          actor_id,
        })
        return
      }

      if (!form.cp_id) throw new Error('CHECKPOINT_NOT_FOUND')

      await updateCheckpointMock({
        cp_id: form.cp_id,
        cp_code: code,
        cp_name: name,
        cp_qr: qr,
        cp_description: desc,
        cp_priority: priority,
        area_id: areaId,
        cp_status: form.cp_status,
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-slate-600 mb-1">Scan Point Code</label>
              <BaseInput
                v-model="form.cp_code"
                label=""
                placeholder="Enter code"
                :disabled="isView"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Scan Point Name</label>
              <BaseInput
                v-model="form.cp_name"
                label=""
                placeholder="Enter name"
                :disabled="isView"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm text-slate-600 mb-1">Description</label>
              <BaseInput
                v-model="form.cp_description"
                label=""
                placeholder="Enter description"
                :disabled="isView"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Area</label>
              <Dropdown
                v-model="form.area_id"
                class="w-full"
                :options="areaOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select area"
                :disabled="isView"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Priority</label>
              <BaseInput
                v-model="form.cp_priority_text"
                label=""
                placeholder="Enter priority"
                :disabled="isView"
              />
            </div>

            <div v-if="!isNew">
              <label class="block text-sm text-slate-600 mb-1">Status</label>
              <Dropdown
                v-model="form.cp_status"
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

          <div>
            <label class="block text-sm text-slate-600 mb-1">QR Image</label>

            <div class="flex items-center gap-3">
              <input
                v-if="!isView"
                ref="qrFileEl"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onChooseQr"
              />
              <BaseButton
                v-if="!isView"
                label="Choose QR"
                severity="secondary"
                outlined
                @click="openQrPicker"
              />
              <div class="text-xs text-slate-500">
                {{ form.cp_qr ? 'QR selected' : 'No QR selected' }}
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="border border-slate-200 rounded-xl p-3 bg-white">
            <div class="text-sm font-medium text-slate-700 mb-2">Preview</div>
            <QrPreview :value="normalizeQr(form.cp_qr)" />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="secondary" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
