<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
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

const props = withDefaults(
  defineProps<{
    visible: boolean
    model: ReportFormModel | null
    mode?: ReportFormMode
    canEditStatus?: boolean
  }>(),
  {
    canEditStatus: true,
  },
)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit-status', payload: { pr_id: number; pr_status: number }): void
  (e: 'close'): void
}>()

const viewerVisible = ref(false)
const viewerTitle = ref('Detail Images')
const viewerItems = ref<BaseImageItem[]>([])
const viewerStartIndex = ref(0)
const statusDraft = ref(0)
const inlineStatusEdit = ref(false)
const { t } = useI18n()

const formMode = computed<ReportFormMode>(() => props.mode ?? 'view')
const canEditStatus = computed(() => Boolean(props.canEditStatus))
const isExternalEditStatus = computed(() => canEditStatus.value && formMode.value === 'edit-status')
const isEditStatus = computed(
  () => canEditStatus.value && (isExternalEditStatus.value || inlineStatusEdit.value),
)
const inspectionOk = computed(() => (props.model ? props.model.pr_has_problem === false : true))
const shiftText = computed(() => String(props.model?.shift_text ?? '').trim())

const issueStatusOptions = computed(() => [
  { label: t('reportForm.issueStatusOptions.pending'), value: 0 },
  { label: t('reportForm.issueStatusOptions.inProgress'), value: 1 },
  { label: t('reportForm.issueStatusOptions.completed'), value: 2 },
  { label: t('reportForm.issueStatusOptions.incompleted'), value: 3 },
])

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

function issueStatusLabel(s: number, hasProblem = true) {
  if (!hasProblem) return t('reportForm.issueStatusOptions.noIssue')
  switch (s) {
    case 0:
      return t('reportForm.issueStatusOptions.pending')
    case 1:
      return t('reportForm.issueStatusOptions.inProgress')
    case 2:
      return t('reportForm.issueStatusOptions.completed')
    case 3:
      return t('reportForm.issueStatusOptions.incompleted')
    default:
      return t('reportForm.issueStatusOptions.noIssue')
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
        title: group.pri_image_note || t('reportForm.photo'),
        alt: `${group.pri_image_note || t('reportForm.photo')} ${idx + 1}`,
      }))
      .filter((x) => !!(x.src ?? '').trim()),
  }))
})

const actualTimeText = computed(() => {
  const text = String(props.model?.reality_time_str ?? '').trim()
  return text || '—'
})

const standardTimeText = computed(() => {
  const text = String(props.model?.plan_time_str ?? '').trim()
  return text || '—'
})

const actualTimeSeverity = computed(() => (props.model?.time_problem ? 'danger' : 'secondary'))

function openViewer(items: BaseImageItem[], startIndex: number, title: string) {
  if (!items.length) return

  const idx = Math.max(0, Math.min(startIndex, items.length - 1))

  viewerTitle.value = title
  viewerItems.value = items
  viewerStartIndex.value = idx
  viewerVisible.value = true
}

function startInlineEditStatus() {
  if (!canEditStatus.value || !props.model?.pr_has_problem) return
  inlineStatusEdit.value = true
  statusDraft.value = Number(props.model.pr_status ?? 0)
}

function cancelInlineEditStatus() {
  inlineStatusEdit.value = false
  statusDraft.value = props.model?.pr_has_problem ? Number(props.model.pr_status ?? 0) : 0
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
      inlineStatusEdit.value = false
    }
  },
)

