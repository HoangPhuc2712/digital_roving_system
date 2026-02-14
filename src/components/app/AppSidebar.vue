<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseBadgeButton from '../common/buttons/BaseBadgeButton.vue'

type GroupKey = 'users' | 'areas' | 'scanPoints'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const roleCode = computed(() => String(auth.user?.role?.role_code ?? '').toUpperCase())
const canSeeAdminMenus = computed(() => roleCode.value === 'ADMIN' || roleCode.value === 'IT')

const userFullName = computed(() => auth.user?.user_name ?? '—')
const userCode = computed(() => auth.user?.user_code ?? '—')
const userRoleName = computed(() => auth.user?.role?.role_name ?? '—')

const openGroup = ref<Record<GroupKey, boolean>>({
  users: false,
  areas: false,
  scanPoints: false,
})

function toggleGroup(key: GroupKey) {
  openGroup.value[key] = !openGroup.value[key]
}

// Auto-open group theo route hiện tại
watch(
  () => route.path,
  (path) => {
    openGroup.value.users = path.startsWith('/users')
    openGroup.value.areas = path.startsWith('/areas')
    openGroup.value.scanPoints = path.startsWith('/checkpoints')
  },
  { immediate: true },
)

function itemClass(active: boolean) {
  return [
    'w-full flex items-center justify-between gap-3',
    'px-3 py-2 rounded-lg transition',
    active ? 'bg-white/10' : 'hover:bg-white/5',
  ].join(' ')
}

function childClass(active: boolean) {
  return [
    'block px-3 py-2 rounded-lg transition',
    active ? 'bg-white/10' : 'hover:bg-white/5',
  ].join(' ')
}

function isGroupActive(key: GroupKey) {
  if (key === 'users') return route.path.startsWith('/users')
  if (key === 'areas') return route.path.startsWith('/areas')
  return route.path.startsWith('/checkpoints')
}

function logout() {
  auth.logout?.()
  router.replace({ name: 'login' })
}
</script>

<template>
  <aside class="h-screen w-72 flex flex-col bg-slate-900 text-slate-100">
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
            <a :class="itemClass(isActive)">
              <span class="flex items-center gap-3">
                <span>Reports</span>
              </span>
            </a>
          </RouterLink>
        </li>

        <template v-if="canSeeAdminMenus">
          <li>
            <button type="button" class="w-full" @click="toggleGroup('users')">
              <div :class="itemClass(isGroupActive('users'))">
                <span class="flex items-center gap-3">
                  <span>Users</span>
                </span>
                <span class="text-slate-300 text-xs">
                  {{ openGroup.users ? '▲' : '▼' }}
                </span>
              </div>
            </button>

            <ul v-show="openGroup.users" class="mt-1 ml-7 space-y-1">
              <li>
                <RouterLink to="/users" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Users Management</a>
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/users/create" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Create User</a>
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Areas -->
          <li>
            <button type="button" class="w-full" @click="toggleGroup('areas')">
              <div :class="itemClass(isGroupActive('areas'))">
                <span class="flex items-center gap-3">
                  <span>Areas</span>
                </span>
                <span class="text-slate-300 text-xs">
                  {{ openGroup.areas ? '▲' : '▼' }}
                </span>
              </div>
            </button>

            <ul v-show="openGroup.areas" class="mt-1 ml-7 space-y-1">
              <li>
                <RouterLink to="/areas" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Areas Management</a>
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/areas/create" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Create Area</a>
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Scan Points (Checkpoints) -->
          <li>
            <button type="button" class="w-full" @click="toggleGroup('scanPoints')">
              <div :class="itemClass(isGroupActive('scanPoints'))">
                <span class="flex items-center gap-3">
                  <span>Scan Points</span>
                </span>
                <span class="text-slate-300 text-xs">
                  {{ openGroup.scanPoints ? '▲' : '▼' }}
                </span>
              </div>
            </button>

            <ul v-show="openGroup.scanPoints" class="mt-1 ml-7 space-y-1">
              <li>
                <RouterLink to="/checkpoints" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Scan Points Management</a>
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/checkpoints/create" v-slot="{ isActive }">
                  <a :class="childClass(isActive)">Create Scan Point</a>
                </RouterLink>
              </li>
            </ul>
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
      <!-- <button
        type="button"
        class="w-full rounded-lg px-3 py-2 bg-red-500/10 text-red-100 hover:bg-red-500/20 transition"
        @click="logout"
      >
        Logout
      </button> -->
    </footer>
  </aside>
</template>
