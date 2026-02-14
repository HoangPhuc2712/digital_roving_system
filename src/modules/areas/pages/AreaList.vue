<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import { useAreasStore } from '@/modules/areas/areas.store'
import { useAuthStore } from '@/stores/auth.store'
import type { AreaRow } from '@/modules/areas/areas.types'
import { deleteAreaMock } from '@/modules/areas/areas.api'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useAreasStore()
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
  () => [store.searchText, store.filterStatus],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

const canManage = computed(() => auth.canAccess('areas.manage'))

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}

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

function onCreate() {
  router.push({ name: 'areas-create' })
}

function onEdit(row: AreaRow) {
  router.push({ name: 'areas-edit', params: { id: row.area_id } })
}

async function onDelete(row: AreaRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete area ${row.area_code} - ${row.area_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteAreaMock({ area_id: row.area_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
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
            detail: `Can't delete Area ${row.area_code} because it has ${n} active scan points`,
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

    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <DataTable
        :value="store.filteredRows"
        :loading="store.loading"
        dataKey="area_id"
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
          <div class="p-4 text-slate-600">No areas found.</div>
        </template>

        <Column field="area_code" header="Area Code" />
        <Column field="area_name" header="Area Name" />

        <Column header="Status">
          <template #body="{ data }">
            <Tag
              :value="statusLabel(data.area_status)"
              :severity="statusSeverity(data.area_status)"
            />
          </template>
        </Column>

        <Column header="Action" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <BaseButton
                label="Edit"
                size="small"
                severity="success"
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
      <BaseButton label="Create Area" severity="success" :disabled="!canManage" @click="onCreate" />
    </div>
  </div>
</template>
