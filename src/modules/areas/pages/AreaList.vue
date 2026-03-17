<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useAreasStore } from '@/modules/areas/areas.store'
import { useAuthStore } from '@/stores/auth.store'
import type { AreaRow } from '@/modules/areas/areas.types'
import { deleteAreaMock } from '@/modules/areas/areas.api'
import { fetchCheckpointRows } from '@/modules/checkpoints/checkpoints.api'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import {
  printCheckpointQrSheets,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'

import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'
import AreaFilters from '@/modules/areas/components/AreaFilters.vue'

import AreaForm, {
  type AreaFormMode,
  type AreaFormModel,
} from '@/modules/areas/components/AreaForm.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { exportAreasXlsx } from '@/services/export/areas.export'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useAreasStore()
const auth = useAuthStore()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('areas.manage'))
const canPrintQr = computed(() => auth.isAdminUser)
const exporting = ref(false)

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterStatus],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
  console.log(store.filteredRows)
})

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
}

async function onExport() {
  exporting.value = true
  try {
    await exportAreasXlsx({
      rows: store.filteredRows,
      fileName: `areas_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export areas.'),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

const selectedAreas = ref<AreaRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<AreaFormMode>('view')
const formModel = ref<AreaFormModel | null>(null)

function mapRowToFormModel(row: AreaRow): AreaFormModel {
  return {
    area_id: row.area_id,
    area_code: row.area_code,
    area_name: row.area_name,
  }
}

function goToAreaCheckPoints(row: AreaRow) {
  router.push({
    name: 'checkpoints',
    query: {
      areaId: row.area_id,
      areaCode: row.area_code,
    },
  })
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    area_code: '',
    area_name: '',
  }
  formVisible.value = true
}

function openView(row: AreaRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: AreaRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

async function doDeleteOne(row: AreaRow) {
  await deleteAreaMock({ area_id: row.area_id, actor_id: auth.user?.user_id ?? '' })
}

async function onDelete(row: AreaRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete area ${row.area_code} - ${row.area_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await doDeleteOne(row)
        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Area has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: 'Cannot Delete',
            detail: `Can't delete Area ${row.area_code} because it has ${n} check points`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg || 'Failed to delete area.',
          life: 3000,
        })
      }
    },
  })
}

function onDeleteSelected() {
  const sel = selectedAreas.value ?? []
  if (!sel.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${sel.length} selected areas?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        for (const row of sel) {
          await doDeleteOne(row)
        }
        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected areas have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: 'Cannot Delete',
            detail: `Can't delete because one selected Area has ${n} check points`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg || 'Failed to delete areas.',
          life: 3000,
        })
      }
    },
  })
}

function buildAreaPrintItems(row: AreaRow, checkpoints: CheckpointRow[]): CheckpointPrintItem[] {
  return (checkpoints ?? [])
    .filter((cp) => Number(cp.area_id) === Number(row.area_id))
    .sort(
      (a, b) =>
        Number(a.cp_priority ?? 0) - Number(b.cp_priority ?? 0) ||
        String(a.cp_code ?? '').localeCompare(String(b.cp_code ?? '')),
    )
    .map((cp) => ({
      areaLabel: cp.area_code || cp.area_name || row.area_code || row.area_name,
      cpName: cp.cp_name,
      cpCode: cp.cp_code,
      cpPriority: cp.cp_priority,
      qrSrc: cp.cp_qr,
    }))
}

async function onPrintAreaQr(row: AreaRow) {
  try {
    const checkpoints = await fetchCheckpointRows()
    const items = buildAreaPrintItems(row, checkpoints)

    if (!items.length) {
      toast.add({
        severity: 'warn',
        summary: 'No QR',
        detail: `No check point QR found for ${row.area_code}.`,
        life: 3000,
      })
      return
    }

    await printCheckpointQrSheets(items, `${row.area_code || row.area_name} Qr Codes`)
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

async function handleAreaFormSubmit(payload: { submit: (actor_id: string) => Promise<void> }) {
  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  try {
    await payload.submit(actor)
    await store.load()

    formVisible.value = false
    formModel.value = null
    selectedAreas.value = null

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Area has been saved.',
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

    if (msg === 'AREA_CODE_EXISTS') {
      toast.add({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'Area Code already exists.',
        life: 3000,
      })
      return
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg || 'Failed to save area.',
      life: 3500,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">Areas Management</div>

    <AreaFilters
      :modelStatus="store.filterStatus"
      :modelSearch="searchDraft"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelSearch="searchDraft = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title="Areas"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="area_id"
      v-model:selection="selectedAreas"
      :rows="store.rowsPerPage"
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
          :disabled="!canManage || !(selectedAreas && selectedAreas.length)"
          @click="onDeleteSelected"
        />
      </template>

      <template #toolbar-end>
        <BaseIconButton
          icon="pi pi-file-excel"
          label="Export"
          size="small"
          severity="secondary"
          outlined
          :disabled="exporting"
          @click="onExport"
        />
      </template>

      <Column
        v-if="canManage"
        selectionMode="multiple"
        style="width: 3rem"
        :exportable="false"
        sortDisabled
      />

      <Column field="area_code" header="Area Code" style="min-width: 10rem" />
      <Column field="area_name" header="Area Name" style="min-width: 14rem" />

      <Column header="Area Check Points" style="min-width: 12rem">
        <template #body="{ data }">
          <BaseButton
            :label="`View (${data.checkpoint_count})`"
            severity="secondary"
            outlined
            @click="goToAreaCheckPoints(data)"
          />
        </template>
      </Column>

      <Column header="Status" style="min-width: 10rem" sortField="area_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.area_status)"
            :severity="statusSeverity(data.area_status)"
          />
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
              @click="onPrintAreaQr(data)"
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

    <AreaForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      @submit="handleAreaFormSubmit"
      @close="formModel = null"
    />
  </div>
</template>
