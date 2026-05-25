<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  Megaphone, 
  Sparkles, 
  Facebook, 
  Chrome, 
  TrendingUp, 
  DollarSign, 
  Users, 
  MousePointer, 
  CheckCircle2,
  Loader2
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados de datos
const vehiculos = ref<any[]>([])
const loadingVehiculos = ref(false)

// Configuración de Campaña
const selectedPlatform = ref<'meta' | 'google'>('meta')
const selectedVehiculoId = ref('')
const presupuestoDiario = ref(1500)
const segmentacionGeo = ref('Rosario, Santa Fe')
const segmentacionInteres = ref('autos usados, financiacion automotor')
const textoAnuncio = ref('')
const isLaunching = ref(false)
const successLaunch = ref(false)

// Configuración de Carrusel & Campaña Automática
const isCarouselMode = ref(false)
const carruselSlides = ref<any[]>([])
const activeSlideIdx = ref(0)
const generatingCarousel = ref(false)
const carouselGenerated = ref(false)
const optimizeAutomatically = ref(true)

// Función para cambiar de diapositiva en el carrusel
const nextSlide = () => {
  if (carruselSlides.value.length === 0) return
  activeSlideIdx.value = (activeSlideIdx.value + 1) % carruselSlides.value.length
}

const prevSlide = () => {
  if (carruselSlides.value.length === 0) return
  activeSlideIdx.value = (activeSlideIdx.value - 1 + carruselSlides.value.length) % carruselSlides.value.length
}

// Generador de Carrusel IA Profesional no repetitivo
const generarCarruselIA = () => {
  const v = selectedVehiculo.value
  if (!v) {
    alert('Por favor, selecciona primero un vehículo del catálogo.')
    return
  }
  
  generatingCarousel.value = true
  carouselGenerated.value = false
  
  setTimeout(() => {
    carruselSlides.value = [
      {
        titulo: `🚘 ${v.marca} ${v.modelo} (Año ${v.anio})`,
        descripcion: `Unidad seleccionada en impecable estado de conservación general, lista para transferir y retirar de nuestro salón hoy. Kilometraje real garantizado.`,
        cta: 'Consultar WhatsApp 📱',
        colorGlow: 'from-emerald-500/10 to-cyan-500/10'
      },
      {
        titulo: `📊 FICHA Y EQUIPAMIENTO DE GAMA`,
        descripcion: `Motor de excelente rendimiento, confort tecnológico premium, control de estabilidad, tapizados premium y servicios al día. ¡Ideal para exigentes!`,
        cta: 'Ficha Completa 📋',
        colorGlow: 'from-cyan-500/10 to-blue-500/10'
      },
      {
        titulo: `💰 PLAN DE FINANCIACIÓN EXPRESS`,
        descripcion: `Subite entregando el 50% ($${(v.precio * 0.5).toLocaleString('es-AR')} ARS) y el resto financialo en cuotas fijas en pesos solo con tu DNI. ¡Resolución en 2 horas!`,
        cta: 'Simular Cuota 💵',
        colorGlow: 'from-blue-500/10 to-purple-500/10'
      },
      {
        titulo: `🔄 TASACIÓN EXCLUSIVA DE TU USADO`,
        descripcion: `Tomamos tu usado llave contra llave en el acto con cotización certificada en base a revistas de mercado automotor. ¡Cambia tu segmento hoy sin esperas!`,
        cta: 'Cotizar Usado 🚗',
        colorGlow: 'from-purple-500/10 to-emerald-500/10'
      }
    ]
    activeSlideIdx.value = 0
    generatingCarousel.value = false
    carouselGenerated.value = true
    isCarouselMode.value = true
  }, 1200)
}

// Listado de campañas activas / simuladas
const campanas = ref<any[]>([
  {
    id: 'camp-1',
    plataforma: 'meta',
    vehiculo: 'Ford Focus III 2.0 SE',
    presupuesto: 1200,
    estado: 'activa',
    metricas: { impresiones: 12400, clicks: 840, leads: 18, gasto: 7200 }
  },
  {
    id: 'camp-2',
    plataforma: 'google',
    vehiculo: 'Toyota Corolla 1.8 SEG',
    presupuesto: 2000,
    estado: 'activa',
    metricas: { impresiones: 8500, clicks: 610, leads: 12, gasto: 6000 }
  }
])

onMounted(async () => {
  await loadVehiculos()
  generarTextoAnuncio()
})

