<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import Column from 'primevue/column'
import Tag from 'primevue/tag'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useRoutesStore } from '@/modules/routes/routes.store'
import type { RouteRow } from '@/modules/routes/routes.types'
import { deleteRouteMock, fetchRouteById } from '@/modules/routes/routes.api'

import RouteFilters from '../components/RouteFilters.vue'
import RouteForm, {
  type RouteFormMode,
  type RouteFormModel,
  type RouteFormSubmitPayload,
} from '../components/RouteForm.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useRoutesStore()
const auth = useAuthStore()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('routes.manage'))

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
  return s === 1 ? 'Active' : 'Inactive'
}
function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

const selectedRoutes = ref<RouteRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<RouteFormMode>('view')
const formModel = ref<RouteFormModel | null>(null)

function mapRowToFormModel(row: RouteRow): RouteFormModel {
  return {
    route_id: row.route_id,
    route_code: row.route_code,
    route_name: row.route_name,
    area_id: row.area_id,
    role_id: row.role_id,
    role_name: row.role_name,
    route_priority: row.route_priority,
    route_total_minute: row.route_total_minute,
    details: row.details.map((d) => ({ ...d })),
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    route_code: '',
    route_name: '',
    area_id: 0,
    role_id: 0,
    role_name: '',
    route_priority: 1,
    route_total_minute: 0,
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

async function openView(row: RouteRow) {
  formMode.value = 'view'
  formModel.value = await hydrateFormModel(row)
  formVisible.value = true
}

async function openEdit(row: RouteRow) {
  formMode.value = 'edit'
  formModel.value = await hydrateFormModel(row)
  formVisible.value = true
}

async function onDelete(row: RouteRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete route ${row.route_code} - ${row.route_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteRouteMock({ route_id: row.route_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
        selectedRoutes.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Route has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete route.',
          life: 3000,
        })
      }
    },
  })
}

function confirmDeleteSelected() {
  const items = selectedRoutes.value ?? []
  if (!items.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${items.length} selected route(s)?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        const actor = auth.user?.user_id ?? ''
        for (const r of items) {
          await deleteRouteMock({ route_id: r.route_id, actor_id: actor })
        }
        await store.load()
        selectedRoutes.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected routes have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete routes.',
          life: 3000,
        })
      }
    },
  })
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
  selectedRoutes.value = null
}

async function handleSubmit(payload: RouteFormSubmitPayload) {
  try {
    const actor = auth.user?.user_id ?? ''
    await payload.submit(actor)
    await store.load()
    selectedRoutes.value = null
    formVisible.value = false
    formModel.value = null

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: formMode.value === 'new' ? 'Route has been created.' : 'Route has been updated.',
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to save route.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">Patrol Routes</div>

    <RouteFilters
      :areaOptions="routeFilterAreaOptions"
      :modelAreaId="store.filterAreaId"
      :modelStatus="store.filterStatus"
      :modelSearch="searchDraft"
      @update:modelAreaId="store.filterAreaId = $event"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelSearch="searchDraft = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title="Routes"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="route_id"
      v-model:selection="selectedRoutes"
      :rows="store.rowsPerPage"
    >
      <template v-if="canManage" #toolbar-start>
        <div class="flex gap-2">
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
            :disabled="!canManage || !selectedRoutes || selectedRoutes.length === 0"
            @click="confirmDeleteSelected"
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

      <Column field="route_code" header="Route Code" style="min-width: 10rem" />
      <Column field="route_name" header="Route Name" style="min-width: 14rem" />

      <Column header="Area" style="min-width: 10rem" sortField="area_name">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.area_name }}</div>
        </template>
      </Column>

      <Column header="Role" style="min-width: 8rem" sortField="role_name">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.role_name || data.role_code || '—' }}</div>
        </template>
      </Column>

      <Column field="route_priority" header="Priority" style="min-width: 8rem" />

      <Column header="Total Time" style="min-width: 10rem" sortField="route_total_second">
        <template #body="{ data }">
          <div class="text-slate-800">{{ formatSeconds(data.route_total_second) }}</div>
        </template>
      </Column>

      <Column header="Total Points" style="min-width: 8rem" sortField="details_count">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.details_count }}</div>
        </template>
      </Column>

      <Column header="Status" style="min-width: 10rem" sortField="route_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.route_status)"
            :severity="statusSeverity(data.route_status)"
          />
        </template>
      </Column>

      <Column header="Action" style="width: 260px" sortDisabled>
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

    <RouteForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :areaOptions="store.areaOptions"
      :roleOptions="store.roleOptions"
      @submit="handleSubmit"
      @close="formModel = null"
    />
  </div>
</template>
