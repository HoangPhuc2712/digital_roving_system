<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import { deleteCheckpointMock } from '@/modules/checkpoints/checkpoints.api'

import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'
import CheckpointForm, {
  type CheckpointFormMode,
  type CheckpointFormModel,
  type CheckpointFormSubmitPayload,
} from '@/modules/checkpoints/components/CheckpointForm.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useCheckpointsStore()
const auth = useAuthStore()

const canManage = computed(() => auth.canAccess('checkpoints.manage'))

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterAreaId, store.filterStatus],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
}

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}
function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

const selectedRows = ref<CheckpointRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<CheckpointFormMode>('view')
const formModel = ref<CheckpointFormModel | null>(null)

function mapRowToFormModel(row: CheckpointRow): CheckpointFormModel {
  return {
    cp_id: row.cp_id,
    cp_code: row.cp_code,
    cp_name: row.cp_name,
    cp_qr: row.cp_qr,
    cp_description: row.cp_description,
    cp_priority: row.cp_priority,
    area_id: row.area_id,
    cp_status: row.cp_status,
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    cp_code: '',
    cp_name: '',
    cp_qr: '',
    cp_description: '',
    cp_priority: 1,
    area_id: store.areaOptions[0]?.value ?? 0,
    cp_status: 1,
  }
  formVisible.value = true
}

function openView(row: CheckpointRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: CheckpointRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

async function deleteOne(row: CheckpointRow) {
  await deleteCheckpointMock({ cp_id: row.cp_id, actor_id: auth.user?.user_id ?? '' })
}

function onDelete(row: CheckpointRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete scan point ${row.cp_code} - ${row.cp_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteOne(row)
        await store.load()
        selectedRows.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Scan point has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete scan point.',
          life: 3000,
        })
      }
    },
  })
}

function onDeleteSelected() {
  const sel = selectedRows.value ?? []
  if (!sel.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${sel.length} selected scan points?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        for (const row of sel) {
          await deleteOne(row)
        }
        await store.load()
        selectedRows.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected scan points have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete scan points.',
          life: 3000,
        })
      }
    },
  })
}

async function handleCheckpointFormSubmit(payload: {
  submit: (actor_id: string) => Promise<void>
}) {
  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  try {
    await payload.submit(actor)
    await store.load()

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Scan Point has been saved.',
      life: 2000,
    })
  } catch (e: any) {
    const msg = String(e?.message ?? '')

    if (msg.startsWith('MISSING_FIELDS:')) {
      const fields = msg.replace('MISSING_FIELDS:', '').trim()
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: fields ? `Please fill: ${fields}.` : 'Please fill required fields.',
        life: 3200,
      })
      return
    }

    if (msg === 'PRIORITY_MIN_1') {
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Priority must be 1 or greater.',
        life: 3200,
      })
      return
    }

    if (msg === 'MISSING_QR') {
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please choose a QR image.',
        life: 3200,
      })
      return
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg || 'Failed to save scan point.',
      life: 3500,
    })
  }
}

function normalizeQr(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Scan Points Management</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="searchDraft" label="" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div class="md:col-span-3">
          <label class="block text-sm text-slate-600 mb-1">Area</label>
          <Dropdown
            v-model="store.filterAreaId"
            class="w-full"
            :options="store.areaOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Status</label>
          <Dropdown
            v-model="store.filterStatus"
            class="w-full"
            :options="[
              { label: 'All', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
          />
        </div>

        <div class="md:col-span-1 flex justify-end">
          <BaseButton label="Clear Filters" severity="secondary" outlined @click="clearAll" />
        </div>
      </div>
    </div>

    <BaseDataTable
      title="Scan Points"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="cp_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      v-model:selection="selectedRows"
      @page="(e) => store.setFirst(e.first)"
    >
      <template #toolbar-start>
        <BaseButton label="New" severity="success" :disabled="!canManage" @click="openNew" />
        <BaseButton
          label="Delete"
          severity="danger"
          outlined
          class="ml-2"
          :disabled="!canManage || !(selectedRows && selectedRows.length)"
          @click="onDeleteSelected"
        />
      </template>

      <Column selectionMode="multiple" style="width: 3rem" :exportable="false" />

      <Column field="cp_code" header="Scan Point Code" style="min-width: 12rem" />
      <Column field="cp_name" header="Scan Point Name" style="min-width: 14rem" />

      <Column header="QR Image" style="min-width: 10rem">
        <template #body="{ data }">
          <div class="flex justify-center">
            <QrPreview :value="normalizeQr(data.cp_qr)" />
          </div>
        </template>
      </Column>

      <Column header="Area" style="min-width: 14rem">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-medium">{{ data.area_code }}</div>
            <div class="text-slate-600 text-xs mt-1">{{ data.area_name }}</div>
          </div>
        </template>
      </Column>

      <Column field="cp_description" header="Description" style="min-width: 18rem" />
      <Column field="cp_priority" header="Priority" style="min-width: 8rem" :min="1" />

      <Column header="Status" style="min-width: 10rem">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.cp_status)" :severity="statusSeverity(data.cp_status)" />
        </template>
      </Column>

      <Column header="Action" :exportable="false" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-end">
            <BaseButton
              label="View"
              size="small"
              severity="secondary"
              outlined
              @click="openView(data)"
            />
            <BaseButton
              label="Edit"
              size="small"
              severity="success"
              outlined
              :disabled="!canManage"
              @click="openEdit(data)"
            />
            <BaseButton
              label="Delete"
              size="small"
              severity="danger"
              outlined
              :disabled="!canManage"
              @click="onDelete(data)"
            />
          </div>
        </template>
      </Column>
    </BaseDataTable>

    <CheckpointForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :areaOptions="store.areaOptions"
      @submit="handleCheckpointFormSubmit"
      @close="formModel = null"
    />
  </div>
</template>
