<script setup lang="ts">
import AppBreadcrumb from '@/components/app/AppBreadcrumb.vue'
import AppLanguageSwitcher from '@/components/app/AppLanguageSwitcher.vue'

defineEmits<{
  (e: 'open-menu'): void
}>()
</script>

<template>
  <div class="h-14 bg-white border-b border-slate-200 px-4 flex items-center gap-3 min-w-0">
    <button
      type="button"
      class="lg:hidden px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
      @click="$emit('open-menu')"
    >
      <i class="pi pi-bars"></i>
    </button>

    <div class="min-w-0 flex-1">
      <AppBreadcrumb />
    </div>

    <div class="shrink-0">
      <AppLanguageSwitcher />
    </div>
  </div>
</template>
