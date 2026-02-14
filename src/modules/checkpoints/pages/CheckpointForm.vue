<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'

import { useToast } from 'primevue/usetoast'

import { useAuthStore } from '@/stores/auth.store'
import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import {
  fetchAreaOptions,
  fetchCheckpointById,
  createCheckpointMock,
  updateCheckpointMock,
} from '@/modules/checkpoints/checkpoints.api'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const auth = useAuthStore()
const store = useCheckpointsStore()

const canManage = computed(() => auth.canAccess('checkpoints.manage'))

const isEditMode = computed(() => route.name === 'checkpoints-edit')
const cpId = computed(() => Number(route.params.id ?? 0))

const loading = ref(false)
const submitting = ref(false)

const cpCode = ref('')
const cpName = ref('')
const areaId = ref<number | null>(null)
const description = ref('')
const priority = ref<number>(1)
const qrImage = ref<string>('')

const status = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE')
const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

const pageTitle = computed(() => (isEditMode.value ? 'Edit Scan Point' : 'Create Scan Point'))

function backToList() {
  router.push({ name: 'checkpoints' })
}

function normalizeQrToDataUrl(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  // nếu là base64 trần:
  return `data:image/png;base64,${s}`
}

const fileInputRef = ref<HTMLInputElement | null>(null)

function clickChooseQr() {
  fileInputRef.value?.click()
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('READ_FILE_FAILED'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}

async function onChooseQr(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.item(0) ?? null
  input.value = ''
  if (!file) return

  const dataUrl = await fileToDataUrl(file)
  qrImage.value = dataUrl
}

function validate() {
  if (!cpCode.value.trim()) return 'CP_CODE_REQUIRED'
  if (!cpName.value.trim()) return 'CP_NAME_REQUIRED'
  if (areaId.value == null) return 'AREA_REQUIRED'
  if (!description.value.trim()) return 'DESC_REQUIRED'
  if (!priority.value || priority.value <= 0) return 'PRIORITY_REQUIRED'
  if (!qrImage.value.trim()) return 'QR_REQUIRED'
  return ''
}

async function loadInit() {
  if (store.areaOptions.length === 0) {
    store.areaOptions = await fetchAreaOptions()
  }

  if (!isEditMode.value) return

  if (!cpId.value) {
    backToList()
    return
  }

  loading.value = true
  try {
    const cp = await fetchCheckpointById(cpId.value)
    if (!cp) {
      toast.add({
        severity: 'warn',
        summary: 'Not Found',
        detail: 'Scan point not found.',
        life: 2500,
      })
      backToList()
      return
    }

    cpCode.value = cp.cp_code ?? ''
    cpName.value = cp.cp_name ?? ''
    areaId.value = cp.area_id ?? null
    description.value = cp.cp_description ?? ''
    priority.value = cp.cp_priority ?? 1
    qrImage.value = normalizeQrToDataUrl(cp.cp_qr ?? '')
    status.value = cp.cp_status === 1 ? 'ACTIVE' : 'INACTIVE'
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load.',
      life: 3000,
    })
    backToList()
  } finally {
    loading.value = false
  }
}

onMounted(loadInit)

async function onSubmit() {
  if (!canManage.value) return

  const err = validate()
  if (err) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail:
        err === 'CP_CODE_REQUIRED'
          ? 'Scan Point Code is required.'
          : err === 'CP_NAME_REQUIRED'
            ? 'Scan Point Name is required.'
            : err === 'AREA_REQUIRED'
              ? 'Area is required.'
              : err === 'DESC_REQUIRED'
                ? 'Description is required.'
                : err === 'PRIORITY_REQUIRED'
                  ? 'Priority must be greater than 0.'
                  : 'QR Image is required.',
      life: 2500,
    })
    return
  }

  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  submitting.value = true
  try {
    if (!isEditMode.value) {
      await createCheckpointMock({
        cp_code: cpCode.value,
        cp_name: cpName.value,
        area_id: areaId.value!,
        cp_description: description.value,
        cp_priority: priority.value,
        cp_qr: qrImage.value,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Scan point has been created.',
        life: 2000,
      })
    } else {
      await updateCheckpointMock({
        cp_id: cpId.value,
        cp_code: cpCode.value,
        cp_name: cpName.value,
        area_id: areaId.value!,
        cp_description: description.value,
        cp_priority: priority.value,
        cp_qr: qrImage.value,
        cp_status: status.value === 'ACTIVE' ? 1 : 0,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Scan point has been updated.',
        life: 2000,
      })
    }

    await store.load()
    backToList()
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        msg === 'CHECKPOINT_CODE_EXISTS_IN_AREA'
          ? 'This scan point code already exists in the selected area.'
          : msg || 'Failed to save scan point.',
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

        <div v-else class="flex flex-col min-h-[260px]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-slate-600 mb-1">Scan Point Code</label>
              <BaseInput v-model="cpCode" label="" class="w-full" />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Scan Point Name</label>
              <BaseInput v-model="cpName" label="" class="w-full" />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Area</label>
              <Dropdown
                v-model="areaId"
                class="w-full"
                :options="store.areaOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select area"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Priority</label>
              <InputNumber v-model="priority" class="w-full" :min="1" :useGrouping="false" />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm text-slate-600 mb-1">Description</label>
              <BaseInput v-model="description" label="" class="w-full" rows="3" autoResize />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm text-slate-600 mb-1">QR Image</label>

              <div class="flex items-center gap-3">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onChooseQr"
                />
                <BaseButton
                  label="Choose QR Image"
                  severity="secondary"
                  outlined
                  @click="clickChooseQr"
                />

                <div class="border border-slate-200 rounded-md overflow-hidden bg-white w-20 h-20">
                  <img
                    v-if="qrImage"
                    :src="qrImage"
                    alt="QR"
                    class="w-full h-full object-cover block"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-xs text-slate-500"
                  >
                    N/A
                  </div>
                </div>
              </div>
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

          <div class="w-full flex justify-end gap-2 pt-4 mt-auto border-t border-slate-200">
            <BaseButton
              label="Cancel"
              severity="secondary"
              outlined
              :disabled="submitting"
              @click="onCancel"
            />
            <BaseButton
              label="Submit"
              severity="success"
              :disabled="submitting || !canManage"
              @click="onSubmit"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
