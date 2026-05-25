<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  TrendingUp, 
  Car, 
  Users, 
  AlertOctagon, 
  Clock, 
  ArrowRight,
  Sparkles,
  Bot,
  Phone
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Datos del Dashboard
const stats = ref({
  facturacion: 14850000,
  stockTotal: 24,
  stockAlertaCount: 5,
  leadsActivos: 18
})

// Gestión de equipo (ruteo rotativo)
const vendedores = ref([
  { id: 'vend-1', nombre: 'Amin Határ', telefono: '+54 9 341 555-001', estado: 'Online', leadsHoy: 4, activo: true, whatsappConectado: true, redesConectadas: true },
  { id: 'vend-2', nombre: 'Laura Fernández', telefono: '+54 9 11 3456-781', estado: 'Online', leadsHoy: 3, activo: false, whatsappConectado: true, redesConectadas: false },
  { id: 'vend-3', nombre: 'Matías Rossi', telefono: '+54 9 341 234-562', estado: 'Offline', leadsHoy: 2, activo: false, whatsappConectado: false, redesConectadas: false }
])

const setSiguienteTurno = (id: string) => {
  vendedores.value.forEach(v => {
    v.activo = (v.id === id)
  })
}


const vehiculosAlerta = ref<any[]>([])
const ultimosLeads = ref<any[]>([])
const loading = ref(true)

// Feed de notificaciones del Bot Cazador de Leads en tiempo real
const botFeed = ref<any[]>([
  {
    id: 1,
    red_social: 'Facebook Marketplace',
    nombre_cliente: 'Gabriel Martínez',
    mensaje: 'Hola, me interesa el Ford Focus 2018. ¿Sigue disponible?',
    fecha: 'Hace 3 min',
    auto_detectado: 'Ford Focus 2018',
    clasificacion: 'Caliente'
  },
  {
    id: 2,
    red_social: 'Instagram Direct',
    nombre_cliente: 'Sofía Rodríguez',
    mensaje: 'Busco un Cronos 1.3 con poco kilometraje. ¿Tienen en stock?',
    fecha: 'Hace 15 min',
    auto_detectado: 'Fiat Cronos',
    clasificacion: 'Tibio'
  },
  {
    id: 3,
    red_social: 'Twitter / X',
    nombre_cliente: 'Carlos Pérez',
    mensaje: 'Alguien vende un Corolla automatico? Pago de contado.',
    fecha: 'Hace 45 min',
    auto_detectado: 'Toyota Corolla',
    clasificacion: 'Caliente'
  }
])

let feedInterval: any = null

onMounted(async () => {
  await loadDashboardData()
  
  // Simular notificaciones en tiempo real si el bot está activo
  feedInterval = setInterval(() => {
    simulateIncomingLead()
  }, 25000) // Nueva notificación simulada cada 25 segundos
})

onUnmounted(() => {
  if (feedInterval) clearInterval(feedInterval)
})

