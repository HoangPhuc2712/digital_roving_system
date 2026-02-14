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

import { useCheckpointsStore } from '@/modules/checkpoints/checkpoints.store'
import { useAuthStore } from '@/stores/auth.store'
import type { CheckpointRow } from '@/modules/checkpoints/checkpoints.types'
import { deleteCheckpointMock } from '@/modules/checkpoints/checkpoints.api'

import QrPreview from '../components/QrPreview.vue'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useCheckpointsStore()
const auth = useAuthStore()

const canManage = computed(() => auth.canAccess('checkpoints.manage'))

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
  router.push({ name: 'checkpoints-create' })
}

function onView(row: CheckpointRow) {
  toast.add({
    severity: 'info',
    summary: 'View',
    detail: 'View is not implemented yet.',
    life: 2000,
  })
}

function onEdit(row: CheckpointRow) {
  router.push({ name: 'checkpoints-edit', params: { id: row.cp_id } })
}

async function onDelete(row: CheckpointRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete scan point ${row.cp_code} - ${row.cp_name}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await deleteCheckpointMock({ cp_id: row.cp_id, actor_id: auth.user?.user_id ?? '' })
        await store.load()
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Scan point has been deleted.',
          life: 2000,
        })
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message ?? 'Failed to delete.',
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
      <div class="text-xl font-semibold text-slate-800">Scan Points Management</div>

      <div class="w-full max-w-md">
        <InputText
          v-model="searchDraft"
          class="w-full"
          placeholder="Search code / name / area / description"
        />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div class="md:col-span-3">
          <label class="block text-sm text-slate-600 mb-1">Area</label>
          <Dropdown
            v-model="store.filterAreaId"
            class="w-full"
            :options="store.areaOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
          />
        </div>

        <div class="md:col-span-2">
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

        <div class="md:col-span-1 flex justify-end">
          <Button label="Clear Filters" severity="secondary" outlined @click="clearAll" />
        </div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <DataTable
        :value="store.filteredRows"
        :loading="store.loading"
        dataKey="cp_id"
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
          <div class="p-4 text-slate-600">No scan points found.</div>
        </template>

        <Column field="cp_code" header="Scan Point Code" />
        <Column field="cp_name" header="Scan Point Name" />

        <Column header="QR Image" style="width: 110px">
          <template #body="{ data }">
            <QrPreview :value="data.cp_qr" :size="44" />
          </template>
        </Column>

        <Column header="Area">
          <template #body="{ data }">
            <div class="text-slate-800">{{ data.area_code }} - {{ data.area_name }}</div>
          </template>
        </Column>

        <Column field="cp_description" header="Description" />

        <Column header="Status" style="width: 120px">
          <template #body="{ data }">
            <Tag :value="statusLabel(data.cp_status)" :severity="statusSeverity(data.cp_status)" />
          </template>
        </Column>

        <Column header="Action" style="width: 260px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <Button
                label="View"
                size="small"
                severity="secondary"
                outlined
                @click="onView(data)"
              />
              <Button
                label="Edit"
                size="small"
                severity="warning"
                outlined
                :disabled="!canManage"
                @click="onEdit(data)"
              />
              <Button
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
      <Button
        label="Create Scan Point"
        severity="success"
        :disabled="!canManage"
        @click="onCreate"
      />
    </div>
  </div>
</template>
