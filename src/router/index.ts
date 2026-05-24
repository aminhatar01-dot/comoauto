import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { supabase } from '@/lib/supabase'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/vehiculos',
    name: 'Vehiculos',
    component: () => import('@/views/Vehiculos.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/leads',
    name: 'Leads',
    component: () => import('@/views/CazadorLeads.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/gestoria',
    name: 'Gestoria',
    component: () => import('@/views/Gestoria.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/campanas',
    name: 'Campanas',
    component: () => import('@/views/Campanas.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/web-builder',
    name: 'WebBuilder',
    component: () => import('@/views/WebBuilder.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guardia de navegación para controlar el acceso a las rutas
router.beforeEach(async (to, _from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  const loggedIn = !!session

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!loggedIn) {
      next('/login')
    } else {
      next()
    }
  } else {
    if (loggedIn && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router
