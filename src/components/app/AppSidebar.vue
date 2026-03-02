<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
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

const roleCode = computed(() => String(auth.user?.role?.role_code ?? '').toUpperCase())
const canSeeAdminMenus = computed(() => roleCode.value === 'ADMIN' || roleCode.value === 'IT')

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
        <li>
          <RouterLink to="/reports" v-slot="{ isActive }">
            <a :class="itemClass(isActive)" @click="closeMobile">
              <span class="flex items-center gap-3">
                <i class="pi pi-clipboard"></i>
                <span>Reports</span>
              </span>
            </a>
          </RouterLink>
        </li>

        <template v-if="canSeeAdminMenus">
          <li>
            <RouterLink to="/users" v-slot="{ isActive }">
              <a :class="itemClass(isActive || isActivePath('/users'))" @click="closeMobile">
                <span class="flex items-center gap-3">
                  <i class="pi pi-users"></i>
                  <span>Users</span>
                </span>
              </a>
            </RouterLink>
          </li>

          <li>
            <RouterLink to="/roles" v-slot="{ isActive }">
              <a :class="itemClass(isActive || isActivePath('/roles'))" @click="closeMobile">
                <span class="flex items-center gap-3">
                  <i class="pi pi-key"></i>
                  <span>Roles</span>
                </span>
              </a>
            </RouterLink>
          </li>

          <li>
            <RouterLink to="/areas" v-slot="{ isActive }">
              <a :class="itemClass(isActive || isActivePath('/areas'))" @click="closeMobile">
                <span class="flex items-center gap-3">
                  <i class="pi pi-map-marker"></i>
                  <span>Areas</span>
                </span>
              </a>
            </RouterLink>
          </li>

          <li>
            <RouterLink to="/checkpoints" v-slot="{ isActive }">
              <a :class="itemClass(isActive || isActivePath('/checkpoints'))" @click="closeMobile">
                <span class="flex items-center gap-3">
                  <i class="pi pi-flag-fill"></i>
                  <span>Scan Points</span>
                </span>
              </a>
            </RouterLink>
          </li>
        </template>
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
