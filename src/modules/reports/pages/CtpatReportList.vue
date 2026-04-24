<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { useCtpatReportsStore } from '@/modules/reports/ctpatReports.store'
import { exportCtpatReportXlsx } from '@/services/export/ctpatReport.export'
import { useResetFirstOnFilterChange } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'
import { translateRouteName } from '@/utils/dataI18n'

const toast = useToast()
const router = useRouter()
const auth = useAuthStore()
const store = useCtpatReportsStore()
const exporting = ref(false)
const { t, locale } = useI18n()

function translatedRouteName(value: string | null | undefined) {
  const raw = String(value ?? '')
  if (locale.value === 'vi') return raw
  return translateRouteName(raw, t)
}
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
  ...(auth.isAdminUser
    ? [
        {
          label: t('patrolDataButtonSwitch.switchIncorrectScanReports'),
          icon: 'pi pi-file',
          size: 'small',
          severity: 'secondary' as const,
          outlined: true,
          onClick: () => router.push({ name: 'incorrect-scan-reports' }),
        },
      ]
    : []),
  ...(auth.isAdminUser
    ? [
        {
          label: t('patrolDataButtonSwitch.switchGpsLog'),
          icon: 'pi pi-map-marker',
          size: 'small',
          severity: 'secondary' as const,
          outlined: true,
          onClick: () => router.push({ name: 'gps-log-reports' }),
        },
      ]
    : []),
  {
    label: t('patrolDataButtonSwitch.switchCtpatReport'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'ctpat-reports' }),
  },
])

useResetFirstOnFilterChange(
  () => [
    store.searchText,
    store.filterAreaName,
    store.filterRouteName,
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

async function onFilterOpen(payload: { key: string }) {
  if (payload.key === 'routeName') await store.ensureRouteFilterOptionsLoaded()
}

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
    store.filterAreaName = payload.value ?? null
    store.filterRouteName = null
  }
  if (payload.key === 'patrolTime') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterDateFrom = value.from ?? null
    store.filterDateTo = value.to ?? null
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
      rows: tableRows.value,
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
      :value="tableRows"
      :loading="store.loading"
      dataKey="pr_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="store.searchText"
      @update:modelSearch="store.searchText = $event"
      @update:columnFilter="onColumnFilter"
      :beforeFilterOpen="onFilterOpen"
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
              : `${t('ctpatReportList.noReports')}.`
          }}
        </div>
      </template>

      <Column
        field="route_name"
        :header="t('ctpatReportList.routeName')"
        style="min-width: 12rem"
        sortField="route_name"
        :filterMenu="{
          key: 'routeName',
          type: 'select',
          value: store.filterAreaName,
          options: store.routeAreaOptions,
          optionLabel: 'label',
          optionValue: 'value',
          placeholder: t('reportList.filters.area'),
          filter: true,
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800">
            {{ translatedRouteName(data.route_name) || '-' }}
          </div>
        </template>
      </Column>

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
