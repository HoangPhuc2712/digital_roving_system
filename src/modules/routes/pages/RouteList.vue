<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useRoutesStore } from '@/modules/routes/routes.store'
import type { RouteRow } from '@/modules/routes/routes.types'
import {
  createPatrolShiftsByTime,
  deleteRouteMock,
  fetchRouteById,
} from '@/modules/routes/routes.api'
import { exportRoutesXlsx } from '@/services/export/routes.export'

import {
  useDebouncedSearchDraft,
  useResetFirstOnFilterChange,
  resetFiltersWithSearchDraft,
} from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

import RouteCreateShiftsDialog from '../components/RouteCreateShiftsDialog.vue'

import RouteForm, {
  type RouteFormMode,
  type RouteFormModel,
  type RouteFormSubmitPayload,
} from '../components/RouteForm.vue'
import { translateRoleName } from '@/utils/dataI18n'

const toast = useToast()
const store = useRoutesStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('routes.manage'))
const exporting = ref(false)

const translatedRoleOptions = computed(() =>
  (store.roleOptions ?? []).map((option) => ({
    ...option,
    label: translateRoleName(String(option.label ?? ''), t),
  })),
)

const routeFilterAreaOptions = computed(() => {
  const map = new Map<number, string>()
  for (const row of store.rows) {
    const id = Number(row.area_id ?? 0)
    if (!id || map.has(id)) continue
    map.set(id, row.area_name || row.area_code || String(id))
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
})

const routeFilterRoleOptions = computed(() => {
  const source = (store.roleOptions ?? []).length
    ? store.roleOptions
    : Array.from(
        new Map(
          (store.rows ?? [])
            .filter((row) => Number(row.role_id) > 0)
            .map((row) => [
              Number(row.role_id),
              String(row.role_name || row.role_code || row.role_id),
            ]),
        ).entries(),
      ).map(([value, label]) => ({ value, label }))

  return source
    .map((option) => ({
      ...option,
      label: translateRoleName(String(option.label ?? ''), t),
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
})

const routeStatusOptions = computed(() => [
  { label: t('routeList.routeStatusOptions.all'), value: 'ALL' },
  {
    label: t('routeList.routeStatusOptions.active'),
    value: 'ACTIVE',
  },
  {
    label: t('routeList.routeStatusOptions.inactive'),
    value: 'INACTIVE',
  },
])
const confirmDeleteVisible = ref(false)
const createShiftsVisible = ref(false)
const createShiftsLoading = ref(false)
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
  () => [store.searchText, store.filterAreaId, store.filterRoleId, store.filterStatus],
  () => store.setFirst(0),
)

const { onPage } = usePagination({
  load: () => store.load(),
  setFirst: (first) => store.setFirst(first),
})

onMounted(async () => {
  await store.load()
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

function statusLabel(s: number) {
  return s === 1
    ? t('routeList.routeStatusOptions.active')
    : t('routeList.routeStatusOptions.inactive')
}
function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function displayRoleName(roleName: string, roleCode?: string) {
  const rawRoleName = String(roleName ?? '').trim()
  return rawRoleName ? translateRoleName(rawRoleName, t) : roleCode || '—'
}

const selectedRoutes = ref<RouteRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<RouteFormMode>('view')
const formModel = ref<RouteFormModel | null>(null)
const formSubmitting = ref(false)

function mapRowToFormModel(row: RouteRow): RouteFormModel {
  return {
    route_id: row.route_id,
    route_code: row.route_code,
    route_name: row.route_name,
    area_id: row.area_id,
    role_id: row.role_id,
    role_name: row.role_name,
    route_priority: row.route_priority,
    route_max_minute: row.route_max_minute,
    route_min_minute: row.route_min_minute,
    details: row.details.map((d) => ({ ...d })),
  }
}

function openCreateShifts() {
  createShiftsVisible.value = true
}

async function submitCreateShifts(payload: { month: number; year: number }) {
  const createdBy = auth.user?.user_id ?? ''
  if (!createdBy) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Unable to determine the current user.',
      life: 3000,
    })
    return
  }

  createShiftsLoading.value = true
  try {
    const ok = await createPatrolShiftsByTime({
      month: payload.month,
      year: payload.year,
      createdBy,
    })

    toast.add({
      severity: ok ? 'success' : 'warn',
      summary: ok ? 'Success' : 'Notice',
      detail: ok ? t('createShifts.success.shiftCreated') : t('createShifts.error.shiftError'),
      life: 3000,
    })

    if (ok) {
      createShiftsVisible.value = false
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: String(e?.message ?? t('createShifts.error.shiftFailed')),
      life: 3000,
    })
  } finally {
    createShiftsLoading.value = false
  }
}

async function openNew() {
  await ensureRouteFormOptionsLoaded()

  formMode.value = 'new'
  formModel.value = {
    route_code: '',
    route_name: '',
    area_id: 0,
    role_id: 0,
    role_name: '',
    route_priority: 1,
    route_min_minute: 0,
    route_max_minute: 0,
    details: [],
  }
  formVisible.value = true
}

async function hydrateFormModel(row: RouteRow) {
  try {
    return await fetchRouteById(row.route_id, store.roleOptions)
  } catch {
    return mapRowToFormModel(row)
  }
}

async function ensureRouteFormOptionsLoaded() {
  await Promise.all([store.ensureAreaOptionsLoaded(), store.ensureRoleOptionsLoaded()])
}

async function openView(row: RouteRow) {
  formMode.value = 'view'
  formModel.value = await hydrateFormModel(row)
  formVisible.value = true
}

async function openEdit(row: RouteRow) {
  await ensureRouteFormOptionsLoaded()
  formMode.value = 'edit'
  formModel.value = await hydrateFormModel(row)
  formVisible.value = true
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

async function onDelete(row: RouteRow) {
  openDeleteConfirm(
    `${t('routeList.error.areYouSure')} ${row.route_code} - ${row.route_name}?`,
    async () => {
      try {
        await deleteRouteMock({ route_id: row.route_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
        selectedRoutes.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('routeList.success.deleteDetail'),
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: e?.message ?? t('routeList.error.deleteDetail'),
          life: 3000,
        })
        throw e
      }
    },
  )
}

function confirmDeleteSelected() {
  const items = selectedRoutes.value ?? []
  if (!items.length) return

  openDeleteConfirm(
    `${t('routeList.error.areYouSureMultiple')} ${items.length} ${t('routeList.error.selectedRoute')}?`,
    async () => {
      try {
        const actor = auth.user?.user_id ?? ''
        for (const r of items) {
          await deleteRouteMock({ route_id: r.route_id, actor_id: actor })
        }
        await store.load()
        selectedRoutes.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('routeList.success.deleteDetailMultiple'),
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: e?.message ?? t('routeList.error.deleteDetailMultiple'),
          life: 3000,
        })
        throw e
      }
    },
  )
}

