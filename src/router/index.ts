import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useAuthStore } from '@/stores/auth.store';

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!auth.token) auth.restoreSession();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  const required = to.meta.permission as any;
  if (required && !auth.canAccess(required)) {
    return { name: 'reports' };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'reports' };
  }

  return true;
});
