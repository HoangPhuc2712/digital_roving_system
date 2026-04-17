<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'

import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Column from 'primevue/column'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useReportsStore } from '@/modules/reports/reports.store'
import type { ReportRow, ResultFilter } from '@/modules/reports/reports.types'
import ReportForm, {
  type ReportFormMode,
  type ReportFormModel,
} from '@/modules/reports/components/ReportForm.vue'
import { exportPatrolReportXlsx } from '@/services/export/patrolReport.export'
import { changeReportStatus, fetchReportRowById } from '@/modules/reports/reports.api'
import { useResetFirstOnFilterChange } from '@/composables/useFilters'
import { usePagination } from '@/composables/usePagination'
import { translateReportNote } from '@/utils/dataI18n'

const toast = useToast()
const auth = useAuthStore()
const store = useReportsStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const resultOptions = computed(
  () =>
    [
      { label: t('reportList.resultOptions.all'), value: 'ALL' },
      { label: t('reportList.resultOptions.ok'), value: 'OK' },
      { label: t('reportList.resultOptions.notOk'), value: 'NOT_OK' },
    ] satisfies { label: string; value: ResultFilter }[],
)

const issueStatusOptions = computed(() => [
  { label: t('reportList.issueStatusOptions.all'), value: null },
  { label: t('reportList.issueStatusOptions.pending'), value: 0 },
  { label: t('reportList.issueStatusOptions.inProgress'), value: 1 },
  { label: t('reportList.issueStatusOptions.completed'), value: 2 },
  { label: t('reportList.issueStatusOptions.incompleted'), value: 3 },
])

const exporting = ref(false)
const formVisible = ref(false)
const formMode = ref<ReportFormMode>('view')
const formModel = ref<ReportFormModel | null>(null)
const canEditStatus = computed(() => auth.canAccess(['reports.view_all', 'reports.view_mine']))
const dateReloadTimer = ref<number | null>(null)
const suppressDateReload = ref(false)
const hasInvalidDateFilter = computed(
  () => (store.filterDateFrom == null) !== (store.filterDateTo == null),
)
const tableRows = computed(() => (hasInvalidDateFilter.value ? [] : store.filteredRows))

const reportSwitchButtons = computed(() => [
  {
    label: t('patrolDataButtonSwitch.switchPatrolReports'),
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
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
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'ctpat-reports' }),
  },
])

function clearDateReloadTimer() {
  if (dateReloadTimer.value != null) {
    window.clearTimeout(dateReloadTimer.value)
    dateReloadTimer.value = null
  }
}

function scheduleReloadByDate() {
  if (suppressDateReload.value) return

  clearDateReloadTimer()
  dateReloadTimer.value = window.setTimeout(async () => {
    await store.load()
  }, 200)
}

useResetFirstOnFilterChange(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterRouteName,
    store.filterIssueStatus,
    store.filterResult,
    store.filterCheckPointName,
    store.filterGuardId,
  ],
  () => store.setFirst(0),
)

const { onPage } = usePagination({
  load: () => (hasInvalidDateFilter.value ? Promise.resolve() : store.load()),
  setFirst: (first) => store.setFirst(first),
})

watch(
  () => [store.filterDateFrom?.getTime() ?? null, store.filterDateTo?.getTime() ?? null],
  () => {
    if (suppressDateReload.value) return
    store.setFirst(0)
    if (hasInvalidDateFilter.value) {
      clearDateReloadTimer()
      return
    }
    scheduleReloadByDate()
  },
)

const REPORTS_RELOAD_STATE_KEY = 'reports:reload-state'

function handleBeforeUnload() {
  persistReloadState()
}

function persistReloadState() {
  const payload = {
    searchText: store.searchText ?? '',
    filterAreaId: store.filterAreaId ?? null,
    filterRouteName: store.filterRouteName ?? null,
    filterIssueStatus: store.filterIssueStatus ?? null,
    filterResult: store.filterResult ?? 'ALL',
    filterCheckPointName: store.filterCheckPointName ?? null,
    filterGuardId: store.filterGuardId ?? '',
    filterDateFrom: store.filterDateFrom ? store.filterDateFrom.toISOString() : null,
    filterDateTo: store.filterDateTo ? store.filterDateTo.toISOString() : null,
    first: store.first ?? 0,
  }

  sessionStorage.setItem(REPORTS_RELOAD_STATE_KEY, JSON.stringify(payload))
}

