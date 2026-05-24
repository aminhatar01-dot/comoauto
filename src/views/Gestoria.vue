<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FolderEdit, 
  Save, 
  DollarSign,
  Car,
  Clock,
  RefreshCw
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados locales
const tramites = ref<any[]>([])
const loading = ref(false)
const selectedTramite = ref<any | null>(null)
const updatingTramite = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Checklist de documentos base
const docLabels: Record<string, string> = {
  titulo: 'Título Digital del Automotor',
  cedula_verde: 'Cédula de Identificación (Verde)',
  f08: 'Formulario 08 Firmado y Legalizado',
  verificacion_policial: 'F12 (Verificación Policial Vigente)',
  libre_deuda: 'Libre Deuda de Multas e Impuestos'
}

onMounted(async () => {
  await loadTramites()
})

const loadTramites = async () => {
  loading.value = true
  if (authStore.isDemoMode) {
    // Datos simulados en Modo Demo
    tramites.value = [
      {
        id: 'tramite-1',
        vehiculo_id: '1',
        estado_tramite: 'en_proceso',
        costo_transferencia: 180000,
        checklist_documentos: {
          titulo: true,
          cedula_verde: true,
          f08: false,
          verificacion_policial: true,
          libre_deuda: false
        },
        vehiculos: {
          marca: 'Ford',
          modelo: 'Focus III 2.0 SE',
          anio: 2017,
          precio: 3400000,
          kilometraje: 89000
        }
      },
      {
        id: 'tramite-2',
        vehiculo_id: '2',
        estado_tramite: 'pendiente',
        costo_transferencia: 245000,
        checklist_documentos: {
          titulo: false,
          cedula_verde: false,
          f08: false,
          verificacion_policial: false,
          libre_deuda: false
        },
        vehiculos: {
          marca: 'Volkswagen',
          modelo: 'Vento 2.0 TSI Sportline',
          anio: 2016,
          precio: 4950000,
          kilometraje: 110000
        }
      },
      {
        id: 'tramite-3',
        vehiculo_id: '3',
        estado_tramite: 'finalizado',
        costo_transferencia: 140000,
        checklist_documentos: {
          titulo: true,
          cedula_verde: true,
          f08: true,
          verificacion_policial: true,
          libre_deuda: true
        },
        vehiculos: {
          marca: 'Renault',
          modelo: 'Sandero Stepway 1.6',
          anio: 2018,
          precio: 2900000,
          kilometraje: 76000
        }
      }
    ]
    if (tramites.value.length > 0 && !selectedTramite.value) {
      selectedTramite.value = tramites.value[0]
    }
    loading.value = false
  } else {
    try {
      // En modo real, hacemos un join de tramites_gestoria con vehiculos
      const { data, error } = await supabase
        .from('tramites_gestoria')
        .select(`
          id,
          vehiculo_id,
          estado_tramite,
          checklist_documentos,
          costo_transferencia,
          vehiculos (
            marca,
            modelo,
            anio,
            precio,
            kilometraje,
            agencia_id
          )
        `)
      
      if (error) throw error
      if (data) {
        // Filtrar trámites que pertenecen a la agencia del usuario
        const filtered = data.filter((t: any) => t.vehiculos?.agencia_id === authStore.activeAgenciaId)
        tramites.value = filtered
        if (filtered.length > 0 && !selectedTramite.value) {
          selectedTramite.value = filtered[0]
        }
      }
    } catch (err: any) {
      console.error('Error al cargar trámites:', err.message)
    } finally {
      loading.value = false
    }
  }
}

// Calcular progreso basado en el checklist
const calcularProgreso = (checklist: Record<string, boolean>) => {
  const keys = Object.keys(checklist)
  if (keys.length === 0) return 0
  const completed = keys.filter(k => checklist[k]).length
  return Math.round((completed / keys.length) * 100)
}

// Alternar switch del checklist
const toggleDoc = async (docKey: string) => {
  if (!selectedTramite.value) return
  
  // Cambiar localmente
  const prevVal = selectedTramite.value.checklist_documentos[docKey]
  selectedTramite.value.checklist_documentos[docKey] = !prevVal
  
  // Recalcular estado del trámite automáticamente
  const prog = calcularProgreso(selectedTramite.value.checklist_documentos)
  if (prog === 100) {
    selectedTramite.value.estado_tramite = 'finalizado'
  } else if (prog > 0) {
    selectedTramite.value.estado_tramite = 'en_proceso'
  } else {
    selectedTramite.value.estado_tramite = 'pendiente'
  }

  // Guardar cambios en base de datos o simular en modo demo
  await handleSaveTramite()
}

