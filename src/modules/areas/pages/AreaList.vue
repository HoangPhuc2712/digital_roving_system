<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useAreasStore } from '@/modules/areas/areas.store'
import { useAuthStore } from '@/stores/auth.store'
import type { AreaRow } from '@/modules/areas/areas.types'
import { deleteAreaMock, fetchAreaById } from '@/modules/areas/areas.api'
import { fetchCheckpointRows } from '@/modules/checkpoints/checkpoints.api'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import {
  printCheckpointQrSheets,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'

import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'

import AreaForm, {
  type AreaFormMode,
  type AreaFormModel,
} from '@/modules/areas/components/AreaForm.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'
import AreaPrintOptionsDialog from '@/modules/areas/components/AreaPrintOptionsDialog.vue'
import { exportAreasXlsx } from '@/services/export/areas.export'
import {
  useDebouncedSearchDraft,
  useResetFirstOnFilterChange,
  resetFiltersWithSearchDraft,
} from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

const router = useRouter()
const toast = useToast()
const store = useAreasStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('areas.manage'))
const areaPrintOptions = computed(() =>
  [...store.rows]
    .sort((a, b) => String(a.area_name ?? '').localeCompare(String(b.area_name ?? '')))
    .map((row) => ({
      label: row.area_name || row.area_code || String(row.area_id),
      value: row.area_id,
    })),
)
const exporting = ref(false)
const printOptionsVisible = ref(false)
const printingAreaId = ref<number | null>(null)
const DELETE_AREA_API_DRY_RUN = false

const areaStatusOptions = [
  { label: t('areaList.areaStatusOptions.all'), value: t('areaList.areaStatusOptions.all') },
  { label: t('areaList.areaStatusOptions.active'), value: t('areaList.areaStatusOptions.active') },
  {
    label: t('areaList.areaStatusOptions.inactive'),
    value: t('areaList.areaStatusOptions.inactive'),
  },
]
const confirmDeleteVisible = ref(false)
const confirmDeleteMessage = ref('')
const confirmDeleteLoading = ref(false)
const pendingDeleteAction = ref<null | (() => Promise<void>)>(null)

const { searchDraft } = useDebouncedSearchDraft({
  source: () => store.searchText,
  commit: (value) => {
    store.searchText = value
  },
})

useResetFirstOnFilterChange(
  () => [store.searchText, store.filterStatus],
  () => store.setFirst(0),
)

const { onPage } = usePagination({
  load: () => store.load(),
  setFirst: (first) => store.setFirst(first),
})

onMounted(async () => {
  await store.load()
})

function statusLabel(s: number) {
  return s === 1 ? t('areaList.areaStatusOptions.active') : t('areaList.areaStatusOptions.inactive')
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'status') store.filterStatus = payload.value ?? 'ALL'
}

