<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseMessage from '@/components/common/messages/BaseMessage.vue'
import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'

import type { RouteDetailModel } from '@/modules/routes/routes.types'
import {
  createRouteMock,
  updateRouteMock,
  fetchScanPointsByArea,
} from '@/modules/routes/routes.api'

export type RouteFormMode = 'new' | 'view' | 'edit'

export type RouteFormModel = {
  route_id?: number
  route_code?: string
  route_name: string
  area_id: number
  role_id: number
  role_name?: string
  route_priority: number
  route_total_minute: number
  details: RouteDetailModel[]
}

export type RouteFormSubmitPayload = {
  submit: (actor_id: string) => Promise<void>
}

type RouteFormState = RouteFormModel & {
  selected_cp_ids: number[]
}

type ScanPointOption = {
  label: string
  value: number
  cpCode: string
  cpName: string
  cpQr?: string
  cpPriority?: number
}

const props = defineProps<{
  visible: boolean
  mode: RouteFormMode
  model: RouteFormModel | null
  areaOptions: { label: string; value: number }[]
  roleOptions: { label: string; value: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', payload: RouteFormSubmitPayload): void
  (e: 'close'): void
}>()

const initializing = ref(false)
const submitted = ref(false)
const addScanPointSubmitted = ref(false)

const isView = computed(() => props.mode === 'view')
const title = computed(() =>
  props.mode === 'new' ? 'Create New Route' : props.mode === 'edit' ? 'Edit Route' : 'Route Detail',
)

const areaLabel = computed(() => {
  return (
    props.areaOptions.find((x) => x.value === form.area_id)?.label ?? String(form.area_id ?? '')
  )
})

const roleLabel = computed(() => {
  return (
    props.roleOptions.find((x) => x.value === form.role_id)?.label ?? props.model?.role_name ?? '—'
  )
})

const scanPointOptions = ref<ScanPointOption[]>([])
const scanLoading = ref(false)

const form = reactive<RouteFormState>({
  route_id: undefined,
  route_code: '',
  route_name: '',
  area_id: 0,
  role_id: 0,
  role_name: '',
  route_priority: 1,
  route_total_minute: 0,
  details: [],
  selected_cp_ids: [],
})

const routeNameError = computed(() => submitted.value && !String(form.route_name ?? '').trim())
const areaError = computed(() => submitted.value && !Number(form.area_id ?? 0))
const roleError = computed(() => submitted.value && !Number(form.role_id ?? 0))
const detailsError = computed(() => submitted.value && !form.details.length)
const addScanPointError = computed(
  () =>
    addScanPointSubmitted.value &&
    Number(form.role_id ?? 0) > 0 &&
    (!Array.isArray(form.selected_cp_ids) || form.selected_cp_ids.length === 0),
)

const sortedDetails = computed(() => {
  const arr = Array.isArray(form.details) ? [...form.details] : []
  return arr.sort((a, b) => Number(a.rd_priority) - Number(b.rd_priority))
})

const availableScanPointOptions = computed(() => {
  const used = new Set((form.details ?? []).map((d) => d.cp_id))
  return (scanPointOptions.value ?? []).filter((x) => !used.has(x.value))
})

function getDisplayOrder(detail: RouteDetailModel) {
  return Number(detail.cp_priority ?? 0) || Number(detail.cp_id ?? 0)
}

function getQrValue(detail: RouteDetailModel) {
  const s = String(detail.cp_qr ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}

function applyDetailMetadata() {
  const pointMap = new Map((scanPointOptions.value ?? []).map((x) => [x.value, x]))
  for (const detail of form.details ?? []) {
    const point = pointMap.get(detail.cp_id)
    if (!point) continue
    if (!detail.cp_code) detail.cp_code = point.cpCode
    if (!detail.cp_name) detail.cp_name = point.cpName
    if (!detail.cp_qr) detail.cp_qr = String(point.cpQr ?? '')
    if (!detail.cp_priority && point.cpPriority) detail.cp_priority = point.cpPriority
  }
}

async function loadScanPoints(roleId: number) {
  if (!roleId) {
    scanPointOptions.value = []
    return
  }

  scanLoading.value = true
  try {
    scanPointOptions.value = await fetchScanPointsByArea(form.area_id, roleId || null)
    applyDetailMetadata()
  } finally {
    scanLoading.value = false
  }
}

watch(
  () => props.model,
  async (m) => {
    if (!m) return
    initializing.value = true
    submitted.value = false
    addScanPointSubmitted.value = false

    form.route_id = m.route_id
    form.route_code = m.route_code ?? ''
    form.route_name = m.route_name ?? ''
    form.area_id = Number(m.area_id ?? 0)
    form.role_id = Number(m.role_id ?? 0)
    form.role_name = m.role_name ?? ''
    form.route_priority = Number(m.route_priority ?? 1)
    form.route_total_minute = Number(m.route_total_minute ?? 0)
    form.details = Array.isArray(m.details) ? m.details.map((d) => ({ ...d })) : []
    form.selected_cp_ids = []

    await loadScanPoints(form.role_id)
    reindexDetails()
    applyDetailMetadata()

    initializing.value = false
  },
  { immediate: true },
)

watch(
  () => form.role_id,
  async (newRoleId, oldRoleId) => {
    if (initializing.value) return
    if (isView.value) return

    const sameRole = Number(newRoleId || 0) === Number(oldRoleId || 0)
    if (sameRole) return

    addScanPointSubmitted.value = false
    form.selected_cp_ids = []
    form.details = []
    await loadScanPoints(Number(newRoleId || 0))
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
  submitted.value = false
  addScanPointSubmitted.value = false
  emit('update:visible', false)
  emit('close')
}

function addSelectedScanPoint() {
  addScanPointSubmitted.value = true

  if (!form.role_id) return
  if (!form.selected_cp_ids.length) return

  const optionMap = new Map(availableScanPointOptions.value.map((x) => [x.value, x]))
  const orderedIds = form.selected_cp_ids.slice()

  for (const cpId of orderedIds) {
    const existed = form.details.some((d) => d.cp_id === cpId)
    if (existed) continue

    const opt = optionMap.get(cpId)
    if (!opt) continue

    const nextPriority = form.details.length + 1
    form.details.push({
      cp_id: opt.value,
      cp_code: opt.cpCode,
      cp_name: opt.cpName,
      cp_qr: String(opt.cpQr ?? ''),
      cp_priority: opt.cpPriority,
      rd_minute: 1,
      rd_priority: nextPriority,
    })
  }

  addScanPointSubmitted.value = false
  form.selected_cp_ids = []
}

function removeDetail(cpId: number) {
  form.details = form.details.filter((d) => d.cp_id !== cpId)
  reindexDetails()
}

function onRowReorder(e: any) {
  const next = Array.isArray(e?.value) ? e.value : []
  form.details = next.map((d: any, idx: number) => ({
    ...d,
    rd_priority: idx + 1,
  }))
}

function submit() {
  submitted.value = true

  const name = (form.route_name ?? '').trim()
  const areaId = Number(form.area_id ?? 0)
  const roleId = Number(form.role_id ?? 0)

  if (!name || !areaId || !roleId) return
  if (!form.details.length) return

  emit('submit', {
    submit: async (actor_id: string) => {
      const details: RouteDetailModel[] = form.details
        .slice()
        .sort((a, b) => Number(a.rd_priority) - Number(b.rd_priority))
        .map((d, idx) => ({
          ...d,
          rd_priority: idx + 1,
          rd_minute: Number(d.rd_minute ?? 0),
        }))

      if (props.mode === 'new') {
        await createRouteMock({
          route_name: name,
          area_id: areaId,
          role_id: roleId,
          route_priority: Number(form.route_priority ?? 1),
          route_total_minute: Number(form.route_total_minute ?? 0),
          details,
          actor_id,
        })
        return
      }

      if (!form.route_id) throw new Error('ROUTE_NOT_FOUND')

      await updateRouteMock({
        route_id: form.route_id,
        route_name: name,
        area_id: areaId,
        role_id: roleId,
        route_priority: Number(form.route_priority ?? 1),
        route_total_minute: Number(form.route_total_minute ?? 0),
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
        <div v-if="isView">
          <label class="block text-sm text-slate-600 mb-1">Route Code</label>
          <div class="text-slate-800 font-semibold">{{ form.route_code || '—' }}</div>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Route Name</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.route_name }}</div>
          <BaseInput
            v-else
            v-model="form.route_name"
            label=""
            size="small"
            placeholder="Enter name"
            :hasError="routeNameError"
            message="Route Name is required"
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
              size="small"
              optionValue="value"
              placeholder="Select area"
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
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ roleLabel }}</div>
          <template v-else>
            <Select
              v-model="form.role_id"
              class="w-full"
              :class="{ 'p-invalid': roleError }"
              :options="roleOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              placeholder="Select role"
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

        <div>
          <label class="block text-sm text-slate-600 mb-1">Route Priority</label>
          <div v-if="isView" class="text-slate-800 font-semibold">{{ form.route_priority }}</div>
          <InputNumber
            v-else
            v-model="form.route_priority"
            class="w-full"
            size="small"
            :min="1"
            :step="1"
            showButtons
            buttonLayout="horizontal"
            decrementButtonIcon="pi pi-minus"
            incrementButtonIcon="pi pi-plus"
          />
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Total Minute</label>
          <div v-if="isView" class="text-slate-800 font-semibold">
            {{ form.route_total_minute }}
          </div>
          <InputNumber
            v-else
            v-model="form.route_total_minute"
            class="w-full"
            size="small"
            :min="0"
            :step="1"
            :useGrouping="false"
          />
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3 space-y-3">
        <div v-if="!isView" class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-sm text-slate-600 mb-1">Add Scan Point</label>
            <MultiSelect
              v-model="form.selected_cp_ids"
              class="w-full"
              :class="{ 'p-invalid': addScanPointError }"
              :options="availableScanPointOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              placeholder="Select scan point"
              :loading="scanLoading"
              :disabled="isView || !form.role_id"
              display="chip"
              filter
              :maxSelectedLabels="2"
            />
            <BaseMessage
              style="margin: 8px 0px"
              :hasError="addScanPointError"
              severity="error"
              size="small"
              variant="simple"
              message="Please select at least one Scan Point"
            />
          </div>

          <div>
            <BaseIconButton
              icon="pi pi-plus"
              label="Add"
              size="small"
              severity="success"
              :disabled="isView || !form.role_id || !form.selected_cp_ids.length"
              @click="addSelectedScanPoint"
            />
          </div>
        </div>

        <div v-if="!form.role_id" class="text-sm text-slate-500">
          Please select Role to load Scan Points.
        </div>

        <BaseMessage
          style="margin: 8px 0px"
          :hasError="detailsError"
          severity="error"
          size="small"
          variant="simple"
          message="Please add at least one Scan Point"
        />

        <div v-if="form.role_id || isView">
          <DataTable
            :value="sortedDetails"
            dataKey="cp_id"
            class="w-full"
            :reorderableRows="!isView"
            @rowReorder="onRowReorder"
          >
            <Column v-if="!isView" rowReorder headerStyle="width: 3rem" />

            <Column header="CP Priority" style="width: 8rem">
              <template #body="{ data }">
                <div class="text-slate-800">{{ getDisplayOrder(data) }}</div>
              </template>
            </Column>

            <Column header="Check Point" style="min-width: 18rem">
              <template #body="{ data }">
                <div class="text-slate-800">{{ data.cp_code }} - {{ data.cp_name }}</div>
              </template>
            </Column>

            <Column header="QR Image" style="width: 8rem">
              <template #body="{ data }">
                <QrPreview
                  :value="getQrValue(data)"
                  :size="40"
                  :printItem="{
                    areaLabel: areaLabel,
                    cpName: data.cp_name,
                    cpCode: data.cp_code,
                    cpPriority: data.cp_priority,
                  }"
                />
              </template>
            </Column>

            <Column header="Minutes" style="width: 8rem">
              <template #body="{ data }">
                <InputNumber
                  v-model="data.rd_minute"
                  class="w-full"
                  :min="0"
                  :step="1"
                  :useGrouping="false"
                  :disabled="isView"
                />
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