// Cargar datos (Demo u Online)
const loadDashboardData = async () => {
  loading.value = true
  if (authStore.isDemoMode) {
    // Cargar datos simulados
    const esVendedor = authStore.profile?.rol === 'vendedor'
    stats.value = {
      facturacion: esVendedor ? 0 : 18450000,
      stockTotal: 28,
      stockAlertaCount: esVendedor ? 2 : 6,
      leadsActivos: esVendedor ? 5 : 14
    }

    vehiculosAlerta.value = [
      { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000, dias_en_stock: 58, kilometraje: 89000 },
      { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000, dias_en_stock: 62, kilometraje: 110000 },
      { id: '3', marca: 'Renault', modelo: 'Sandero Stepway 1.6 Privilage', anio: 2018, precio: 2900000, dias_en_stock: 49, kilometraje: 76000 },
      { id: '4', marca: 'Chevrolet', modelo: 'Cruze 1.4T LTZ', anio: 2019, precio: 5100000, dias_en_stock: 75, kilometraje: 54000 },
      { id: '5', marca: 'Peugeot', modelo: '208 1.6 Feline', anio: 2019, precio: 3200000, dias_en_stock: 46, kilometraje: 68000 }
    ]

    ultimosLeads.value = esVendedor 
      ? [
          { id: '1', nombre_cliente: 'Juan Ignacio Díaz', telefono_whatsapp: '+5491134567890', estado_lead: 'nuevo', fecha_creacion: new Date(), vendedor_nombre: authStore.profile?.nombre }
        ]
      : [
          { id: '1', nombre_cliente: 'Juan Ignacio Díaz', telefono_whatsapp: '+5491134567890', estado_lead: 'nuevo', fecha_creacion: new Date() },
          { id: '2', nombre_cliente: 'María Belén Gómez', telefono_whatsapp: '+5493412345678', estado_lead: 'en_contacto', fecha_creacion: new Date(Date.now() - 3600000) }
        ]
    loading.value = false
  } else {
    // Consulta real a Supabase
    try {
      // 1. Obtener total vehículos y vehiculos con stock > 45 días
      const { data: vehiculos, error: vehError } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
      
      if (vehError) throw vehError

      if (vehiculos) {
        stats.value.stockTotal = vehiculos.length
        const alertaList = vehiculos.filter(v => v.dias_en_stock > 45 && v.estado === 'disponible')
        vehiculosAlerta.value = alertaList.sort((a, b) => b.dias_en_stock - a.dias_en_stock)
        stats.value.stockAlertaCount = alertaList.length
      }

      // 2. Obtener leads activos (nuevos, en contacto, interesados)
      let queryLeads = supabase
        .from('leads')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
        .in('estado_lead', ['nuevo', 'en_contacto', 'interesado'])

      if (authStore.profile?.rol === 'vendedor') {
        queryLeads = queryLeads.eq('vendedor_asignado_id', authStore.profile.id)
      }

      const { data: leads, error: leadError } = await queryLeads
        .order('fecha_creacion', { ascending: false })

      if (leadError) throw leadError

      if (leads) {
        stats.value.leadsActivos = leads.length
        ultimosLeads.value = leads.slice(0, 5)
      }

      // 3. Simular facturación basada en vehículos vendidos (solo administradores)
      if (authStore.profile?.rol !== 'vendedor') {
        const { data: vendidos } = await supabase
          .from('vehiculos')
          .select('precio')
          .eq('agencia_id', authStore.activeAgenciaId)
          .eq('estado', 'vendido')

        if (vendidos) {
          const sum = vendidos.reduce((acc, curr) => acc + Number(curr.precio), 0)
          stats.value.facturacion = sum || 12500000 // Backup si no hay ventas
        }
      } else {
        stats.value.facturacion = 0
      }

      // 4. Obtener vendedores de la agencia desde la base de datos (solo admins)
      if (authStore.profile?.rol !== 'vendedor') {
        const { data: usuariosData, error: usrError } = await supabase
          .from('usuarios')
          .select('id, nombre, telefono_whatsapp, config_conexion_whatsapp, config_redes_sociales, rol')
          .eq('agencia_id', authStore.activeAgenciaId)
          .in('rol', ['vendedor', 'admin'])

        if (usrError) throw usrError

        if (usuariosData) {
          // Contar leads de hoy para cada vendedor
          const inicioHoy = new Date()
          inicioHoy.setHours(0, 0, 0, 0)
          
          const { data: leadsHoyData } = await supabase
            .from('leads')
            .select('vendedor_asignado_id')
            .eq('agencia_id', authStore.activeAgenciaId)
            .gte('fecha_creacion', inicioHoy.toISOString())
          
          const counts: Record<string, number> = {}
          if (leadsHoyData) {
            leadsHoyData.forEach(l => {
              if (l.vendedor_asignado_id) {
                counts[l.vendedor_asignado_id] = (counts[l.vendedor_asignado_id] || 0) + 1
              }
            })
          }

          vendedores.value = usuariosData.map(u => {
            const wa = u.config_conexion_whatsapp || {}
            const redes = u.config_redes_sociales || {}
            
            return {
              id: u.id,
              nombre: u.nombre,
              telefono: u.telefono_whatsapp || 'Sin registrar',
              estado: u.id === authStore.profile?.id ? 'Online' : 'Offline',
              leadsHoy: counts[u.id] || 0,
              activo: false,
              whatsappConectado: wa.conectado || false,
              redesConectadas: !!(redes.facebook?.usuario || redes.instagram?.usuario)
            }
          })
          
          if (vendedores.value.length > 0) {
            vendedores.value[0].activo = true
          }
        }
      }

    } catch (err: any) {
      console.error('Error al cargar datos reales del dashboard:', err.message)
    } finally {
      loading.value = false
    }
  }
}

