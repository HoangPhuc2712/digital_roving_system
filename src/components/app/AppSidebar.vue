<script setup lang="ts">
defineOptions({ inheritAttrs: false })
import { computed, onMounted, ref, watch, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import BaseBadgeButton from '../common/buttons/BaseBadgeButton.vue'
import { translateMenuCategoryName, translateRoleName } from '@/utils/dataI18n'

const props = withDefaults(
  defineProps<{
    mobileOpen?: boolean
    desktopOpen?: boolean
  }>(),
  {
    mobileOpen: false,
    desktopOpen: true,
  },
)

const emit = defineEmits<{
  (e: 'update:mobileOpen', v: boolean): void
}>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const attrs = useAttrs()

const { t } = useI18n()

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

function normalizeMenuName(input?: string) {
  return String(input ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

const MENU_MAP: Record<string, Omit<NavItem, 'key' | 'priority' | 'label'>> = {
  DASHBOARD: { to: '/dashboard', icon: 'pi pi-home', prefix: '/dashboard' },

  REPORTS: { to: '/reports', icon: 'pi pi-clipboard', prefix: '/reports' },
  USERS: { to: '/users', icon: 'pi pi-users', prefix: '/users' },
  ROLES: { to: '/roles', icon: 'pi pi-key', prefix: '/roles' },
  AREAS: { to: '/areas', icon: 'pi pi-map-marker', prefix: '/areas' },
  ROUTES: { to: '/routes', icon: 'pi pi-map', prefix: '/routes' },
  TUTORIAL: { to: '/tutorial', icon: 'pi pi-info', prefix: '/tutorial' },
}

const allowedMenuNames = computed(() => {
  const raw = (auth.user as any)?.allow_views ?? (auth.user as any)?.allowViews ?? []
  const arr = Array.isArray(raw) ? raw : []
  const set = new Set<string>()

  for (const it of arr) {
    const name = normalizeMenuName(it?.mcName)
    if (!name) continue
    if (it?.mcActive === false) continue
    set.add(name)
  }

  return set
})

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = []

  const dash = MENU_MAP['DASHBOARD']!
  items.push({
    key: 'DASHBOARD',
    label: t('dashboard.title'),
    to: dash.to,
    icon: dash.icon,
    prefix: dash.prefix,
    priority: 0,
  })

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

  const allowed = allowedMenuNames.value

  for (const mc of base) {
    const menuName = normalizeMenuName((mc as any).mcName)
    if (!menuName) continue
    if ((mc as any).mcActive === false) continue
    if (allowed.size > 0 && !allowed.has(menuName)) continue

    const meta = MENU_MAP[menuName]
    if (!meta) continue

    const label = translateMenuCategoryName(String((mc as any).mcName ?? ''), t) || menuName
    items.push({
      key: menuName,
      label: label || menuName,
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
      path === '/incorrect-scan-reports' ||
      path === '/ctpat-reports' ||
      path === '/patrol-detail-reports' ||
      path === '/patrol-summary-reports' ||
      path === '/routes-chart-reports' ||
      path.startsWith('/reports/') ||
      path.startsWith('/incorrect-scan-reports/') ||
      path.startsWith('/ctpat-reports/') ||
      path.startsWith('/patrol-detail-reports/') ||
      path.startsWith('/patrol-summary-reports/') ||
      path.startsWith('/routes-chart-reports/')
    ) {
      reportsOpen.value = true
    }
  },
  { immediate: true },
)

const userFullName = computed(() => auth.user?.user_name ?? '—')
const userCode = computed(() => auth.user?.user_code ?? '—')
const userRoleName = computed(() => {
  const rawRoleName = String(auth.user?.role?.role_name ?? '').trim()
  return rawRoleName ? translateRoleName(rawRoleName, t) : '—'
})

function closeMobile() {
  emit('update:mobileOpen', false)
}

function itemClass(active: boolean) {
  return [
    'w-full flex items-center justify-between gap-3 cursor-pointer',
    'px-3 py-2 rounded-lg transition',
    active ? 'bg-white/10' : 'hover:bg-white/5',
  ].join(' ')
}

function subItemClass(active: boolean) {
  return [
    'w-full flex items-center gap-3 cursor-pointer',
    'px-3 py-2 rounded-lg transition',
    active ? 'bg-white/10' : 'hover:bg-white/5',
  ].join(' ')
}

function isActivePath(prefix: string) {
  return route.path === prefix || route.path.startsWith(prefix + '/')
}

function isAreasGroupActive() {
  return (
    isActivePath('/areas') ||
    route.path === '/checkpoints' ||
    route.path.startsWith('/checkpoints/')
  )
}

function isNavItemActive(item: NavItem, isActive: boolean) {
  if (item.key === 'AREAS') return isActive || isAreasGroupActive()
  return isActive || isActivePath(item.prefix)
}

function isReportsGroupActive() {
  return (
    route.path === '/reports' ||
    route.path === '/incorrect-scan-reports' ||
    route.path === '/ctpat-reports' ||
    route.path === '/patrol-detail-reports' ||
    route.path === '/patrol-summary-reports' ||
    route.path === '/routes-chart-reports' ||
    route.path.startsWith('/reports/') ||
    route.path.startsWith('/incorrect-scan-reports/') ||
    route.path.startsWith('/ctpat-reports/') ||
    route.path.startsWith('/patrol-detail-reports/') ||
    route.path.startsWith('/patrol-summary-reports/') ||
    route.path.startsWith('/routes-chart-reports/')
  )
}

function toggleReports() {
  reportsOpen.value = !reportsOpen.value
}

function goToPatrolsData() {
  router.push({ name: 'reports' })
  closeMobile()
}

function goToReportsData() {
  router.push({ name: 'patrol-detail-reports' })
  closeMobile()
}

function goToUserInfo() {
  router.push({ name: 'user-info' })
  closeMobile()
}

function logout() {
  auth.logout?.()
  router.replace({ name: 'login' })
  closeMobile()
}
</script>

<template>
  <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="closeMobile" />

  <aside
    v-bind="attrs"
    class="fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:sticky lg:top-0 lg:left-auto lg:inset-y-auto lg:self-start lg:h-screen lg:translate-x-0 lg:overflow-hidden lg:transition-[width]"
    :class="[
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
      props.desktopOpen ? 'lg:w-72' : 'lg:w-0',
    ]"
  >
    <div class="h-screen w-72 flex flex-col bg-slate-900 text-slate-100">
      <header class="px-4 py-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-xs">
            <img src="/src/styles/logo/JiaHsinLogo.png" alt="" />
          </div>
          <div class="leading-tight">
            <div class="text-base font-semibold">JIAHSIN CO., LTD</div>
          </div>
        </div>
      </header>

      <nav class="flex-1 overflow-y-auto px-2 py-3">
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.key">
            <template v-if="item.key === 'REPORTS'">
              <button
                type="button"
                :class="itemClass(isReportsGroupActive())"
                @click="toggleReports"
              >
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
                <button
                  type="button"
                  :class="
                    subItemClass(
                      isActivePath('/reports') ||
                        isActivePath('/incorrect-scan-reports') ||
                        isActivePath('/ctpat-reports'),
                    )
                  "
                  @click="goToPatrolsData"
                >
                  <span class="flex items-center gap-3">
                    <i class="pi pi-shield"></i>
                    <span>{{ t('breadcrumb.patrolsData') }}</span>
                  </span>
                </button>

                <button
                  type="button"
                  :class="
                    subItemClass(
                      isActivePath('/patrol-detail-reports') ||
                        isActivePath('/patrol-summary-reports') ||
                        isActivePath('/routes-chart-reports'),
                    )
                  "
                  @click="goToReportsData"
                >
                  <span class="flex items-center gap-3">
                    <i class="pi pi-file"></i>
                    <span>{{ t('breadcrumb.reportsData') }}</span>
                  </span>
                </button>
              </div>
            </template>

            <template v-else>
              <RouterLink :to="item.to" v-slot="{ isActive }">
                <a :class="itemClass(isNavItemActive(item, isActive))" @click="closeMobile">
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
          <button
            type="button"
            class="text-sm font-semibold flex items-center gap-2 leading-snug text-left hover:text-white transition"
            @click="goToUserInfo"
          >
            <i class="pi pi-user"></i>
            <span class="hover:underline cursor-pointer">{{ userFullName }}</span>
          </button>
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
    </div>
  </aside>
</template>
