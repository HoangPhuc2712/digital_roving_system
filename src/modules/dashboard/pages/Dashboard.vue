<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/modules/dashboard/dashboard.store'
import type { DashboardCardMeta, DashboardTotalAppItem } from '@/modules/dashboard/dashboard.types'

const auth = useAuthStore()
const store = useDashboardStore()
const router = useRouter()

const allowCodeSet = computed(() => {
  const list = (auth.user as any)?.allowViews ?? (auth.user as any)?.allow_views ?? []
  const set = new Set<string>()
  for (const x of list) {
    if (x?.mcActive === true && x?.mcCode) set.add(String(x.mcCode).toUpperCase())
  }
  return set
})

function canSeeMc(mcCode?: string) {
  if (!mcCode) return true
  return allowCodeSet.value.has(mcCode.toUpperCase())
}

function normalizeName(name: string) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

function cardMetaOf(item: DashboardTotalAppItem): DashboardCardMeta {
  switch (normalizeName(item.name)) {
    case 'ROLES':
      return { mcCode: 'MC001', to: '/roles' }
    case 'USERS':
      return { mcCode: 'MC002', to: '/users' }
    case 'MENUCATEGORIES':
      return { mcCode: 'MC003' }
    case 'AREAS':
      return { mcCode: 'MC004', to: '/areas' }
    case 'CHECKPOINTS':
      return { mcCode: 'MC004', to: '/areas' }
    case 'ROUTES':
      return { mcCode: 'MC005', to: '/routes' }
    default:
      return {}
  }
}

const cards = computed(() => {
  return store.cards
    .map((item) => ({
      ...item,
      ...cardMetaOf(item),
    }))
    .filter((item) => canSeeMc(item.mcCode))
    .sort((a, b) => a.stt - b.stt)
})

function open(card: DashboardTotalAppItem & DashboardCardMeta) {
  if (!card.to) return
  router.push(card.to)
}

function cardStyle(card: DashboardTotalAppItem) {
  return {
    backgroundColor: card.color || '#ffffff',
  }
}

onMounted(async () => {
  await store.load()
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
        v-for="(card, idx) in cards"
        :key="`${card.stt}-${card.name}`"
        v-animateonscroll="{
          enterClass: 'dashboard-card-enter',
          leaveClass: 'dashboard-card-leave',
        }"
        type="button"
        class="dashboard-card rounded-2xl shadow-sm hover:shadow transition p-4 text-left"
        :class="card.to ? 'cursor-pointer' : 'cursor-default'"
        :style="{ ...cardStyle(card), animationDelay: `${idx * 100}ms` }"
        @click="open(card)"
      >
        <div class="text-sm text-white/85">{{ card.name }}</div>

        <div class="mt-2 text-3xl font-semibold text-white">
          <span v-if="store.loading">—</span>
          <span v-else>{{ card.totalItem }}</span>
        </div>

        <div class="mt-2 text-xs text-white/80">Click to view</div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-card-enter {
  animation: dashboard-fade-in-left 0.7s ease-out both;
}

.dashboard-card-leave {
  animation: dashboard-fade-out 0.2s ease-in both;
}

@keyframes dashboard-fade-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes dashboard-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
</style>
