<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useMenuCategoriesStore } from '@/modules/menuCategories/menuCategories.store'
import { useAuthStore } from '@/stores/auth.store'
import type { MenuCategoryRow } from '@/modules/menuCategories/menuCategories.types'
import {
  deleteMenuCategory,
  fetchMenuCategoryById,
} from '@/modules/menuCategories/menuCategories.api'

import MenuCategoryFilters from '../components/MenuCategoryFilters.vue'
import MenuCategoryForm, {
  type MenuCategoryFormModel,
  type MenuCategoryFormMode,
  type MenuCategoryFormSubmitPayload,
} from '../components/MenuCategoryForm.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useMenuCategoriesStore()
const auth = useAuthStore()

const canManage = computed(() => auth.isAdminUser)

const searchDraft = ref(store.searchText)
let searchTimer: number | undefined

watch(searchDraft, (val) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.searchText = val
  }, 300)
})

watch(
  () => [store.searchText, store.filterStatus],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

function statusLabel(active: boolean) {
  return active ? 'Active' : 'Inactive'
}

function statusSeverity(active: boolean) {
  return active ? 'success' : 'secondary'
}

const selectedRows = ref<MenuCategoryRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<MenuCategoryFormMode>('view')
const formModel = ref<MenuCategoryFormModel | null>(null)

function mapRowToFormModel(row: MenuCategoryRow): MenuCategoryFormModel {
  return {
    mc_id: row.mc_id,
    mc_code: row.mc_code,
    mc_name: row.mc_name,
    mc_active: Boolean(row.mc_active),
    mc_priority: Number(row.mc_priority ?? 0),
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    mc_code: '',
    mc_name: '',
    mc_active: true,
    mc_priority: 0,
  }
  formVisible.value = true
}

async function openView(row: MenuCategoryRow) {
  try {
    const detail = await fetchMenuCategoryById(row.mc_id)
    formMode.value = 'view'
    formModel.value = mapRowToFormModel(detail)
    formVisible.value = true
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load menu category detail.',
      life: 3000,
    })
  }
}

async function openEdit(row: MenuCategoryRow) {
  try {
    const detail = await fetchMenuCategoryById(row.mc_id)
    formMode.value = 'edit'
    formModel.value = mapRowToFormModel(detail)
    formVisible.value = true
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load menu category detail.',
      life: 3000,
    })
  }
}

async function onDelete(row: MenuCategoryRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete menu category ${row.mc_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteMenuCategory({
          mc_id: row.mc_id,
          actor_id: auth.user?.user_id ?? '',
        })
        await store.load()
        selectedRows.value = null

        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Menu category has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete menu category.',
          life: 3000,
        })
      }
    },
  })
}

function confirmDeleteSelected() {
  const items = selectedRows.value ?? []
  if (!items.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${items.length} selected menu categor${items.length > 1 ? 'ies' : 'y'}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        const actor = auth.user?.user_id ?? ''
        for (const row of items) {
          await deleteMenuCategory({
            mc_id: row.mc_id,
            actor_id: actor,
          })
        }

        await store.load()
        selectedRows.value = null

        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected menu categories have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete menu categories.',
          life: 3000,
        })
      }
    },
  })
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
  selectedRows.value = null
}

async function handleSubmit(payload: MenuCategoryFormSubmitPayload) {
  try {
    const actor = auth.user?.user_id ?? ''
    await payload.submit(actor)
    await store.load()

    selectedRows.value = null
    formVisible.value = false
    formModel.value = null

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail:
        formMode.value === 'new'
          ? 'Menu category has been created.'
          : 'Menu category has been updated.',
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to save menu category.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-xl font-semibold text-slate-800">Menu Categories Management</div>

    <MenuCategoryFilters
      :modelStatus="store.filterStatus"
      :modelSearch="searchDraft"
      @update:modelStatus="store.filterStatus = $event"
      @update:modelSearch="searchDraft = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title="Menu Categories"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="mc_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      v-model:selection="selectedRows"
      @page="(e) => store.setFirst(e.first)"
    >
      <template v-if="canManage" #toolbar-start>
        <div class="flex gap-2">
          <BaseIconButton
            icon="pi pi-plus"
            label="New"
            size="small"
            severity="success"
            @click="openNew"
          />
          <BaseIconButton
            icon="pi pi-trash"
            label="Delete"
            size="small"
            severity="danger"
            outlined
            :disabled="!selectedRows || selectedRows.length === 0"
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

      <Column field="mc_code" header="MC Code" style="min-width: 12rem" />
      <Column field="mc_name" header="MC Name" style="min-width: 14rem" />

      <Column header="Status" style="min-width: 10rem" sortField="mc_active">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.mc_active)" :severity="statusSeverity(data.mc_active)" />
        </template>
      </Column>

      <Column field="mc_priority" header="Priority" style="min-width: 8rem" />

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

    <MenuCategoryForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      @submit="handleSubmit"
      @close="formVisible = false"
    />
  </div>
</template>