const loadVehiculos = async () => {
  loadingVehiculos.value = true
  if (authStore.isDemoMode) {
    vehiculos.value = [
      { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000 },
      { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000 },
      { id: '3', marca: 'Fiat', modelo: 'Cronos 1.3 Drive', anio: 2021, precio: 3900000 },
      { id: '4', marca: 'Toyota', modelo: 'Corolla 1.8 SEG', anio: 2018, precio: 5400000 }
    ]
    if (vehiculos.value.length > 0) selectedVehiculoId.value = vehiculos.value[0].id
    loadingVehiculos.value = false
  } else {
    try {
      const { data } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
        .eq('estado', 'disponible')
      
      if (data && data.length > 0) {
        vehiculos.value = data
        selectedVehiculoId.value = data[0].id
      }
    } catch (err) {
      console.error('Error al cargar autos para Ads:', err)
    } finally {
      loadingVehiculos.value = false
    }
  }
}

// Obtener vehículo seleccionado reactivo
const selectedVehiculo = computed(() => {
  return vehiculos.value.find(v => v.id === selectedVehiculoId.value) || null
})

// Generar copia del anuncio automáticamente
const generarTextoAnuncio = () => {
  const v = selectedVehiculo.value
  if (!v) {
    textoAnuncio.value = '¡Buscas tu próximo auto? Encontralo en nuestra concesionaria con financiación pre-aprobada.'
    return
  }
  
  const opciones = [
    `🔥 ¡OPORTUNIDAD ÚNICA! 🔥\n🚘 ${v.marca} ${v.modelo} (Año ${v.anio}) disponible hoy en salón.\n💵 Precio increíble y financiación exclusiva de hasta el 50% con DNI.\n👉 ¡Escribinos y reservá tu test drive ahora mismo antes de que se venda!`,
    `🚀 ¿Pensando en cambiar tu auto? 🚀\nSubite a este espectacular ${v.marca} ${v.modelo} impecable.\n✓ Kilometraje real certificado.\n✓ Tomamos tu usado en parte de pago.\n📲 Hace click para recibir más fotos y coordinar una visita.`,
    `💼 TU PRÓXIMO AUTO TE ESPERA 💼\nPresentamos el ${v.marca} ${v.modelo}.\nEquipamiento full, confort y la seguridad que buscás para tu familia.\n¡Hacemos envíos y transferencias llave contra llave en el acto!\n👇 Consultá plan de cuotas fijas.`
  ]
  textoAnuncio.value = opciones[Math.floor(Math.random() * opciones.length)]
}

// Cambiar de vehículo gatilla regeneración
const handleVehiculoChange = () => {
  generarTextoAnuncio()
}

// Lanzar Campaña (Simulado)
const handleLaunchCampaign = () => {
  if (!selectedVehiculo.value) return
  isLaunching.value = true
  successLaunch.value = false
  
  setTimeout(() => {
    const nuevaCampana = {
      id: 'camp-' + Date.now(),
      plataforma: selectedPlatform.value,
      vehiculo: `${selectedVehiculo.value.marca} ${selectedVehiculo.value.modelo} ${isCarouselMode.value ? '(Carrusel IA)' : '(Anuncio)'}`,
      presupuesto: presupuestoDiario.value,
      estado: 'activa',
      metricas: { impresiones: 0, clicks: 0, leads: 0, gasto: 0 }
    }
    
    campanas.value.unshift(nuevaCampana)
    isLaunching.value = false
    successLaunch.value = true
    
    // Simular crecimiento de métricas de la nueva campaña tras unos segundos
    setTimeout(() => {
      nuevaCampana.metricas = {
        impresiones: Math.floor(120 + Math.random() * 550),
        clicks: Math.floor(15 + Math.random() * 45),
        leads: Math.floor(2 + Math.random() * 5),
        gasto: Math.floor(220 + Math.random() * 320)
      }
    }, 5000)

    setTimeout(() => { successLaunch.value = false }, 4000)
  }, 2000)
}

// Cálculos de KPI globales de marketing
const totalKpis = computed(() => {
  let imp = 0, cli = 0, lea = 0, gst = 0
  campanas.value.forEach(c => {
    imp += c.metricas.impresiones
    cli += c.metricas.clicks
    lea += c.metricas.leads
    gst += c.metricas.gasto
  })
  
  const ctr = cli > 0 ? ((cli / imp) * 100).toFixed(2) : '0'
  const cpl = lea > 0 ? (gst / lea).toFixed(0) : '0'
  
  return { imp, cli, lea, gst, ctr, cpl }
})

