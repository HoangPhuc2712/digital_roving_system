<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type BreadcrumbItem = {
  label: string
  to?: { name: string; query?: Record<string, any> }
}

const route = useRoute()
const router = useRouter()

const routeName = computed(() => String(route.name ?? ''))

const items = computed<BreadcrumbItem[]>(() => {
  const root: BreadcrumbItem = {
    label: 'Internal Patrol Report',
    to: { name: 'dashboard' },
  }

  switch (routeName.value) {
    case 'dashboard':
      return [root]
    case 'users':
      return [root, { label: 'Users' }]
    case 'roles':
      return [root, { label: 'Roles' }]
    case 'areas':
      return [root, { label: 'Areas' }]
    case 'checkpoints':
      return [root, { label: 'Areas', to: { name: 'areas' } }, { label: 'Check Points' }]
    case 'routes':
      return [root, { label: 'Patrol Routes' }]
    case 'menuCategories':
      return [root, { label: 'Menu Categories' }]
    case 'reports':
      return [root, { label: 'Patrols Data', to: { name: 'reports' } }, { label: 'Patrol Reports' }]
    case 'ctpat-reports':
      return [root, { label: 'Patrols Data', to: { name: 'reports' } }, { label: 'C-TPAT Report' }]
    case 'patrol-detail-reports':
      return [
        root,
        { label: 'Reports Data', to: { name: 'patrol-detail-reports' } },
        { label: 'Patrol Detail Report' },
      ]
    case 'patrol-summary-reports':
      return [
        root,
        { label: 'Reports Data', to: { name: 'patrol-detail-reports' } },
        { label: 'Patrol Summary Report' },
      ]
    default:
      return [root]
  }
})

function onNavigate(item: BreadcrumbItem, isLast: boolean) {
  if (isLast || !item.to) return
  router.push(item.to)
}
</script>

<template>
  <nav aria-label="Breadcrumb" class="min-w-0">
    <ol class="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex items-center gap-1.5 min-w-0"
      >
        <button
          v-if="item.to && index < items.length - 1"
          type="button"
          class="truncate rounded text-left transition hover:text-slate-900"
          @click="onNavigate(item, index === items.length - 1)"
        >
          {{ item.label }}
        </button>
        <span
          v-else
          class="truncate"
          :class="index === items.length - 1 ? 'text-slate-800 font-medium' : ''"
        >
          {{ item.label }}
        </span>

        <span v-if="index < items.length - 1" class="text-slate-400">/</span>
      </li>
    </ol>
  </nav>
</template>
