<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import { useReportsStore } from '@/modules/reports/reports.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ReportRow } from '@/modules/reports/reports.types'
import BaseButton from '@/components/common/buttons/BaseButton.vue'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useReportsStore()
const auth = useAuthStore()

const canEdit = computed(() => auth.canAccess('reports.edit'))
const canDelete = computed(() => auth.canAccess('reports.delete'))

const lockRoleGuard = computed(() => !auth.canAccess('reports.view_all'))

const currentRoleCode = computed(() => String(auth.user?.role?.role_code ?? ''))
const currentUserId = computed(() => String(auth.user?.user_id ?? ''))

function applyLockedFilters() {
  if (!lockRoleGuard.value) return
  store.filterRoleCode = currentRoleCode.value
  store.filterGuardId = currentUserId.value
}

onMounted(async () => {
  applyLockedFilters()
  await store.load()
})

watch(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterResult,
    store.filterRoleCode,
    store.filterGuardId,
    store.filterDateRange,
  ],
  () => {
    store.setFirst(0)
  },
)

watch(
  () => store.filterGuardId,
  (guardId) => {
    if (!guardId) return
    const row = store.visibleRows.find((r) => r.user_id === guardId)
    if (!row) return
    if (store.filterRoleCode !== row.role_code) {
      store.filterRoleCode = row.role_code
    }
  },
)

watch(
  () => store.filterRoleCode,
  (roleCode) => {
    if (lockRoleGuard.value) return
    if (!store.filterGuardId) return

    const row = store.visibleRows.find((r) => r.user_id === store.filterGuardId)
    if (!row) return

    if (roleCode && row.role_code !== roleCode) {
      store.filterGuardId = ''
    }
  },
)

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function onView(row: ReportRow) {
  router.push({ name: 'report-detail', params: { id: row.pr_id } })
}

function onEdit(row: ReportRow) {
  router.push({
    name: 'report-detail',
    params: { id: row.pr_id },
    query: { edit: '1' },
  })
}

function onDelete(row: ReportRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete report #${row.pr_id}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: () => {
      store.deleteLocal(row.pr_id)
      toast.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `Report #${row.pr_id} has been deleted.`,
        life: 2000,
      })
    },
  })
}

function onClearFilters() {
  store.clearFilters()
  applyLockedFilters()
}

const resultOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'OK', value: 'OK' },
  { label: 'Not OK', value: 'NOT_OK' },
]
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Roving Reports</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="store.searchText" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div class="md:col-span-1">
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

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Result</label>
          <Dropdown
            v-model="store.filterResult"
            class="w-full"
            :options="resultOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <Dropdown
            v-model="store.filterRoleCode"
            class="w-full"
            :options="store.roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
            :disabled="lockRoleGuard"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Guard Name</label>
          <Dropdown
            v-model="store.filterGuardId"
            class="w-full"
            :options="store.guardOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
            :disabled="lockRoleGuard"
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Select Date</label>
          <Calendar
            v-model="store.filterDateRange"
            class="w-full"
            selectionMode="range"
            dateFormat="yy-mm-dd"
            placeholder="From - To"
            showButtonBar
          />
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <BaseButton label="Clear Filters" severity="secondary" outlined @click="onClearFilters" />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl">
      <DataTable
        :value="store.filteredRows"
        :loading="store.loading"
        dataKey="pr_id"
        paginator
        :rows="store.rowsPerPage"
        :first="store.first"
        :pageLinkSize="5"
        @page="onPage"
        stripedRows
        rowHover
        responsiveLayout="scroll"
        class="p-datatable-sm"
      >
        <template #empty>
          <div class="p-4 text-slate-600 flex justify-center">No reports found.</div>
        </template>

        <Column header="Area">
          <template #body="{ data }">
            <div class="flex flex-col">
              <div class="text-slate-800 font-bold">{{ data.area_code }}</div>
              <div class="text-slate-600 text-xs">{{ data.area_name }}</div>
            </div>
          </template>
        </Column>

        <Column field="cp_name" header="Scan Point" />
        <Column field="cp_description" header="Description" />

        <Column header="Result">
          <template #body="{ data }">
            <Tag
              :value="data.pr_check ? 'OK' : 'Not OK'"
              :severity="data.pr_check ? 'success' : 'danger'"
            />
          </template>
        </Column>

        <Column field="user_name" header="Guard Name" />

        <Column header="Roving Date">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
          </template>
        </Column>

        <Column header="Action" style="width: 220px">
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
                severity="success"
                outlined
                :disabled="!canEdit"
                @click="onEdit(data)"
              />
              <BaseButton
                label="Delete"
                size="small"
                severity="danger"
                outlined
                :disabled="!canDelete"
                @click="onDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
