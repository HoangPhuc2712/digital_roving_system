<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

type BreadcrumbItem = {
  label: string
  to?: { name: string; query?: Record<string, any> }
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const routeName = computed(() => String(route.name ?? ''))

const items = computed<BreadcrumbItem[]>(() => {
  const root: BreadcrumbItem = {
    label: t('breadcrumb.root'),
    to: { name: 'dashboard' },
  }

  switch (routeName.value) {
    case 'dashboard':
      return [root]
    case 'users':
      return [root, { label: t('breadcrumb.users') }]
    case 'roles':
      return [root, { label: t('breadcrumb.roles') }]
    case 'areas':
      return [root, { label: t('breadcrumb.areas') }]
    case 'checkpoints':
      return [
        root,
        { label: t('breadcrumb.areas'), to: { name: 'areas' } },
        { label: t('breadcrumb.checkpoints') },
      ]
    case 'routes':
      return [root, { label: t('breadcrumb.routes') }]
    case 'user-info':
      return [root, { label: t('breadcrumb.userInfo') }]
    case 'tutorial':
      return [root, { label: t('breadcrumb.tutorial') }]
    case 'organizations':
      return [root, { label: t('breadcrumb.organizations') }]
    case 'reports':
      return [
        root,
        { label: t('breadcrumb.patrolsData'), to: { name: 'reports' } },
        { label: t('breadcrumb.patrolReports') },
      ]
    case 'ctpat-reports':
      return [
        root,
        { label: t('breadcrumb.patrolsData'), to: { name: 'reports' } },
        { label: t('breadcrumb.ctpatReport') },
      ]
    case 'incorrect-scan-reports':
      return [
        root,
        { label: t('breadcrumb.patrolsData'), to: { name: 'reports' } },
        { label: t('breadcrumb.incorrectScanReports') },
      ]
    case 'patrol-detail-reports':
      return [
        root,
        { label: t('breadcrumb.reportsData'), to: { name: 'patrol-detail-reports' } },
        { label: t('breadcrumb.patrolDetailReport') },
      ]
    case 'patrol-summary-reports':
      return [
        root,
        { label: t('breadcrumb.reportsData'), to: { name: 'patrol-detail-reports' } },
        { label: t('breadcrumb.patrolSummaryReport') },
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
          class="truncate rounded text-left transition hover:text-slate-900 hover:cursor-pointer"
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