function clearAll() {
  resetFiltersWithSearchDraft({
    clear: () => store.clearFilters(),
    searchDraft,
  })
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
      detail: String(e?.message ?? t('areaList.errors.exportFailed')),
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

async function openView(row: AreaRow) {
  formMode.value = 'view'
  const detail = (await fetchAreaById(row.area_id)) ?? row
  formModel.value = mapRowToFormModel(detail as AreaRow)
  formVisible.value = true
}

async function openEdit(row: AreaRow) {
  formMode.value = 'edit'
  const detail = (await fetchAreaById(row.area_id)) ?? row
  formModel.value = mapRowToFormModel(detail as AreaRow)
  formVisible.value = true
}

function getAreaDeleteBlockedCount(row: AreaRow) {
  return Number(row.checkpoint_count ?? 0)
}

function logAreaDeleteDryRun(row: AreaRow) {
  console.log('[DRY RUN] deleteArea skipped', {
    payload: { area_id: row.area_id, actor_id: auth.user?.user_id ?? '' },
    row,
  })
}

async function doDeleteOne(row: AreaRow) {
  if (DELETE_AREA_API_DRY_RUN) {
    logAreaDeleteDryRun(row)
    return
  }

  await deleteAreaMock({ area_id: row.area_id, actor_id: auth.user?.user_id ?? '' })
}

function openDeleteConfirm(message: string, action: () => Promise<void>) {
  confirmDeleteMessage.value = message
  pendingDeleteAction.value = action
  confirmDeleteVisible.value = true
}

async function onConfirmDelete() {
  if (!pendingDeleteAction.value || confirmDeleteLoading.value) return

  confirmDeleteLoading.value = true
  try {
    await pendingDeleteAction.value()
    confirmDeleteVisible.value = false
    pendingDeleteAction.value = null
  } finally {
    confirmDeleteLoading.value = false
  }
}

function closeDeleteConfirm() {
  confirmDeleteVisible.value = false
  confirmDeleteLoading.value = false
  pendingDeleteAction.value = null
}

async function onDelete(row: AreaRow) {
  const checkpointCount = getAreaDeleteBlockedCount(row)
  if (checkpointCount > 0) {
    toast.add({
      severity: 'warn',
      summary: t('common.cannotDelete'),
      detail: `${t('areaList.errors.cannotDeleteSingleArea')} ${t('areaList.errors.becauseItHas')} ${checkpointCount} ${t('areaList.errors.checkpoints')}.`,
      life: 3500,
    })
    return
  }

  openDeleteConfirm(
    `${t('areaList.errors.areYouSure')} ${row.area_code} - ${row.area_name}?`,
    async () => {
      try {
        await doDeleteOne(row)

        if (DELETE_AREA_API_DRY_RUN) {
          toast.add({
            severity: 'info',
            summary: 'Delete API Disabled',
            detail: 'Delete API is disabled for testing. Check console log.',
            life: 3000,
          })
          return
        }

        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('areaList.success.deleteDetail'),
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: t('common.cannotDelete'),
            detail: `${t('areaList.errors.cannotDeleteSingleArea')} ${row.area_code} ${t('areaList.errors.becauseItHas')} ${n} ${t('areaList.errors.checkpoints')}`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: msg || t('areaList.errors.deleteFailed'),
          life: 3000,
        })
        throw e
      }
    },
  )
}

