<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { useCtpatReportsStore } from '@/modules/reports/ctpatReports.store'
import { exportCtpatReportXlsx } from '@/services/export/ctpatReport.export'

const toast = useToast()
const router = useRouter()
const store = useCtpatReportsStore()
const exporting = ref(false)
const { t, locale } = useI18n()

const reportSwitchButtons = computed(() => [
  {
    label: t('patrolDataButtonSwitch.switchPatrolReports'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'reports' }),
  },
  {
    label: t('patrolDataButtonSwitch.switchIncorrectScanReports'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'incorrect-scan-reports' }),
  },
  {
    label: t('patrolDataButtonSwitch.switchCtpatReport'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'ctpat-reports' }),
  },
])

watch(
  () => [
    store.searchText,
    store.filterAreaName,
    store.filterRouteName,
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

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'routeName') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterAreaName = value.primaryValue ?? null
    store.filterRouteName = value.secondaryValue ?? null
  }
}

function clearAll() {
  store.clearFilters()
}

function resetPageState() {
  store.clearFilters()
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
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="text-[26px] font-semibold text-slate-800">{{ t('ctpatReportList.title') }}</div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <BaseDataTable
      :key="`ctpat-report-list-table-${locale}`"
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="pr_id"
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
            :label="t('common.export')"
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
        <div class="p-4 text-slate-600 flex justify-center">
          {{ t('ctpatReportList.noReports') }}.
        </div>
      </template>

      <Column
        field="route_name"
        :header="t('ctpatReportList.routeName')"
        style="min-width: 12rem"
        sortField="route_name"
        :filterMenu="{
          key: 'routeName',
          type: 'dual-select',
          value: {
            primaryValue: store.filterAreaName,
            secondaryValue: store.filterRouteName,
          },
          options: store.routeAreaOptions,
          optionLabel: 'label',
          optionValue: 'value',
          placeholder: t('reportList.filters.area'),
          filter: true,
          secondaryOptions: store.routeOptions,
          secondaryOptionLabel: 'label',
          secondaryOptionValue: 'value',
          secondaryPlaceholder: t('ctpatReportList.routeName'),
          secondaryFilter: true,
          secondaryFilterField: 'areaName',
        }"
      />

      <Column
        field="check_point_name"
        :header="t('ctpatReportList.checkpointName')"
        style="min-width: 18rem"
        sortField="check_point_name"
      />

      <Column
        :header="t('ctpatReportList.startTime')"
        style="min-width: 12rem"
        sortField="start_at"
      >
        <template #body="{ data }">
          {{ formatDateTime(data.start_at) }}
        </template>
      </Column>

      <Column :header="t('ctpatReportList.finishTime')" style="min-width: 12rem" sortField="end_at">
        <template #body="{ data }">
          {{ formatDateTime(data.end_at) }}
        </template>
      </Column>

      <Column
        :header="t('ctpatReportList.patrolTime')"
        style="min-width: 12rem"
        sortField="scan_at"
      >
        <template #body="{ data }">
          {{ formatDateTime(data.scan_at) }}
        </template>
      </Column>

      <Column
        field="report_name"
        :header="t('ctpatReportList.guardName')"
        style="min-width: 12rem"
        sortField="report_name"
      />

      <Column
        field="cp_priority"
        :header="t('ctpatReportList.routeOrder')"
        style="min-width: 10rem"
        sortField="cp_priority"
      />
    </BaseDataTable>
  </div>
</template>
