<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'

import { useUsersStore } from '@/modules/users/users.store'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRow } from '@/modules/users/users.types'
import { deleteUserMock } from '@/modules/users/users.api'

import UserFilters from '../components/UserFilters.vue'
import UserForm, {
  type UserFormModel,
  type UserFormMode,
  type UserFormSubmitPayload,
} from '../components/UserForm.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useUsersStore()
const auth = useAuthStore()
const router = useRouter()

const canManage = computed(() => auth.canAccess('users.manage'))

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterRoleId, store.filterAreaId],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
  console.log(store.filteredRows)
})

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
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
    user_role_id: store.roleOptions[0]?.value ?? 0,
    user_area_id: store.areaOptions[0]?.value ?? 0,
    user_password: '',
  }
  formVisible.value = true
}

function openView(row: UserRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: UserRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

async function onDelete(row: UserRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete user ${row.user_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteUserMock({ user_id: row.user_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
        selectedUsers.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'User has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete user.',
          life: 3000,
        })
      }
    },
  })
}

function confirmDeleteSelected() {
  const items = selectedUsers.value ?? []
  if (!items.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${items.length} selected user(s)?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        const actor = auth.user?.user_id ?? ''
        for (const u of items) {
          await deleteUserMock({ user_id: u.user_id, actor_id: actor })
        }
        await store.load()
        selectedUsers.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected users have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete users.',
          life: 3000,
        })
      }
    },
  })
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
  selectedUsers.value = null
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
      detail: formMode.value === 'new' ? 'User has been created.' : 'User has been updated.',
      life: 2000,
    })
  } catch (e: any) {
    const msg =
      e?.message === 'USER_CODE_EXISTS'
        ? 'User code already exists.'
        : (e?.message ?? 'Failed to save user.')
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
  }
}

function onViewPatrolPath(row: UserRow) {
  router.push({ name: 'user-patrol-path', params: { id: row.user_id } })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Users Management</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="searchDraft" label="" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <UserFilters
      :roleOptions="store.roleOptions"
      :areaOptions="store.areaOptions"
      :modelRoleId="store.filterRoleId"
      :modelAreaId="store.filterAreaId"
      @update:modelRoleId="store.filterRoleId = $event"
      @update:modelAreaId="store.filterAreaId = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title="Users"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="user_id"
      v-model:selection="selectedUsers"
      :rows="store.rowsPerPage"
    >
      <template #toolbar-start>
        <div class="flex gap-2">
          <BaseIconButton
            icon="pi pi-plus"
            label="New"
            severity="success"
            :disabled="!canManage"
            @click="openNew"
          />
          <BaseIconButton
            icon="pi pi-trash"
            label="Delete"
            severity="danger"
            outlined
            :disabled="!canManage || !selectedUsers || selectedUsers.length === 0"
            @click="confirmDeleteSelected"
          />
        </div>
      </template>

      <template #toolbar-end>
        <!-- Import/Export -->
      </template>

      <Column selectionMode="multiple" style="width: 3rem" :exportable="false" sortDisabled />

      <Column field="user_name" header="Name" style="min-width: 14rem" />
      <Column field="user_code" header="User Code" style="min-width: 10rem" />
      <Column header="Area" style="min-width: 14rem" sortField="area_name">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.area_name }}</div>
        </template>
      </Column>

      <Column header="Role" style="min-width: 12rem" sortField="role_name">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.role_name }}</div>
        </template>
      </Column>

      <Column header="Status" style="min-width: 10rem" sortField="user_status">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.user_status)"
            :severity="statusSeverity(data.user_status)"
          />
        </template>
      </Column>

      <!-- <Column header="Patrol Routes" style="min-width: 12rem" :exportable="false">
        <template #body="{ data }">
          <div class="flex justify-start">
            <BaseIconButton
              icon="pi pi-eye"
              label="View"
              size="small"
              severity="secondary"
              outlined
              @click="onViewPatrolPath(data)"
            />
          </div>
        </template>
      </Column> -->

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
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              outlined
              rounded
              :disabled="!canManage"
              @click="openEdit(data)"
            />
            <BaseIconButton
              icon="pi pi-trash"
              size="small"
              severity="danger"
              outlined
              rounded
              :disabled="!canManage"
              @click="onDelete(data)"
            />
          </div>
        </template>
      </Column>
    </BaseDataTable>

    <UserForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :roleOptions="store.roleOptions"
      :areaOptions="store.areaOptions"
      @submit="handleSubmit"
      @close="formVisible = false"
    />
  </div>
</template>
