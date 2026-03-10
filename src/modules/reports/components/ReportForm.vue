<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseImageViewer from '@/components/common/BaseImageViewer.vue'

import type { ReportImage, ReportRow } from '@/modules/reports/reports.types'

type BaseImageItem = {
  id: string | number
  src: string
  alt?: string
  title?: string
}

export type ReportFormMode = 'view' | 'edit-status'
export type ReportFormModel = ReportRow

const props = defineProps<{
  visible: boolean
  model: ReportFormModel | null
  mode?: ReportFormMode
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit-status', payload: { pr_id: number; pr_status: number }): void
  (e: 'close'): void
}>()

const viewerVisible = ref(false)
const viewerTitle = ref('Detail Images')
const viewerItems = ref<BaseImageItem[]>([])
const statusDraft = ref(0)

const formMode = computed<ReportFormMode>(() => props.mode ?? 'view')
const isEditStatus = computed(() => formMode.value === 'edit-status')
const inspectionOk = computed(() => (props.model ? props.model.pr_has_problem === false : true))

const issueStatusOptions = [
  { label: 'Pending', value: 0 },
  { label: 'In Progress', value: 1 },
  { label: 'Completed', value: 2 },
  { label: 'Incompleted', value: 3 },
]

function close() {
  emit('update:visible', false)
  emit('close')
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

function formatSeconds(sec: number) {
  const s = Math.max(0, Number(sec) || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const rr = String(r).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${rr}` : `${m}:${rr.padStart(2, '0')}`
}

function issueStatusLabel(s: number, hasProblem = true) {
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

function issueStatusSeverity(s: number, hasProblem = true) {
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

const detailGroups = computed(() => {
  const groups = props.model?.note_groups ?? []
  return groups.map((group, groupIndex) => ({
    id: `${group.pr_group}-${groupIndex}`,
    note: group.pri_image_note || '—',
    items: (group.report_images ?? [])
      .map((img: ReportImage, idx) => ({
        id: img.pri_id || `${group.pr_group}-${idx + 1}`,
        src: img.pri_image,
        title: `Image ${idx + 1}`,
        alt: `Image ${idx + 1}`,
      }))
      .filter((x) => !!(x.src ?? '').trim()),
  }))
})

function openViewer(items: BaseImageItem[], startIndex: number, title: string) {
  if (!items.length) return

  const idx = Math.max(0, Math.min(startIndex, items.length - 1))
  const rotated = items.slice(idx).concat(items.slice(0, idx))

  viewerTitle.value = title
  viewerItems.value = rotated
  viewerVisible.value = true
}

function submitStatus() {
  if (!props.model?.pr_id) return
  emit('submit-status', {
    pr_id: props.model.pr_id,
    pr_status: Number(statusDraft.value ?? 0),
  })
}

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      viewerVisible.value = false
      viewerItems.value = []
    }
  },
)

watch(
  () => [props.model?.pr_id, props.model?.pr_status, props.model?.pr_has_problem, formMode.value],
  () => {
    if (!props.model) {
      statusDraft.value = 0
      return
    }
    statusDraft.value = props.model.pr_has_problem ? Number(props.model.pr_status ?? 0) : 0
  },
  { immediate: true },
)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="isEditStatus ? 'Edit Issue Status' : 'Report Detail'"
    :style="{ width: '980px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '78vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="space-y-1">
        <div class="text-lg font-semibold text-slate-800">
          {{ model.cp_code }} - {{ model.cp_name }}
        </div>
        <div class="text-sm text-slate-600">
          Area:
          <span class="text-slate-800 font-semibold"
            >{{ model.area_code }} - {{ model.area_name }}</span
          >
        </div>
        <div class="text-sm text-slate-600">
          Guard:
          <span class="text-slate-800 font-semibold">{{
            model.report_name || model.created_by
          }}</span>
        </div>
        <div class="text-sm text-slate-600">
          Report Date:
          <span class="text-slate-800 font-semibold">{{
            formatDateTime(model.report_at || model.scan_at || model.created_at)
          }}</span>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <Tag
            :value="issueStatusLabel(model.pr_status, model.pr_has_problem)"
            :severity="issueStatusSeverity(model.pr_status, model.pr_has_problem)"
          />
          <Tag
            :value="inspectionOk ? 'OK' : 'Not OK'"
            :severity="inspectionOk ? 'success' : 'danger'"
          />
          <Tag :value="`Actual: ${formatSeconds(model.pr_second)}`" severity="secondary" />
          <Tag :value="`Standard: ${formatSeconds(model.rd_second)}`" severity="secondary" />
        </div>
      </div>

      <div v-if="isEditStatus" class="border-t border-slate-200 pt-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label class="block text-sm text-slate-600 mb-1">Issue Status</label>
            <Dropdown
              v-model="statusDraft"
              class="w-full"
              :options="issueStatusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select status"
              :disabled="!model.pr_has_problem"
            />
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3">
        <div class="text-sm font-semibold text-slate-800 mb-2">Detail</div>

        <div v-if="detailGroups.length === 0" class="text-sm text-slate-500">
          No detail available.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(group, groupIndex) in detailGroups"
            :key="group.id"
            class="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div class="text-sm font-semibold text-slate-800 mb-2">{{ group.note }}</div>

            <div v-if="group.items.length === 0" class="text-sm text-slate-500">No images.</div>

            <div v-else class="flex items-center gap-3 flex-wrap">
              <button
                v-for="(img, idx) in group.items"
                :key="img.id"
                type="button"
                class="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition"
                @click="
                  openViewer(group.items, idx, `Detail ${groupIndex + 1} (${group.items.length})`)
                "
              >
                <img :src="img.src" :alt="img.alt" class="h-16 w-16 object-cover" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Close" severity="secondary" outlined @click="close" />
        <BaseButton
          v-if="isEditStatus && model.pr_has_problem"
          label="Submit"
          severity="success"
          @click="submitStatus"
        />
      </div>
    </div>

    <BaseImageViewer v-model:visible="viewerVisible" :title="viewerTitle" :images="viewerItems" />
  </Dialog>
</template>