function onDeleteSelected() {
  const sel = selectedAreas.value ?? []
  if (!sel.length) return

  const blocked = sel.filter((row) => getAreaDeleteBlockedCount(row) > 0)
  if (blocked.length) {
    toast.add({
      severity: 'warn',
      summary: t('common.cannotDelete'),
      detail: `${t('areaList.errors.cannotDeleteMultipleAreas')} ${blocked.length} ${t('areaList.errors.becauseItContains')}.`,
      life: 3500,
    })
    return
  }

  openDeleteConfirm(
    `${t('areaList.errors.areYouSureMultiple')} ${sel.length} ${t('areaList.errors.selectedAreas')}?`,
    async () => {
      try {
        for (const row of sel) {
          await doDeleteOne(row)
        }

        if (DELETE_AREA_API_DRY_RUN) {
          toast.add({
            severity: 'info',
            summary: 'Delete API Disabled',
            detail: 'Delete API is disabled for testing. Check console log.',
            life: 3000,
          })
          return
        }

        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('areaList.success.DeleteMultipleDetail'),
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: t('common.cannotDelete'),
            detail: `${t('areaList.errors.areaDeleteRestricted')} ${n} ${t('areaList.errors.checkpoints')}`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg || t('areaList.errors.deleteFailed'),
          life: 3000,
        })
        throw e
      }
    },
  )
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
  printingAreaId.value = row.area_id
  try {
    const checkpoints = await fetchCheckpointRows()
    const items = buildAreaPrintItems(row, checkpoints)

    if (!items.length) {
      toast.add({
        severity: 'warn',
        summary: t('areaList.errors.noQr'),
        detail: `${t('areaList.errors.noQrDetail')} ${row.area_code}.`,
        life: 3000,
      })
      return
    }

    await printCheckpointQrSheets(items, `${row.area_code || row.area_name} Qr Codes`)
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    toast.add({
      severity: 'error',
      summary: t('areaList.errors.qrPdfError'),
      detail:
        msg === 'QR_IMAGE_NOT_FOUND'
          ? t('areaList.errors.noQrAvailable')
          : msg === 'QR_IMAGE_FORMAT_NOT_SUPPORTED'
            ? t('areaList.errors.qrUnsupport')
            : msg || t('areaList.errors.qrExportFailed'),
      life: 3500,
    })
  } finally {
    printingAreaId.value = null
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
      summary: t('common.save'),
      detail: t('areaList.success.savedDetail'),
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
        summary: t('areaList.errors.duplicate'),
        detail: t('areaList.errors.areaCodeExist'),
        life: 3000,
      })
      return
    }

    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: msg || t('areaList.errors.saveAreaFailed'),
      life: 3500,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('areaList.title') }}</div>

    <BaseDataTable
      :key="`area-list-table-${locale}`"
      title="Areas"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="area_id"
      v-model:selection="selectedAreas"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="searchDraft"
      @update:modelSearch="searchDraft = $event"
      @update:columnFilter="onColumnFilter"
      @clear="clearAll"
      @page="onPage"
    >
      <template v-if="canManage" #toolbar-start>
        <BaseIconButton
          icon="pi pi-plus"
          :label="t('common.new')"
          size="small"
          severity="success"
          :disabled="!canManage"
          @click="openNew"
        />
        <BaseIconButton
          icon="pi pi-trash"
          :label="t('common.delete')"
          size="small"
          severity="danger"
          outlined
          class="ml-2"
          :disabled="!canManage || !(selectedAreas && selectedAreas.length)"
          @click="onDeleteSelected"
        />
      </template>

      <template #toolbar-end>
        <div class="flex justify-end gap-2">
          <BaseIconButton
            v-if="canManage"
            icon="pi pi-file-pdf"
            :label="t('areaList.checkpointExportPdf')"
            size="small"
            severity="secondary"
            outlined
            @click="printOptionsVisible = true"
          />
          <BaseIconButton
            icon="pi pi-file-excel"
            :label="t('common.export')"
            size="small"
            severity="secondary"
            outlined
            :loading="exporting"
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

      <Column field="area_code" :header="t('areaList.areaCode')" style="min-width: 10rem" />
      <Column field="area_name" :header="t('areaList.areaName')" style="min-width: 14rem" />

      <Column :header="t('areaList.areaCheckPoints')" style="min-width: 12rem">
        <template #body="{ data }">
          <BaseButton
            :label="`${t('common.view')} (${data.checkpoint_count})`"
            severity="secondary"
            outlined
            @click="goToAreaCheckPoints(data)"
          />
        </template>
      </Column>

      <Column
        :header="t('areaList.status')"
        style="min-width: 10rem"
        sortField="area_status"
        :filterMenu="{
          key: 'status',
          type: 'select',
          value: store.filterStatus,
          options: areaStatusOptions,
          showClear: false,
        }"
      >
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.area_status)"
            :severity="statusSeverity(data.area_status)"
          />
        </template>
      </Column>

      <Column
        :header="t('common.action')"
        :exportable="false"
        style="min-width: 18rem"
        sortDisabled
      >
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
              v-if="canManage"
              icon="pi pi-file-pdf"
              size="small"
              severity="secondary"
              outlined
              rounded
              ariaLabel="Export Qr PDF"
              :loading="printingAreaId === data.area_id"
              :disabled="printingAreaId === data.area_id"
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

    <BaseConfirmDelete
      :visible="confirmDeleteVisible"
      :message="confirmDeleteMessage"
      :loading="confirmDeleteLoading"
      @update:visible="confirmDeleteVisible = $event"
      @cancel="closeDeleteConfirm"
      @confirm="onConfirmDelete"
    />

    <AreaForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      @submit="handleAreaFormSubmit"
      @close="formModel = null"
    />

    <AreaPrintOptionsDialog v-model:visible="printOptionsVisible" :areaOptions="areaPrintOptions" />
  </div>
</template>
