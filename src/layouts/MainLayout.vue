<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import BasePageHeader from '@/components/common/BasePageHeader.vue'
import BasePageFooter from '@/components/common/BasePageFooter.vue'
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
  <div class="min-h-screen flex bg-slate-50">
    <aside class="sticky top-0 self-start shrink-0 h-screen">
      <AppSidebar v-model:mobileOpen="sidebarOpen" class="h-screen" />
    </aside>

    <div class="flex-1 min-w-0 flex flex-col min-h-screen">
      <header class="sticky top-0 z-30 shrink-0">
        <BasePageHeader @open-menu="sidebarOpen = true" />
      </header>

      <main class="flex-1 p-4">
        <router-view />
      </main>

      <BasePageFooter class="mt-auto" />
    </div>
  </div>
</template>
