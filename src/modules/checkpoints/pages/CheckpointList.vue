<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { exportCheckpointsXlsx } from '@/services/export/checkpoints.export'
import { printSingleCheckpointQr } from '@/services/print/checkpoints.print'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import CheckpointFilters from '@/modules/checkpoints/components/CheckpointFilters.vue'

import BaseDataTable from '@/components/common/BaseDataTable.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import { deleteCheckpointMock, fetchCheckpointById } from '@/modules/checkpoints/checkpoints.api'

import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'
import CheckpointForm, {
  type CheckpointFormMode,
  type CheckpointFormModel,
} from '@/modules/checkpoints/components/CheckpointForm.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

const store = useCheckpointsStore()
const auth = useAuthStore()
const exporting = ref(false)

const canManage = computed(() => auth.isAdminUser && auth.canAccess('checkpoints.manage'))
const canPrintQr = computed(() => auth.isAdminUser)

const lockedAreaId = computed<number | null>(() => {
  const raw = Array.isArray(route.query.areaId) ? route.query.areaId[0] : route.query.areaId
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
})

const lockedAreaCode = computed(() => {
  const raw = Array.isArray(route.query.areaCode) ? route.query.areaCode[0] : route.query.areaCode
  return String(raw ?? '').trim()
})

const pageTitle = computed(() =>
  lockedAreaCode.value
    ? `${lockedAreaCode.value} Check Points Management`
    : 'Check Points Management',
)

function applyLockedAreaFilter() {
  store.filterAreaId = lockedAreaId.value
}

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterStatus, lockedAreaId.value],
  () => store.setFirst(0),
)

watch(
  lockedAreaId,
  () => {
    applyLockedAreaFilter()
  },
  { immediate: true },
)

onMounted(async () => {
  applyLockedAreaFilter()
  await store.load()
  applyLockedAreaFilter()
  console.log(store.filteredRows)
})

function clearAll() {
  store.searchText = ''
  searchDraft.value = ''
  store.filterStatus = 'ALL'
  applyLockedAreaFilter()
  store.setFirst(0)
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
    role_ids: row.role_ids,
    role_names: row.role_names,
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
    area_id: lockedAreaId.value ?? store.areaOptions[0]?.value ?? 0,
    role_ids: [],
    role_names: [],
  }
  formVisible.value = true
}

async function openView(row: CheckpointRow) {
  formMode.value = 'view'
  try {
    const detail = await fetchCheckpointById(row.cp_id, store.roleOptions)
    formModel.value = {
      cp_id: detail.cp_id,
      cp_code: detail.cp_code,
      cp_name: detail.cp_name,
      cp_qr: detail.cp_qr,
      cp_description: detail.cp_description,
      cp_priority: detail.cp_priority,
      area_id: detail.area_id,
      role_ids: detail.role_ids,
      role_names: detail.role_names,
    }
  } catch {
    formModel.value = mapRowToFormModel(row)
  }
  formVisible.value = true
}

async function openEdit(row: CheckpointRow) {
  formMode.value = 'edit'
  try {
    const detail = await fetchCheckpointById(row.cp_id, store.roleOptions)
    formModel.value = {
      cp_id: detail.cp_id,
      cp_code: detail.cp_code,
      cp_name: detail.cp_name,
      cp_qr: detail.cp_qr,
      cp_description: detail.cp_description,
      cp_priority: detail.cp_priority,
      area_id: detail.area_id,
      role_ids: detail.role_ids,
      role_names: detail.role_names,
    }
  } catch {
    formModel.value = mapRowToFormModel(row)
  }
  formVisible.value = true
}

async function deleteOne(row: CheckpointRow) {
  await deleteCheckpointMock({ cp_id: row.cp_id, actor_id: auth.user?.user_id ?? '' })
}

