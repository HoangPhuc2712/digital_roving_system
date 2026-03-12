<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import PatrolDetailReportFilters from '@/modules/reports/components/PatrolDetailReportFilters.vue'
import { usePatrolDetailReportsStore } from '@/modules/reports/patrolDetailReports.store'
import { exportPatrolDetailReportXlsx } from '@/services/export/patrolDetailReport.export'

const toast = useToast()
const router = useRouter()
const store = usePatrolDetailReportsStore()
const exporting = ref(false)

watch(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterCheckPointName,
    store.filterGuardName,
    store.filterDateFrom,
    store.filterDateTo,
  ],
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

function goToPatrolsData() {
  router.push({ name: 'reports' })
}

function shiftCellStyle(hex: string) {
  return {
    backgroundColor: hex,
    margin: '-0.5rem -1rem',
    padding: '0.5rem 1rem',
    minHeight: 'calc(100% + 1rem)',
  }
}

async function onExport() {
  exporting.value = true
  try {
    await exportPatrolDetailReportXlsx({
      rows: store.filteredRows,
      fileName: `patrol_detail_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export patrol detail report.'),
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
      <div class="text-xl font-semibold text-slate-800">Patrol Detail Report</div>

      <div class="w-full max-w-md">
        <BaseInput label="" v-model="store.searchText" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <PatrolDetailReportFilters
      :areaOptions="store.areaOptions"
      :checkPointOptions="store.checkPointOptions"
      :guardOptions="store.guardOptions"
      :modelAreaId="store.filterAreaId"
      :modelCheckPointName="store.filterCheckPointName"
      :modelGuardName="store.filterGuardName"
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      @update:modelAreaId="store.filterAreaId = $event"
      @update:modelCheckPointName="store.filterCheckPointName = $event"
      @update:modelGuardName="store.filterGuardName = $event"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="row_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      @page="onPage"
    >
      <template #toolbar-start>
        <BaseIconButton
          icon="pi pi-shield"
          label="Patrols Data"
          severity="secondary"
          outlined
          @click="goToPatrolsData"
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
        style="min-width: 10rem"
        sortField="route_name"
      />

      <Column
        field="check_point_name"
        header="Check Point"
        style="min-width: 18rem"
        sortField="check_point_name"
      />

      <Column header="Start Time" style="min-width: 12rem" sortField="start_time">
        <template #body="{ data }">
          <div :style="shiftCellStyle(data.shift_color)">
            {{ formatDateTime(data.start_time) }}
          </div>
        </template>
      </Column>

      <Column header="Finish Time" style="min-width: 12rem" sortField="finish_time">
        <template #body="{ data }">
          <div :style="shiftCellStyle(data.shift_color)">
            {{ formatDateTime(data.finish_time) }}
          </div>
        </template>
      </Column>

      <Column header="Patrol Time" style="min-width: 12rem" sortField="patrol_time">
        <template #body="{ data }">
          {{ formatDateTime(data.patrol_time) }}
        </template>
      </Column>

      <Column
        field="report_name"
        header="Patrol Guard"
        style="min-width: 12rem"
        sortField="report_name"
      />

      <Column
        field="event_zh"
        header="Event Information Zh"
        style="min-width: 14rem"
        sortField="event_zh"
      >
        <template #body="{ data }">
          {{ data.event_zh || '' }}
        </template>
      </Column>

      <Column
        field="event_vi"
        header="Event Information Vi"
        style="min-width: 14rem"
        sortField="event_vi"
      >
        <template #body="{ data }">
          {{ data.event_vi || '' }}
        </template>
      </Column>
    </BaseDataTable>
  </div>
</template>
