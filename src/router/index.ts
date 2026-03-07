import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth.store'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!auth.token) auth.restoreSession()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  const required = to.meta.permission as any
  if (required && !auth.canAccess(required)) {
    // ✅ đẩy qua trang 403 để không loop
    return { name: 'forbidden' } // hoặc { path: '/403' } tuỳ route bạn đặt
  }

  // ✅ KHÔNG auto-redirect khỏi login khi đã có session (tránh loop khi backend down / permission rỗng)
  // Nếu bạn vẫn muốn auto-redirect thì dùng landing an toàn (bên dưới)
  if (to.name === 'login' && auth.isAuthenticated) {
    if (auth.canAccess(['reports.view_all', 'reports.view_mine'])) return { name: 'dashboard' }
    return { name: 'forbidden' }
  }

  return true
})
