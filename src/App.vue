<template>
  <RouterView />
  <Toast />
  <ConfirmDialog />
  <AppSessionExpiredDialog />
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppSessionExpiredDialog from '@/components/app/AppSessionExpiredDialog.vue'

const { t, locale } = useI18n()

watchEffect(() => {
  void locale.value
  document.title = t('breadcrumb.root')
})
</script>

<style>
.p-dialog .p-dialog-header .p-dialog-header-actions button:focus,
.p-dialog .p-dialog-header .p-dialog-header-actions button:focus-visible,
.p-dialog .p-dialog-header .p-dialog-header-close:focus,
.p-dialog .p-dialog-header .p-dialog-header-close:focus-visible,
.p-dialog .p-dialog-header .p-dialog-header-icon:focus,
.p-dialog .p-dialog-header .p-dialog-header-icon:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
</style>
