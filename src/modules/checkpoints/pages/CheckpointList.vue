<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useRoute } from 'vue-router'
import { exportCheckpointsXlsx } from '@/services/export/checkpoints.export'
import { printSingleCheckpointQr } from '@/services/print/checkpoints.print'
import { normalizeImageSource } from '@/utils/base64'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'

import BaseDataTable from '@/components/common/BaseDataTable.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import { deleteCheckpointMock, fetchCheckpointById } from '@/modules/checkpoints/checkpoints.api'
import { fetchRouteRows } from '@/modules/routes/routes.api'
import type { RouteRow } from '@/modules/routes/routes.types'

import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'
import CheckpointForm, {
  type CheckpointFormMode,
  type CheckpointFormModel,
} from '@/modules/checkpoints/components/CheckpointForm.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'
import {
  useDebouncedSearchDraft,
  useResetFirstOnFilterChange,
  resetFiltersWithSearchDraft,
} from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

const route = useRoute()
const toast = useToast()
const store = useCheckpointsStore()
const auth = useAuthStore()
const exporting = ref(false)
const printingCheckpointId = ref<number | null>(null)
const DELETE_CHECKPOINT_API_DRY_RUN = false

const checkpointStatusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]
const confirmDeleteVisible = ref(false)
const confirmDeleteMessage = ref('')
const confirmDeleteLoading = ref(false)
const pendingDeleteAction = ref<null | (() => Promise<void>)>(null)

const canManage = computed(() => auth.isAdminUser && auth.canAccess('checkpoints.manage'))

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

const routeRowsCache = ref<RouteRow[] | null>(null)

async function getRouteRowsForDeleteCheck() {
  if (!routeRowsCache.value) {
    routeRowsCache.value = await fetchRouteRows()
  }
  return routeRowsCache.value
}

function logCheckpointDeleteDryRun(row: CheckpointRow) {
  console.log('[DRY RUN] deleteCheckpoint skipped', {
    payload: { cp_id: row.cp_id, actor_id: auth.user?.user_id ?? '' },
    row,
  })
}

async function findCheckpointUsage(row: CheckpointRow) {
  const routes = await getRouteRowsForDeleteCheck()
  return routes.filter(
    (route) =>
      Array.isArray(route.details) &&
      route.details.some((detail) => Number(detail.cp_id) === Number(row.cp_id)),
  )
}

function applyLockedAreaFilter() {
  store.filterAreaId = lockedAreaId.value
}

const { searchDraft } = useDebouncedSearchDraft({
  source: () => store.searchText,
  commit: (value) => {
    store.searchText = value
  },
})

useResetFirstOnFilterChange(
  () => [store.searchText, store.filterStatus, lockedAreaId.value],
  () => store.setFirst(0),
)

const { onPage } = usePagination({
  load: async () => {
    applyLockedAreaFilter()
    await store.load()
    applyLockedAreaFilter()
  },
  setFirst: (first) => store.setFirst(first),
})

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
})

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'areaId') store.filterAreaId = payload.value ?? null
  if (payload.key === 'status') store.filterStatus = payload.value ?? 'ALL'
  if (payload.key === 'roleIds')
    store.filterRoleIds = Array.isArray(payload.value) ? payload.value : []
}

function clearAll() {
  resetFiltersWithSearchDraft({
    clear: () => {
      store.searchText = ''
      store.filterStatus = 'ALL'
      store.filterRoleIds = []
      applyLockedAreaFilter()
      store.setFirst(0)
    },
    searchDraft,
  })
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
  if (DELETE_CHECKPOINT_API_DRY_RUN) {
    logCheckpointDeleteDryRun(row)
    return
  }

  await deleteCheckpointMock({ cp_id: row.cp_id, actor_id: auth.user?.user_id ?? '' })
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

async function onDelete(row: CheckpointRow) {
  try {
    const usedInRoutes = await findCheckpointUsage(row)
    if (usedInRoutes.length > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: `Can't delete Check Point ${row.cp_code} because it exists in ${usedInRoutes.length} route(s).`,
        life: 3500,
      })
      return
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to validate check point delete.'),
      life: 3000,
    })
    return
  }

  openDeleteConfirm(
    `Are you sure you want to delete check point ${row.cp_code} - ${row.cp_name}?`,
    async () => {
      try {
        await deleteOne(row)

        if (DELETE_CHECKPOINT_API_DRY_RUN) {
          toast.add({
            severity: 'info',
            summary: 'Delete API Disabled',
            detail: 'Delete API is disabled for testing. Check console log.',
            life: 3000,
          })
          return
        }

        await store.load()
        routeRowsCache.value = null
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
        throw e
      }
    },
  )
}