// Guardar los datos del trámite
const handleSaveTramite = async () => {
  if (!selectedTramite.value) return
  updatingTramite.value = selectedTramite.value.id
  successMsg.value = null

  if (authStore.isDemoMode) {
    setTimeout(() => {
      updatingTramite.value = null
      successMsg.value = 'Trámite actualizado correctamente (Demo)'
      setTimeout(() => { successMsg.value = null }, 3000)
    }, 800)
  } else {
    try {
      const { error } = await supabase
        .from('tramites_gestoria')
        .update({
          checklist_documentos: selectedTramite.value.checklist_documentos,
          estado_tramite: selectedTramite.value.estado_tramite,
          costo_transferencia: selectedTramite.value.costo_transferencia
        })
        .eq('id', selectedTramite.value.id)
      
      if (error) throw error
      successMsg.value = '¡Cambios sincronizados en la nube!'
      setTimeout(() => { successMsg.value = null }, 3000)
    } catch (err: any) {
      console.error('Error al guardar trámite:', err.message)
    } finally {
      updatingTramite.value = null
    }
  }
}

const selectTramite = (t: any) => {
  selectedTramite.value = t
}

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
          <FileText class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Gestoría & Trámites</h1>
          <p class="text-slate-400 text-sm mt-0.5">Control de documentación y gestoría para transferencias de stock</p>
        </div>
      </div>
      
      <button 
        @click="loadTramites"
        class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        title="Refrescar trámites"
      >
        <RefreshCw class="w-5 h-5" />
      </button>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Listado de Trámites en Curso (Izquierda - 5/12) -->
      <div class="lg:col-span-5 space-y-4">
        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Carpetas en Curso</h3>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="tramites.length === 0" class="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-slate-600 text-sm">
          No hay carpetas de gestoría creadas.
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="t in tramites" 
            :key="t.id"
            @click="selectTramite(t)"
            :class="[
              'p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 relative overflow-hidden',
              selectedTramite?.id === t.id ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            ]"
          >
            <!-- Barra lateral indicadora de estado -->
            <div 
              :class="[
                'absolute left-0 top-0 bottom-0 w-1',
                t.estado_tramite === 'finalizado' ? 'bg-emerald-500' :
                t.estado_tramite === 'en_proceso' ? 'bg-cyan-500' : 'bg-amber-500'
              ]"
            ></div>

            <div class="pl-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-100 text-sm">{{ t.vehiculos?.marca }} {{ t.vehiculos?.modelo }}</span>
                <span 
                  :class="[
                    'text-[9px] px-2 py-0.5 rounded font-extrabold uppercase',
                    t.estado_tramite === 'finalizado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    t.estado_tramite === 'en_proceso' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  ]"
                >
                  {{ t.estado_tramite.replace('_', ' ') }}
                </span>
              </div>

              <!-- Fila Info del Trámite -->
              <div class="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                <span class="flex items-center gap-1"><Car class="w-3.5 h-3.5 text-slate-500" /> Año {{ t.vehiculos?.anio }}</span>
                <span>Costo: {{ formatMoneda(t.costo_transferencia) }}</span>
              </div>

              <!-- Progreso Visual -->
              <div class="mt-3">
                <div class="flex justify-between text-[10px] font-semibold mb-1">
                  <span class="text-slate-400">Documentación</span>
                  <span :class="calcularProgreso(t.checklist_documentos) === 100 ? 'text-emerald-400' : 'text-slate-300'">
                    {{ calcularProgreso(t.checklist_documentos) }}%
                  </span>
                </div>
                <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div 
                    :class="[
                      'h-full rounded-full transition-all duration-500',
                      t.estado_tramite === 'finalizado' ? 'bg-emerald-500' :
                      t.estado_tramite === 'en_proceso' ? 'bg-cyan-500' : 'bg-amber-500'
                    ]"
                    :style="{ width: calcularProgreso(t.checklist_documentos) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalle de la Carpeta y Checklist Interactivo (Derecha - 7/12) -->
      <div class="lg:col-span-7">
        <div v-if="selectedTramite" class="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6 flex flex-col justify-between min-h-[500px]">
          
          <!-- Cabecera de la Carpeta -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 class="text-2xl font-bold text-white">{{ selectedTramite.vehiculos?.marca }} {{ selectedTramite.vehiculos?.modelo }}</h2>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5" /> Estado del trámite: 
                <span class="capitalize text-emerald-400 font-bold">{{ selectedTramite.estado_tramite.replace('_', ' ') }}</span>
              </p>
            </div>

            <!-- Botón de Sincronización Manual (Opcional, ya que es auto-sincronizado) -->
            <button 
              @click="handleSaveTramite"
              :disabled="updatingTramite === selectedTramite.id"
              class="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer flex items-center gap-2"
            >
              <span v-if="updatingTramite === selectedTramite.id" class="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <Save v-else class="w-4 h-4 text-emerald-400" />
              <span>Guardar Trámite</span>
            </button>
          </div>

          <!-- Mensaje de éxito de sincronización -->
          <Transition name="fade">
            <div v-if="successMsg" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              <span>{{ successMsg }}</span>
            </div>
          </Transition>

          <!-- Input Costo de Transferencia -->
          <div class="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Costo Estimado de Transferencia (ARS)</label>
            <div class="relative max-w-xs">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <DollarSign class="w-4 h-4" />
              </span>
              <input 
                v-model.number="selectedTramite.costo_transferencia" 
                type="number"
                class="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-100 text-sm font-semibold transition-all"
              />
            </div>
          </div>

          <!-- Checklist de Documentos con Switches Animados -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Checklist de Documentación de Transferencia</h3>
            
            <div class="space-y-2.5">
              <div 
                v-for="(label, key) in docLabels" 
                :key="key"
                @click="toggleDoc(key)"
                class="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div class="flex items-center gap-3">
                  <div 
                    :class="[
                      'p-2 rounded-lg transition-all',
                      selectedTramite.checklist_documentos[key] 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-slate-950 text-slate-600'
                    ]"
                  >
                    <CheckCircle2 v-if="selectedTramite.checklist_documentos[key]" class="w-4 h-4" />
                    <HelpCircle v-else class="w-4 h-4" />
                  </div>
                  <span 
                    :class="[
                      'text-sm font-semibold transition-all',
                      selectedTramite.checklist_documentos[key] ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-300'
                    ]"
                  >
                    {{ label }}
                  </span>
                </div>

                <!-- Control Switch Estilizado -->
                <div 
                  :class="[
                    'w-11 h-6 rounded-full p-0.5 transition-all duration-300',
                    selectedTramite.checklist_documentos[key] ? 'bg-emerald-500' : 'bg-slate-850 border border-slate-700'
                  ]"
                >
                  <div 
                    :class="[
                      'w-5 h-5 rounded-full bg-slate-950 transition-all duration-300 shadow-md transform',
                      selectedTramite.checklist_documentos[key] ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-600'
                    ]"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Progreso General en el pie -->
          <div class="border-t border-slate-800 pt-5 flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Progreso Total:</span>
              <span class="text-white font-extrabold text-lg">
                {{ calcularProgreso(selectedTramite.checklist_documentos) }}%
              </span>
            </div>
            
            <div v-if="calcularProgreso(selectedTramite.checklist_documentos) === 100" class="flex items-center gap-1.5 text-emerald-400 font-bold animate-float">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              <span>¡Listo para transferir!</span>
            </div>
            <div v-else class="text-slate-500 font-semibold text-xs flex items-center gap-1.5">
              <AlertCircle class="w-4 h-4 text-slate-500" />
              <span>Falta documentación</span>
            </div>
          </div>

        </div>

        <div v-else class="glass-panel rounded-2xl border border-slate-800 p-8 text-center text-slate-500 min-h-[500px] flex flex-col items-center justify-center">
          <FolderEdit class="w-12 h-12 text-slate-700 mb-3 animate-bounce" />
          <p>Selecciona una carpeta del stock para inspeccionar y marcar el checklist de gestoría.</p>
        </div>
      </div>

    </div>
  </div>
</template>
