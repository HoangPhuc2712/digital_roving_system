<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'

import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { type DataTablePageEvent } from 'primevue/datatable'
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
import ReportFilters from '@/modules/reports/components/ReportFilters.vue'
import { exportPatrolReportXlsx } from '@/services/export/patrolReport.export'
import { changeReportStatus, fetchReportRowById } from '@/modules/reports/reports.api'

const toast = useToast()
const auth = useAuthStore()
const store = useReportsStore()
const route = useRoute()
const router = useRouter()

const resultOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'OK', value: 'OK' },
  { label: 'Not OK', value: 'NOT_OK' },
] satisfies { label: string; value: ResultFilter }[]

const issueStatusOptions = [
  { label: 'All', value: null },
  { label: 'Pending', value: 0 },
  { label: 'In Progress', value: 1 },
  { label: 'Completed', value: 2 },
  { label: 'Incompleted', value: 3 },
]

const exporting = ref(false)
const formVisible = ref(false)
const formMode = ref<ReportFormMode>('view')
const formModel = ref<ReportFormModel | null>(null)
const canEditStatus = computed(() => auth.isAdminUser)
const dateReloadTimer = ref<number | null>(null)
const suppressDateReload = ref(false)

const reportSwitchButtons = computed(() => [
  {
    label: 'Patrol Reports',
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'reports' }),
  },
  {
    label: 'C-TPAT Report',
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

watch(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterIssueStatus,
    store.filterResult,
    store.filterGuardId,
  ],
  () => store.setFirst(0),
)

watch(
  () => [store.filterDateFrom?.getTime() ?? null, store.filterDateTo?.getTime() ?? null],
  () => {
    if (suppressDateReload.value) return
    store.setFirst(0)
    scheduleReloadByDate()
  },
)

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
    store.filterGuardId = ''
    store.filterDateFrom = null
    store.filterDateTo = null
  }
}

onMounted(async () => {
  applyRouteFilters()
  await store.load()
})

onBeforeRouteLeave(() => {
  resetPageState()
})

onBeforeUnmount(() => {
  clearDateReloadTimer()
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

function issueStatusLabel(s: number, hasProblem: boolean) {
  if (!hasProblem) return 'No Issue'
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
      return 'No Issue'
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
  return hasProblem ? 'Not OK' : 'OK'
}

function inspectionSeverity(hasProblem: boolean) {
  return hasProblem ? 'danger' : 'success'
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
      throw new Error('Failed to reload updated report.')
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
      summary: 'Saved',
      detail: 'Issue status has been updated.',
      life: 2000,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to update issue status.'),
      life: 3000,
    })
  }
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
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="text-[26px] font-semibold text-slate-800">Patrol Reports</div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <ReportFilters
      :areaOptions="store.areaOptions"
      :guardOptions="store.guardOptions"
      :resultOptions="resultOptions"
      :issueStatusOptions="issueStatusOptions"
      :modelAreaId="store.filterAreaId"
      :modelIssueStatus="store.filterIssueStatus"
      :modelResult="store.filterResult"
      :modelGuardId="store.filterGuardId"
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      :modelSearch="store.searchText"
      @update:modelAreaId="store.filterAreaId = $event"
      @update:modelIssueStatus="store.filterIssueStatus = $event"
      @update:modelResult="store.filterResult = $event"
      @update:modelGuardId="store.filterGuardId = $event"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @update:modelSearch="store.searchText = $event"
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
      <template #toolbar-end>
        <div class="flex justify-end gap-2">
          <BaseIconButton
            icon="pi pi-file-excel"
            label="Export"
            size="small"
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

      <Column header="Route Name" style="min-width: 10rem" sortField="route_name">
        <template #body="{ data }">
          <div class="text-slate-800 font-semibold">
            {{ data.route_name || '-' }}
          </div>
        </template>
      </Column>

      <Column header="Check Point" style="min-width: 16rem" sortField="cp_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-semibold">{{ data.cp_name }}</div>
            <div class="text-slate-600 text-xs">{{ data.cp_code }}</div>
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

      <Column field="report_name" header="Guard Name" style="min-width: 12rem" />

      <Column header="Issue Status" style="min-width: 12rem" sortField="pr_status">
        <template #body="{ data }">
          <Tag
            :value="issueStatusLabel(data.pr_status, data.pr_has_problem)"
            :severity="issueStatusSeverity(data.pr_status, data.pr_has_problem)"
          />
        </template>
      </Column>

      <Column header="Report Date" style="min-width: 12rem" sortField="report_at">
        <template #body="{ data }">
          {{ formatDateTime(data.report_at || data.scan_at || data.created_at) }}
        </template>
      </Column>

      <Column header="Action" style="width: 160px" sortDisabled>
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
              v-if="canEditStatus && data.pr_has_problem"
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
