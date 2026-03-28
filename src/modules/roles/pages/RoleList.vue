<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'

import { useRolesStore } from '@/modules/roles/roles.store'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleRow } from '@/modules/roles/roles.types'
import { deleteRole, fetchRoleById } from '@/modules/roles/roles.api'
import { fetchUserRows } from '@/modules/users/users.api'
import { exportRolesXlsx } from '@/services/export/roles.export'

import {
  useDebouncedSearchDraft,
  useResetFirstOnFilterChange,
  resetFiltersWithSearchDraft,
} from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

import RoleForm, {
  type RoleFormModel,
  type RoleFormMode,
  type RoleFormSubmitPayload,
} from '../components/RoleForm.vue'

const toast = useToast()
const store = useRolesStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('roles.manage'))
const exporting = ref(false)

const roleStatusOptions = [
  { label: t('roleList.roleStatusOptions.all'), value: t('roleList.roleStatusOptions.all') },
  { label: t('roleList.roleStatusOptions.active'), value: t('roleList.roleStatusOptions.active') },
  {
    label: t('roleList.roleStatusOptions.inactive'),
    value: t('roleList.roleStatusOptions.inactive'),
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
  () => [store.searchText, store.filterStatus, store.filterMenuId],
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
  return s === 1 ? t('roleList.roleStatusOptions.active') : t('roleList.roleStatusOptions.inactive')
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

async function openView(row: RoleRow) {
  formMode.value = 'view'
  const detail = (await fetchRoleById(row.role_id)) ?? row
  formModel.value = mapRowToFormModel(detail as RoleRow)
  formVisible.value = true
}

async function openEdit(row: RoleRow) {
  formMode.value = 'edit'
  const detail = (await fetchRoleById(row.role_id)) ?? row
  formModel.value = mapRowToFormModel(detail as RoleRow)
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

async function onDelete(row: RoleRow) {
  try {
    const counts = await getAssignedUserCounts([row.role_id])
    const assignedCount = counts.get(row.role_id) ?? 0

    if (assignedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: t('roleList.error.deleteRestricted'),
        detail: `${t('roleList.error.deleteDetail')} ${assignedCount} ${t('roleList.error.user')}.`,
        life: 3500,
      })
      return
    }

    openDeleteConfirm(`${t('roleList.error.areYouSure')} ${row.role_name}?`, async () => {
      try {
        await deleteRole({ role_id: row.role_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
        selectedRoles.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('roleList.success.deleteDetail'),
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: e?.message ?? t('roleList.error.deleteFailed'),
          life: 3000,
        })
        throw e
      }
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: e?.message ?? t('roleList.error.validate'),
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
        summary: t('roleList.error.deleteRestricted'),
        detail:
          blocked.length === 1 && firstBlocked
            ? `${t('roleList.error.DeleteDetailMultipleFirst')} "${firstBlocked.role_name}" ${t('roleList.error.assignedFirst')} ${counts.get(firstBlocked.role_id) ?? 0} ${t('roleList.error.user')}.`
            : `${t('roleList.error.DeleteDetailMultipleSecond')} ${blocked.length} ${t('roleList.error.assignedSecond')} ${totalAssigned} ${t('roleList.error.user')}).`,
        life: 4000,
      })
      return
    }

    openDeleteConfirm(
      `${t('roleList.error.areYouSureMultiple')} ${items.length} ${t('roleList.error.multipleRoles')}?`,
      async () => {
        try {
          const actor = auth.user?.user_id ?? ''

          for (const r of items) {
            await deleteRole({ role_id: r.role_id, actor_id: actor })
          }

          await store.load()
          selectedRoles.value = null
          toast.add({
            severity: 'success',
            summary: t('common.deleted'),
            detail: t('roleList.success.deleteDetailMultiple'),
            life: 2000,
          })
        } catch (e: any) {
          toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: e?.message ?? t('roleList.error.deleteFailedMultiple'),
            life: 3000,
          })
          throw e
        }
      },
    )
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: e?.message ?? t('roleList.error.validate'),
      life: 3000,
    })
  }
}

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'status') store.filterStatus = payload.value ?? 'ALL'
  if (payload.key === 'menuId') store.filterMenuId = payload.value ?? null
}

function clearAll() {
  resetFiltersWithSearchDraft({
    clear: () => store.clearFilters(),
    searchDraft,
    afterClear: () => {
      selectedRoles.value = null
    },
  })
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
      summary: t('common.error'),
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
      summary: t('common.save'),
      detail:
        formMode.value === 'new'
          ? t('roleList.success.roleCreated')
          : t('roleList.success.roleEdited'),
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? t('roleList.error.saveFailed'),
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('roleList.title') }}</div>

    <BaseDataTable
      :key="`role-list-table-${locale}`"
      title="Roles"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="role_id"
      v-model:selection="selectedRoles"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="searchDraft"
      @update:modelSearch="searchDraft = $event"
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
            :disabled="!canManage || !selectedRoles || selectedRoles.length === 0"
            @click="confirmDeleteSelected"
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

      <Column field="role_code" :header="t('roleList.roleCode')" style="min-width: 10rem" />
      <Column field="role_name" :header="t('roleList.roleName')" style="min-width: 14rem" />

      <Column
        :header="t('roleList.accessPermission')"
        style="min-width: 16rem"
        sortField="menu_count"
        :filterMenu="{
          key: 'menuId',
          type: 'select',
          value: store.filterMenuId,
          options: store.menuOptions,
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">
            {{ data.menu_count }} {{ t('roleList.accessPermissionNumber') }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('roleList.status')"
        style="min-width: 10rem"
        sortField="role_status"
        :filterMenu="{
          key: 'status',
          type: 'select',
          value: store.filterStatus,
          options: roleStatusOptions,
          showClear: false,
        }"
      >
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.role_status)"
            :severity="statusSeverity(data.role_status)"
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
