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
      sortMode="single"
      removableSort
      responsiveLayout="scroll"
      class="app-datatable"
      @page="onPage"
    >
      <VNodeRenderer
        v-for="(node, index) in normalizedDefaultNodes"
        :key="node.key ?? `column-${index}`"
        :vnode="node"
      />

      <template #empty>
        <slot name="empty">
          <div class="py-6 text-center text-slate-500">No data</div>
        </slot>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { Fragment, computed, defineComponent, h, isVNode, useSlots, type VNode } from 'vue'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Toolbar from 'primevue/toolbar'

type AnyRow = Record<string, any>
type SortIconSlotProps = {
  sorted?: boolean
  sortOrder?: number
}

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

const slots = useSlots()

const VNodeRenderer = defineComponent({
  name: 'BaseDataTableVNodeRenderer',
  props: {
    vnode: {
      type: Object as () => VNode,
      required: true,
    },
  },
  setup(rendererProps) {
    return () => rendererProps.vnode
  },
})

const selectionProxy = computed({
  get: () => props.selection,
  set: (v) => emit('update:selection', v),
})

const normalizedDefaultNodes = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.map(transformNode).filter((node): node is VNode => isVNode(node))
})

function onPage(ev: DataTablePageEvent) {
  emit('update:first', ev.first)
  emit('page', ev)
}

function transformNode(node: VNode): VNode {
  if (!isVNode(node)) {
    return node
  }

  const currentProps = { ...(node.props ?? {}) } as Record<string, any>

  const sortable =
    currentProps.sortDisabled === true
      ? false
      : Boolean(currentProps.field || currentProps.sortField)

  const vnodeProps: Record<string, any> = {
    ...currentProps,
    ref: (node as any).ref,
    sortable,
  }

  if (node.key != null) {
    vnodeProps.key = node.key
  }

  return h(node.type as any, vnodeProps, buildColumnChildren(node, sortable) as any)
}

function isColumnVNode(node: VNode) {
  const type = node.type as any
  return typeof type === 'object' && (type?.name === 'Column' || type?.__name === 'Column')
}

function buildColumnChildren(node: VNode, sortable: boolean) {
  const children = node.children

  if (!children || Array.isArray(children) || typeof children !== 'object') {
    return children
  }

  const currentSlots = children as Record<string, (...args: any[]) => any>

  if (!sortable || currentSlots.sorticon) {
    return currentSlots
  }

  return {
    ...currentSlots,
    sorticon: (slotProps: SortIconSlotProps) => {
      const icon = resolveSortIcon(slotProps)
      return h('i', { class: ['pi', icon] })
    },
  }
}

function resolveSortIcon(slotProps: SortIconSlotProps) {
  if (!slotProps?.sorted) return 'pi-sort-alt'
  if ((slotProps.sortOrder ?? 0) > 0) return 'pi-sort-amount-down-alt'
  return 'pi-sort-amount-up'
}
</script>
