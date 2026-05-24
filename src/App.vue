<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  LayoutDashboard, 
  Bot, 
  FileCheck, 
  LogOut, 
  Car,
  Building2,
  Menu,
  X
} from 'lucide-vue-next'
import { ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isSidebarOpen = ref(true)

onMounted(async () => {
  await authStore.initialize()
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// Ocultar barra lateral en la pantalla de login
const showNavigation = computed(() => {
  return authStore.isAuthenticated && route.path !== '/login'
})
</script>

<template>
  <div class="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col md:flex-row">
    
    <!-- Barra lateral de navegación (Sidebar) -->
    <aside 
      v-if="showNavigation"
      :class="[
        'fixed md:sticky top-0 left-0 z-40 h-screen w-64 glass-panel border-r border-slate-800 transition-transform duration-300 flex flex-col justify-between',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <div>
        <!-- Cabecera Sidebar / Logo -->
        <div class="p-6 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg text-slate-900">
              <Car class="w-6 h-6 text-slate-900 stroke-[2.5]" />
            </div>
            <div>
              <span class="text-xl font-bold tracking-wider text-gradient font-sans">ComoAuto</span>
              <p class="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Gestión Auto</p>
            </div>
          </div>
          <button @click="toggleSidebar" class="md:hidden p-1 text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Info de la Agencia activa -->
        <div v-if="authStore.agencia" class="p-4 mx-4 my-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
          <div class="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <Building2 class="w-4 h-4" />
          </div>
          <div class="overflow-hidden">
            <p class="text-xs text-slate-400 font-medium">Agencia Activa</p>
            <p class="text-sm font-semibold truncate text-slate-200">{{ authStore.agencia.nombre }}</p>
          </div>
        </div>

        <!-- Menú de Enlaces -->
        <nav class="px-4 space-y-2">
          <router-link 
            to="/dashboard" 
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition-all font-medium"
            active-class="bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
          >
            <LayoutDashboard class="w-5 h-5" />
            <span>Dashboard</span>
          </router-link>

          <router-link 
            to="/leads" 
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition-all font-medium"
            active-class="bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
          >
            <Bot class="w-5 h-5" />
            <span>Cazador de Leads</span>
          </router-link>

          <router-link 
            to="/gestoria" 
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition-all font-medium"
            active-class="bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
          >
            <FileCheck class="w-5 h-5" />
            <span>Gestoría</span>
          </router-link>
        </nav>
      </div>

      <!-- Info del Usuario logueado y Logout -->
      <div class="p-4 border-t border-slate-800 space-y-3">
        <div v-if="authStore.profile" class="flex items-center gap-3 px-2">
          <div class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
            {{ authStore.profile.nombre.charAt(0).toUpperCase() }}
          </div>
          <div class="overflow-hidden">
            <p class="text-sm font-semibold truncate text-slate-200">{{ authStore.profile.nombre }}</p>
            <p class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">{{ authStore.profile.rol }}</p>
          </div>
        </div>
        <button 
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-all text-sm font-medium"
        >
          <LogOut class="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>

    <!-- Botón móvil para abrir Sidebar -->
    <div v-if="showNavigation" class="md:hidden flex items-center justify-between p-4 glass-panel border-b border-slate-800 w-full z-30">
      <div class="flex items-center gap-2">
        <Car class="w-6 h-6 text-emerald-400" />
        <span class="text-lg font-bold text-gradient">ComoAuto</span>
      </div>
      <button @click="toggleSidebar" class="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800">
        <Menu class="w-5 h-5" />
      </button>
    </div>

    <!-- Área de Contenido Principal -->
    <main :class="['flex-1 p-4 md:p-8 overflow-y-auto min-h-screen transition-all', showNavigation ? '' : 'w-full']">
      <div class="max-w-7xl mx-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style>
/* Transiciones de página */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
