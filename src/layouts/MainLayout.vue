<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import 'primeicons/primeicons.css'

const sidebarOpen = ref(false)
const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="h-screen flex bg-slate-50 overflow-hidden">
    <aside class="shrink-0 h-screen">
      <AppSidebar v-model:mobileOpen="sidebarOpen" class="h-full" />
    </aside>

    <div class="flex-1 min-w-0 flex flex-col h-screen">
      <header
        class="h-14 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="lg:hidden px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            @click="sidebarOpen = true"
          >
            <i class="pi pi-bars"></i>
          </button>

          <div class="text-sm text-slate-600">Internal Patrol Report</div>
        </div>
      </header>

      <main class="flex-1 p-4 overflow-y-auto overflow-x-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
