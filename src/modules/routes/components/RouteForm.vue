<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import type { RouteDetailModel } from '@/modules/routes/routes.types'
import {
  createRouteMock,
  updateRouteMock,
  fetchScanPointsByArea,
  sumSeconds,
} from '@/modules/routes/routes.api'

export type RouteFormMode = 'new' | 'view' | 'edit'

export type RouteFormModel = {
  route_id?: number
  route_code: string
  route_name: string
  area_id: number
  route_priority: number
  details: RouteDetailModel[]
}

export type RouteFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

type RouteFormState = RouteFormModel & {
  selected_cp_id: number | null
}

type ScanPointOption = {
  label: string
  value: number
  cpCode: string
  cpName: string
}

const props = defineProps<{
  visible: boolean
  mode: RouteFormMode
  model: RouteFormModel | null
  areaOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: RouteFormSubmitPayload): void
  (e: 'close'): void
}>()

const toast = useToast()
const initializing = ref(false)

const isView = computed(() => props.mode === 'view')
const isNew = computed(() => props.mode === 'new')
const title = computed(() =>
  props.mode === 'new' ? 'Create New Route' : props.mode === 'edit' ? 'Edit Route' : 'Route Detail',
)

const scanPointOptions = ref<ScanPointOption[]>([])
const scanLoading = ref(false)

const form = reactive<RouteFormState>({
  route_id: undefined,
  route_code: '',
  route_name: '',
  area_id: 0,
  route_priority: 1,
  details: [],
  selected_cp_id: null,
})

const sortedDetails = computed(() => {
  const arr = Array.isArray(form.details) ? [...form.details] : []
  return arr.sort((a, b) => Number(a.rd_priority) - Number(b.rd_priority))
})

const totalSecond = computed(() => sumSeconds(form.details))

const availableScanPointOptions = computed(() => {
  const used = new Set((form.details ?? []).map((d) => d.cp_id))
  return (scanPointOptions.value ?? []).filter((x) => !used.has(x.value))
})

