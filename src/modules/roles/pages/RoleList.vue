<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useRolesStore } from '@/modules/roles/roles.store'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleRow } from '@/modules/roles/roles.types'
import { deleteRole } from '@/modules/roles/roles.api'
import { fetchUserRows } from '@/modules/users/users.api'
import { exportRolesXlsx } from '@/services/export/roles.export'

import RoleFilters from '../components/RoleFilters.vue'
import RoleForm, {
  type RoleFormModel,
  type RoleFormMode,
  type RoleFormSubmitPayload,
} from '../components/RoleForm.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useRolesStore()
const auth = useAuthStore()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('roles.manage'))
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
  () => [store.searchText, store.filterStatus, store.filterMenuId],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}
function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

const selectedRoles = ref<RoleRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<RoleFormMode>('view')
const formModel = ref<RoleFormModel | null>(null)

function mapRowToFormModel(row: RoleRow): RoleFormModel {
  return {
    role_id: row.role_id,
    role_code: row.role_code,
    role_name: row.role_name,
    role_hour_report: Boolean(row.role_hour_report),
    role_is_admin: Boolean(row.role_is_admin),
    mc_ids: Array.isArray(row.menu_ids) ? [...row.menu_ids] : [],
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    role_code: '',
    role_name: '',
    role_hour_report: false,
    role_is_admin: false,
    mc_ids: [],
  }
  formVisible.value = true
}

function openView(row: RoleRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: RoleRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

async function getAssignedUserCounts(roleIds: number[]) {
  const users = await fetchUserRows()
  const counts = new Map<number, number>()

  for (const user of users) {
    const roleId = Number(user.user_role_id ?? 0)
    if (!roleIds.includes(roleId)) continue
    counts.set(roleId, (counts.get(roleId) ?? 0) + 1)
  }

  return counts
}

async function onDelete(row: RoleRow) {
  try {
    const counts = await getAssignedUserCounts([row.role_id])
    const assignedCount = counts.get(row.role_id) ?? 0

    if (assignedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Delete Restricted',
        detail: `Cannot delete because this role is assigned to ${assignedCount} user(s).`,
        life: 3500,
      })
      return
    }

    confirm.require({
      header: 'Confirm Delete',
      message: `Delete role ${row.role_name}?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: async () => {
        try {
          await deleteRole({ role_id: row.role_id, actor_id: auth.user?.user_id ?? '' })
          await store.load()
          selectedRoles.value = null
          toast.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Role has been deleted.',
            life: 2000,
          })
        } catch (e: any) {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: e?.message ?? 'Failed to delete role.',
            life: 3000,
          })
        }
      },
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to validate role delete restriction.',
      life: 3000,
    })
  }
}

async function confirmDeleteSelected() {
  const items = selectedRoles.value ?? []
  if (!items.length) return

  try {
    const roleIds = items.map((r) => r.role_id)
    const counts = await getAssignedUserCounts(roleIds)

    const blocked = items.filter((r) => (counts.get(r.role_id) ?? 0) > 0)
    if (blocked.length > 0) {
      const totalAssigned = blocked.reduce((sum, r) => sum + (counts.get(r.role_id) ?? 0), 0)
      const firstBlocked = blocked[0]

      toast.add({
        severity: 'warn',
        summary: 'Delete Restricted',
        detail:
          blocked.length === 1 && firstBlocked
            ? `Cannot delete because role "${firstBlocked.role_name}" is assigned to ${counts.get(firstBlocked.role_id) ?? 0} user(s).`
            : `Cannot delete because ${blocked.length} selected role(s) are still assigned to ${totalAssigned} user(s).`,
        life: 4000,
      })
      return
    }

    confirm.require({
      header: 'Confirm Delete',
      message: `Delete ${items.length} selected role(s)?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: async () => {
        try {
          const actor = auth.user?.user_id ?? ''

          for (const r of items) {
            await deleteRole({ role_id: r.role_id, actor_id: actor })
          }

          await store.load()
          selectedRoles.value = null
          toast.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Selected roles have been deleted.',
            life: 2000,
          })
        } catch (e: any) {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: e?.message ?? 'Failed to delete roles.',
            life: 3000,
          })
        }
      },
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to validate role delete restriction.',
      life: 3000,
    })
  }
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
  selectedRoles.value = null
}

async function onExport() {
  exporting.value = true
  try {
    await exportRolesXlsx({
      rows: store.filteredRows,
      fileName: `roles_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export roles.'),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

async function handleSubmit(payload: RoleFormSubmitPayload) {
  try {
    const actor = auth.user?.user_id ?? ''
    await payload.submit(actor)
    await store.load()
    selectedRoles.value = null
    formVisible.value = false

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: formMode.value === 'new' ? 'Role has been created.' : 'Role has been updated.',
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to save role.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">Roles Management</div>

    <RoleFilters
      :menuOptions="store.menuOptions"
      :modelStatus="store.filterStatus"
      :modelMenuId="store.filterMenuId"
      :modelSearch="searchDraft"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelMenuId="store.filterMenuId = $event"
      @update:modelSearch="searchDraft = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title="Roles"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="role_id"
      v-model:selection="selectedRoles"
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
            :disabled="!canManage || !selectedRoles || selectedRoles.length === 0"
            @click="confirmDeleteSelected"
          />
        </div>
      </template>

      <template #toolbar-end>
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
      </template>

      <Column
        v-if="canManage"
        selectionMode="multiple"
        style="width: 3rem"
        :exportable="false"
        sortDisabled
      />

      <Column field="role_code" header="Role Code" style="min-width: 10rem" />
      <Column field="role_name" header="Role Name" style="min-width: 14rem" />

      <Column header="Access Permissions" style="min-width: 16rem" sortField="menu_count">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.menu_count }} access permission(s)</div>
        </template>
      </Column>

      <Column header="Status" style="min-width: 10rem" sortField="role_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.role_status)"
            :severity="statusSeverity(data.role_status)"
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

    <RoleForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :menuOptions="store.menuOptions"
      @submit="handleSubmit"
      @close="formVisible = false"
    />
  </div>
</template>
