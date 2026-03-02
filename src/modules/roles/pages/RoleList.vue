<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useRolesStore } from '@/modules/roles/roles.store'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleRow } from '@/modules/roles/roles.types'
import { deleteRole } from '@/modules/roles/roles.api'

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

const canManage = computed(() => auth.canAccess('roles.manage'))

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
    mc_ids: Array.isArray(row.menu_ids) ? [...row.menu_ids] : [],
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    role_code: '',
    role_name: '',
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

async function onDelete(row: RoleRow) {
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
}

function confirmDeleteSelected() {
  const items = selectedRoles.value ?? []
  if (!items.length) return

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
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
  selectedRoles.value = null
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
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Roles Management</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="searchDraft" label="" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <RoleFilters
      :menuOptions="store.menuOptions"
      :modelStatus="store.filterStatus"
      :modelMenuId="store.filterMenuId"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelMenuId="store.filterMenuId = $event"
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
            :disabled="!canManage || !selectedRoles || selectedRoles.length === 0"
            @click="confirmDeleteSelected"
          />
        </div>
      </template>

      <Column selectionMode="multiple" style="width: 3rem" :exportable="false" />

      <Column field="role_code" header="Role Code" style="min-width: 10rem" />
      <Column field="role_name" header="Role Name" style="min-width: 14rem" />

      <Column header="Permissions" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="text-slate-800">{{ data.menu_count }} permission(s)</div>
        </template>
      </Column>

      <Column header="Status" style="min-width: 10rem">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.role_status)"
            :severity="statusSeverity(data.role_status)"
          />
        </template>
      </Column>

      <Column header="Action" style="width: 260px">
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
