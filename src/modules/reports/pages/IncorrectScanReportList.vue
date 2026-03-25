<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'

import BaseDataTable from '@/components/common/BaseDataTable.vue'
import BaseButtonGroup from '@/components/common/buttons/BaseButtonGroup.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import IncorrectScanReportFilters from '@/modules/reports/components/IncorrectScanReportFilters.vue'
import { useIncorrectScanReportsStore } from '@/modules/reports/incorrectScanReports.store'
import { exportIncorrectScanReportXlsx } from '@/services/export/incorrectScanReport.export'

const toast = useToast()
const router = useRouter()
const store = useIncorrectScanReportsStore()
const dateReloadTimer = ref<number | null>(null)
const exporting = ref(false)

const reportSwitchButtons = computed(() => [
  {
    label: 'Patrol Reports',
    icon: 'pi pi-file',
    size: 'small',
    severity: 'secondary' as const,
    outlined: true,
    onClick: () => router.push({ name: 'reports' }),
  },
  {
    label: 'Incorrect Scan Reports',
    icon: 'pi pi-file',
    size: 'small',
    severity: 'info' as const,
    outlined: false,
    onClick: () => router.push({ name: 'incorrect-scan-reports' }),
  },
  {
    label: 'C-TPAT Reports',
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
  clearDateReloadTimer()
  dateReloadTimer.value = window.setTimeout(async () => {
    await store.load()
  }, 200)
}

watch(
  () => store.searchText,
  () => store.setFirst(0),
)

watch(
  () => [store.filterDateFrom?.getTime() ?? null, store.filterDateTo?.getTime() ?? null],
  () => {
    store.setFirst(0)
    scheduleReloadByDate()
  },
)

onMounted(async () => {
  await store.load()
})

onBeforeRouteLeave(() => {
  resetPageState()
})

onBeforeUnmount(() => {
  clearDateReloadTimer()
  resetPageState()
})

function resetPageState() {
  store.clearFilters()
}

function clearAll() {
  store.clearFilters()
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

async function onExport() {
  exporting.value = true
  try {
    await exportIncorrectScanReportXlsx({
      rows: store.filteredRows,
      fileName: `incorrect_scan_reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? 'Failed to export incorrect scan reports.'),
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
      <div class="text-[26px] font-semibold text-slate-800">Incorrect Scan Point Reports</div>
      <BaseButtonGroup :buttons="reportSwitchButtons" />
    </div>

    <IncorrectScanReportFilters
      :modelDateFrom="store.filterDateFrom"
      :modelDateTo="store.filterDateTo"
      :modelSearch="store.searchText"
      :loading="store.loading"
      @update:modelDateFrom="store.filterDateFrom = $event"
      @update:modelDateTo="store.filterDateTo = $event"
      @update:modelSearch="store.searchText = $event"
      @clear="clearAll"
    />

    <BaseDataTable
      title=""
      :value="store.filteredRows"
      :loading="store.loading"
      dataKey="scql_id"
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
            :loading="exporting"
            :disabled="exporting"
            @click="onExport"
          />
        </div>
      </template>
      <template #empty>
        <div class="p-4 text-slate-600 flex justify-center">No incorrect scan reports found.</div>
      </template>

      <Column
        field="route_name"
        header="Route Name"
        style="min-width: 14rem"
        sortField="route_name"
      >
        <template #body="{ data }">
          <div class="text-slate-800 font-semibold">{{ data.route_name || '-' }}</div>
        </template>
      </Column>

      <Column header="Start Time" style="min-width: 12rem" sortField="ps_start_at">
        <template #body="{ data }">
          {{ formatDateTime(data.ps_start_at) }}
        </template>
      </Column>

      <Column header="Finish Time" style="min-width: 12rem" sortField="ps_end_at">
        <template #body="{ data }">
          {{ formatDateTime(data.ps_end_at) }}
        </template>
      </Column>

      <Column header="Patrol Time" style="min-width: 12rem" sortField="created_at">
        <template #body="{ data }">
          {{ formatDateTime(data.created_at) }}
        </template>
      </Column>

      <Column header="Incorrect Scan Point" style="min-width: 16rem" sortField="wrong_cp_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-red-600 font-semibold">{{ data.wrong_cp_name || '-' }}</div>
            <div class="text-red-500 text-xs">{{ data.wrong_cp_code || '-' }}</div>
          </div>
        </template>
      </Column>

      <Column header="Correct Scan Point" style="min-width: 16rem" sortField="correct_cp_code">
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="text-slate-800 font-semibold">{{ data.correct_cp_name || '-' }}</div>
            <div class="text-slate-600 text-xs">{{ data.correct_cp_code || '-' }}</div>
          </div>
        </template>
      </Column>

      <Column
        field="created_name"
        header="Guard Name"
        style="min-width: 12rem"
        sortField="created_name"
      />
    </BaseDataTable>
  </div>
</template>
