<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  Globe, 
  Settings, 
  Check, 
  ExternalLink, 
  Save, 
  Search, 
  Car, 
  Phone, 
  Mail, 
  MapPin,
  RefreshCw,
  Server
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados locales
const vehiculos = ref<any[]>([])
const loadingVehiculos = ref(false)
const savingConfig = ref(false)
const successMsg = ref<string | null>(null)

// Configuración de la Web
const configWeb = ref({
  tema_color: 'emerald',
  texto_hero: 'Encuentra tu próximo auto hoy',
  subtitulo: 'Vehículos garantizados con la mejor financiación del mercado.',
  contacto_email: 'contacto@comoauto.com',
  contacto_telefono: '+54 9 341 555-1234',
  contacto_direccion: 'Av. Pellegrini 1500, Rosario',
  dominio_personalizado: 'concesionariarosario.com',
  mostrar_stock: true
})

// Simulación de búsqueda de dominios
const domainSearchQuery = ref('')
const domainStatus = ref<'idle' | 'searching' | 'available' | 'taken'>('idle')
const domainSuggestions = ref<string[]>([])

onMounted(async () => {
  await loadAgenciaConfig()
  await loadVehiculos()
})

const loadAgenciaConfig = async () => {
  if (authStore.isDemoMode || !authStore.agencia) return
  
  try {
    const { data, error } = await supabase
      .from('agencias')
      .select('config_web')
      .eq('id', authStore.activeAgenciaId)
      .single()
      
    if (error) throw error
    if (data && data.config_web) {
      configWeb.value = {
        ...configWeb.value,
        ...data.config_web
      }
    }
  } catch (err) {
    console.error('Error al cargar config web de agencia:', err)
  }
}

const loadVehiculos = async () => {
  loadingVehiculos.value = true
  if (authStore.isDemoMode) {
    vehiculos.value = [
      { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000 },
      { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000 },
      { id: '3', marca: 'Fiat', modelo: 'Cronos 1.3 Drive', anio: 2021, precio: 3900000 }
    ]
    loadingVehiculos.value = false
  } else {
    try {
      const { data } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
        .eq('estado', 'disponible')
        .limit(3) // Mostrar solo 3 en la preview
      if (data) vehiculos.value = data
    } catch (err) {
      console.error('Error al cargar vehículos para preview web:', err)
    } finally {
      loadingVehiculos.value = false
    }
  }
}

// Guardar Configuración Web
const handleSaveConfig = async () => {
  savingConfig.value = true
  successMsg.value = null
  
  if (authStore.isDemoMode) {
    setTimeout(() => {
      savingConfig.value = false
      showSuccess('Configuración web guardada localmente (Demo)')
    }, 1000)
  } else {
    try {
      const { error } = await supabase
        .from('agencias')
        .update({
          config_web: configWeb.value
        })
        .eq('id', authStore.activeAgenciaId)
        
      if (error) throw error
      showSuccess('¡Sitio web público actualizado en tiempo real!')
    } catch (err: any) {
      console.error('Error al guardar configuración web:', err.message)
    } finally {
      savingConfig.value = false
    }
  }
}

const showSuccess = (msg: string) => {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = null }, 3500)
}

// Buscar disponibilidad de dominios (Simulado)
const handleSearchDomain = () => {
  if (!domainSearchQuery.value.trim()) return
  domainStatus.value = 'searching'
  
  setTimeout(() => {
    const query = domainSearchQuery.value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const extensions = ['.com.ar', '.com', '.net', '.ar']
    
    // Determinar disponibilidad basada en la longitud
    const isAvailable = query.length > 5
    domainStatus.value = isAvailable ? 'available' : 'taken'
    
    domainSuggestions.value = extensions.map(ext => `${query}${ext}`)
  }, 1200)
}

