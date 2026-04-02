<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'

import { useUsersStore } from '@/modules/users/users.store'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRow } from '@/modules/users/users.types'
import { deleteUserMock, fetchUserById } from '@/modules/users/users.api'

import UserForm, {
  type UserFormModel,
  type UserFormMode,
  type UserFormSubmitPayload,
} from '../components/UserForm.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { exportUsersXlsx } from '@/services/export/users.export'
import {
  useDebouncedSearchDraft,
  useResetFirstOnFilterChange,
  resetFiltersWithSearchDraft,
} from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'
import { translateRoleName } from '@/utils/dataI18n'

const toast = useToast()

const store = useUsersStore()
const auth = useAuthStore()
const router = useRouter()
const { t, locale } = useI18n()

const canManage = computed(() => auth.isAdminUser && auth.canAccess('users.manage'))
const exporting = ref(false)

const translatedRoleOptions = computed(() =>
  (store.roleOptions ?? []).map((option) => ({
    ...option,
    label: translateRoleName(String(option.label ?? ''), t),
  })),
)
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
  () => [
    store.searchText,
    store.filterUserId,
    store.filterUserCode,
    store.filterRoleId,
    store.filterAreaId,
  ],
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
  return s === 1 ? t('userList.userStatusOptions.active') : t('userList.userStatusOptions.inactive')
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function displayRoleName(roleName: string) {
  return translateRoleName(String(roleName ?? ''), t)
}

const selectedUsers = ref<UserRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<UserFormMode>('view')
const formModel = ref<UserFormModel | null>(null)

function mapRowToFormModel(row: UserRow): UserFormModel {
  return {
    user_id: row.user_id,
    user_name: row.user_name,
    user_code: row.user_code,
    user_role_id: row.user_role_id,
    user_area_id: row.user_area_id,
    user_password: '',
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    user_name: '',
    user_code: '',
    user_role_id: 0,
    user_area_id: 0,
    user_password: '',
  }
  formVisible.value = true
}

async function openView(row: UserRow) {
  formMode.value = 'view'
  const detail = (await fetchUserById(row.user_id)) ?? row
  formModel.value = mapRowToFormModel(detail as UserRow)
  formVisible.value = true
}

async function openEdit(row: UserRow) {
  formMode.value = 'edit'
  const detail = (await fetchUserById(row.user_id)) ?? row
  formModel.value = mapRowToFormModel(detail as UserRow)
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

async function onDelete(row: UserRow) {
  openDeleteConfirm(`${t('userList.error.areYouSure')} ${row.user_name}?`, async () => {
    try {
      await deleteUserMock({ user_id: row.user_id, actor_id: auth.user?.user_id ?? '' })
      await store.load()
      selectedUsers.value = null
      toast.add({
        severity: 'success',
        summary: t('common.deleted'),
        detail: t('userList.success.deleteDetail'),
        life: 2000,
      })
    } catch (e: any) {
      toast.add({
        severity: 'error',
        summary: t('common.error'),
        detail: e?.message ?? t('userList.error.deleteFailed'),
        life: 3000,
      })
      throw e
    }
  })
}

function confirmDeleteSelected() {
  const items = selectedUsers.value ?? []
  if (!items.length) return

  openDeleteConfirm(
    `${t('userList.error.areYouSureMultiple')} ${items.length} ${t('userList.error.selectedUsers')}?`,
    async () => {
      try {
        const actor = auth.user?.user_id ?? ''
        for (const u of items) {
          await deleteUserMock({ user_id: u.user_id, actor_id: actor })
        }
        await store.load()
        selectedUsers.value = null
        toast.add({
          severity: 'success',
          summary: t('common.deleted'),
          detail: t('userList.success.deleteDetailMultiple'),
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: e?.message ?? t('userList.error.deleteFailedMultiple'),
          life: 3000,
        })
        throw e
      }
    },
  )
}

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'userId') store.filterUserId = payload.value ?? null
  if (payload.key === 'userCode') store.filterUserCode = String(payload.value ?? '')
  if (payload.key === 'roleId') store.filterRoleId = payload.value ?? null
  if (payload.key === 'areaId') store.filterAreaId = payload.value ?? null
}

function clearAll() {
  resetFiltersWithSearchDraft({
    clear: () => store.clearFilters(),
    searchDraft,
    afterClear: () => {
      selectedUsers.value = null
    },
  })
}

async function onExport() {
  exporting.value = true
  try {
    await exportUsersXlsx({
      rows: store.filteredRows,
      fileName: `users_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: String(e?.message ?? t('userList.error.exportFailed')),
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

async function handleSubmit(payload: UserFormSubmitPayload) {
  try {
    const actor = auth.user?.user_id ?? ''
    await payload.submit(actor)
    await store.load()
    selectedUsers.value = null
    formVisible.value = false

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail:
        formMode.value === 'new'
          ? t('userList.success.userCreated')
          : t('userList.success.userUpdated'),
      life: 2000,
    })
  } catch (e: any) {
    const msg =
      e?.message === 'USER_CODE_EXISTS'
        ? t('userList.error.codeExists')
        : (e?.message ?? t('userList.error.saveFailed'))
    toast.add({ severity: 'error', summary: t('common.error'), detail: msg, life: 3000 })
  }
}

function onViewPatrolPath(row: UserRow) {
  router.push({ name: 'user-patrol-path', params: { id: row.user_id } })
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-[26px] font-semibold text-slate-800">{{ t('userList.title') }}</div>

    <BaseDataTable
      title="Users"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="user_id"
      v-model:selection="selectedUsers"
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
            :disabled="!canManage || !selectedUsers || selectedUsers.length === 0"
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

      <Column
        field="user_name"
        :header="t('userList.userName')"
        style="min-width: 14rem"
        :filterMenu="{
          key: 'userId',
          type: 'select',
          value: store.filterUserId,
          options: store.userOptions,
          placeholder: t('userList.userName'),
          filter: true,
        }"
      />
      <!--
        If you want the User Code filter to show a selectable list later, uncomment:
        options: store.userCodeOptions,
        filter: true,
        and change type from 'text' to 'select'.
      -->
      <Column
        field="user_code"
        :header="t('userList.userCode')"
        style="min-width: 10rem"
        :filterMenu="{
          key: 'userCode',
          type: 'text',
          value: store.filterUserCode,
          placeholder: t('userList.userCode'),
        }"
      />
      <Column
        :header="t('userList.area')"
        style="min-width: 14rem"
        sortField="area_name"
        :filterMenu="{
          key: 'areaId',
          type: 'select',
          value: store.filterAreaId,
          options: store.areaOptions,
          placeholder: t('userList.area'),
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.area_name }}</div>
        </template>
      </Column>

      <Column
        :header="t('userList.role')"
        style="min-width: 12rem"
        sortField="role_name"
        :filterMenu="{
          key: 'roleId',
          type: 'select',
          value: store.filterRoleId,
          options: translatedRoleOptions,
          placeholder: t('userList.role'),
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">{{ displayRoleName(data.role_name) }}</div>
        </template>
      </Column>

      <Column :header="t('userList.status')" style="min-width: 10rem" sortField="user_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.user_status)"
            :severity="statusSeverity(data.user_status)"
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

    <UserForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :roleOptions="translatedRoleOptions"
      :areaOptions="store.areaOptions"
      @submit="handleSubmit"
      @close="formVisible = false"
    />
  </div>
</template>
