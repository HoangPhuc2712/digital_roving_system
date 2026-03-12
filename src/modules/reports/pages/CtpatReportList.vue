<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import CtpatReportFilters from '@/modules/reports/components/CtpatReportFilters.vue'
import { useCtpatReportsStore } from '@/modules/reports/ctpatReports.store'
import { exportCtpatReportXlsx } from '@/services/export/ctpatReport.export'

const toast = useToast()
const router = useRouter()
const store = useCtpatReportsStore()
const exporting = ref(false)

watch(
  () => [store.searchText, store.filterAreaName, store.filterDateFrom, store.filterDateTo],
  () => store.setFirst(0),
)

onMounted(async () => {
  await store.load()
})

onBeforeRouteLeave(() => {
  resetPageState()
})

onBeforeUnmount(() => {
  resetPageState()
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

function clearAll() {
  store.clearFilters()
}

function resetPageState() {
  store.clearFilters()
}

function goToPatrolsReport() {
  router.push({ name: 'reports' })
}

async function onExport() {
  exporting.value = true
  try {
    await exportCtpatReportXlsx({
      rows: store.filteredRows,
      fileName: `ctpat_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export C-TPAT report.'),
      life: 3000,
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
      <div class="text-xl font-semibold text-slate-800">C-TPAT Reports</div>

      <div class="w-full max-w-md">
        <BaseInput label="" v-model="store.searchText" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <CtpatReportFilters
      :areaOptions="store.areaOptions"
      :modelAreaName="store.filterAreaName"
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      @update:modelAreaName="store.filterAreaName = $event"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="pr_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      @page="onPage"
    >
      <template #toolbar-start>
        <BaseIconButton
          icon="pi pi-file"
          label="Patrols Report"
          severity="secondary"
          outlined
          @click="goToPatrolsReport"
        />
      </template>

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

      <Column
        field="route_name"
        header="Route Name"
        style="min-width: 12rem"
        sortField="route_name"
      />

      <Column
        field="check_point_name"
        header="Check Point"
        style="min-width: 18rem"
        sortField="check_point_name"
      />

      <Column header="Start Time" style="min-width: 12rem" sortField="start_at">
        <template #body="{ data }">
          {{ formatDateTime(data.start_at) }}
        </template>
      </Column>

      <Column header="Finish Time" style="min-width: 12rem" sortField="end_at">
        <template #body="{ data }">
          {{ formatDateTime(data.end_at) }}
        </template>
      </Column>

      <Column header="Patrol Time" style="min-width: 12rem" sortField="scan_at">
        <template #body="{ data }">
          {{ formatDateTime(data.scan_at) }}
        </template>
      </Column>

      <Column
        field="report_name"
        header="Guard Name"
        style="min-width: 12rem"
        sortField="report_name"
      />

      <Column
        field="cp_priority"
        header="Route Order"
        style="min-width: 10rem"
        sortField="cp_priority"
      />
    </BaseDataTable>
  </div>
</template>
