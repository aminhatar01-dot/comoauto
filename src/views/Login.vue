<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Car, Lock, Mail, AlertTriangle, Shield, CheckCircle } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loadingLocal = ref(false)
const errorLocal = ref<string | null>(null)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorLocal.value = 'Por favor, ingresa correo y contraseña.'
    return
  }
  
  loadingLocal.value = true
  errorLocal.value = null
  
  const success = await authStore.login(email.value, password.value)
  loadingLocal.value = false
  
  if (success) {
    router.push('/dashboard')
  } else {
    errorLocal.value = authStore.errorMsg
  }
}

const handleDemoLogin = (role: 'admin' | 'vendedor' | 'gestor') => {
  loadingLocal.value = true
  authStore.loginDemo(role)
  
  // Simular la transición de redirección
  setTimeout(() => {
    loadingLocal.value = false
    router.push('/dashboard')
  }, 1000)
}
</script>

<template>
  <div class="min-h-[85vh] flex items-center justify-center p-4">
    <!-- Fondo decorativo con gradientes orbitales -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-subtle"></div>
      <div class="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse-subtle"></div>
    </div>

    <!-- Contenedor del Login -->
    <div class="w-full max-w-md glass-panel rounded-2xl border border-slate-800 p-8 shadow-2xl relative z-10 animate-float">
      <!-- Logo de la Marca -->
      <div class="flex flex-col items-center mb-8">
        <div class="p-3 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/10">
          <Car class="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-gradient font-sans">ComoAuto</h1>
        <p class="text-slate-400 text-sm mt-1">Gestión Inteligente de Ventas y Gestoría</p>
      </div>

      <!-- Errores -->
      <div 
        v-if="errorLocal" 
        class="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3"
      >
        <AlertTriangle class="w-5 h-5 shrink-0 text-rose-400" />
        <div>
          <span class="font-bold">Error de Acceso</span>
          <p class="mt-0.5">{{ errorLocal }}</p>
        </div>
      </div>

      <!-- Formulario de Acceso Oficial -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Mail class="w-5 h-5" />
            </span>
            <input 
              v-model="email" 
              type="email" 
              required
              placeholder="admin@comoauto.com"
              class="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-100 transition-all placeholder:text-slate-600 text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Lock class="w-5 h-5" />
            </span>
            <input 
              v-model="password" 
              type="password" 
              required
              placeholder="••••••••"
              class="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-100 transition-all placeholder:text-slate-600 text-sm"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loadingLocal"
          class="w-full py-3 rounded-xl font-semibold btn-gradient text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <span v-if="loadingLocal" class="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          <span v-else>Iniciar Sesión</span>
        </button>
      </form>

      <!-- Divisor Estético -->
      <div class="relative my-8">
        <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-800"></span></div>
        <div class="relative flex justify-center text-xs uppercase"><span class="bg-[#0b0f19] px-3 text-slate-500 font-semibold tracking-wider">O explora la aplicación</span></div>
      </div>

      <!-- Sección de Modo Demo -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider justify-center mb-1">
          <Shield class="w-4 h-4 text-cyan-400" />
          <span>Acceso Instantáneo en Modo Demo</span>
        </div>
        
        <div class="grid grid-cols-3 gap-2">
          <button 
            @click="handleDemoLogin('admin')"
            :disabled="loadingLocal"
            class="py-2.5 px-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-all hover:bg-cyan-500/5 cursor-pointer flex flex-col items-center gap-1"
          >
            <span class="text-[9px] uppercase tracking-wider text-slate-500">Rol</span>
            <span>Administrador</span>
          </button>
          
          <button 
            @click="handleDemoLogin('vendedor')"
            :disabled="loadingLocal"
            class="py-2.5 px-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-all hover:bg-emerald-500/5 cursor-pointer flex flex-col items-center gap-1"
          >
            <span class="text-[9px] uppercase tracking-wider text-slate-500">Rol</span>
            <span>Vendedor</span>
          </button>
          
          <button 
            @click="handleDemoLogin('gestor')"
            :disabled="loadingLocal"
            class="py-2.5 px-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold text-slate-300 hover:text-purple-400 transition-all hover:bg-purple-500/5 cursor-pointer flex flex-col items-center gap-1"
          >
            <span class="text-[9px] uppercase tracking-wider text-slate-500">Rol</span>
            <span>Gestor</span>
          </button>
        </div>

        <div class="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <CheckCircle class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>El modo demo no requiere configuración previa y carga datos simulados para que pruebes toda la lógica del bot y gestoría al instante.</p>
        </div>
      </div>
    </div>
  </div>
</template>