async function onDeleteSelected() {
  const sel = selectedRows.value ?? []
  if (!sel.length) return

  try {
    const routes = await getRouteRowsForDeleteCheck()
    const blocked = sel.filter((row) =>
      routes.some(
        (route) =>
          Array.isArray(route.details) &&
          route.details.some((detail) => Number(detail.cp_id) === Number(row.cp_id)),
      ),
    )

    if (blocked.length > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: `Can't delete ${blocked.length} selected check point(s) because they already exist in route(s).`,
        life: 3500,
      })
      return
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to validate check point delete.'),
      life: 3000,
    })
    return
  }

  openDeleteConfirm(
    `Are you sure you want to delete ${sel.length} selected check points?`,
    async () => {
      try {
        for (const row of sel) {
          await deleteOne(row)
        }

        if (DELETE_CHECKPOINT_API_DRY_RUN) {
          toast.add({
            severity: 'info',
            summary: 'Delete API Disabled',
            detail: 'Delete API is disabled for testing. Check console log.',
            life: 3000,
          })
          return
        }

        await store.load()
        routeRowsCache.value = null
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
        throw e
      }
    },
  )
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
    formVisible.value = false
    formModel.value = null

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
  return normalizeImageSource(src, { fallbackExt: 'png' })
}

async function onPrintCheckpointQr(row: CheckpointRow) {
  printingCheckpointId.value = row.cp_id
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
  } finally {
    printingCheckpointId.value = null
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

    <BaseDataTable
      :title="pageTitle"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="cp_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="searchDraft"
      v-model:selection="selectedRows"
      @update:modelSearch="searchDraft = $event"
      @update:columnFilter="onColumnFilter"
      @clear="clearAll"
      @page="onPage"
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

      <Column
        header="Area"
        style="min-width: 14rem"
        sortField="area_code"
        :filterMenu="{
          key: 'areaId',
          type: 'select',
          value: store.filterAreaId,
          options: store.areaOptions,
          disabled: lockedAreaId != null,
        }"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-medium">{{ data.area_code }}</div>
            <div class="text-slate-600 text-xs mt-1">{{ data.area_name }}</div>
          </div>
        </template>
      </Column>

      <Column field="cp_description" header="Description" style="min-width: 18rem" />

      <Column
        header="Role"
        style="min-width: 14rem"
        :filterMenu="{
          key: 'roleIds',
          type: 'multiselect',
          value: store.filterRoleIds,
          options: store.roleOptions,
          placeholder: 'Select role',
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">
            {{ Array.isArray(data.role_names) ? data.role_names.join(', ') : '-' }}
          </div>
        </template>
      </Column>
      <Column field="cp_priority" header="Priority" style="min-width: 8rem" />

      <Column
        header="Status"
        style="min-width: 10rem"
        sortField="cp_status"
        :filterMenu="{
          key: 'status',
          type: 'select',
          value: store.filterStatus,
          options: checkpointStatusOptions,
          showClear: false,
        }"
      >
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
              v-if="canManage"
              icon="pi pi-file-pdf"
              size="small"
              severity="secondary"
              outlined
              rounded
              ariaLabel="Print Qr"
              :loading="printingCheckpointId === data.cp_id"
              :disabled="printingCheckpointId === data.cp_id"
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

    <BaseConfirmDelete
      :visible="confirmDeleteVisible"
      :message="confirmDeleteMessage"
      :loading="confirmDeleteLoading"
      @update:visible="confirmDeleteVisible = $event"
      @cancel="closeDeleteConfirm"
      @confirm="onConfirmDelete"
    />

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
