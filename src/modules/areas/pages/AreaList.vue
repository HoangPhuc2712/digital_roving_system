<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

import { useAreasStore } from '@/modules/areas/areas.store'
import { useAuthStore } from '@/stores/auth.store'
import type { AreaRow } from '@/modules/areas/areas.types'
import { deleteAreaMock } from '@/modules/areas/areas.api'

import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'

import AreaForm, {
  type AreaFormMode,
  type AreaFormModel,
  type AreaFormSubmitPayload,
} from '@/modules/areas/components/AreaForm.vue'

const toast = useToast()
const confirm = useConfirm()

const store = useAreasStore()
const auth = useAuthStore()

const canManage = computed(() => auth.canAccess('areas.manage'))

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

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

function statusLabel(s: number) {
  return s === 1 ? 'Active' : 'Inactive'
}

function statusSeverity(s: number) {
  return s === 1 ? 'success' : 'secondary'
}

function clearAll() {
  store.clearFilters()
  searchDraft.value = ''
}

const selectedAreas = ref<AreaRow[] | null>(null)

const formVisible = ref(false)
const formMode = ref<AreaFormMode>('view')
const formModel = ref<AreaFormModel | null>(null)

function mapRowToFormModel(row: AreaRow): AreaFormModel {
  return {
    area_id: row.area_id,
    area_code: row.area_code,
    area_name: row.area_name,
    area_status: row.area_status,
  }
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    area_code: '',
    area_name: '',
    area_status: 1,
  }
  formVisible.value = true
}

function openView(row: AreaRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: AreaRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

async function doDeleteOne(row: AreaRow) {
  await deleteAreaMock({ area_id: row.area_id, actor_id: auth.user?.user_id ?? '' })
}

async function onDelete(row: AreaRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete area ${row.area_code} - ${row.area_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await doDeleteOne(row)
        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Area has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: 'Cannot Delete',
            detail: `Can't delete Area ${row.area_code} because it has ${n} scan points`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg || 'Failed to delete area.',
          life: 3000,
        })
      }
    },
  })
}

function onDeleteSelected() {
  const sel = selectedAreas.value ?? []
  if (!sel.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${sel.length} selected areas?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        for (const row of sel) {
          await doDeleteOne(row)
        }
        await store.load()
        selectedAreas.value = null
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Selected areas have been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.startsWith('AREA_HAS_SCAN_POINTS:')) {
          const n = Number(msg.split(':')[1] ?? 0)
          toast.add({
            severity: 'warn',
            summary: 'Cannot Delete',
            detail: `Can't delete because one selected Area has ${n} scan points`,
            life: 3500,
          })
          return
        }
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg || 'Failed to delete areas.',
          life: 3000,
        })
      }
    },
  })
}

async function handleAreaFormSubmit(payload: { submit: (actor_id: string) => Promise<void> }) {
  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  try {
    await payload.submit(actor)
    await store.load()

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Area has been saved.',
      life: 2000,
    })
  } catch (e: any) {
    const msg = String(e?.message ?? '')

    if (msg === 'MISSING_FIELDS') {
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill Area Code and Area Name.',
        life: 3000,
      })
      return
    }

    if (msg === 'AREA_CODE_EXISTS') {
      toast.add({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'Area Code already exists.',
        life: 3000,
      })
      return
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg || 'Failed to save area.',
      life: 3500,
    })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Areas Management</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="searchDraft" label="" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div class="md:col-span-3">
          <label class="block text-sm text-slate-600 mb-1">Status</label>
          <Dropdown
            v-model="store.filterStatus"
            class="w-full"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
          />
        </div>

        <div class="md:col-span-3 flex justify-end">
          <BaseButton label="Clear Filters" severity="secondary" outlined @click="clearAll" />
        </div>
      </div>
    </div>

    <BaseDataTable
      title="Areas"
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="area_id"
      v-model:selection="selectedAreas"
      :rows="store.rowsPerPage"
    >
      <template #toolbar-start>
        <BaseButton label="New" severity="success" :disabled="!canManage" @click="openNew" />
        <BaseButton
          label="Delete"
          severity="danger"
          outlined
          class="ml-2"
          :disabled="!canManage || !(selectedAreas && selectedAreas.length)"
          @click="onDeleteSelected"
        />
      </template>

      <template #toolbar-end>
        <!-- để trống hoặc sau này thêm Export -->
      </template>

      <template #header-right>
        <!-- giữ header-right trống vì search đang nằm phía trên theo design hiện tại -->
      </template>

      <Column selectionMode="multiple" style="width: 3rem" :exportable="false" />

      <Column field="area_code" header="Area Code" style="min-width: 10rem" />
      <Column field="area_name" header="Area Name" style="min-width: 14rem" />

      <Column header="Status" style="min-width: 10rem">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.area_status)"
            :severity="statusSeverity(data.area_status)"
          />
        </template>
      </Column>

      <Column header="Action" :exportable="false" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-end">
            <BaseButton
              label="View"
              size="small"
              severity="secondary"
              outlined
              @click="openView(data)"
            />
            <BaseButton
              label="Edit"
              size="small"
              severity="success"
              outlined
              :disabled="!canManage"
              @click="openEdit(data)"
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
    </BaseDataTable>

    <AreaForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      @submit="handleAreaFormSubmit"
      @close="formModel = null"
    />
  </div>
</template>