// Simular la llegada de un lead en tiempo real por el Bot
const simulateIncomingLead = () => {
  const nombres = ['Laura Fernández', 'Matías Rossi', 'Esteban Quito', 'Agustina Bianchi', 'Paula Manso']
  const redes = ['Facebook Marketplace', 'Instagram Direct', 'MercadoLibre Preguntas']
  const autos = ['Toyota Hilux', 'Honda Civic 2017', 'Chevrolet Onix', 'Volkswagen Gol Trend']
  const mensajes = [
    'Me interesa el auto, ¿cuál es el precio charlable?',
    'Aceptas permuta menor valor y diferencia?',
    'Sigue en stock? Quisiera pasar a verlo esta tarde.',
    'Hacen financiación? Qué requisitos piden?'
  ]
  const clasificaciones = ['Caliente', 'Tibio', 'Frio']

  const randomNombre = nombres[Math.floor(Math.random() * nombres.length)]
  const randomRed = redes[Math.floor(Math.random() * redes.length)]
  const randomAuto = autos[Math.floor(Math.random() * autos.length)]
  const randomMensaje = mensajes[Math.floor(Math.random() * mensajes.length)]
  const randomClasif = clasificaciones[Math.floor(Math.random() * clasificaciones.length)]

  const newLeadFeed = {
    id: Date.now(),
    red_social: randomRed,
    nombre_cliente: randomNombre,
    mensaje: randomMensaje,
    fecha: 'Ahora mismo',
    auto_detectado: randomAuto,
    clasificacion: randomClasif
  }

  // Insertar al inicio de la lista
  botFeed.value.unshift(newLeadFeed)
  // Limitar a 6 notificaciones en pantalla
  if (botFeed.value.length > 6) botFeed.value.pop()

  // Actualizar estadísticas del dashboard localmente
  stats.value.leadsActivos++

  // Rotar el turno de vendedor en la UI
  const activoIdx = vendedores.value.findIndex(v => v.activo)
  if (activoIdx !== -1) {
    vendedores.value[activoIdx].leadsHoy++
    vendedores.value[activoIdx].activo = false
    const nextIdx = (activoIdx + 1) % vendedores.value.length
    vendedores.value[nextIdx].activo = true
  }
}

