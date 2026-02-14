<template>
  <div class="card">
    <Toolbar class="mb-4">
      <template #start>
        <slot name="toolbar-start" />
      </template>
      <template #end>
        <slot name="toolbar-end" />
      </template>
    </Toolbar>

    <DataTable
      ref="dt"
      :value="value"
      :loading="loading"
      :dataKey="dataKey"
      v-model:selection="selectionProxy"
      :paginator="paginator"
      :rows="rows"
      :first="first"
      :rowsPerPageOptions="rowsPerPageOptions"
      :paginatorTemplate="paginatorTemplate"
      :currentPageReportTemplate="currentPageReportTemplate"
      responsiveLayout="scroll"
      class="app-datatable"
      @page="onPage"
    >
      <!-- <template #header>
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <h4 class="m-0">{{ title }}</h4>
          <slot name="header-right" />
        </div>
      </template> -->

      <slot />

      <template #empty>
        <div class="py-6 text-center text-slate-500">No data</div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Toolbar from 'primevue/toolbar'

type AnyRow = Record<string, any>

const props = withDefaults(
  defineProps<{
    title: string
    value: AnyRow[]
    loading?: boolean
    dataKey?: string
    paginator?: boolean
    rows?: number
    first?: number
    rowsPerPageOptions?: number[]
    paginatorTemplate?: string
    currentPageReportTemplate?: string
    selection?: AnyRow[] | null
  }>(),
  {
    loading: false,
    dataKey: 'id',
    paginator: true,
    rows: 10,
    first: 0,
    rowsPerPageOptions: () => [10, 25, 50],
    paginatorTemplate:
      'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
    selection: null,
  },
)

const emit = defineEmits<{
  (e: 'update:selection', value: AnyRow[] | null): void
  (e: 'update:first', value: number): void
  (e: 'page', ev: DataTablePageEvent): void
}>()

const selectionProxy = computed({
  get: () => props.selection,
  set: (v) => emit('update:selection', v),
})

function onPage(ev: DataTablePageEvent) {
  emit('update:first', ev.first)
  emit('page', ev)
}
</script>
