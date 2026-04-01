<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const COPYRIGHT_START_YEAR = 2026
const copyrightYearRange = computed(() => {
  const currentYear = new Date().getFullYear()

  return `${COPYRIGHT_START_YEAR}-${currentYear}`
})
const JHV_LINK = 'https://www.jiahsin.com.vn/'
const SHM_LINK = 'http://www.shimmer.com.vn/'
const PORTAL_LINK = 'https://portal.jiahsin.com.vn/portal/'
const APP_VERSION = '1.0.0'
const { t } = useI18n()
</script>

<template>
  <footer
    class="shrink-0 border-t border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-500 sm:px-4"
  >
    <div class="flex items-start gap-2 leading-relaxed text-slate-500">
      <i class="pi pi-exclamation-circle mt-0.5 text-[8px] text-slate-400" />
      <p class="text-xs italic">
        {{ t('footer.detail') }}
      </p>
    </div>

    <div
      class="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-wrap items-center gap-1">
        <span>©{{ copyrightYearRange }}</span>
        <a
          :href="JHV_LINK"
          target="_blank"
          rel="noopener noreferrer"
          class="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          JHV
        </a>
        <span>|</span>
        <a
          :href="SHM_LINK"
          target="_blank"
          rel="noopener noreferrer"
          class="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          SHM
        </a>
        <span>|</span>
        <a
          :href="PORTAL_LINK"
          target="_blank"
          rel="noopener noreferrer"
          class="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Portal
        </a>
      </div>

      <div class="text-right text-slate-500">{{ t('footer.version') }} {{ APP_VERSION }}</div>
    </div>
  </footer>
</template>