function restoreReloadState() {
  const raw = sessionStorage.getItem(REPORTS_RELOAD_STATE_KEY)
  if (!raw) return false

  try {
    const payload = JSON.parse(raw) as {
      searchText?: string
      filterAreaId?: number | null
      filterRouteName?: string | null
      filterIssueStatus?: number | null
      filterResult?: ResultFilter
      filterCheckPointName?: string | null
      filterGuardId?: string
      filterDateFrom?: string | null
      filterDateTo?: string | null
      first?: number
    }

    store.searchText = payload.searchText ?? ''
    store.filterAreaId = payload.filterAreaId ?? null
    store.filterRouteName = payload.filterRouteName ?? null
    store.filterIssueStatus = payload.filterIssueStatus ?? null
    store.filterResult = payload.filterResult ?? 'ALL'
    store.filterCheckPointName = payload.filterCheckPointName ?? null
    store.filterGuardId = payload.filterGuardId ?? ''
    store.filterDateFrom = payload.filterDateFrom ? new Date(payload.filterDateFrom) : null
    store.filterDateTo = payload.filterDateTo ? new Date(payload.filterDateTo) : null
    store.setFirst(payload.first ?? 0)

    return true
  } catch {
    sessionStorage.removeItem(REPORTS_RELOAD_STATE_KEY)
    return false
  }
}

function applyRouteFilters() {
  const result = String(route.query.result ?? '')
    .trim()
    .toUpperCase()
  const issueStatusRaw = route.query.issueStatus
  const fromDashboard = String(route.query.fromDashboard ?? '') === '1'

  if (result === 'ALL' || result === 'OK' || result === 'NOT_OK') {
    store.filterResult = result as ResultFilter
  }

  if (issueStatusRaw != null && issueStatusRaw !== '') {
    const issueStatus = Number(Array.isArray(issueStatusRaw) ? issueStatusRaw[0] : issueStatusRaw)
    if (Number.isFinite(issueStatus)) {
      store.filterIssueStatus = issueStatus
    }
  }

  if (fromDashboard) {
    store.searchText = ''
    store.filterAreaId = null
    store.filterRouteName = null
    store.filterGuardId = ''
    store.filterDateFrom = null
    store.filterDateTo = null
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)

  suppressDateReload.value = true

  const restored = restoreReloadState()

  if (!restored) {
    applyRouteFilters()
  }

  await store.load()
  suppressDateReload.value = false
})

