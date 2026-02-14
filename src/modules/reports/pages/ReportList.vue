<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'

import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import { useReportsStore } from '@/modules/reports/reports.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ReportRow } from '@/modules/reports/reports.types'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseImageViewer from '@/components/common/BaseImageViewer.vue'
import { pointReportImages } from '@/mocks/db'
import BaseDataTable from '@/components/common/BaseDataTable.vue'
import ReportForm, { type ReportFormModel } from '@/modules/reports/components/ReportForm.vue'
import { createReportMock, updateReportMock } from '@/modules/reports/reports.api'

type BaseImageItem = {
  id: string | number
  src: string
  alt?: string
  title?: string
}

type ReportFormSubmitPayload = {
  pr_id?: number
  cp_id?: string | number
  pr_check: boolean
  pr_note: string
  delete_image_ids: Array<string | number>
  add_images: string[]
}

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const store = useReportsStore()
const auth = useAuthStore()

const canEdit = computed(() => auth.canAccess('reports.edit'))
const canDelete = computed(() => auth.canAccess('reports.delete'))

const lockRoleGuard = computed(() => !auth.canAccess('reports.view_all'))

const currentRoleCode = computed(() => String(auth.user?.role?.role_code ?? ''))
const currentUserId = computed(() => String(auth.user?.user_id ?? ''))

const imagesDialogVisible = ref(false)
const imagesDialogTitle = ref('')
const imagesDialogItems = ref<BaseImageItem[]>([])
const selectedReports = ref<ReportRow[]>([])

const formVisible = ref(false)
const formMode = ref<'new' | 'view' | 'edit'>('view')
const formModel = ref<ReportFormModel | null>(null)
const submitting = ref(false)

function applyLockedFilters() {
  if (!lockRoleGuard.value) return
  store.filterRoleCode = currentRoleCode.value
  store.filterGuardId = currentUserId.value
}

onMounted(async () => {
  applyLockedFilters()
  await store.load()
})

watch(
  () => [
    store.searchText,
    store.filterAreaId,
    store.filterResult,
    store.filterRoleCode,
    store.filterGuardId,
    store.filterDateRange,
  ],
  () => {
    store.setFirst(0)
  },
)

watch(
  () => store.filterGuardId,
  (guardId) => {
    if (!guardId) return
    const row = store.visibleRows.find((r) => r.user_id === guardId)
    if (!row) return
    if (store.filterRoleCode !== row.role_code) {
      store.filterRoleCode = row.role_code
    }
  },
)

watch(
  () => store.filterRoleCode,
  (roleCode) => {
    if (lockRoleGuard.value) return
    if (!store.filterGuardId) return

    const row = store.visibleRows.find((r) => r.user_id === store.filterGuardId)
    if (!row) return

    if (roleCode && row.role_code !== roleCode) {
      store.filterGuardId = ''
    }
  },
)

function onPage(e: DataTablePageEvent) {
  store.setFirst(e.first)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function onView(row: ReportRow) {
  router.push({ name: 'report-detail', params: { id: row.pr_id } })
}

function onEdit(row: ReportRow) {
  router.push({
    name: 'report-detail',
    params: { id: row.pr_id },
    query: { edit: '1' },
  })
}

function onDelete(row: ReportRow) {
  confirm.require({
    header: 'Confirm Delete',
    message: `Delete report #${row.pr_id}?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: () => {
      store.deleteLocal(row.pr_id)
      toast.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `Report #${row.pr_id} has been deleted.`,
        life: 2000,
      })
    },
  })
}

function onClearFilters() {
  store.clearFilters()
  applyLockedFilters()
}

const resultOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'OK', value: 'OK' },
  { label: 'Not OK', value: 'NOT_OK' },
]

function normalizeImage(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:')) return s
  return `data:image/jpeg;base64,${s}`
}

function getImageList(prId: number) {
  return pointReportImages
    .filter((x) => x.pr_id === prId)
    .map((x) => normalizeImage(x.pri_image))
    .filter(Boolean)
}