function onDelete(row: CheckpointRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete check point ${row.cp_code} - ${row.cp_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteOne(row)
        await store.load()
        applyLockedAreaFilter()
        selectedRows.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Check point has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete check point.',
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
    message: `Delete ${sel.length} selected check points?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        for (const row of sel) {
          await deleteOne(row)
        }
        await store.load()
        applyLockedAreaFilter()
        selectedRows.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected check points have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete check points.',
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
    applyLockedAreaFilter()

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Check Point has been saved.',
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

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg || 'Failed to save check point.',
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

async function onPrintCheckpointQr(row: CheckpointRow) {
  try {
    await printSingleCheckpointQr({
      areaLabel: row.area_code || row.area_name,
      cpName: row.cp_name,
      cpCode: row.cp_code,
      cpPriority: row.cp_priority,
      qrSrc: row.cp_qr,
    })
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    toast.add({
      severity: 'error',
      summary: 'QR PDF Error',
      detail:
        msg === 'QR_IMAGE_NOT_FOUND'
          ? 'No QR image available to export.'
          : msg === 'QR_IMAGE_FORMAT_NOT_SUPPORTED'
            ? 'QR image format is not supported.'
            : msg || 'Failed to export QR PDF.',
      life: 3500,
    })
  }
}

async function onExport() {
  exporting.value = true
  try {
    const areaCode = lockedAreaCode.value || 'Area'
    await exportCheckpointsXlsx({
      rows: store.filteredRows,
      title: `${areaCode} Checkpoints`,
      fileName: `${areaCode}_checkpoints_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export checkpoints.'),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">{{ pageTitle }}</div>

    <CheckpointFilters
      :modelStatus="store.filterStatus"
      :modelSearch="searchDraft"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelSearch="searchDraft = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      :title="pageTitle"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="cp_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      v-model:selection="selectedRows"
      @page="(e) => store.setFirst(e.first)"
    >
      <template v-if="canManage" #toolbar-start>
        <BaseIconButton
          icon="pi pi-plus"
          label="New"
          size="small"
          severity="success"
          :disabled="!canManage"
          @click="openNew"
        />
        <BaseIconButton
          icon="pi pi-trash"
          label="Delete"
          size="small"
          severity="danger"
          outlined
          class="ml-2"
          :disabled="!canManage || !(selectedRows && selectedRows.length)"
          @click="onDeleteSelected"
        />
      </template>

      <template #toolbar-end>
        <div class="flex justify-end gap-2">
          <BaseIconButton
            icon="pi pi-file-excel"
            label="Export"
            size="small"
            severity="secondary"
            outlined
            :disabled="exporting"
            @click="onExport"
          />
        </div>
      </template>

      <Column
        v-if="canManage"
        selectionMode="multiple"
        style="width: 3rem"
        :exportable="false"
        sortDisabled
      />

      <Column field="cp_code" header="Check Point Code" style="min-width: 12rem" />
      <Column field="cp_name" header="Check Point Name" style="min-width: 14rem" />

      <Column header="QR Image" style="min-width: 10rem" sortDisabled>
        <template #body="{ data }">
          <div class="flex justify-start">
            <QrPreview
              :value="normalizeQr(data.cp_qr)"
              :printItem="{
                areaLabel: data.area_code || data.area_name,
                cpName: data.cp_name,
                cpCode: data.cp_code,
                cpPriority: data.cp_priority,
              }"
            />
          </div>
        </template>
      </Column>

      <Column header="Area" style="min-width: 14rem" sortField="area_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-medium">{{ data.area_code }}</div>
            <div class="text-slate-600 text-xs mt-1">{{ data.area_name }}</div>
          </div>
        </template>
      </Column>

      <Column field="cp_description" header="Description" style="min-width: 18rem" />
      <Column field="cp_priority" header="Priority" style="min-width: 8rem" />

      <Column header="Status" style="min-width: 10rem" sortField="cp_status">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.cp_status)" :severity="statusSeverity(data.cp_status)" />
        </template>
      </Column>

      <Column header="Action" :exportable="false" style="min-width: 18rem" sortDisabled>
        <template #body="{ data }">
          <div class="flex gap-2 justify-start">
            <BaseIconButton
              icon="pi pi-eye"
              size="small"
              severity="info"
              outlined
              rounded
              @click="openView(data)"
            />
            <BaseIconButton
              v-if="canPrintQr"
              icon="pi pi-print"
              size="small"
              severity="secondary"
              outlined
              rounded
              ariaLabel="Print Qr"
              @click="onPrintCheckpointQr(data)"
            />
            <BaseIconButton
              v-if="canManage"
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              outlined
              rounded
              @click="openEdit(data)"
            />
            <BaseIconButton
              v-if="canManage"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              outlined
              rounded
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
      :roleOptions="store.roleOptions"
      @submit="handleCheckpointFormSubmit"
      @close="formModel = null"
    />
  </div>
</template>
