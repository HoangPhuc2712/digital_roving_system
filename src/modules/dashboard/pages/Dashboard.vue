<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/modules/dashboard/dashboard.store'
import type { DashboardCard } from '@/modules/dashboard/dashboard.types'

const auth = useAuthStore()
const store = useDashboardStore()
const router = useRouter()

const allowCodeSet = computed(() => {
  const list = (auth.user as any)?.allowViews ?? (auth.user as any)?.allow_views ?? []
  const set = new Set<string>()
  for (const x of list) {
    if (x?.mcActive === true && x?.mcCode) set.add(String(x.mcCode))
  }
  return set
})

function canSeeMc(mcCode?: string) {
  if (!mcCode) return true
  return allowCodeSet.value.has(mcCode)
}

const cards = computed<DashboardCard[]>(() => {
  // className: bạn tự đổi màu tại đây
  const list: DashboardCard[] = [
    {
      key: 'totalReports',
      title: 'Total Reports',
      mcCode: 'MC006',
      to: '/reports',
      className: 'bg-white',
    },
    {
      key: 'issuedReports',
      title: 'Issued Reports',
      mcCode: 'MC006',
      to: '/reports',
      className: 'bg-white',
    },
    {
      key: 'pendingReports',
      title: 'Pending Reports',
      mcCode: 'MC006',
      to: '/reports',
      className: 'bg-white',
    },

    { key: 'roles', title: 'Roles', mcCode: 'MC001', to: '/roles', className: 'bg-white' },
    { key: 'users', title: 'Users', mcCode: 'MC002', to: '/users', className: 'bg-white' },

    // Scan Points không có menu riêng trong MenuCategory list, nên tạm map chung quyền Routes (MC005)
    {
      key: 'scanPoints',
      title: 'Scan Points',
      mcCode: 'MC005',
      to: '/checkpoints',
      className: 'bg-white',
    },
    { key: 'routes', title: 'Routes', mcCode: 'MC005', to: '/routes', className: 'bg-white' },
  ]

  return list.filter((c) => canSeeMc(c.mcCode))
})

function valueOf(key: DashboardCard['key']) {
  const s = store.stats
  if (!s) return null
  return s[key]
}

function open(card: DashboardCard) {
  if (!card.to) return
  router.push(card.to)
}

onMounted(async () => {
  const hasReports = canSeeMc('MC006')
  const hasRoles = canSeeMc('MC001')
  const hasUsers = canSeeMc('MC002')
  const hasRoutes = canSeeMc('MC005')

  await store.load({
    includeReports: hasReports,
    includeRoles: hasRoles,
    includeUsers: hasUsers,
    includeScanPoints: hasRoutes,
    includeRoutes: hasRoutes,
  })
})
</script>

<template>
  <div class="space-y-3">
    <div class="text-xl font-semibold text-slate-800">Dashboard</div>

    <div v-if="store.error" class="p-4">
      <div class="text-slate-800 font-semibold text-lg">Server Maintenance</div>
      <div class="text-slate-600 mt-1">{{ store.error }}</div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <button
        v-for="c in cards"
        :key="c.key"
        type="button"
        class="rounded-2xl shadow-sm hover:shadow transition p-4 text-left cursor-pointer"
        :class="c.className"
        @click="open(c)"
      >
        <div class="text-sm text-slate-600">{{ c.title }}</div>

        <div class="mt-2 text-3xl font-semibold text-slate-900">
          <span v-if="store.loading">—</span>
          <span v-else>{{ valueOf(c.key) ?? '—' }}</span>
        </div>

        <div class="mt-2 text-xs text-slate-500">Click to view</div>
      </button>
    </div>
  </div>
</template>
