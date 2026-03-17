<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import BasePageHeader from '@/components/common/BasePageHeader.vue'
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
      <header class="shrink-0">
        <BasePageHeader @open-menu="sidebarOpen = true" />
      </header>

      <main class="flex-1 p-4 overflow-y-auto overflow-x-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