watch(
  () => [props.model?.pr_id, props.model?.pr_status, props.model?.pr_has_problem, formMode.value],
  () => {
    if (!props.model) {
      statusDraft.value = 0
      inlineStatusEdit.value = false
      return
    }
    statusDraft.value = props.model.pr_has_problem ? Number(props.model.pr_status ?? 0) : 0
    inlineStatusEdit.value = false
  },
  { immediate: true },
)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="isExternalEditStatus ? t('reportForm.editIssueStatus') : t('reportForm.reportDetail')"
    :style="{ width: '980px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '78vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">{{ t('reportForm.noData') }}</div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        <div class="space-y-4 min-w-0">
          <div class="space-y-2">
            <div class="text-xl font-semibold text-slate-800">
              {{ model.cp_name }} - {{ model.cp_code }}
            </div>
            <div>
              <div class="text-sm text-slate-600">
                {{ t('reportForm.patrolRoute') }}:
                <span class="text-slate-800 font-semibold">{{ model.route_name }}</span>
                <span v-if="shiftText" class="text-slate-600">
                  - {{ t('reportForm.shift') }}:
                  <span class="text-slate-800 font-semibold">{{ shiftText }}</span>
                </span>
              </div>

              <div class="text-sm text-slate-600">
                {{ t('reportForm.area') }}:
                <span class="text-slate-800 font-semibold">{{ model.area_name }}</span>
              </div>

              <div class="text-sm text-slate-600">
                {{ t('reportForm.guard') }}:
                <span class="text-slate-800 font-semibold">{{
                  model.report_name || model.created_by
                }}</span>
              </div>

              <div class="text-sm text-slate-600">
                {{ t('reportForm.reportDate') }}:
                <span
                  :class="
                    model.shift_problem
                      ? 'text-red-600 font-semibold'
                      : 'text-slate-800 font-semibold'
                  "
                >
                  {{ formatDateTime(model.report_at || model.scan_at || model.created_at) }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <Tag
                :value="
                  inspectionOk
                    ? t('reportForm.inspectionResultTag.ok')
                    : t('reportForm.inspectionResultTag.notOk')
                "
                :severity="inspectionOk ? 'success' : 'danger'"
              />
            </div>

            <div class="space-y-2">
              <div class="text-sm font-semibold text-slate-800">
                {{ t('reportForm.patrolTime') }}
              </div>
              <div class="flex flex-wrap gap-2">
                <Tag
                  :value="`${t('reportForm.timeCheck.actual')}: ${actualTimeText}`"
                  :severity="actualTimeSeverity"
                />
                <Tag
                  :value="`${t('reportForm.timeCheck.standard')}: ${standardTimeText}`"
                  severity="secondary"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="text-sm font-semibold text-slate-800">{{ t('reportForm.issueStatus') }}</div>

          <div v-if="isEditStatus && model.pr_has_problem" class="space-y-3">
            <div>
              <label class="block text-sm text-slate-600 mb-1">{{ t('reportForm.status') }}</label>
              <Select
                v-model="statusDraft"
                class="w-full"
                :options="issueStatusOptions"
                optionLabel="label"
                size="small"
                optionValue="value"
                :placeholder="t('reportForm.selectStatus')"
              />
            </div>

            <div class="text-sm text-slate-600">
              {{ t('reportForm.updatedBy') }}:
              <span class="text-slate-800 font-semibold">{{ model.updated_name || '—' }}</span>
            </div>

            <div class="flex justify-end gap-2">
              <BaseButton
                v-if="inlineStatusEdit"
                :label="t('common.cancel')"
                severity="secondary"
                outlined
                @click="cancelInlineEditStatus"
              />
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <Tag
                :value="issueStatusLabel(model.pr_status, model.pr_has_problem)"
                :severity="issueStatusSeverity(model.pr_status, model.pr_has_problem)"
              />

              <BaseIconButton
                v-if="canEditStatus && model.pr_has_problem"
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                outlined
                rounded
                @click="startInlineEditStatus"
              />
            </div>

            <div class="text-sm text-slate-600">
              {{ t('reportForm.updatedBy') }}:
              <span class="text-slate-800 font-semibold">{{ model.updated_name || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3">
        <div class="text-sm font-semibold text-slate-800 mb-2">{{ t('reportForm.detail') }}</div>

        <div v-if="detailGroups.length === 0" class="text-sm text-slate-500">
          {{ t('reportForm.noDetailAvailable') }}.
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
                @click="openViewer(group.items, idx, group.note)"
              >
                <img :src="img.src" :alt="img.alt" class="h-16 w-16 object-cover" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton
          :label="t('common.close')"
          size="small"
          severity="secondary"
          outlined
          @click="close"
        />
        <BaseButton
          v-if="isEditStatus && model.pr_has_problem"
          :label="t('common.submit')"
          size="small"
          severity="success"
          @click="submitStatus"
        />
      </div>
    </div>

    <BaseImageViewer
      v-model:visible="viewerVisible"
      :title="viewerTitle"
      :images="viewerItems"
      :startIndex="viewerStartIndex"
    />
  </Dialog>
</template>
