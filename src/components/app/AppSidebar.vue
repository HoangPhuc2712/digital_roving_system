<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import BaseBadgeButton from '../common/buttons/BaseBadgeButton.vue'

const props = withDefaults(
  defineProps<{
    mobileOpen?: boolean
  }>(),
  {
    mobileOpen: false,
  },
)

const emit = defineEmits<{
  (e: 'update:mobileOpen', v: boolean): void
}>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type MenuCategoryView = {
  mcId: number
  mcCode: string
  mcName: string
  mcActive: boolean
  mcPriority: number
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

const menuCategories = ref<MenuCategoryView[]>([])
const reportsOpen = ref(false)

async function loadMenuCategories() {
  try {
    const res = await http.post(endpoints.menuCategoryView.getList, {})
    const list = ensureSuccess<MenuCategoryView[]>(res.data).data ?? []
    menuCategories.value = Array.isArray(list) ? list : []
  } catch {
    menuCategories.value = []
  }
}

onMounted(async () => {
  if (auth.isAuthenticated) {
    await loadMenuCategories()
  }
})

watch(
  () => auth.isAuthenticated,
  async (ok) => {
    if (!ok) return
    await loadMenuCategories()
  },
)

type NavItem = {
  key: string
  label: string
  to: string
  icon: string
  prefix: string
  priority: number
}

const MENU_MAP: Record<string, Omit<NavItem, 'key' | 'priority' | 'label'>> = {
  DASHBOARD: { to: '/dashboard', icon: 'pi pi-home', prefix: '/dashboard' },

  MC006: { to: '/reports', icon: 'pi pi-clipboard', prefix: '/reports' },
  MC002: { to: '/users', icon: 'pi pi-users', prefix: '/users' },
  MC001: { to: '/roles', icon: 'pi pi-key', prefix: '/roles' },
  MC004: { to: '/areas', icon: 'pi pi-map-marker', prefix: '/areas' },
  MC005: { to: '/routes', icon: 'pi pi-map', prefix: '/routes' },
  MC007: { to: '/tutorial', icon: 'pi pi-info', prefix: '/tutorial' },
  MC003: { to: '/menuCategories', icon: 'pi pi-book', prefix: '/menuCategories' },
}

const allowedMcCodes = computed(() => {
  const raw = (auth.user as any)?.allow_views ?? (auth.user as any)?.allowViews ?? []
  const arr = Array.isArray(raw) ? raw : []
  const set = new Set<string>()
  for (const it of arr) {
    const code = String(it?.mcCode ?? '')
      .trim()
      .toUpperCase()
    if (!code) continue
    if (it?.mcActive === false) continue
    set.add(code)
  }
  return set
})

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = []

  // Dashboard is always visible (after login)
  const dash = MENU_MAP['DASHBOARD']!
  items.push({
    key: 'DASHBOARD',
    label: 'Dashboard',
    to: dash.to,
    icon: dash.icon,
    prefix: dash.prefix,
    priority: 0,
  })

  // Prefer menu category list from API (has priority + active)
  const base =
    Array.isArray(menuCategories.value) && menuCategories.value.length
      ? menuCategories.value
      : (() => {
          const raw = (auth.user as any)?.allow_views ?? (auth.user as any)?.allowViews ?? []
          const arr = Array.isArray(raw) ? raw : []
          return arr.map((x: any, idx: number) => ({
            mcId: Number(x?.mcId ?? 0),
            mcCode: String(x?.mcCode ?? ''),
            mcName: String(x?.mcName ?? ''),
            mcActive: x?.mcActive !== false,
            mcPriority: Number(x?.mcPriority ?? idx + 1),
          }))
        })()

  const allowed = allowedMcCodes.value

  for (const mc of base) {
    const code = String((mc as any).mcCode ?? '')
      .trim()
      .toUpperCase()
    if (!code) continue
    if ((mc as any).mcActive === false) continue
    if (allowed.size > 0 && !allowed.has(code)) continue

    const meta = MENU_MAP[code]
    if (!meta) continue

    const label = code === 'MC005' ? 'Patrol Routes' : String((mc as any).mcName ?? '')
    items.push({
      key: code,
      label: label || code,
      to: meta.to,
      icon: meta.icon,
      prefix: meta.prefix,
      priority: Number((mc as any).mcPriority ?? 999),
    })
  }

  return items.sort((a, b) => a.priority - b.priority)
})

