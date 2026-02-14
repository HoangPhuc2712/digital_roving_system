<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import Tag from 'primevue/tag'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseImageViewer from '@/components/common/BaseImageViewer.vue'

type ReportFormMode = 'new' | 'view' | 'edit'

export type ReportFormModel = {
  pr_id?: number
  area_id?: number | null
  area_code?: string
  area_name?: string

  cp_id?: number | null
  cp_name?: string
  cp_description?: string

  pr_check?: boolean
  pr_note?: string

  user_id?: string
  user_name?: string
  role_code?: string
  role_name?: string

  created_at?: string

  images?: Array<{
    pri_id: number | string
    src: string
  }>
}

type BaseImageItem = {
  id: string | number
  src: string
  alt?: string
  title?: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    mode: ReportFormMode
    model: ReportFormModel | null

    canEdit?: boolean
    canDelete?: boolean

    resultOptions?: Array<{ label: string; value: boolean }>
  }>(),
  {
    canEdit: true,
    canDelete: true,
    resultOptions: () => [
      { label: 'OK', value: true },
      { label: 'Not OK', value: false },
    ],
  },
)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (
    e: 'submit',
    payload: {
      pr_id?: number
      pr_check: boolean
      pr_note: string
      delete_image_ids: Array<number | string>
      add_images: string[]
    },
  ): void
  (e: 'delete', pr_id: number): void
  (e: 'openEdit', pr_id: number): void
}>()

const isView = computed(() => props.mode === 'view')
const isEdit = computed(() => props.mode === 'edit')
const isNew = computed(() => props.mode === 'new')

const headerTitle = computed(() => {
  const cp = props.model?.cp_name || 'Report'
  if (isNew.value) return `New ${cp}`
  if (isEdit.value) return `${cp} Edit`
  return `${cp} Detail`
})

function close() {
  emit('update:visible', false)
}

