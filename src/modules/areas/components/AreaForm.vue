<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

import { createAreaMock, updateAreaMock } from '@/modules/areas/areas.api'

export type AreaFormMode = 'new' | 'view' | 'edit'

export type AreaFormModel = {
  area_id?: number
  area_code: string
  area_name: string
  area_status: number
}

type AreaFormState = {
  area_id?: number
  area_code: string
  area_name: string
  area_status: number
}

export type AreaFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: AreaFormMode
  model: AreaFormModel | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: AreaFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')
const title = computed(() =>
  props.mode === 'new' ? 'New Area' : props.mode === 'edit' ? 'Edit Area' : 'Area Detail',
)

const form = reactive<AreaFormState>({
  area_id: undefined,
  area_code: '',
  area_name: '',
  area_status: 1,
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    form.area_id = m.area_id
    form.area_code = m.area_code ?? ''
    form.area_name = m.area_name ?? ''
    form.area_status = m.area_status ?? 1
  },
  { immediate: true },
)

function close() {
  emit('update:visible', false)
  emit('close')
}

function submit() {
  emit('submit', {
    submit: async (actor_id: string) => {
      const code = (form.area_code ?? '').trim()
      const name = (form.area_name ?? '').trim()

      const missing: string[] = []
      if (!code) missing.push('Area Code')
      if (!name) missing.push('Area Name')

      if (missing.length) {
        throw new Error(`MISSING_FIELDS:${missing.join(', ')}`)
      }

      if (props.mode === 'new') {
        await createAreaMock({
          area_code: code,
          area_name: name,
          actor_id,
        })
        return
      }

      if (!form.area_id) throw new Error('AREA_NOT_FOUND')

      await updateAreaMock({
        area_id: form.area_id,
        area_code: code,
        area_name: name,
        area_status: form.area_status,
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
    :style="{ width: '860px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Area Code</label>
          <BaseInput
            v-model="form.area_code"
            label=""
            placeholder="Enter code"
            :disabled="isView"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Area Name</label>
          <BaseInput
            v-model="form.area_name"
            label=""
            placeholder="Enter name"
            :disabled="isView"
          />
        </div>

        <div v-if="!isNew">
          <label class="block text-sm text-slate-600 mb-1">Status</label>
          <Dropdown
            v-model="form.area_status"
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
