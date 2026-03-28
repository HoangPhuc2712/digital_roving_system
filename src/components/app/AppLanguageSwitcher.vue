<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { setAppLocale, type AppLocale } from '@/plugins/i18n'

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const { t, locale } = useI18n()

type LanguageOption = { code: AppLocale; flag: string }

const fallbackLanguage: LanguageOption = { code: 'en', flag: '🇺🇸' }

const languages: LanguageOption[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'vi', flag: '🇻🇳' },
  { code: 'zh-CN', flag: '🇨🇳' },
  { code: 'zh-TW', flag: '🇹🇼' },
]

const currentLanguage = computed<LanguageOption>(() => {
  return languages.find((item) => item.code === locale.value) ?? fallbackLanguage
})

function toggleOpen() {
  open.value = !open.value
}

function selectLanguage(code: AppLocale) {
  setAppLocale(code)
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 hover:cursor-pointer"
      @click="toggleOpen"
    >
      <span class="text-base leading-none">{{ currentLanguage.flag }}</span>
      <span class="font-medium whitespace-nowrap">
        {{ t(`languageSwitcher.languages.${currentLanguage.code}`) }}
      </span>
      <i class="pi pi-angle-down text-xs text-slate-500"></i>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      <button
        v-for="item in languages"
        :key="item.code"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
        :class="item.code === locale ? 'bg-slate-50 font-medium' : ''"
        @click="selectLanguage(item.code)"
      >
        <span class="text-base leading-none">{{ item.flag }}</span>
        <span>{{ t(`languageSwitcher.languages.${item.code}`) }}</span>
      </button>
    </div>
  </div>
</template>