function formatSeconds(sec: number) {
  const s = Math.max(0, Number(sec) || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const rr = String(r).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${rr}` : `${m}:${rr.padStart(2, '0')}`
}

async function loadScanPoints(areaId: number) {
  if (!areaId) {
    scanPointOptions.value = []
    return
  }
  scanLoading.value = true
  try {
    scanPointOptions.value = await fetchScanPointsByArea(areaId)
  } finally {
    scanLoading.value = false
  }
}

watch(
  () => props.model,
  async (m) => {
    if (!m) return
    initializing.value = true

    form.route_id = m.route_id
    form.route_code = m.route_code ?? ''
    form.route_name = m.route_name ?? ''
    form.area_id = Number(m.area_id ?? 0)
    form.route_priority = Number(m.route_priority ?? 1)
    form.details = Array.isArray(m.details) ? m.details.map((d) => ({ ...d })) : []
    form.selected_cp_id = null

    await loadScanPoints(form.area_id)
    reindexDetails()

    initializing.value = false
  },
  { immediate: true },
)

watch(
  () => form.area_id,
  async (newAreaId, oldAreaId) => {
    if (initializing.value) return
    if (isView.value) return

    if (Number(newAreaId || 0) === Number(oldAreaId || 0)) return

    form.selected_cp_id = null
    form.details = []
    await loadScanPoints(Number(newAreaId || 0))
  },
)

function reindexDetails() {
  const arr = Array.isArray(form.details) ? form.details : []
  arr.sort((a, b) => Number(a.rd_priority) - Number(b.rd_priority))
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (!item) continue
    item.rd_priority = i + 1
  }
}

function close() {
  emit('update:visible', false)
  emit('close')
}

function toastError(detail: string) {
  toast.add({ severity: 'error', summary: 'Validation', detail, life: 2500 })
}

function addSelectedScanPoint() {
  if (!form.area_id) {
    toastError('Please select Area first.')
    return
  }
  if (!form.selected_cp_id) {
    toastError('Please select a Scan Point.')
    return
  }

  const existed = form.details.some((d) => d.cp_id === form.selected_cp_id)
  if (existed) {
    toastError('This Scan Point is already in the route.')
    return
  }

  const opt = availableScanPointOptions.value.find((x) => x.value === form.selected_cp_id)
  if (!opt) {
    toastError('Scan Point not found.')
    return
  }

  const nextPriority = form.details.length + 1
  form.details.push({
    cp_id: opt.value,
    cp_code: opt.cpCode,
    cp_name: opt.cpName,
    rd_second: 60,
    rd_priority: nextPriority,
  })

  form.selected_cp_id = null
}

function removeDetail(cpId: number) {
  form.details = form.details.filter((d) => d.cp_id !== cpId)
  reindexDetails()
}

function onRowReorder(e: any) {
  // PrimeVue rowReorder trả về mảng đã reorder ở e.value
  const next = Array.isArray(e?.value) ? e.value : []
  form.details = next.map((d: any, idx: number) => ({
    ...d,
    rd_priority: idx + 1,
  }))
}

function submit() {
  const code = (form.route_code ?? '').trim()
  const name = (form.route_name ?? '').trim()
  const areaId = Number(form.area_id ?? 0)

  if (!code || !name || !areaId) {
    toastError('Please fill Route Code, Route Name, and Area.')
    return
  }

  if (!form.details.length) {
    toastError('Please add at least one Scan Point.')
    return
  }

  emit('submit', {
    submit: async (actor_id: string) => {
      const details: RouteDetailModel[] = form.details
        .slice()
        .sort((a, b) => Number(a.rd_priority) - Number(b.rd_priority))
        .map((d, idx) => ({
          ...d,
          rd_priority: idx + 1,
          rd_second: Number(d.rd_second ?? 0),
        }))

      if (props.mode === 'new') {
        await createRouteMock({
          route_code: code,
          route_name: name,
          area_id: areaId,
          route_priority: Number(form.route_priority ?? 1),
          details,
          actor_id,
        })
        return
      }

      if (!form.route_id) throw new Error('ROUTE_NOT_FOUND')

      await updateRouteMock({
        route_id: form.route_id,
        route_code: code,
        route_name: name,
        area_id: areaId,
        route_priority: Number(form.route_priority ?? 1),
        details,
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
    :style="{ width: '980px', maxWidth: '96vw' }"
    :contentStyle="{ maxHeight: '78vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Route Code</label>
          <BaseInput
            v-model="form.route_code"
            label=""
            placeholder="Enter code"
            :disabled="isView"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Route Name</label>
          <BaseInput
            v-model="form.route_name"
            label=""
            placeholder="Enter name"
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
          <label class="block text-sm text-slate-600 mb-1">Route Priority</label>
          <InputNumber v-model="form.route_priority" class="w-full" :min="1" :disabled="isView" />
        </div>

        <div class="md:col-span-2">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm text-slate-700">
              <span class="font-semibold">Total Time:</span>
              <span class="ml-2">{{ formatSeconds(totalSecond) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3 space-y-3">
        <div v-if="!isView" class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-sm text-slate-600 mb-1">Add Scan Point</label>
            <Dropdown
              v-model="form.selected_cp_id"
              class="w-full"
              :options="availableScanPointOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select scan point"
              :loading="scanLoading"
              :disabled="isView || !form.area_id"
              showClear
            />
          </div>

          <div>
            <BaseIconButton
              icon="pi pi-plus"
              label="Add"
              severity="success"
              :disabled="isView || !form.area_id || !form.selected_cp_id"
              @click="addSelectedScanPoint"
            />
          </div>
        </div>

        <div v-if="!form.area_id" class="text-sm text-slate-500">
          Please select Area to load Scan Points.
        </div>

        <div v-else>
          <DataTable
            :value="sortedDetails"
            dataKey="cp_id"
            class="w-full"
            :reorderableRows="!isView"
            @rowReorder="onRowReorder"
          >
            <Column v-if="!isView" rowReorder headerStyle="width: 3rem" />

            <Column header="Order" style="width: 6rem">
              <template #body="{ data }">
                <div class="text-slate-800">{{ data.rd_priority }}</div>
              </template>
            </Column>

            <Column header="Scan Point" style="min-width: 18rem">
              <template #body="{ data }">
                <div class="text-slate-800">{{ data.cp_code }} - {{ data.cp_name }}</div>
              </template>
            </Column>

            <Column header="Seconds" style="width: 10rem">
              <template #body="{ data }">
                <InputNumber v-model="data.rd_second" class="w-full" :min="0" :disabled="isView" />
              </template>
            </Column>

            <Column v-if="!isView" header="Action" style="width: 9rem">
              <template #body="{ data }">
                <div class="flex justify-start">
                  <BaseIconButton
                    v-if="!isView"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    outlined
                    rounded
                    @click="removeDetail(data.cp_id)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Cancel" severity="danger" outlined @click="close" />
        <BaseButton v-if="!isView" label="Submit" severity="success" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>