function getImageCount(prId: number) {
  return pointReportImages.filter((x) => x.pr_id === prId).length
}

function onViewImages(row: ReportRow) {
  const prId = row.pr_id
  const srcList = getImageList(prId)

  imagesDialogTitle.value = `${row.cp_name} Photos`
  imagesDialogItems.value = srcList.map((src, idx) => ({
    id: `${prId}-${idx}`,
    src,
    alt: `Image ${idx + 1}`,
    title: `Image ${idx + 1}`,
  }))

  imagesDialogVisible.value = true
}

function toNumberIds(ids: Array<string | number> | undefined) {
  return (ids ?? [])
    .map((x) => (typeof x === 'number' ? x : Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function getImagesByReportId(prId: number) {
  return pointReportImages
    .filter((x) => x.pr_id === prId)
    .map((x) => ({
      pri_id: x.pri_id,
      src: normalizeImage(x.pri_image),
    }))
    .filter((x) => !!x.src)
}

function onDeleteSelected() {
  if (!selectedReports.value.length) return

  confirm.require({
    header: 'Confirm Delete',
    message: `Delete ${selectedReports.value.length} selected report(s)?`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: () => {
      const ids = selectedReports.value.map((x) => x.pr_id)
      ids.forEach((id) => store.deleteLocal(id))
      selectedReports.value = []

      toast.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `Deleted ${ids.length} report(s).`,
        life: 2000,
      })
    },
  })
}

function openNew() {
  formMode.value = 'new'
  formModel.value = {
    pr_check: true,
    pr_note: '',
    images: [],
  }
  formVisible.value = true
}

function openView(row: ReportRow) {
  formMode.value = 'view'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function openEdit(row: ReportRow) {
  formMode.value = 'edit'
  formModel.value = mapRowToFormModel(row)
  formVisible.value = true
}

function mapRowToFormModel(row: ReportRow): ReportFormModel {
  return {
    pr_id: row.pr_id,
    area_id: row.area_id,
    area_code: row.area_code,
    area_name: row.area_name,
    cp_id: row.cp_id,
    cp_name: row.cp_name,
    cp_description: row.cp_description,
    pr_check: row.pr_check,
    pr_note: row.pr_note,
    user_id: row.user_id,
    user_name: row.user_name,
    role_code: row.role_code,
    role_name: row.role_name,
    created_at: row.created_at,
    images: getImagesByReportId(row.pr_id),
  }
}

async function onFormSubmit(payload: ReportFormSubmitPayload) {
  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  const delIds = toNumberIds(payload.delete_image_ids)
  const addImgs = payload.add_images ?? []

  submitting.value = true
  try {
    if (formMode.value === 'new') {
      const cpId = typeof payload.cp_id === 'number' ? payload.cp_id : Number(payload.cp_id)

      if (!Number.isFinite(cpId) || cpId <= 0) throw new Error('CHECKPOINT_REQUIRED')

      await createReportMock({
        cp_id: cpId,
        pr_check: payload.pr_check,
        pr_note: payload.pr_note,
        add_images: addImgs,
        actor_id: actor,
      })
    }

    if (formMode.value === 'edit') {
      if (!payload.pr_id) throw new Error('REPORT_ID_REQUIRED')

      await updateReportMock({
        pr_id: payload.pr_id,
        pr_check: payload.pr_check,
        pr_note: payload.pr_note,
        delete_image_ids: delIds,
        add_images: addImgs,
        actor_id: actor,
      })
    }

    await store.load()
    formVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-reports space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-xl font-semibold text-slate-800">Roving Reports</div>

      <div class="w-full max-w-md">
        <BaseInput v-model="store.searchText" class="w-full" placeholder="Search..." />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Area</label>
          <Dropdown
            v-model="store.filterAreaId"
            class="w-full"
            :options="store.areaOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Result</label>
          <Dropdown
            v-model="store.filterResult"
            class="w-full"
            :options="resultOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Role</label>
          <Dropdown
            v-model="store.filterRoleCode"
            class="w-full"
            :options="store.roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
            :disabled="lockRoleGuard"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Guard Name</label>
          <Dropdown
            v-model="store.filterGuardId"
            class="w-full"
            :options="store.guardOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All"
            showClear
            :disabled="lockRoleGuard"
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm text-slate-600 mb-1">Select Date</label>
          <Calendar
            v-model="store.filterDateRange"
            class="w-full"
            selectionMode="range"
            dateFormat="yy-mm-dd"
            placeholder="From - To"
            showButtonBar
          />
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <BaseButton label="Clear Filters" severity="secondary" outlined @click="onClearFilters" />
      </div>
    </div>

    <div>
      <BaseDataTable
        title=""
        :value="store.filteredRows"
        :loading="store.loading"
        dataKey="pr_id"
        :rows="store.rowsPerPage"
        :first="store.first"
        v-model:selection="selectedReports"
        @page="onPage"
      >
        <template #toolbar-start>
          <div class="flex justify-start gap-2">
            <BaseButton
              label="Delete"
              severity="danger"
              outlined
              :disabled="!selectedReports.length"
              @click="onDeleteSelected"
            />
          </div>
        </template>
        <template #toolbar-end>
          <!-- Import/Export -->
        </template>
        <template #empty>
          <div class="p-4 text-slate-600 flex justify-center">No reports found.</div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem" />

        <Column header="Area" style="min-width: 12rem">
          <template #body="{ data }">
            <div class="flex flex-col">
              <div class="text-slate-800 font-bold">{{ data.area_code }}</div>
              <div class="text-slate-600 text-xs">{{ data.area_name }}</div>
            </div>
          </template>
        </Column>

        <Column header="Scan Point" style="min-width: 16rem">
          <template #body="{ data }">
            <div class="flex flex-col">
              <div class="text-slate-800 font-medium">{{ data.cp_name }}</div>
              <div class="text-slate-600 text-xs mt-1">{{ data.cp_description }}</div>
            </div>
          </template>
        </Column>

        <Column header="Result" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="data.pr_check ? 'OK' : 'Not OK'"
              :severity="data.pr_check ? 'success' : 'danger'"
            />
          </template>
        </Column>

        <Column header="Note" style="min-width: 16rem">
          <template #body="{ data }">
            <div class="max-w-[420px] truncate" :title="data.pr_note || ''">
              {{ data.pr_note || '-' }}
            </div>
          </template>
        </Column>

        <Column header="Photo" style="min-width: 10rem">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-2">
              <BaseButton
                :label="
                  getImageCount(data.pr_id) > 0 ? `View (${getImageCount(data.pr_id)})` : 'View (0)'
                "
                size="small"
                severity="secondary"
                outlined
                :disabled="getImageCount(data.pr_id) === 0"
                @click="onViewImages(data)"
              />
            </div>
          </template>
        </Column>

        <Column field="user_name" header="Guard Name" style="min-width: 12rem" />

        <Column header="Roving Date" style="min-width: 12rem">
          <template #body="{ data }">
            {{ formatDateTime(data.created_at) }}
          </template>
        </Column>

        <Column header="Action" style="width: 220px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <BaseButton
                label="View"
                size="small"
                severity="secondary"
                outlined
                @click="openView(data)"
              />
              <BaseButton
                label="Edit"
                size="small"
                severity="success"
                outlined
                :disabled="!canEdit"
                @click="openEdit(data)"
              />
              <BaseButton
                label="Delete"
                size="small"
                severity="danger"
                outlined
                :disabled="!canDelete"
                @click="onDelete(data)"
              />
            </div>
          </template>
        </Column>
      </BaseDataTable>

      <BaseImageViewer
        v-model:visible="imagesDialogVisible"
        :title="imagesDialogTitle"
        :images="imagesDialogItems"
      />

      <ReportForm
        v-model:visible="formVisible"
        :mode="formMode"
        :model="formModel"
        :submitting="submitting"
        @submit="onFormSubmit"
        @request-edit="formMode = 'edit'"
      />
    </div>
  </div>
</template>