async function onFilterOpen(payload: { key: string }) {
  if (payload.key === 'roleId') await store.ensureRoleOptionsLoaded()
}

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'areaId') store.filterAreaId = payload.value ?? null
  if (payload.key === 'roleId') store.filterRoleId = payload.value ?? null
  if (payload.key === 'status') store.filterStatus = payload.value ?? 'ALL'
}

function clearAll() {
  resetFiltersWithSearchDraft({
    clear: () => store.clearFilters(),
    searchDraft,
    afterClear: () => {
      selectedRoutes.value = null
    },
  })
}

async function onExport() {
  exporting.value = true
  try {
    await exportRoutesXlsx({
      rows: store.filteredRows,
      fileName: `patrol_routes_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: String(e?.message ?? t('routeList.error.exportFailed')),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

async function handleSubmit(payload: RouteFormSubmitPayload) {
  if (formSubmitting.value) return

  formSubmitting.value = true

  try {
    const actor = auth.user?.user_id ?? ''
    await payload.submit(actor)
    await store.load()
    selectedRoutes.value = null
    formVisible.value = false
    formModel.value = null

    toast.add({
      severity: 'success',
      summary: t('common.save'),
      detail:
        formMode.value === 'new'
          ? t('routeList.success.routeCreated')
          : t('routeList.success.routeUpdated'),
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: e?.message ?? t('routeList.error.saveFailed'),
      life: 3000,
    })
  } finally {
    formSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('routeList.title') }}</div>

    <BaseDataTable
      :key="`route-list-table-${locale}`"
      title="Routes"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="route_id"
      v-model:selection="selectedRoutes"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="searchDraft"
      @update:modelSearch="searchDraft = $event"
      :beforeFilterOpen="onFilterOpen"
      @update:columnFilter="onColumnFilter"
      @clear="clearAll"
      @page="onPage"
    >
      <template v-if="canManage" #toolbar-start>
        <div class="flex gap-2">
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
            :disabled="!canManage || !selectedRoutes || selectedRoutes.length === 0"
            @click="confirmDeleteSelected"
          />
          <BaseIconButton
            icon="pi pi-calendar"
            :label="t('createShifts.button')"
            size="small"
            severity="info"
            outlined
            :disabled="!canManage"
            @click="openCreateShifts"
          />
        </div>
      </template>

      <template #toolbar-end>
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
      </template>

      <Column
        v-if="canManage"
        selectionMode="multiple"
        style="width: 3rem"
        :exportable="false"
        sortDisabled
      />

      <!-- <Column field="route_code" :header="t('routeList.routeCode')" style="min-width: 8rem" /> -->
      <Column field="route_name" :header="t('routeList.routeName')" style="min-width: 16rem" />

      <Column
        :header="t('routeList.area')"
        style="min-width: 12rem"
        sortField="area_name"
        :filterMenu="{
          key: 'areaId',
          type: 'select',
          value: store.filterAreaId,
          options: routeFilterAreaOptions,
          placeholder: t('routeList.area'),
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.area_name }}</div>
        </template>
      </Column>

      <Column
        :header="t('routeList.role')"
        style="min-width: 8rem"
        sortField="role_name"
        :filterMenu="{
          key: 'roleId',
          type: 'select',
          value: store.filterRoleId,
          options: routeFilterRoleOptions,
          placeholder: t('routeList.role'),
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ displayRoleName(data.role_name, data.role_code) }}</div>
        </template>
      </Column>

      <Column field="route_priority" :header="t('routeList.priority')" style="min-width: 8rem" />

      <Column
        :header="t('routeList.minMinute')"
        style="min-width: 12rem"
        sortField="route_min_minute"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.route_min_minute }}:00</div>
        </template>
      </Column>

      <Column
        :header="t('routeList.maxMinute')"
        style="min-width: 12rem"
        sortField="route_max_minute"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.route_max_minute }}:00</div>
        </template>
      </Column>

      <Column
        :header="t('routeList.totalPoints')"
        style="min-width: 8rem"
        sortField="details_count"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.details_count }}</div>
        </template>
      </Column>

      <Column :header="t('routeList.status')" style="min-width: 12rem" sortField="route_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.route_status)"
            :severity="statusSeverity(data.route_status)"
          />
        </template>
      </Column>

      <Column :header="t('common.action')" style="width: 260px" sortDisabled>
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

    <RouteCreateShiftsDialog
      v-model:visible="createShiftsVisible"
      :loading="createShiftsLoading"
      @submit="submitCreateShifts"
    />

    <RouteForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :areaOptions="store.areaOptions"
      :roleOptions="translatedRoleOptions"
      :loading="formSubmitting"
      @submit="handleSubmit"
      @close="formModel = null"
    />
  </div>
</template>