// Formateador
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
          <Globe class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Creador de Página Web</h1>
          <p class="text-slate-400 text-sm mt-0.5">Diseña, edita y publica el sitio web público para tus clientes al instante</p>
        </div>
      </div>
    </div>

    <!-- Mensaje de éxito -->
    <div v-if="successMsg" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
      <Check class="w-5 h-5 shrink-0" />
      <span>{{ successMsg }}</span>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Panel de Control y Configuración (Izquierda - 5/12) -->
      <div class="lg:col-span-5 space-y-6">
        
        <!-- Editor de Contenido -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div class="flex justify-between items-center">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <Settings class="w-4 h-4 text-emerald-400" />
              <span>Diseño & Textos</span>
            </h2>
            
            <button 
              @click="handleSaveConfig"
              :disabled="savingConfig"
              class="px-3.5 py-1.5 rounded-xl btn-gradient text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Save class="w-3.5 h-3.5 text-slate-950" />
              <span>Publicar Web</span>
            </button>
          </div>

          <!-- Selector de Temas -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paleta de Colores</label>
            <div class="grid grid-cols-4 gap-2">
              <button 
                v-for="color in ['emerald', 'blue', 'orange', 'slate']"
                :key="color"
                @click="configWeb.tema_color = color"
                :class="[
                  'py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold capitalize transition-all cursor-pointer',
                  configWeb.tema_color === color ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                ]"
              >
                <span 
                  :class="[
                    'w-4 h-4 rounded-full',
                    color === 'emerald' ? 'bg-emerald-500' :
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'orange' ? 'bg-orange-500' : 'bg-slate-400'
                  ]"
                ></span>
                <span>{{ color }}</span>
              </button>
            </div>
          </div>

          <!-- Título Hero -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título de Bienvenida (Hero)</label>
            <input 
              v-model="configWeb.texto_hero"
              type="text"
              class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
            />
          </div>

          <!-- Subtítulo -->
          <div class="space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtítulo Descriptivo</label>
            <textarea 
              v-model="configWeb.subtitulo"
              rows="2"
              class="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-350 text-xs transition-all"
            ></textarea>
          </div>

          <!-- Datos de Contacto -->
          <div class="space-y-3 pt-2 border-t border-slate-800/60">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Información de Contacto</label>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="block text-[9px] text-slate-500 font-semibold mb-1">WhatsApp</span>
                <input v-model="configWeb.contacto_telefono" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <span class="block text-[9px] text-slate-500 font-semibold mb-1">Email</span>
                <input v-model="configWeb.contacto_email" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div>
              <span class="block text-[9px] text-slate-500 font-semibold mb-1">Dirección Física</span>
              <input v-model="configWeb.contacto_direccion" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Mostrar Stock Toggle -->
          <div class="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl">
            <div>
              <p class="text-xs font-semibold text-slate-200">Mostrar Inventario en Vivo</p>
              <p class="text-[10px] text-slate-500">Muestra los vehículos disponibles de Supabase automáticamente</p>
            </div>
            <div 
              @click="configWeb.mostrar_stock = !configWeb.mostrar_stock"
              :class="[
                'w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer',
                configWeb.mostrar_stock ? 'bg-emerald-500' : 'bg-slate-850 border border-slate-700'
              ]"
            >
              <div 
                :class="[
                  'w-5 h-5 rounded-full bg-slate-950 transition-all duration-300 shadow-md transform',
                  configWeb.mostrar_stock ? 'translate-x-5' : 'translate-x-0'
                ]"
              ></div>
            </div>
          </div>
        </div>

        <!-- Búsqueda y Configuración de Dominios -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <Server class="w-4 h-4 text-emerald-400" />
            <span>Dominio & Conexión</span>
          </h2>
          <p class="text-slate-400 text-xs leading-relaxed">
            Busca y configura tu dominio personalizado (ej. `mi-agencia.com`) de forma sencilla.
          </p>

          <!-- Input Búsqueda -->
          <div class="relative">
            <input 
              v-model="domainSearchQuery"
              @keyup.enter="handleSearchDomain"
              type="text"
              placeholder="Ej: autosrosario"
              class="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-200 text-xs transition-all"
            />
            <button 
              @click="handleSearchDomain"
              class="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-white rounded-lg cursor-pointer"
            >
              <Search class="w-4 h-4" />
            </button>
          </div>

          <!-- Respuesta disponibilidad -->
          <div v-if="domainStatus === 'searching'" class="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>Verificando disponibilidad de dominios...</span>
          </div>

          <div v-else-if="domainStatus === 'available'" class="space-y-2">
            <p class="text-emerald-400 text-xs font-bold">✓ ¡Dominio disponible para registrar!</p>
            <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <a 
                v-for="sug in domainSuggestions" 
                :key="sug"
                href="https://donweb.com/" 
                target="_blank"
                class="p-2 bg-slate-950 border border-slate-850 hover:border-emerald-500/40 rounded-lg flex justify-between items-center group transition-all"
              >
                <span class="group-hover:text-emerald-400 truncate">{{ sug }}</span>
                <ExternalLink class="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </a>
            </div>
          </div>
          
          <div v-else-if="domainStatus === 'taken'" class="text-xs text-rose-400 font-semibold">
            ✕ El dominio ya está registrado por otra entidad.
          </div>

          <!-- DNS Config Info -->
          <div class="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] text-slate-400 space-y-2 font-mono">
            <p class="font-bold text-slate-300">Configuración DNS en tu Registrador:</p>
            <div class="border-t border-slate-900 pt-2 space-y-1">
              <p><span class="text-cyan-400">Tipo:</span> A  |  <span class="text-cyan-400">Nombre:</span> @  |  <span class="text-emerald-400">Valor:</span> 76.76.21.21</p>
              <p><span class="text-cyan-400">Tipo:</span> CNAME | <span class="text-cyan-400">Nombre:</span> www | <span class="text-emerald-400">Valor:</span> cname.vercel-dns.com</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Previsualizador de Página Web en Vivo (Derecha - 7/12) -->
      <div class="lg:col-span-7">
        <div class="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[600px] shadow-2xl">
          <!-- Barra superior del previsualizador (Estilo Browser) -->
          <div class="bg-slate-950 px-4 py-2 border-b border-slate-900 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-rose-500/70"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/70"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/70"></span>
            </div>
            
            <div class="bg-slate-900 border border-slate-800 rounded-lg px-6 py-1 text-slate-400 text-[10px] tracking-wide select-none min-w-[250px] text-center truncate">
              https://{{ configWeb.dominio_personalizado || 'tu-agencia.comoauto.site' }}
            </div>
            
            <span class="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 select-none">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En Vivo
            </span>
          </div>

          <!-- CONTENIDO PREVISUALIZADOR EN VIVO (MOCK SITIO PÚBLICO) -->
          <div class="flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans relative">
            
            <!-- Navbar de la Web pública -->
            <header class="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
              <div class="flex items-center gap-2">
                <div 
                  :class="[
                    'p-1.5 rounded-lg text-slate-950',
                    configWeb.tema_color === 'emerald' ? 'bg-emerald-500' :
                    configWeb.tema_color === 'blue' ? 'bg-blue-500' :
                    configWeb.tema_color === 'orange' ? 'bg-orange-500' : 'bg-slate-400'
                  ]"
                >
                  <Car class="w-4 h-4 text-slate-950" />
                </div>
                <span class="font-bold text-sm tracking-wider">{{ authStore.agencia?.nombre || 'Mi Concesionario' }}</span>
              </div>
              
              <nav class="flex gap-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span class="hover:text-white transition-colors cursor-pointer">Inicio</span>
                <span class="hover:text-white transition-colors cursor-pointer">Stock</span>
                <span class="hover:text-white transition-colors cursor-pointer">Contacto</span>
              </nav>
            </header>

            <!-- Sección Hero de la Web pública -->
            <section class="py-12 px-6 text-center bg-gradient-to-b from-slate-900/50 to-slate-950 relative overflow-hidden flex flex-col items-center justify-center flex-1">
              <!-- Glow decorativo dinámico -->
              <div 
                :class="[
                  'absolute -top-[10%] w-[40%] h-[30%] rounded-full blur-[80px] opacity-20 pointer-events-none',
                  configWeb.tema_color === 'emerald' ? 'bg-emerald-500' :
                  configWeb.tema_color === 'blue' ? 'bg-blue-500' :
                  configWeb.tema_color === 'orange' ? 'bg-orange-500' : 'bg-slate-400'
                ]"
              ></div>

              <h2 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight max-w-lg leading-tight font-sans">
                {{ configWeb.texto_hero }}
              </h2>
              <p class="text-slate-400 text-xs max-w-md mt-3 font-normal leading-relaxed">
                {{ configWeb.subtitulo }}
              </p>
              
              <button 
                :class="[
                  'mt-6 px-5 py-2.5 rounded-lg text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg cursor-pointer',
                  configWeb.tema_color === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-400' :
                  configWeb.tema_color === 'blue' ? 'bg-blue-500 hover:bg-blue-400' :
                  configWeb.tema_color === 'orange' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-slate-300 hover:bg-white'
                ]"
              >
                Ver Catálogo Completo
              </button>
            </section>

            <!-- Sección Stock Destacado de la Web pública -->
            <section v-if="configWeb.mostrar_stock" class="py-8 px-6 border-t border-slate-900 bg-slate-950 flex-1">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6">Últimos Ingresos</h3>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  v-for="veh in vehiculos" 
                  :key="veh.id"
                  class="bg-slate-900/60 border border-slate-900 rounded-xl overflow-hidden p-4 flex flex-col gap-2 shadow"
                >
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="text-[10px] font-bold uppercase" :class="[
                        configWeb.tema_color === 'emerald' ? 'text-emerald-400' :
                        configWeb.tema_color === 'blue' ? 'text-blue-400' :
                        configWeb.tema_color === 'orange' ? 'text-orange-400' : 'text-slate-300'
                      ]">{{ veh.marca }}</p>
                      <h4 class="font-bold text-white text-xs truncate max-w-[100px]">{{ veh.modelo }}</h4>
                    </div>
                    <span class="text-[9px] text-slate-500 font-semibold">Año {{ veh.anio }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center border-t border-slate-850/60 pt-2 mt-1">
                    <span class="text-xs font-bold text-white">{{ formatMoneda(veh.precio) }}</span>
                    <span class="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-semibold cursor-pointer">
                      Ver Ficha
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Footer de la Web pública -->
            <footer class="p-6 border-t border-slate-900 bg-slate-950 mt-auto text-[10px] text-slate-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div class="space-y-1.5">
                <p class="font-bold text-slate-400">{{ authStore.agencia?.nombre || 'Mi Concesionario' }}</p>
                <p class="flex items-center gap-1.5"><MapPin class="w-3 h-3 text-slate-600" /> {{ configWeb.contacto_direccion }}</p>
              </div>
              <div class="space-y-1">
                <p class="flex items-center gap-1.5"><Phone class="w-3 h-3 text-slate-600" /> {{ configWeb.contacto_telefono }}</p>
                <p class="flex items-center gap-1.5"><Mail class="w-3 h-3 text-slate-600" /> {{ configWeb.contacto_email }}</p>
              </div>
            </footer>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
