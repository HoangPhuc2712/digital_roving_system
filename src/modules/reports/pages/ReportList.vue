<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'

import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useReportsStore } from '@/modules/reports/reports.store'
import type { ReportRow } from '@/modules/reports/reports.types'
import ReportForm, { type ReportFormModel } from '@/modules/reports/components/ReportForm.vue'
import { exportPatrolReportXlsx } from '@/services/export/patrolReport.export'

const store = useReportsStore()

const resultOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'OK', value: 'OK' },
  { label: 'Not OK', value: 'NOT_OK' },
]

const issueStatusOptions = [
  { label: 'All', value: null },
  { label: 'Pending', value: 0 },
  { label: 'In Progress', value: 1 },
  { label: 'Completed', value: 2 },
  { label: 'Incompleted', value: 3 },
]

const exporting = ref(false)

const formVisible = ref(false)
const formModel = ref<ReportFormModel | null>(null)

watch(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterIssueStatus,
    store.filterResult,
    store.filterGuardId,
    store.filterMultiDays,
    store.filterDate,
    store.filterDateRange,
  ],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

function formatDateTime(iso: string) {
  const s = (iso ?? '').trim()
  if (!s) return '—'
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return s
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`
}

function issueStatusLabel(s: number) {
  switch (s) {
    case 0:
      return 'Pending'
    case 1:
      return 'In Progress'
    case 2:
      return 'Completed'
    case 3:
      return 'Incompleted'
    default:
      return '—'
  }
}

function issueStatusSeverity(s: number) {
  // PrimeVue Tag severity: success | info | warning | danger | secondary
  switch (s) {
    case 0:
      return 'warning'
    case 1:
      return 'info'
    case 2:
      return 'success'
    case 3:
      return 'danger'
    default:
      return 'secondary'
  }
}

function inspectionLabel(hasProblem: boolean) {
  return hasProblem ? 'Not OK' : 'OK'
}

function inspectionSeverity(hasProblem: boolean) {
  return hasProblem ? 'danger' : 'success'
}

function clearAll() {
  store.clearFilters()
}

function openView(row: ReportRow) {
  formModel.value = row as any
  formVisible.value = true
}

async function onExport() {
  exporting.value = true
  try {
    await exportPatrolReportXlsx({
      rows: store.filteredRows,
      fileName: `patrol_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } finally {
    exporting.value = false
  }
}

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Patrol Reports</div>

      <div class="w-full max-w-md">
        <BaseInput label="" v-model="store.searchText" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
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
          <label class="block text-sm text-slate-600 mb-1">Issue Status</label>
          <Dropdown
            v-model="store.filterIssueStatus"
            class="w-full"
            :options="issueStatusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Inspection Result</label>
          <Dropdown
            v-model="store.filterResult"
            class="w-full"
            :options="resultOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
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
          />
        </div>

        <div class="md:col-span-1">
          <div class="flex justify-between">
            <label class="block text-sm text-slate-600 mb-1">Select Date</label>
            <div class="flex items-center gap-1 mb-1">
              <Checkbox v-model="store.filterMultiDays" :binary="true" inputId="multiDays" />
              <label for="multiDays" class="text-xs text-slate-600">Select multiple days</label>
            </div>
          </div>

          <Calendar
            v-if="!store.filterMultiDays"
            v-model="store.filterDate"
            class="w-full"
            selectionMode="single"
            dateFormat="yy-mm-dd"
            placeholder="Select date"
            showButtonBar
          />

          <Calendar
            v-else
            v-model="store.filterDateRange"
            class="w-full"
            selectionMode="range"
            dateFormat="yy-mm-dd"
            placeholder="From - To"
            showButtonBar
          />
        </div>

        <div class="md:col-span-6 flex justify-end">
          <BaseIconButton
            icon="pi pi-filter-slash"
            label="Clear Filters"
            severity="secondary"
            outlined
            @click="clearAll"
          />
        </div>
      </div>
    </div>

    <BaseDataTable
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="pr_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      @page="onPage"
    >
      <template #toolbar-start></template>

      <template #toolbar-end>
        <div class="flex justify-end gap-2">
          <BaseIconButton
            icon="pi pi-download"
            label="Export"
            severity="secondary"
            outlined
            :disabled="exporting"
            @click="onExport"
          />
        </div>
      </template>

      <template #empty>
        <div class="p-4 text-slate-600 flex justify-center">No reports found.</div>
      </template>

      <Column header="Area" style="min-width: 10rem" sortField="area_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-bold">{{ data.area_code }}</div>
            <div class="text-slate-600 text-xs">{{ data.area_name }}</div>
          </div>
        </template>
      </Column>

      <Column header="Scan Point" style="min-width: 16rem" sortField="cp_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-bold">{{ data.cp_code }}</div>
            <div class="text-slate-600 text-xs">{{ data.cp_name }}</div>
          </div>
        </template>
      </Column>

      <Column header="Inspection Result" style="min-width: 10rem" sortField="pr_has_problem">
        <template #body="{ data }">
          <Tag
            :value="inspectionLabel(data.pr_has_problem)"
            :severity="inspectionSeverity(data.pr_has_problem)"
          />
        </template>
      </Column>

      <Column header="Note" style="min-width: 16rem" sortField="pr_note">
        <template #body="{ data }">
          <div class="max-w-[420px] truncate" :title="data.pr_note || ''">
            {{ data.pr_note || '-' }}
          </div>
        </template>
      </Column>

      <!-- Photo column is currently hidden by request; keep it for future enable -->
      <Column v-if="false" header="Photo" style="min-width: 10rem">
        <template #body="{ data }">
          <div class="text-slate-700">{{ data.image_count }}</div>
        </template>
      </Column>

      <Column field="created_name" header="Guard Name" style="min-width: 12rem" />

      <Column header="Issue Status" style="min-width: 12rem" sortField="pr_status">
        <template #body="{ data }">
          <Tag
            :value="issueStatusLabel(data.pr_status)"
            :severity="issueStatusSeverity(data.pr_status)"
          />
        </template>
      </Column>

      <Column header="Patrol Date" style="min-width: 12rem" sortField="scan_at">
        <template #body="{ data }">
          {{ formatDateTime(data.scan_at || data.created_at) }}
        </template>
      </Column>

      <Column header="Action" style="width: 120px" sortDisabled>
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
          </div>
        </template>
      </Column>
    </BaseDataTable>

    <ReportForm v-model:visible="formVisible" :model="formModel" @close="formModel = null" />
  </div>
</template>