// Formateadores
const formatMoneda = (val: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div class="space-y-8 relative">
    
    <!-- Encabezado de Bienvenida -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Panel de Control</h1>
        <p class="text-slate-400 text-sm mt-1">
          Bienvenido, {{ authStore.profile?.nombre }} • Rol: <span class="text-cyan-400 font-semibold uppercase text-xs">{{ authStore.profile?.rol }}</span>
        </p>
      </div>
      <button 
        @click="loadDashboardData"
        class="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all text-sm font-semibold cursor-pointer flex items-center gap-2"
      >
        <Sparkles class="w-4 h-4 text-emerald-400 animate-pulse" />
        <span>Actualizar Datos</span>
      </button>
    </div>

    <!-- Carga inicial -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-slate-400 text-sm mt-4">Analizando métricas del concesionario...</p>
    </div>

    <div v-else class="space-y-8">
      <!-- Grid de KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- KPI 1: Facturación / Desempeño Personal -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300"></div>
          <div v-if="authStore.profile?.rol !== 'vendedor'">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facturación Estimada</span>
            <h3 class="text-2xl font-bold text-white mt-1.5 font-sans">{{ formatMoneda(stats.facturacion) }}</h3>
            <div class="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
              <TrendingUp class="w-3.5 h-3.5" />
              <span>+12.4% este mes</span>
            </div>
          </div>
          <div v-else>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mis Conversiones</span>
            <h3 class="text-2xl font-bold text-emerald-400 mt-1.5 font-sans">8 ventas</h3>
            <div class="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
              <TrendingUp class="w-3.5 h-3.5" />
              <span>Rendimiento Personal</span>
            </div>
          </div>
          <div class="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp class="w-6 h-6" />
          </div>
        </div>

        <!-- KPI 2: Stock Total -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-300"></div>
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehículos en Stock</span>
            <h3 class="text-2xl font-bold text-white mt-1.5">{{ stats.stockTotal }} autos</h3>
            <div class="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
              <Car class="w-3.5 h-3.5" />
              <span>85% disponibles</span>
            </div>
          </div>
          <div class="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Car class="w-6 h-6" />
          </div>
        </div>

        <!-- KPI 3: Stock Parado -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-300"></div>
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Parado (+45 d)</span>
            <h3 class="text-2xl font-bold text-rose-400 mt-1.5">{{ stats.stockAlertaCount }} autos</h3>
            <div class="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-semibold animate-pulse">
              <AlertOctagon class="w-3.5 h-3.5" />
              <span>Requiere acción inmediata</span>
            </div>
          </div>
          <div class="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <AlertOctagon class="w-6 h-6" />
          </div>
        </div>

        <!-- KPI 4: Leads Activos -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300"></div>
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leads Activos Bot</span>
            <h3 class="text-2xl font-bold text-white mt-1.5">{{ stats.leadsActivos }} leads</h3>
            <div class="flex items-center gap-1.5 text-xs text-cyan-400 mt-2 font-semibold">
              <Sparkles class="w-3.5 h-3.5 animate-pulse" />
              <span>Cazador activo en redes</span>
            </div>
          </div>
          <div class="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Users class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Sección Principal: Stock Parado y Feed del Bot -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Stock Parado (+45 días) - Columna Izquierda (7/12) -->
        <div class="lg:col-span-7 space-y-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <AlertOctagon class="w-5 h-5 text-rose-400" />
              <h2 class="text-xl font-bold text-white">Alerta de Stock Parado (> 45 días)</h2>
            </div>
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {{ vehiculosAlerta.length }} en riesgo
            </span>
          </div>

          <div class="space-y-4">
            <div 
              v-for="veh in vehiculosAlerta" 
              :key="veh.id"
              class="glass-panel p-4 rounded-xl border border-slate-800 hover:border-rose-500/30 transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden"
            >
              <!-- Barra lateral de advertencia -->
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-amber-500"></div>
              
              <div class="pl-2">
                <h4 class="font-bold text-slate-100 text-base">{{ veh.marca }} {{ veh.modelo }}</h4>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>Año: {{ veh.anio }}</span>
                  <span>•</span>
                  <span>{{ veh.kilometraje.toLocaleString() }} km</span>
                  <span>•</span>
                  <span class="font-semibold text-white">{{ formatMoneda(veh.precio) }}</span>
                </div>
              </div>

              <!-- Indicadores de Alerta -->
              <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <div class="flex items-center gap-1.5">
                  <Clock class="w-4 h-4 text-rose-400" />
                  <span class="text-sm font-bold text-rose-400">{{ veh.dias_en_stock }} días parado</span>
                </div>
                <router-link 
                  to="/gestoria" 
                  class="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                  title="Ver Gestoría"
                >
                  <ArrowRight class="w-4 h-4" />
                </router-link>
              </div>
            </div>

            <!-- Sin stock parado -->
            <div 
              v-if="vehiculosAlerta.length === 0" 
              class="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-sm"
            >
              ¡Felicitaciones! No tienes stock estancado mayor a 45 días.
            </div>
          </div>
        </div>

        <!-- Feed del Bot Cazador en Tiempo Real - Columna Derecha (5/12) -->
        <div class="lg:col-span-5 space-y-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <Bot class="w-5 h-5 text-emerald-400" />
              <h2 class="text-xl font-bold text-white">Bot Cazador (Redes Sociales)</h2>
            </div>
            <span class="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              En Vivo
            </span>
          </div>

          <!-- Feed del Bot -->
          <div class="glass-panel rounded-2xl border border-slate-800 p-4 space-y-4 max-h-[500px] overflow-y-auto">
            <TransitionGroup name="list" tag="div" class="space-y-4">
              <div 
                v-for="item in botFeed" 
                :key="item.id"
                class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2 relative overflow-hidden"
              >
                <!-- Clasificación Badge -->
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800">
                    {{ item.red_social }}
                  </span>
                  <span 
                    :class="[
                      'text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide',
                      item.clasificacion === 'Caliente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      item.clasificacion === 'Tibio' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    ]"
                  >
                    {{ item.clasificacion }}
                  </span>
                </div>

                <!-- Mensaje e Info -->
                <div>
                  <p class="text-sm font-bold text-slate-200">{{ item.nombre_cliente }}</p>
                  <p class="text-xs text-slate-300 italic mt-1 font-serif">"{{ item.mensaje }}"</p>
                </div>

                <!-- Footer del Feed -->
                <div class="flex justify-between items-center border-t border-slate-800/60 pt-2 mt-1">
                  <span class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Car class="w-3 h-3" />
                    Interés: {{ item.auto_detectado }}
                  </span>
                  <span class="text-[9px] text-slate-500">{{ item.fecha }}</span>
                </div>
              </div>
            </TransitionGroup>
          </div>
          
          <div class="text-center">
            <router-link 
              to="/leads" 
              class="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
            >
              <span>Ver todos los leads capturados</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Gestión de Equipo y Ruteo Rotativo de WhatsApp (Sección Premium) -->
    <div v-if="authStore.profile?.rol !== 'vendedor'" class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 mt-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Users class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-white font-sans">Equipo de Ventas & Ruteo WhatsApp</h2>
            <p class="text-slate-400 text-xs mt-0.5">Distribución equitativa y en tiempo real de los leads entrantes en la agencia</p>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
          <Sparkles class="w-3.5 h-3.5 animate-pulse" />
          Ruteo Activo: Rotativo
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="vend in vendedores" 
          :key="vend.id"
          :class="[
            'p-5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between gap-4 duration-300',
            vend.activo 
              ? 'bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
              : 'bg-slate-900/40 border-slate-850 hover:border-slate-800'
          ]"
        >
          <!-- Badge de Turno Activo -->
          <div v-if="vend.activo" class="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-bl">
            Siguiente Lead
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                {{ vend.nombre.split(' ').map(n => n[0]).join('') }}
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">{{ vend.nombre }}</h4>
                <span 
                  :class="[
                    'text-[9px] font-bold uppercase tracking-wider',
                    vend.estado === 'Online' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                  ]"
                >
                  ● {{ vend.estado }}
                </span>
              </div>
            </div>
            
            <p class="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-2">
              <Phone class="w-3.5 h-3.5 text-slate-500" />
              {{ vend.telefono }}
            </p>

            <!-- Estado de Canales Privados del Vendedor -->
            <div class="flex flex-wrap gap-2.5 mt-3 pt-2.5 border-t border-slate-800/40">
              <span 
                :class="[
                  'text-[9px] font-bold px-2 py-0.5 rounded-md border',
                  vend.whatsappConectado 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-slate-950 text-slate-600 border-slate-900'
                ]"
              >
                WhatsApp: {{ vend.whatsappConectado ? 'Conectado QR' : 'Inactivo' }}
              </span>
              <span 
                :class="[
                  'text-[9px] font-bold px-2 py-0.5 rounded-md border',
                  vend.redesConectadas 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                    : 'bg-slate-950 text-slate-600 border-slate-900'
                ]"
              >
                Redes: {{ vend.redesConectadas ? 'Vinculadas' : 'Inactivas' }}
              </span>
            </div>
          </div>

          <div class="flex justify-between items-center border-t border-slate-800/60 pt-3 text-[11px] text-slate-500">
            <span>Leads hoy: <strong class="text-white">{{ vend.leadsHoy }}</strong></span>
            <button 
              v-if="!vend.activo"
              @click="setSiguienteTurno(vend.id)"
              class="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:text-emerald-400 transition-all cursor-pointer font-bold text-[10px]"
            >
              Dar Turno
            </button>
            <span v-else class="text-emerald-400 font-bold text-[9px] uppercase tracking-wider">Recibiendo Leads</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Animación de entrada para el feed */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
