import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  agencia_id: string
  nombre: string
  rol: 'admin' | 'vendedor' | 'gestor'
}

export interface Agencia {
  id: string
  nombre: string
  cuit: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const profile = ref<UserProfile | null>(null)
  const agencia = ref<Agencia | null>(null)
  const loading = ref(false)
  const errorMsg = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => profile.value?.rol || null)
  const activeAgenciaId = computed(() => profile.value?.agencia_id || null)

  const isDemoMode = ref(false)

  // Inicializar estado escuchando la sesión activa
  async function initialize() {
    // Si ya estamos en modo demo, no inicializar desde Supabase
    if (isDemoMode.value) return

    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        user.value = session.user
        await fetchProfileAndAgencia(session.user.id)
      }
    } catch (err: any) {
      console.warn('Error al conectar con Supabase (inicialización):', err.message)
    } finally {
      loading.value = false
    }

    // Escuchar cambios de estado en auth si no es modo demo
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isDemoMode.value) return
      
      loading.value = true
      if (session) {
        user.value = session.user
        await fetchProfileAndAgencia(session.user.id)
      } else {
        user.value = null
        profile.value = null
        agencia.value = null
      }
      loading.value = false
    })
  }

  // Buscar perfil del usuario y datos de su agencia
  async function fetchProfileAndAgencia(userId: string) {
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileErr) throw profileErr
      profile.value = profileData as UserProfile

      if (profileData && profileData.agencia_id) {
        const { data: agenciaData, error: agenciaErr } = await supabase
          .from('agencias')
          .select('*')
          .eq('id', profileData.agencia_id)
          .single()

        if (agenciaErr) throw agenciaErr
        agencia.value = agenciaData as Agencia
      }
    } catch (err: any) {
      console.error('Error al cargar datos del usuario/agencia:', err.message)
      errorMsg.value = 'No se pudo cargar el perfil del usuario asociado.'
    }
  }

  // Login normal con Supabase
  async function login(email: string, password: string) {
    loading.value = true
    errorMsg.value = null
    isDemoMode.value = false
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      user.value = data.user
      await fetchProfileAndAgencia(data.user!.id)
      return true
    } catch (err: any) {
      console.error('Error en login:', err.message)
      errorMsg.value = err.message || 'Error de credenciales o conexión.'
      return false
    } finally {
      loading.value = false
    }
  }

  // Iniciar Sesión en Modo Demo (Offline)
  function loginDemo(role: 'admin' | 'vendedor' | 'gestor' = 'admin') {
    loading.value = true
    errorMsg.value = null
    isDemoMode.value = true
    
    // Simular retardo de red
    setTimeout(() => {
      user.value = {
        id: 'demo-user-id',
        email: 'demo@comoauto.com',
        user_metadata: { nombre: 'Usuario Demo' }
      }
      profile.value = {
        id: 'demo-user-id',
        agencia_id: 'demo-agencia-id',
        nombre: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        rol: role
      }
      agencia.value = {
        id: 'demo-agencia-id',
        nombre: 'AutoPremium S.A. (Demo)',
        cuit: '30-71458963-9'
      }
      loading.value = false
    }, 800)
    return true
  }

  // Cerrar sesión
  async function logout() {
    loading.value = true
    try {
      if (!isDemoMode.value) {
        await supabase.auth.signOut()
      }
    } catch (err: any) {
      console.warn('Error en signout de Supabase:', err.message)
    } finally {
      // Limpiar estado en ambos casos
      user.value = null
      profile.value = null
      agencia.value = null
      isDemoMode.value = false
      loading.value = false
    }
  }

  return {
    user,
    profile,
    agencia,
    loading,
    errorMsg,
    isDemoMode,
    isAuthenticated,
    userRole,
    activeAgenciaId,
    initialize,
    fetchProfileAndAgencia,
    login,
    loginDemo,
    logout
  }
})
