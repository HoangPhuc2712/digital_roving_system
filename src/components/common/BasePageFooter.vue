<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const COPYRIGHT_START_YEAR = 2026
const COPYRIGHT_CURRENT_YEAR = computed(() => `${new Date().getFullYear()}`)
const copyrightYearRange = computed(() => `${COPYRIGHT_START_YEAR} - ${new Date().getFullYear()}`)
</script>

<template>
  <div
    class="mt-3 flex flex-row px-4 py-2 border-t justify-between items-center border-slate-200 pt-3 text-[13px] text-slate-500"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <img
          src="/src/styles/logo/JiaHsinLogo.png  "
          alt="Jia Hsin"
          class="h-12 w-12 shrink-0 object-contain"
        />
        <div class="min-w-0 leading-tight">
          <p class="truncate text-md font-bold text-[#0b5ca8]">佳新責任有限公司</p>
          <p class="truncate text-sm font-bold uppercase text-[#0b5ca8]">CÔNG TY TNHH JIA HSIN</p>
        </div>
      </div>
    </div>
    <div>
      <span>Internal Patrol System • © {{ COPYRIGHT_CURRENT_YEAR }} By App Team</span>
    </div>
  </div>
</template>
