import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import Aura from '@primeuix/themes/aura'

export function setupPrimeVue(app: any) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: false,
      },
    },
  })

  app.use(ToastService)
  app.use(ConfirmationService)
}