onBeforeRouteLeave(() => {
  sessionStorage.removeItem(REPORTS_RELOAD_STATE_KEY)
  resetPageState()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  clearDateReloadTimer()
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

function issueStatusLabel(s: number, hasProblem: boolean) {
  if (!hasProblem) return t('reportList.issueStatusTag.noIssue')
  switch (s) {
    case 0:
      return t('reportList.issueStatusTag.pending')
    case 1:
      return t('reportList.issueStatusTag.inProgress')
    case 2:
      return t('reportList.issueStatusTag.completed')
    case 3:
      return t('reportList.issueStatusTag.incompleted')
    default:
      return t('reportList.issueStatusTag.noIssue')
  }
}

function issueStatusSeverity(s: number, hasProblem: boolean) {
  if (!hasProblem) return 'secondary'
  switch (s) {
    case 0:
      return 'warn'
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
  return hasProblem
    ? t('reportList.inspectionResultTag.notOk')
    : t('reportList.inspectionResultTag.ok')
}

function inspectionSeverity(hasProblem: boolean) {
  return hasProblem ? 'danger' : 'success'
}

function displayReportNote(note: string) {
  return translateReportNote(String(note ?? ''), t)
}

function onColumnFilter(payload: { key: string; value: any }) {
  if (payload.key === 'routeName') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterAreaId = value.primaryValue ?? null
    store.filterRouteName = value.secondaryValue ?? null
  }
  if (payload.key === 'checkPointName') store.filterCheckPointName = payload.value ?? null
  if (payload.key === 'issueStatus') store.filterIssueStatus = payload.value ?? null
  if (payload.key === 'result') store.filterResult = payload.value ?? 'ALL'
  if (payload.key === 'guardId') store.filterGuardId = String(payload.value ?? '').trim()
  if (payload.key === 'reportDate') {
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {}
    store.filterDateFrom = value.from ?? null
    store.filterDateTo = value.to ?? null
  }
}

function clearAll() {
  store.clearFilters()
}

function resetPageState() {
  suppressDateReload.value = true
  clearDateReloadTimer()
  store.clearFilters()
  formVisible.value = false
  formModel.value = null
}

async function openView(row: ReportRow) {
  formMode.value = 'view'
  formModel.value = (await fetchReportRowById(row.pr_id)) ?? row
  formVisible.value = true
}

async function openEditStatus(row: ReportRow) {
  if (!canEditStatus.value || !row.pr_has_problem) return
  formMode.value = 'edit-status'
  formModel.value = (await fetchReportRowById(row.pr_id)) ?? row
  formVisible.value = true
}

async function handleSubmitStatus(payload: { pr_id: number; pr_status: number }) {
  const updatedBy = auth.user?.user_id ?? ''
  if (!updatedBy) return

  try {
    await changeReportStatus({
      pr_id: payload.pr_id,
      pr_status: payload.pr_status,
      updated_by: updatedBy,
    })

    const refreshed = await fetchReportRowById(payload.pr_id)
    if (!refreshed) {
      throw new Error(t('reportList.toast.failedToUpdate'))
    }

    const idx = store.rows.findIndex((x) => x.pr_id === payload.pr_id)
    if (idx >= 0) {
      store.rows[idx] = refreshed
    }

    if (formModel.value?.pr_id === payload.pr_id) {
      formModel.value = refreshed
    }

    formVisible.value = false
    toast.add({
      severity: 'success',
      summary: t('common.save'),
      detail: t('reportList.toast.updated'),
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: String(e?.message ?? t('reportList.toast.failedToUpdate')),
      life: 3000,
    })
  }
}

async function onExport() {
  exporting.value = true
  try {
    await exportPatrolReportXlsx({
      rows: tableRows.value,
      fileName: `patrol_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('reportList.toast.failedToExport'),
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
      <div class="text-[26px] font-semibold text-slate-800">{{ t('reportList.title') }}</div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <BaseDataTable
      :key="`report-list-table-${locale}`"
      title=""
      :value="tableRows"
      :loading="store.loading"
      dataKey="pr_id"
      :rows="store.rowsPerPage"
      :first="store.first"
      :modelSearch="store.searchText"
      @update:modelSearch="store.searchText = $event"
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
            hasInvalidDateFilter ? t('common.invalidDateFilter') : t('reportList.noReportsFound')
          }}
        </div>
      </template>

      <Column
        :header="t('reportList.table.routeName')"
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
          secondaryPlaceholder: t('reportList.table.routeName'),
          secondaryFilter: true,
          secondaryParentField: 'areaId',
          secondaryFilterField: 'searchText',
        }"
      >
        <template #body="{ data }">
          <div class="text-slate-800 font-semibold">
            {{ data.route_name || '-' }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('reportList.table.checkPoint')"
        sortField="cp_code"
        :filterMenu="{
          key: 'checkPointName',
          type: 'select',
          value: store.filterCheckPointName,
          options: store.checkPointOptions,
          filter: true,
          filterField: 'searchText',
          filterMatchMode: 'contains',
          placeholder: t('reportList.table.checkPoint'),
        }"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-semibold">{{ data.cp_name }}</div>
            <div class="text-slate-600 text-xs">{{ data.cp_code }}</div>
          </div>
        </template>
      </Column>

      <Column
        :header="t('reportList.table.inspectionResult')"
        sortField="pr_has_problem"
        :filterMenu="{
          key: 'result',
          type: 'select',
          value: store.filterResult,
          options: resultOptions,
          showClear: false,
        }"
      >
        <template #body="{ data }">
          <Tag
            :value="inspectionLabel(data.pr_has_problem)"
            :severity="inspectionSeverity(data.pr_has_problem)"
          />
        </template>
      </Column>

      <Column :header="t('reportList.table.note')" sortField="pr_note">
        <template #body="{ data }">
          <div class="max-w-[420px] truncate" :title="displayReportNote(data.pr_note || '')">
            {{ data.pr_note ? displayReportNote(data.pr_note) : t('reportList.emptyNote') }}
          </div>
        </template>
      </Column>

      <Column
        :header="t('reportList.table.reportDate')"
        sortField="report_at"
        :filterMenu="{
          key: 'reportDate',
          type: 'date-range',
          value: {
            from: store.filterDateFrom,
            to: store.filterDateTo,
          },
        }"
      >
        <template #body="{ data }">
          {{ formatDateTime(data.report_at || data.scan_at || data.created_at) }}
        </template>
      </Column>

      <Column
        :header="t('reportList.table.issueStatus')"
        sortField="pr_status"
        :filterMenu="{
          key: 'issueStatus',
          type: 'select',
          value: store.filterIssueStatus,
          options: issueStatusOptions,
          showClear: true,
          placeholder: t('reportList.issueStatusOptions.all'),
        }"
      >
        <template #body="{ data }">
          <Tag
            :value="issueStatusLabel(data.pr_status, data.pr_has_problem)"
            :severity="issueStatusSeverity(data.pr_status, data.pr_has_problem)"
          />
        </template>
      </Column>

      <Column
        field="report_name"
        :header="t('reportList.table.guardName')"
        :filterMenu="{
          key: 'guardId',
          type: 'text',
          value: store.filterGuardId,
          placeholder: t('reportList.filters.guardName'),
        }"
      />

      <Column :header="t('reportList.table.action')" sortDisabled>
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
            <BaseIconButton
              v-if="data.pr_has_problem"
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              outlined
              rounded
              @click="openEditStatus(data)"
            />
          </div>
        </template>
      </Column>
    </BaseDataTable>

    <ReportForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model="formModel"
      :canEditStatus="canEditStatus"
      @submit-status="handleSubmitStatus"
      @close="formModel = null"
    />
  </div>
</template>