function normalizeSrc(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/jpeg;base64,${s}`
}

const form = reactive({
  pr_check: true as boolean,
  pr_note: '' as string,
})

const existing = ref<Array<{ pri_id: number | string; src: string; removed: boolean }>>([])
const addImages = ref<Array<{ id: string; src: string }>>([])

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    form.pr_check = props.model?.pr_check ?? true
    form.pr_note = props.model?.pr_note ?? ''
    existing.value = (props.model?.images ?? []).map((x) => ({
      pri_id: x.pri_id,
      src: normalizeSrc(x.src),
      removed: false,
    }))
    addImages.value = []
    touched.value = false
  },
  { immediate: true },
)

const touched = ref(false)
const noteError = computed(() => false)

function toggleRemoveExisting(id: number | string) {
  if (isView.value) return
  const item = existing.value.find((x) => x.pri_id === id)
  if (!item) return
  item.removed = !item.removed
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('READ_FILE_FAILED'))
    reader.readAsDataURL(file)
  })
}

async function onChoosePhotos(e: FileUploadSelectEvent) {
  if (isView.value) return
  const files = Array.from(e.files ?? [])
  if (files.length === 0) return

  for (const f of files) {
    if (!f) continue
    const dataUrl = await fileToDataUrl(f as File)
    addImages.value.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      src: dataUrl,
    })
  }
}

function removeNewImage(id: string) {
  if (isView.value) return
  const idx = addImages.value.findIndex((x) => x.id === id)
  if (idx >= 0) addImages.value.splice(idx, 1)
}

const viewDialog = ref(false)
const viewItems = ref<BaseImageItem[]>([])
const viewTitle = ref('Photos')

function openViewer(title: string, list: Array<{ id: string | number; src: string }>) {
  viewTitle.value = title
  viewItems.value = list
    .map((x, idx) => ({
      id: x.id,
      src: x.src,
      alt: `Image ${idx + 1}`,
      title: `Image ${idx + 1}`,
    }))
    .filter((x) => !!normalizeSrc(x.src))
    .map((x) => ({ ...x, src: normalizeSrc(x.src) }))
  viewDialog.value = true
}

function onSubmit() {
  touched.value = true
  if (!props.canEdit) return
  if (!isNew.value && !isEdit.value) return

  const deleteIds = existing.value.filter((x) => x.removed).map((x) => x.pri_id)
  const add = addImages.value.map((x) => x.src)

  emit('submit', {
    pr_id: props.model?.pr_id,
    pr_check: form.pr_check,
    pr_note: form.pr_note ?? '',
    delete_image_ids: deleteIds,
    add_images: add,
  })
}

function onDelete() {
  if (!props.canDelete) return
  const id = props.model?.pr_id
  if (!id) return
  emit('delete', id)
}

function formatReportDateTime(iso?: string) {
  const s = (iso ?? '').trim()
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s

  // 2026-02-06, 10:10
  const date = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)

  return `${date}, ${time}`
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="headerTitle"
    :style="{ width: '920px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '78vh' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm text-slate-600">
            {{ model?.user_name || '-' }}
            <span class="mx-1">-</span>
            {{ model?.role_name || model?.role_code || '-' }}
            <span class="mx-1">-</span>
            {{ formatReportDateTime(model?.created_at) }}
          </div>
        </div>

        <div class="flex gap-2 shrink-0">
          <BaseButton
            v-if="mode === 'view' && model?.pr_id"
            label="Edit"
            severity="success"
            outlined
            :disabled="!canEdit"
            @click="emit('openEdit', model.pr_id)"
          />
          <BaseButton
            v-if="mode !== 'new'"
            label="Delete"
            severity="danger"
            outlined
            :disabled="!canDelete"
            @click="onDelete"
          />
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div class="p-4 border-b md:border-b-0 md:border-r border-slate-200">
            <div class="text-xs text-slate-500 mb-1">Scan Point</div>
            <div class="text-slate-800 font-medium">{{ model?.cp_name || '-' }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ model?.cp_description || '' }}</div>
          </div>
          <div class="p-4 border-b border-slate-200">
            <div class="text-xs text-slate-500 mb-1">Area</div>
            <div class="text-slate-800 font-medium">
              {{ model?.area_code || '-' }}
            </div>
            <div class="text-slate-600 text-xs mt-1">
              {{ model?.area_name || '' }}
            </div>
          </div>

          <div class="p-4 border-b md:border-b-0 md:border-r border-slate-200">
            <div class="text-xs text-slate-500 mb-2">Result</div>

            <div v-if="isView" class="inline-flex">
              <Tag
                :value="(model?.pr_check ?? false) ? 'OK' : 'Not OK'"
                :severity="(model?.pr_check ?? false) ? 'success' : 'danger'"
              />
            </div>

            <div v-else class="max-w-[240px]">
              <Dropdown
                v-model="form.pr_check"
                class="w-full"
                :options="resultOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select result"
              />
            </div>
          </div>

          <div class="p-4 border-b border-slate-200">
            <div class="text-xs text-slate-500 mb-2">Note</div>

            <div v-if="isView" class="text-slate-800">
              {{ model?.pr_note?.trim() ? model?.pr_note : '-' }}
            </div>

            <div v-else>
              <Textarea
                v-model="form.pr_note"
                class="w-full"
                rows="3"
                :invalid="touched && noteError"
              />
            </div>
          </div>

          <div class="p-4 md:col-span-2">
            <div class="text-xs text-slate-500 mb-2">Photo</div>

            <div class="flex flex-wrap items-center gap-2 mb-3">
              <BaseButton
                label="View"
                severity="secondary"
                outlined
                :disabled="existing.filter((x) => !x.removed).length + addImages.length === 0"
                @click="
                  openViewer('Photos', [
                    ...existing
                      .filter((x) => !x.removed)
                      .map((x) => ({ id: x.pri_id, src: x.src })),
                    ...addImages.map((x) => ({ id: x.id, src: x.src })),
                  ])
                "
              />
              <div class="text-xs text-slate-500">
                {{ existing.filter((x) => !x.removed).length + addImages.length }} file(s)
              </div>
            </div>

            <div v-if="!isView" class="space-y-3">
              <div>
                <div class="text-xs text-slate-500 mb-2">Existing Photos</div>
                <div v-if="existing.length === 0" class="text-sm text-slate-500">
                  No existing photos.
                </div>

                <div v-else class="flex flex-wrap gap-2">
                  <button
                    v-for="img in existing"
                    :key="String(img.pri_id)"
                    type="button"
                    class="border rounded-lg overflow-hidden w-[96px] h-[72px] relative"
                    @click="toggleRemoveExisting(img.pri_id)"
                  >
                    <img :src="img.src" class="w-full h-full object-cover" />
                    <div
                      v-if="img.removed"
                      class="absolute inset-0 bg-white/80 flex items-center justify-center text-xs text-slate-700"
                    >
                      Removed
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div class="text-xs text-slate-500 mb-2">Add New Photos</div>

                <FileUpload
                  mode="basic"
                  name="files"
                  accept="image/*"
                  customUpload
                  chooseLabel="Choose Photo"
                  :multiple="true"
                  :auto="false"
                  @select="onChoosePhotos"
                />

                <div v-if="addImages.length > 0" class="mt-3 flex flex-wrap gap-2">
                  <div
                    v-for="img in addImages"
                    :key="img.id"
                    class="relative w-[96px] h-[72px] border rounded-lg overflow-hidden"
                  >
                    <img :src="img.src" class="w-full h-full object-cover" />
                    <button
                      type="button"
                      class="absolute top-1 right-1 bg-white/90 border border-slate-200 rounded px-2 py-1 text-xs"
                      @click="removeNewImage(img.id)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-slate-500">View images using the button above.</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <BaseButton label="Cancel" severity="secondary" outlined @click="close" />
        <BaseButton
          v-if="mode === 'new' || mode === 'edit'"
          label="Submit"
          severity="success"
          :disabled="!canEdit"
          @click="onSubmit"
        />
      </div>
    </template>
  </Dialog>

  <BaseImageViewer v-model:visible="viewDialog" :title="viewTitle" :images="viewItems" />
</template>
