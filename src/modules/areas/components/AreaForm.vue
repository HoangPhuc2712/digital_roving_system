<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

import { createAreaMock, updateAreaMock } from '@/modules/areas/areas.api'

export type AreaFormMode = 'new' | 'view' | 'edit'

export type AreaFormModel = {
  area_id?: number
  area_code: string
  area_name: string
}

type AreaFormState = {
  area_id?: number
  area_code: string
  area_name: string
}

export type AreaFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

const { t, locale } = useI18n()
const props = defineProps<{
  visible: boolean
  mode: AreaFormMode
  model: AreaFormModel | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: AreaFormSubmitPayload): void
  (e: 'close'): void
}>()

const isView = computed(() => props.mode === 'view')
const title = computed(() =>
  props.mode === 'new'
    ? t('areaForm.newArea')
    : props.mode === 'edit'
      ? t('areaForm.editArea')
      : t('areaForm.areaDetail'),
)

const isSubmitting = computed(() => submitLocked.value || Boolean(props.loading))

const submitted = ref(false)
const submitLocked = ref(false)

const form = reactive<AreaFormState>({
  area_id: undefined,
  area_code: '',
  area_name: '',
})

const areaCodeError = computed(() => submitted.value && !String(form.area_code ?? '').trim())
const areaNameError = computed(() => submitted.value && !String(form.area_name ?? '').trim())

watch(
  () => props.loading,
  (loading) => {
    if (!loading) {
      submitLocked.value = false
    }
  },
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      submitLocked.value = false
    }
  },
)

watch(
  () => props.model,
  (m) => {
    if (!m) return
    submitted.value = false
    form.area_id = m.area_id
    form.area_code = m.area_code ?? ''
    form.area_name = m.area_name ?? ''
  },
  { immediate: true },
)

function handleDialogVisibleChange(nextVisible: boolean) {
  if (isSubmitting.value) return
  emit('update:visible', nextVisible)
}

function close() {
  submitted.value = false
  submitLocked.value = false
  emit('update:visible', false)
  emit('close')
}

function submit() {
  if (isSubmitting.value) return

  submitted.value = true

  const code = String(form.area_code ?? '').trim()
  const name = String(form.area_name ?? '').trim()

  if (!code || !name) return

  submitLocked.value = true

  emit('submit', {
    submit: async (actor_id: string) => {
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
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    @update:visible="handleDialogVisibleChange"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">{{ t('areaForm.noData') }}.</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">{{ t('areaForm.areaCode') }}</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.area_code }}</div>
          <BaseInput
            v-else
            v-model="form.area_code"
            label=""
            size="small"
            :placeholder="t('areaForm.enterCode')"
            :hasError="areaCodeError"
            :message="t('areaForm.error.areaCodeRequired')"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">{{ t('areaForm.areaName') }}</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.area_name }}</div>
          <BaseInput
            v-else
            v-model="form.area_name"
            label=""
            size="small"
            :placeholder="t('areaForm.enterName')"
            :hasError="areaNameError"
            :message="t('areaForm.error.areaNameRequired')"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton
          :label="t('common.cancel')"
          size="small"
          severity="danger"
          outlined
          :disabled="isSubmitting"
          @click="close"
        />
        <BaseButton
          v-if="!isView"
          :label="t('common.submit')"
          size="small"
          severity="success"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>
