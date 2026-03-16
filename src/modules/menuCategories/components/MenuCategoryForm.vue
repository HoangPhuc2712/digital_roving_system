<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseMessage from '@/components/common/messages/BaseMessage.vue'

import { createMenuCategory, updateMenuCategory } from '@/modules/menuCategories/menuCategories.api'

export type MenuCategoryFormMode = 'new' | 'view' | 'edit'

export type MenuCategoryFormModel = {
  mc_id?: number
  mc_code: string
  mc_name: string
  mc_active: boolean
  mc_priority: number
}

export type MenuCategoryFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const props = defineProps<{
  visible: boolean
  mode: MenuCategoryFormMode
  model: MenuCategoryFormModel | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: MenuCategoryFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const title = computed(() =>
  props.mode === 'new'
    ? 'Create New Menu Category'
    : props.mode === 'edit'
      ? 'Edit Menu Category'
      : 'Menu Category Detail',
)

const submitted = ref(false)

const form = reactive<MenuCategoryFormModel>({
  mc_id: undefined,
  mc_code: '',
  mc_name: '',
  mc_active: true,
  mc_priority: 0,
})

const mcNameError = computed(() => submitted.value && !String(form.mc_name ?? '').trim())
const mcPriorityError = computed(() => {
  if (!submitted.value) return false
  const priority = Number(form.mc_priority ?? 0)
  return !Number.isFinite(priority) || priority < 0
})

watch(
  () => props.model,
  (m) => {
    if (!m) return
    submitted.value = false
    form.mc_id = m.mc_id
    form.mc_code = m.mc_code ?? ''
    form.mc_name = m.mc_name ?? ''
    form.mc_active = Boolean(m.mc_active)
    form.mc_priority = Number(m.mc_priority ?? 0)
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

  const name = (form.mc_name ?? '').trim()
  const priority = Number(form.mc_priority ?? 0)

  if (!name) return
  if (!Number.isFinite(priority) || priority < 0) return

  emit('submit', {
    submit: async (actor_id: string) => {
      if (props.mode === 'new') {
        await createMenuCategory({
          mc_name: name,
          mc_active: Boolean(form.mc_active),
          mc_priority: priority,
          actor_id,
        })
        return
      }

      if (!form.mc_id) throw new Error('MENU_CATEGORY_NOT_FOUND')

      await updateMenuCategory({
        mc_id: form.mc_id,
        mc_name: name,
        mc_active: Boolean(form.mc_active),
        mc_priority: priority,
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
      <div v-if="isView" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">MC Code</label>
          <div class="text-slate-800 font-semibold">{{ form.mc_code || '—' }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">MC Name</label>
          <div class="text-slate-800 font-semibold">{{ form.mc_name }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Status</label>
          <div class="text-slate-800 font-semibold">
            {{ form.mc_active ? 'Active' : 'Inactive' }}
          </div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Priority</label>
          <div class="text-slate-800 font-semibold">{{ form.mc_priority }}</div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">MC Name</label>
          <BaseInput
            v-model="form.mc_name"
            label=""
            size="small"
            placeholder="Enter name"
            :hasError="mcNameError"
            message="MC Name is required"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Priority</label>
          <InputNumber
            v-model="form.mc_priority"
            class="w-full"
            size="small"
            :class="{ 'p-invalid': mcPriorityError }"
            :min="0"
            :useGrouping="false"
          />
          <BaseMessage
            style="margin: 8px 0px"
            :hasError="mcPriorityError"
            severity="error"
            size="small"
            variant="simple"
            message="Priority must be greater than or equal to 0"
          />
        </div>

        <div class="md:col-span-2 flex items-center min-h-[42px]">
          <div class="flex items-center gap-2">
            <Checkbox v-model="form.mc_active" inputId="mc-active" binary />
            <label for="mc-active" class="text-sm text-slate-700">Active</label>
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
