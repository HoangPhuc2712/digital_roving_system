<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { usePatrolDetailReportsStore } from '@/modules/reports/patrolDetailReports.store'
import { exportPatrolDetailReportXlsx } from '@/services/export/patrolDetailReport.export'

const toast = useToast()
const router = useRouter()
const store = usePatrolDetailReportsStore()
const exporting = ref(false)
const { t, locale } = useI18n()

const reportSwitchButtons = computed(() => [
  {
    label: t('reportDataButtonSwitch.switchPatrolDetailReport'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'patrol-detail-reports' }),
  },
  {
    label: t('reportDataButtonSwitch.switchPatrolSummaryReport'),
    icon: 'pi pi-chart-line',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'patrol-summary-reports' }),
  },
])

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

function areaLabel(areaId: number) {
  return store.areaOptions.find((option) => option.value === areaId)?.label || `Area ${areaId}`
}

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

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'areaId') store.filterAreaId = payload.value ?? null
  if (payload.key === 'checkPointName') store.filterCheckPointName = payload.value ?? null
  if (payload.key === 'guardName') store.filterGuardName = payload.value ?? null
}

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="text-[26px] font-semibold text-slate-800">
        {{ t('patrolDetailReport.title') }}
      </div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <BaseDataTable
      :key="`patrol-detail-report-list-table-${locale}`"
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="row_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="store.searchText"
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      :showDateSelection="true"
      @update:modelSearch="store.searchText = $event"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @update:columnFilter="onColumnFilter"
      @clear="clearAll"
      @page="onPage"
    >
      <template #toolbar-end>
        <div class="flex justify-end gap-2">
          <BaseIconButton
            icon="pi pi-file-excel"
            label="Export"
            size="small"
            severity="secondary"
            outlined
            :loading="exporting"
            :disabled="exporting"
            @click="onExport"
          />
        </div>
      </template>

      <template #empty>
        <div class="p-4 text-slate-600 flex justify-center">No reports found.</div>
      </template>

      <Column
        header="Area"
        style="min-width: 12rem"
        :filterMenu="{
          key: 'areaId',
          type: 'select',
          value: store.filterAreaId,
          options: store.areaOptions,
        }"
      >
        <template #body="{ data }">
          {{ areaLabel(data.area_id) }}
        </template>
      </Column>

      <Column
        field="route_name"
        header="Route Name"
        style="min-width: 14rem"
        sortField="route_name"
      />

      <Column
        field="check_point_name"
        header="Check Point"
        style="min-width: 12rem"
        sortField="check_point_name"
        :filterMenu="{
          key: 'checkPointName',
          type: 'select',
          value: store.filterCheckPointName,
          options: store.checkPointOptions,
          filter: true,
        }"
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

      <Column header="Patrol Time" style="min-width: 14rem" sortField="patrol_time">
        <template #body="{ data }">
          {{ formatDateTime(data.patrol_time) }}
        </template>
      </Column>

      <Column
        field="report_name"
        header="Patrol Guard"
        style="min-width: 16rem"
        sortField="report_name"
        :filterMenu="{
          key: 'guardName',
          type: 'select',
          value: store.filterGuardName,
          options: store.guardOptions,
          filter: true,
        }"
      />

      <!-- <Column
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
      </Column> -->
    </BaseDataTable>
  </div>
</template>
