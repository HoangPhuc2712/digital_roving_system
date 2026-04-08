<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useGpsLogReportsStore } from '@/modules/reports/gpsLogReports.store'
import { exportGpsLogReportXlsx } from '@/services/export/gpsLogReport.export'
import { useResetFirstOnFilterChange } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'

const toast = useToast()
const router = useRouter()
const auth = useAuthStore()
const store = useGpsLogReportsStore()
const exporting = ref(false)
const { t, locale } = useI18n()
const hasInvalidDateFilter = computed(
  () => (store.filterDateFrom == null) !== (store.filterDateTo == null),
)
const tableRows = computed(() => (hasInvalidDateFilter.value ? [] : store.filteredRows))

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
  ...(auth.isAdminUser
    ? [
        {
          label: t('patrolDataButtonSwitch.switchGpsLog'),
          icon: 'pi pi-map-marker',
          size: 'small',
          severity: 'info' as const,
          outlined: false,
          onClick: () => router.push({ name: 'gps-log-reports' }),
        },
      ]
    : []),
  {
    label: t('patrolDataButtonSwitch.switchCtpatReport'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'ctpat-reports' }),
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

function shiftCellStyle(hex: string) {
  return {
    backgroundColor: hex,
    margin: '-0.5rem -1rem',
    padding: '0.5rem 1rem',
    minHeight: 'calc(100% + 1rem)',
  }
}

function formatCoordinate(value: number | null) {
  return value == null ? '—' : String(value)
}

async function onExport() {
  exporting.value = true
  try {
    await exportGpsLogReportXlsx({
      rows: tableRows.value,
      fileName: `gps_log_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export GPS log.'),
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
  if (payload.key === 'guardName') {
    const value = String(payload.value ?? '').trim()
    store.filterGuardName = value || null
  }
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
        {{ t('gpsLogReport.title') }}
      </div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <BaseDataTable
      :key="`gps-log-report-list-table-${locale}`"
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
            hasInvalidDateFilter ? t('common.invalidDateFilter') : `${t('gpsLogReport.noReport')}.`
          }}
        </div>
      </template>

      <Column
        field="route_name"
        :header="t('gpsLogReport.routeName')"
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
          secondaryPlaceholder: t('gpsLogReport.routeName'),
          secondaryFilter: true,
          secondaryParentField: 'areaId',
          secondaryFilterField: 'searchText',
        }"
      />

      <Column
        field="check_point_name"
        :header="t('gpsLogReport.checkpointName')"
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
          placeholder: t('gpsLogReport.checkpointName'),
        }"
      />

      <Column :header="t('gpsLogReport.startTime')" style="min-width: 12rem" sortField="start_time">
        <template #body="{ data }">
          <div :style="shiftCellStyle(data.shift_color)">
            {{ formatDateTime(data.start_time) }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('gpsLogReport.finishTime')"
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
        :header="t('gpsLogReport.patrolTime')"
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
        field="latitude"
        :header="t('gpsLogReport.lat')"
        style="min-width: 10rem"
        sortField="latitude"
      >
        <template #body="{ data }">
          {{ formatCoordinate(data.latitude) }}
        </template>
      </Column>

      <Column
        field="longitude"
        :header="t('gpsLogReport.long')"
        style="min-width: 10rem"
        sortField="longitude"
      >
        <template #body="{ data }">
          {{ formatCoordinate(data.longitude) }}
        </template>
      </Column>

      <Column
        field="report_name"
        :header="t('gpsLogReport.guardName')"
        style="min-width: 10rem"
        sortField="report_name"
        :filterMenu="{
          key: 'guardName',
          type: 'text',
          value: store.filterGuardName,
          placeholder: t('gpsLogReport.guardName'),
        }"
      />
    </BaseDataTable>
  </div>
</template>