const formatMoneda = (val: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div class="space-y-8 relative">
    
    <!-- Encabezado de la página -->
    <div class="flex justify-between items-center border-b border-slate-800 pb-5">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Megaphone class="w-6 h-6 animate-float" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Marketing & Campañas Ads</h1>
          <p class="text-slate-400 text-sm mt-0.5">Genera y automatiza campañas publicitarias en Meta (Facebook, Instagram) y Google</p>
        </div>
      </div>
    </div>

    <!-- Mensaje de éxito al lanzar campaña -->
    <div v-if="successLaunch" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-pulse">
      <CheckCircle2 class="w-5 h-5 shrink-0" />
      <span>¡Campaña vinculada y lanzada con éxito en las plataformas asociadas!</span>
    </div>

    <!-- KPIs de Anuncios -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gasto Total</span>
        <h4 class="text-lg font-bold text-white mt-1">{{ formatMoneda(totalKpis.gst) }}</h4>
      </div>
      <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impresiones</span>
        <h4 class="text-lg font-bold text-white mt-1">{{ totalKpis.imp.toLocaleString() }}</h4>
      </div>
      <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clicks</span>
        <h4 class="text-lg font-bold text-white mt-1">{{ totalKpis.cli.toLocaleString() }}</h4>
      </div>
      <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CTR Promedio</span>
        <h4 class="text-lg font-bold text-emerald-400 mt-1">{{ totalKpis.ctr }}%</h4>
      </div>
      <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between col-span-2 lg:col-span-1">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo por Lead (CPL)</span>
        <h4 class="text-lg font-bold text-cyan-400 mt-1">{{ formatMoneda(Number(totalKpis.cpl)) }}</h4>
      </div>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Panel de Creación de Campañas (Izquierda - 5/12) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">Configuración del Anuncio</h2>
            <button 
              @click="generarTextoAnuncio"
              class="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles class="w-3.5 h-3.5 animate-pulse" />
              <span>Redactar con IA</span>
            </button>
          </div>

          <!-- Selector de Plataforma -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plataforma Objetivo</label>
            <div class="grid grid-cols-2 gap-3">
              <button 
                @click="selectedPlatform = 'meta'"
                :class="[
                  'py-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-all',
                  selectedPlatform === 'meta' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400'
                ]"
              >
                <Facebook class="w-4 h-4 text-cyan-400" />
                <span>Meta Ads</span>
              </button>
              
              <button 
                @click="selectedPlatform = 'google'"
                :class="[
                  'py-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-all',
                  selectedPlatform === 'google' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400'
                ]"
              >
                <Chrome class="w-4 h-4 text-emerald-400" />
                <span>Google Ads</span>
              </button>
            </div>
          </div>

          <!-- Selector de Vehículo -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehículo a Promocionar</label>
            <select 
              v-model="selectedVehiculoId"
              @change="handleVehiculoChange"
              class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-300 text-sm transition-all"
            >
              <option v-if="loadingVehiculos" value="">Cargando catálogo...</option>
              <option v-else-if="vehiculos.length === 0" value="">No hay vehículos en stock</option>
              <option 
                v-for="v in vehiculos" 
                :key="v.id" 
                :value="v.id"
              >
                {{ v.marca }} {{ v.modelo }} - {{ formatMoneda(v.precio) }}
              </option>
            </select>
          </div>

          <!-- Presupuesto Diario -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presupuesto Diario (ARS)</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <DollarSign class="w-4 h-4" />
              </span>
              <input 
                v-model.number="presupuestoDiario" 
                type="number"
                class="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
          </div>

          <!-- Segmentación -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zona Geográfica</label>
              <input 
                v-model="segmentacionGeo" 
                type="text"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-xs transition-all"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intereses Clave</label>
              <input 
                v-model="segmentacionInteres" 
                type="text"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-xs transition-all"
              />
            </div>
          </div>

          <!-- Copia del anuncio -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Texto del Anuncio / Descripción General</label>
            <textarea 
              v-model="textoAnuncio"
              rows="3"
              class="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-300 text-xs transition-all placeholder:text-slate-700"
            ></textarea>
          </div>

          <!-- Modos Avanzados: Carrusel IA & Optimización Automática -->
          <div class="space-y-3 pt-3 border-t border-slate-850">
            <!-- Selector Modo Carrusel -->
            <div class="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <div>
                <p class="text-xs font-semibold text-slate-200">Formato Carrusel IA Profesional</p>
                <p class="text-[9px] text-slate-500">Crea slides con ganchos comerciales originales y no repetitivos</p>
              </div>
              <button 
                @click="generarCarruselIA"
                :disabled="generatingCarousel || !selectedVehiculoId"
                class="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-[10px] font-bold text-slate-350 hover:text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span v-if="generatingCarousel" class="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                <Sparkles v-else class="w-3 h-3 text-emerald-400" />
                <span>Generar</span>
              </button>
            </div>

            <!-- Switch Optimización Automática de Presupuesto y Canales -->
            <div class="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <div>
                <p class="text-xs font-semibold text-slate-200">Campaña Automatizada Directa</p>
                <p class="text-[9px] text-slate-500">Publicar y optimizar presupuesto/segmentos automáticamente por API</p>
              </div>
              <div 
                @click="optimizeAutomatically = !optimizeAutomatically"
                :class="[
                  'w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer shrink-0',
                  optimizeAutomatically ? 'bg-emerald-500' : 'bg-slate-850 border border-slate-700'
                ]"
              >
                <div 
                  :class="[
                    'w-5 h-5 rounded-full bg-slate-950 transition-all duration-300 shadow-md transform',
                    optimizeAutomatically ? 'translate-x-5' : 'translate-x-0'
                  ]"
                ></div>
              </div>
            </div>
          </div>

          <button 
            @click="handleLaunchCampaign"
            :disabled="isLaunching || !selectedVehiculoId"
            class="w-full py-3 rounded-xl font-bold btn-gradient text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 text-sm mt-4"
          >
            <Loader2 v-if="isLaunching" class="w-4 h-4 animate-spin text-slate-950" />
            <Megaphone v-else class="w-4 h-4 text-slate-950" />
            <span>Lanzar Campaña Automática</span>
          </button>
        </div>
      </div>

      <!-- Preview de Campañas y Listado Activas (Derecha - 7/12) -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Previsualizador de Anuncio en Tiempo Real -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previsualización del Anuncio en Vivo</span>
          
          <!-- Mock de Meta Ads Feed (Modo Carrusel o Estático) -->
          <div v-if="selectedPlatform === 'meta'" class="max-w-md mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-sm relative">
            <div class="p-3 border-b border-slate-800/80 flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs">
                C
              </div>
              <div>
                <p class="font-bold text-white text-xs">{{ authStore.agencia?.nombre || 'Mi Concesionario' }}</p>
                <p class="text-[9px] text-slate-500 font-medium">Publicidad Patrocinada</p>
              </div>
            </div>
            
            <div class="p-3 text-xs text-slate-300 whitespace-pre-line font-sans leading-relaxed">
              {{ textoAnuncio }}
            </div>

            <!-- MODO CARRUSEL IA INTERACTIVO -->
            <div v-if="isCarouselMode && carouselGenerated && carruselSlides.length > 0" class="relative group">
              <div :class="['aspect-video bg-slate-900 border-t border-b border-slate-850 flex flex-col justify-center items-center relative overflow-hidden p-6 text-center transition-all duration-300 bg-gradient-to-br', carruselSlides[activeSlideIdx].colorGlow]">
                <!-- Flecha de Navegación Izquierda -->
                <button 
                  @click="prevSlide"
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 border border-slate-850 text-slate-350 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 text-[9px] font-bold"
                >
                  &larr;
                </button>

                <Car class="w-10 h-10 text-emerald-400/80 animate-pulse mb-3" />
                <h4 class="font-bold text-white text-base font-sans tracking-tight px-6">{{ carruselSlides[activeSlideIdx].titulo }}</h4>
                <p class="text-[11px] text-slate-300 mt-2 px-8 leading-relaxed font-sans">{{ carruselSlides[activeSlideIdx].descripcion }}</p>

                <!-- Flecha de Navegación Derecha -->
                <button 
                  @click="nextSlide"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 border border-slate-850 text-slate-350 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 text-[9px] font-bold"
                >
                  &rarr;
                </button>

                <!-- Indicadores de Posición / Puntos Deslizantes -->
                <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  <span 
                    v-for="(_, sIdx) in carruselSlides" 
                    :key="sIdx"
                    :class="[
                      'w-2 h-2 rounded-full transition-all duration-300',
                      sIdx === activeSlideIdx ? 'bg-emerald-400 w-4' : 'bg-slate-700'
                    ]"
                  ></span>
                </div>
              </div>

              <!-- Footer Meta Ad Carrusel -->
              <div class="p-3.5 bg-slate-900/60 flex justify-between items-center border-t border-slate-850">
                <div>
                  <p class="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Carrusel Diapositiva {{ activeSlideIdx + 1 }} de {{ carruselSlides.length }}</p>
                  <p class="font-bold text-white text-xs mt-0.5">{{ carruselSlides[activeSlideIdx].cta }}</p>
                </div>
                <span class="px-3.5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs tracking-wide cursor-pointer hover:bg-emerald-450 transition-colors">
                  Contactar
                </span>
              </div>
            </div>

            <!-- MODO ESTÁTICO (IMAGEN ÚNICA) -->
            <div v-else>
              <!-- Caja de Imagen/Ficha del Auto -->
              <div class="aspect-video bg-slate-900 border-t border-b border-slate-850 flex flex-col justify-center items-center relative overflow-hidden p-6 text-center">
                <Car class="w-12 h-12 text-slate-700 animate-pulse" />
                <h4 class="font-bold text-white text-base mt-3">{{ selectedVehiculo?.marca }} {{ selectedVehiculo?.modelo }}</h4>
                <p class="text-xs text-emerald-400 font-bold mt-1" v-if="selectedVehiculo">{{ formatMoneda(selectedVehiculo.precio) }}</p>
              </div>

              <!-- Footer Meta Ad -->
              <div class="p-3.5 bg-slate-900/60 flex justify-between items-center border-t border-slate-850">
                <div>
                  <p class="text-[10px] text-slate-400 uppercase tracking-wide">Más Información en WhatsApp</p>
                  <p class="font-bold text-white text-xs">Reservá hoy tu visita</p>
                </div>
                <span class="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs tracking-wide">
                  Enviar Mensaje
                </span>
              </div>
            </div>
          </div>

          <!-- Mock de Google Ads Search -->
          <div v-else class="max-w-md mx-auto bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs font-sans space-y-2">
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>Google</span>
              <span>•</span>
              <span class="font-bold">Patrocinado</span>
            </div>
            
            <a href="#" class="text-sky-400 hover:underline text-sm font-semibold truncate block">
              Concesionaria Rosario S.A. | {{ selectedVehiculo?.marca }} {{ selectedVehiculo?.modelo }} Disponible
            </a>
            
            <p class="text-emerald-500 font-medium text-[10px] truncate">
              https://{{ authStore.agencia?.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') || 'comoauto' }}.com/stock/{{ selectedVehiculo?.modelo.toLowerCase().replace(/[^a-z0-9]/g, '') }}
            </p>
            
            <p class="text-slate-400 leading-relaxed font-normal">
              {{ textoAnuncio.replace(/\n/g, ' ') }} ¡Consultas de cuotas fijas y tasación llave contra llave!
            </p>
          </div>
        </div>

        <!-- Tabla de Campañas Activas -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial de Campañas Recientes</span>
          
          <div class="space-y-3.5">
            <div 
              v-for="camp in campanas" 
              :key="camp.id"
              class="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs"
            >
              <div class="flex items-center gap-3">
                <div 
                  :class="[
                    'p-2.5 rounded-lg',
                    camp.plataforma === 'meta' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'
                  ]"
                >
                  <Facebook v-if="camp.plataforma === 'meta'" class="w-4 h-4" />
                  <Chrome v-else class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="font-bold text-white text-sm">{{ camp.vehiculo }}</h4>
                  <p class="text-slate-400 text-[10px] mt-0.5">
                    Presupuesto: <span class="text-slate-200 font-semibold">{{ formatMoneda(camp.presupuesto) }}/día</span>
                  </p>
                </div>
              </div>

              <!-- Estadísticas cortas -->
              <div class="flex flex-wrap gap-x-5 gap-y-1.5 text-slate-400">
                <div class="flex items-center gap-1.5">
                  <TrendingUp class="w-3.5 h-3.5 text-slate-500" />
                  <span>{{ camp.metricas.impresiones.toLocaleString() }} Imp.</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <MousePointer class="w-3.5 h-3.5 text-slate-500" />
                  <span>{{ camp.metricas.clicks }} Clicks</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Users class="w-3.5 h-3.5 text-emerald-400" />
                  <span class="font-bold text-emerald-400">{{ camp.metricas.leads }} Leads</span>
                </div>
              </div>

              <!-- Estado badge -->
              <span class="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                {{ camp.estado }}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
