<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import { useUsersStore } from '@/modules/users/users.store'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRow } from '@/modules/users/users.types'
import { deleteUserMock } from '@/modules/users/users.api'

import UserFilters from '../components/UserFilters.vue'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useUsersStore()
const auth = useAuthStore()

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterRoleId, store.filterStatus],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function onCreate() {
  router.push({ name: 'users-create' })
}

function onView(row: UserRow) {
  toast.add({
    severity: 'info',
    summary: 'View',
    detail: 'View is not implemented yet.',
    life: 2000,
  })
}

function onEdit(row: UserRow) {
  router.push({ name: 'users-edit', params: { id: row.user_id } })
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

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
}

const canManage = computed(() => auth.canAccess('users.manage'))
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Users Management</div>

      <div class="w-full max-w-md">
        <BaseInput
          v-model="searchDraft"
          class="w-full"
          placeholder="Search name / user code / role"
        />
      </div>
    </div>

    <UserFilters
      :roleOptions="store.roleOptions"
      :modelRoleId="store.filterRoleId"
      :modelStatus="store.filterStatus"
      @update:modelRoleId="store.filterRoleId = $event"
      @update:modelStatus="store.filterStatus = $event"
      @clear="clearAll"
    />

    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <DataTable
        :value="store.filteredRows"
        :loading="store.loading"
        dataKey="user_id"
        paginator
        :rows="store.rowsPerPage"
        :first="store.first"
        @page="onPage"
        stripedRows
        rowHover
        responsiveLayout="scroll"
        class="p-datatable-sm"
      >
        <template #empty>
          <div class="p-4 text-slate-600">No users found.</div>
        </template>

        <Column field="user_name" header="Name" />
        <Column field="user_code" header="User Code" />

        <Column header="Role">
          <template #body="{ data }">
            <div class="text-slate-800">{{ data.role_name }}</div>
          </template>
        </Column>

        <Column header="Status">
          <template #body="{ data }">
            <Tag
              :value="statusLabel(data.user_status)"
              :severity="statusSeverity(data.user_status)"
            />
          </template>
        </Column>

        <Column header="Action" style="width: 240px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <BaseButton
                label="View"
                size="small"
                severity="secondary"
                outlined
                @click="onView(data)"
              />
              <BaseButton
                label="Edit"
                size="small"
                severity="warning"
                outlined
                :disabled="!canManage"
                @click="onEdit(data)"
              />
              <BaseButton
                label="Delete"
                size="small"
                severity="danger"
                outlined
                :disabled="!canManage"
                @click="onDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="flex justify-end">
      <BaseButton label="Create User" severity="success" :disabled="!canManage" @click="onCreate" />
    </div>
  </div>
</template>
