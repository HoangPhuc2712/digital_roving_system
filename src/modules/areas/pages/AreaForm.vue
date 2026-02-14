<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'

import { useToast } from 'primevue/usetoast'

import { useAreasStore } from '@/modules/areas/areas.store'
import { useAuthStore } from '@/stores/auth.store'
import { createAreaMock, updateAreaMock, fetchAreaById } from '@/modules/areas/areas.api'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const store = useAreasStore()
const auth = useAuthStore()

const areaCode = ref('')
const areaName = ref('')
const status = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE')

const submitting = ref(false)
const loading = ref(false)

const canManage = computed(() => auth.canAccess('areas.manage'))

const isEditMode = computed(() => route.name === 'areas-edit')
const areaId = computed(() => Number(route.params.id ?? 0))

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

const pageTitle = computed(() => (isEditMode.value ? 'Edit Area' : 'Create Area'))

function backToList() {
  router.push({ name: 'areas' })
}

function validate() {
  if (!areaCode.value.trim()) return 'AREA_CODE_REQUIRED'
  if (!areaName.value.trim()) return 'AREA_NAME_REQUIRED'
  return ''
}

async function loadEditData() {
  if (!isEditMode.value) return
  if (!areaId.value) return

  loading.value = true
  try {
    const a = await fetchAreaById(areaId.value)
    if (!a) {
      toast.add({ severity: 'warn', summary: 'Not Found', detail: 'Area not found.', life: 2500 })
      backToList()
      return
    }

    areaCode.value = a.area_code ?? ''
    areaName.value = a.area_name ?? ''
    status.value = a.area_status === 1 ? 'ACTIVE' : 'INACTIVE'
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load area.',
      life: 3000,
    })
    backToList()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadEditData()
})

async function onSubmit() {
  if (!canManage.value) return

  const err = validate()
  if (err) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: err === 'AREA_CODE_REQUIRED' ? 'Area Code is required.' : 'Area Name is required.',
      life: 2500,
    })
    return
  }

  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  submitting.value = true
  try {
    if (!isEditMode.value) {
      await createAreaMock({
        area_code: areaCode.value,
        area_name: areaName.value,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Area has been created.',
        life: 2000,
      })
    } else {
      await updateAreaMock({
        area_id: areaId.value,
        area_code: areaCode.value,
        area_name: areaName.value,
        area_status: status.value === 'ACTIVE' ? 1 : 0,
        actor_id: actor,
      })

      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Area has been updated.',
        life: 2000,
      })
    }

    await store.load()
    backToList()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        e?.message === 'AREA_CODE_EXISTS'
          ? 'Area Code already exists.'
          : (e?.message ?? 'Failed to save area.'),
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

        <div v-else class="flex flex-col min-h-[220px]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-slate-600 mb-1">Area Code</label>
              <BaseInput v-model="areaCode" label="" class="w-full" />
            </div>

            <div>
              <label class="block text-sm text-slate-600 mb-1">Area Name</label>
              <BaseInput v-model="areaName" label="" class="w-full" />
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
              :disabled="submitting || loading"
              @click="onCancel"
            />
            <BaseButton
              label="Submit"
              severity="success"
              :disabled="submitting || loading || !canManage"
              @click="onSubmit"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
