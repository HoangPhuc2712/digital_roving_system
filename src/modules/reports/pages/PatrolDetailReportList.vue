<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { usePatrolDetailReportsStore } from '@/modules/reports/patrolDetailReports.store'
import { parseReportMailDateRange } from '@/modules/reports/reportMailLink'
import { exportPatrolDetailReportXlsx } from '@/services/export/patrolDetailReport.export'
import { useResetFirstOnFilterChange } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const store = usePatrolDetailReportsStore()
const exporting = ref(false)
const { t, locale } = useI18n()
const hasInvalidDateFilter = computed(
  () => (store.filterDateFrom == null) !== (store.filterDateTo == null),
)
const tableRows = computed(() => (hasInvalidDateFilter.value ? [] : store.filteredRows))

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

useResetFirstOnFilterChange(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterRouteName,
    store.filterCheckPointName,
    store.filterGuardName,
    store.filterDateFrom,
    store.filterDateTo,
  ],
  () => store.setFirst(0),
)

const { onPage } = usePagination({
  load: () => (hasInvalidDateFilter.value ? Promise.resolve() : store.load()),
  setFirst: (first) => store.setFirst(first),
})

onMounted(async () => {
  const mailRange = parseReportMailDateRange(route.query)
  if (mailRange.hasQuery && mailRange.from && mailRange.to) {
    store.filterDateFrom = mailRange.from
    store.filterDateTo = mailRange.to
  }

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
      rows: tableRows.value,
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
  if (payload.key === 'routeName') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterAreaId = value.primaryValue ?? null
    store.filterRouteName = value.secondaryValue ?? null
  }
  if (payload.key === 'checkPointName') store.filterCheckPointName = payload.value ?? null
  if (payload.key === 'guardName') store.filterGuardName = payload.value ?? null
  if (payload.key === 'patrolTime') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterDateFrom = value.from ?? null
    store.filterDateTo = value.to ?? null
  }
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
      :value="tableRows"
      :loading="store.loading"
      dataKey="row_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      :showSearch="false"
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
          {{
            hasInvalidDateFilter
              ? t('common.invalidDateFilter')
              : `${t('patrolDetailReport.noReport')}.`
          }}
        </div>
      </template>

      <!-- <Column
        :header="t('patrolDetailReport.area')"
        sortField="area_id"
        style="min-width: 10rem"
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
      </Column> -->

      <Column
        field="route_name"
        :header="t('patrolDetailReport.routeName')"
        style="min-width: 14rem"
        sortField="route_name"
        :filterMenu="{
          key: 'routeName',
          type: 'dual-select',
          value: {
            primaryValue: store.filterAreaId,
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
          secondaryPlaceholder: t('patrolDetailReport.routeName'),
          secondaryFilter: true,
          secondaryFilterField: 'areaId',
        }"
      />

      <Column
        field="check_point_name"
        :header="t('patrolDetailReport.checkpointName')"
        style="min-width: 10rem"
        sortField="check_point_name"
        :filterMenu="{
          key: 'checkPointName',
          type: 'select',
          value: store.filterCheckPointName,
          options: store.checkPointOptions,
          filter: true,
          filterField: 'searchText',
          filterMatchMode: 'contains',
          placeholder: t('patrolDetailReport.checkpointName'),
        }"
      />

      <Column
        :header="t('patrolDetailReport.startTime')"
        style="min-width: 12rem"
        sortField="start_time"
      >
        <template #body="{ data }">
          <div :style="shiftCellStyle(data.shift_color)">
            {{ formatDateTime(data.start_time) }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('patrolDetailReport.finishTime')"
        style="min-width: 12rem"
        sortField="finish_time"
      >
        <template #body="{ data }">
          <div :style="shiftCellStyle(data.shift_color)">
            {{ formatDateTime(data.finish_time) }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('patrolDetailReport.patrolTime')"
        style="min-width: 12rem"
        sortField="patrol_time"
        :filterMenu="{
          key: 'patrolTime',
          type: 'date-range',
          value: {
            from: store.filterDateFrom,
            to: store.filterDateTo,
          },
        }"
      >
        <template #body="{ data }">
          {{ formatDateTime(data.patrol_time) }}
        </template>
      </Column>

      <Column
        field="report_name"
        :header="t('patrolDetailReport.guardName')"
        style="min-width: 10rem"
        sortField="report_name"
        :filterMenu="{
          key: 'guardName',
          type: 'select',
          value: store.filterGuardName,
          options: store.guardOptions,
          filter: true,
          filterField: 'searchText',
          filterMatchMode: 'contains',
        }"
      />

      <Column
        field="event_zh"
        :header="t('patrolDetailReport.eventInfoZh')"
        style="min-width: 10rem"
        sortField="event_zh"
      >
        <template #body="{ data }">
          {{ data.event_zh || '' }}
        </template>
      </Column>

      <Column
        field="event_vi"
        :header="t('patrolDetailReport.eventInfoVi')"
        style="min-width: 10rem"
        sortField="event_vi"
      >
        <template #body="{ data }">
          {{ data.event_vi || '' }}
        </template>
      </Column>
    </BaseDataTable>
  </div>
</template>