watch(
  () => route.path,
  (path) => {
    if (
      path === '/reports' ||
      path === '/ctpat-reports' ||
      path.startsWith('/reports/') ||
      path.startsWith('/ctpat-reports/')
    ) {
      reportsOpen.value = true
    }
  },
  { immediate: true },
)

function toggleReports() {
  reportsOpen.value = !reportsOpen.value
}

function isReportsActive() {
  return (
    route.path === '/reports' ||
    route.path === '/ctpat-reports' ||
    route.path.startsWith('/reports/') ||
    route.path.startsWith('/ctpat-reports/')
  )
}

const userFullName = computed(() => auth.user?.user_name ?? '—')
const userCode = computed(() => auth.user?.user_code ?? '—')
const userRoleName = computed(() => auth.user?.role?.role_name ?? '—')

function closeMobile() {
  emit('update:mobileOpen', false)
}

function itemClass(active: boolean) {
  return [
    'w-full flex items-center justify-between gap-3',
    'px-3 py-2 rounded-lg transition',
    active ? 'bg-white/10' : 'hover:bg-white/5',
  ].join(' ')
}

function isActivePath(prefix: string) {
  return route.path === prefix || route.path.startsWith(prefix + '/')
}

function logout() {
  auth.logout?.()
  router.replace({ name: 'login' })
  closeMobile()
}
</script>

<template>
  <div v-if="mobileOpen" class="fixed inset-0 bg-black/40 z-40 lg:hidden" @click="closeMobile" />

  <aside
    class="h-screen w-72 flex flex-col bg-slate-900 text-slate-100 z-50 fixed inset-y-0 left-0 transform transition-transform duration-200 lg:static lg:translate-x-0"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <header class="px-4 py-4 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-xs">
          Logo
        </div>
        <div class="leading-tight">
          <div class="text-base font-semibold">JIAHSIN CO., LTD</div>
        </div>
      </div>
    </header>

    <nav class="flex-1 overflow-y-auto px-2 py-3">
      <ul class="space-y-1">
        <li v-for="item in navItems" :key="item.key">
          <template v-if="item.key === 'MC006'">
            <button type="button" :class="itemClass(isReportsActive())" @click="toggleReports">
              <span class="flex items-center gap-3">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </span>
              <i
                class="pi transition-transform"
                :class="reportsOpen ? 'pi-chevron-down' : 'pi-chevron-right'"
              ></i>
            </button>

            <div v-if="reportsOpen" class="mt-1 ml-4 space-y-1">
              <RouterLink to="/reports" v-slot="{ isActive }">
                <a :class="itemClass(isActive || isActivePath('/reports'))" @click="closeMobile">
                  <span class="flex items-center gap-3">
                    <i class="pi pi-shield"></i>
                    <span>Patrols</span>
                  </span>
                </a>
              </RouterLink>

              <RouterLink to="/ctpat-reports" v-slot="{ isActive }">
                <a
                  :class="itemClass(isActive || isActivePath('/ctpat-reports'))"
                  @click="closeMobile"
                >
                  <span class="flex items-center gap-3">
                    <i class="pi pi-chart-line"></i>
                    <span>C-TPAT Report</span>
                  </span>
                </a>
              </RouterLink>
            </div>
          </template>

          <template v-else>
            <RouterLink :to="item.to" v-slot="{ isActive }">
              <a :class="itemClass(isActive || isActivePath(item.prefix))" @click="closeMobile">
                <span class="flex items-center gap-3">
                  <i :class="item.icon"></i>
                  <span>{{ item.label }}</span>
                </span>
              </a>
            </RouterLink>
          </template>
        </li>
      </ul>
    </nav>

    <footer class="border-t border-white/10 px-4 py-4">
      <div class="mb-3">
        <div class="text-sm font-semibold leading-snug">
          {{ userFullName }}
        </div>
        <div class="text-xs text-slate-300 mt-1">User Code: {{ userCode }}</div>
        <div class="text-xs text-slate-300">Role: {{ userRoleName }}</div>
      </div>

      <BaseBadgeButton
        type="button"
        label="Logout"
        severity="contrast"
        class="w-full rounded-lg px-3 py-2 bg-red-500/10 text-red-100 hover:bg-red-500/20 transition"
        @click="logout"
      />
    </footer>
  </aside>
</template>
