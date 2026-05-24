<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  Bot, 
  MessageSquare, 
  Car, 
  Phone, 
  Sparkles,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados locales
const leads = ref<any[]>([])
const loading = ref(false)
const rawSocialText = ref('')
const selectedLead = ref<any | null>(null)
const processingBot = ref(false)
const sendingWhatsApp = ref<string | null>(null)

// Lista de vehículos disponibles de la agencia para simular cotizaciones
const vehiculosAgencia = ref<any[]>([
  { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000 },
  { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000 },
  { id: '3', marca: 'Fiat', modelo: 'Cronos 1.3 Drive', anio: 2021, precio: 3900000 },
  { id: '4', marca: 'Toyota', modelo: 'Corolla 1.8 SEG', anio: 2018, precio: 5400000 }
])

onMounted(async () => {
  await loadLeads()
  await loadVehiculos()
})

const loadVehiculos = async () => {
  if (authStore.isDemoMode) return
  try {
    const { data } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('agencia_id', authStore.activeAgenciaId)
      .eq('estado', 'disponible')
    if (data && data.length > 0) vehiculosAgencia.value = data
  } catch (err) {
    console.error('Error al cargar vehículos:', err)
  }
}

const loadLeads = async () => {
  loading.value = true
  if (authStore.isDemoMode) {
    // Cargar leads simulados
    leads.value = [
      {
        id: 'lead-1',
        nombre_cliente: 'Juan Ignacio Díaz',
        telefono_whatsapp: '+5491134567890',
        estado_lead: 'nuevo',
        auto_interes: 'Ford Focus 2017',
        historial_conversacion: [
          { emisor: 'cliente', mensaje: 'Hola, vi la publicación del Focus en Facebook. ¿Sigue disponible?', fecha: new Date(Date.now() - 7200000).toISOString() }
        ],
        fecha_creacion: new Date(Date.now() - 7200000).toISOString(),
        clasificacion: 'Caliente'
      },
      {
        id: 'lead-2',
        nombre_cliente: 'María Belén Gómez',
        telefono_whatsapp: '+5493412345678',
        estado_lead: 'en_contacto',
        auto_interes: 'Fiat Cronos',
        historial_conversacion: [
          { emisor: 'cliente', mensaje: 'Hola! Tienen planes de financiación para el Cronos?', fecha: new Date(Date.now() - 86400000).toISOString() },
          { emisor: 'bot', mensaje: '¡Hola María! Sí, contamos con financiación pre-aprobada con DNI de hasta el 50% del valor del Fiat Cronos. ¿Te gustaría simular tu cuota?', fecha: new Date(Date.now() - 86000000).toISOString() }
        ],
        fecha_creacion: new Date(Date.now() - 86400000).toISOString(),
        clasificacion: 'Tibio'
      },
      {
        id: 'lead-3',
        nombre_cliente: 'Roberto Sánchez',
        telefono_whatsapp: '+5492619876543',
        estado_lead: 'interesado',
        auto_interes: 'Toyota Corolla',
        historial_conversacion: [
          { emisor: 'cliente', mensaje: 'Hola, tomás permuta? Tengo un Gol Trend 2015 impecable para entregar por el Corolla.', fecha: new Date(Date.now() - 172800000).toISOString() },
          { emisor: 'bot', mensaje: '¡Hola Roberto! Sí, tomamos vehículos usados llave contra llave. El departamento de tasación ya está al tanto. ¿A qué hora te queda cómodo que te llamemos?', fecha: new Date(Date.now() - 172000000).toISOString() },
          { emisor: 'cliente', mensaje: 'Mañana por la mañana tipo 10 am me viene genial.', fecha: new Date(Date.now() - 171500000).toISOString() }
        ],
        fecha_creacion: new Date(Date.now() - 172800000).toISOString(),
        clasificacion: 'Caliente'
      }
    ]
    if (leads.value.length > 0 && !selectedLead.value) {
      selectedLead.value = leads.value[0]
    }
    loading.value = false
  } else {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
        .order('fecha_creacion', { ascending: false })
      
      if (error) throw error
      if (data) {
        // Mapear clasificación basada en el historial en modo online
        leads.value = data.map(item => {
          let clasif = 'Tibio'
          const histStr = JSON.stringify(item.historial_conversacion)
          if (histStr.includes('precio') || histStr.includes('comprar') || histStr.includes('permuta')) {
            clasif = 'Caliente'
          } else if (histStr.includes('no gracias') || histStr.includes('mas adelante')) {
            clasif = 'Frio'
          }
          
          // Buscar auto de interés en el mensaje si no está explícito
          let auto = 'Indeterminado'
          for (const v of vehiculosAgencia.value) {
            if (histStr.toLowerCase().includes(v.marca.toLowerCase()) || histStr.toLowerCase().includes(v.modelo.toLowerCase())) {
              auto = `${v.marca} ${v.modelo}`
              break
            }
          }

          return { ...item, clasificacion: clasif, auto_interes: auto }
        })
        if (leads.value.length > 0 && !selectedLead.value) {
          selectedLead.value = leads.value[0]
        }
      }
    } catch (err: any) {
      console.error('Error al cargar leads reales:', err.message)
    } finally {
      loading.value = false
    }
  }
}

// Bot Cazador: Procesar entrada de red social localmente o mediante la API
const handleHuntLead = async () => {
  if (!rawSocialText.value.trim()) return
  processingBot.value = true
  
  if (authStore.isDemoMode) {
    // Simular procesamiento del bot
    setTimeout(() => {
      // Intentar extraer nombre
      const nameMatch = rawSocialText.value.match(/(?:soy|nombre es|me llamo)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||
                        rawSocialText.value.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/)
      const nombre = nameMatch ? nameMatch[1] : 'Cliente Extraído'
      
      // Intentar extraer teléfono
      const telMatch = rawSocialText.value.match(/(\+?\d{2,4}\s?\d{3,4}[-\s]?\d{4})/g)
      const tel = telMatch ? telMatch[0] : '+54911' + Math.floor(10000000 + Math.random() * 90000000)

      // Determinar vehículo de interés
      let auto = 'Ford Focus 2017'
      for (const v of vehiculosAgencia.value) {
        if (rawSocialText.value.toLowerCase().includes(v.marca.toLowerCase()) || rawSocialText.value.toLowerCase().includes(v.modelo.toLowerCase())) {
          auto = `${v.marca} ${v.modelo}`
          break
        }
      }

      const nuevoLead = {
        id: 'lead-' + Date.now(),
        nombre_cliente: nombre,
        telefono_whatsapp: tel,
        estado_lead: 'nuevo',
        auto_interes: auto,
        historial_conversacion: [
          { emisor: 'cliente', mensaje: rawSocialText.value, fecha: new Date().toISOString() }
        ],
        fecha_creacion: new Date().toISOString(),
        clasificacion: rawSocialText.value.toLowerCase().includes('comprar') || rawSocialText.value.toLowerCase().includes('precio') ? 'Caliente' : 'Tibio'
      }

      leads.value.unshift(nuevoLead)
      selectedLead.value = nuevoLead
      rawSocialText.value = ''
      processingBot.value = false
    }, 1500)
  } else {
    // LLAMADA AL ENDPOINT REAL /api/bot/hunt
    try {
      const response = await fetch('/api/bot/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawSocialText.value,
          agencia_id: authStore.activeAgenciaId
        })
      })
      const result = await response.json()
      if (result.success) {
        await loadLeads()
        rawSocialText.value = ''
      }
    } catch (err: any) {
      console.error('Error al invocar API de bot hunt:', err)
    } finally {
      processingBot.value = false
    }
  }
}

// Iniciar contacto automático por WhatsApp (Integración Webhook simulada)
const handleStartWhatsApp = async (lead: any) => {
  sendingWhatsApp.value = lead.id
  
  if (authStore.isDemoMode) {
    // Simular webhook y despacho de ficha por WhatsApp
    setTimeout(() => {
      lead.estado_lead = 'en_contacto'
      const autoObj = vehiculosAgencia.value.find(v => lead.auto_interes.toLowerCase().includes(v.modelo.toLowerCase())) || vehiculosAgencia.value[0]
      
      const mensajeBot = `¡Hola ${lead.nombre_cliente}! 🤖 Te escribo de ComoAuto. Vimos tu interés en el *${lead.auto_interes}*. Te adjunto la ficha técnica: Precio: $${autoObj.precio.toLocaleString()} ARS. ¿Te interesaría venir a verlo o hacer un test drive?`
      
      lead.historial_conversacion.push({
        emisor: 'bot',
        mensaje: mensajeBot,
        fecha: new Date().toISOString()
      })
      
      sendingWhatsApp.value = null
      
      // Simular una respuesta del cliente al cabo de 6 segundos
      setTimeout(() => {
        lead.historial_conversacion.push({
          emisor: 'cliente',
          mensaje: 'Dale genial! El sábado por la mañana puedo ir a verlo? Qué dirección tienen?',
          fecha: new Date().toISOString()
        })
        lead.clasificacion = 'Caliente'
        lead.estado_lead = 'interesado'
      }, 6000)

    }, 2000)
  } else {
    try {
      // Envío real llamando a API Serverless
      const response = await fetch('/api/bot/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          nombre_cliente: lead.nombre_cliente,
          telefono_whatsapp: lead.telefono_whatsapp,
          auto_interes: lead.auto_interes
        })
      })
      const result = await response.json()
      if (result.success) {
        await loadLeads()
      }
    } catch (err) {
      console.error('Error al despachar mensaje de WhatsApp:', err)
    } finally {
      sendingWhatsApp.value = null
    }
  }
}

const selectLead = (lead: any) => {
  selectedLead.value = lead
}

const formatFecha = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-8 relative">
    
    <!-- Encabezado de la página -->
    <div class="flex justify-between items-center border-b border-slate-800 pb-5">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Bot class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Cazador de Leads</h1>
          <p class="text-slate-400 text-sm mt-0.5">Captura semántica de clientes en redes sociales y automatización por WhatsApp</p>
        </div>
      </div>
      
      <button 
        @click="loadLeads"
        class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        title="Refrescar lista"
      >
        <RefreshCw class="w-5 h-5" />
      </button>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Panel de Control y Captura (Izquierda - 4/12) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- Tarjeta Ingesta del Bot -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-2 text-emerald-400 font-bold">
            <Sparkles class="w-5 h-5 text-emerald-400 animate-pulse" />
            <span>Simulador de Ingesta (Redes)</span>
          </div>
          <p class="text-slate-400 text-xs">
            Ingresa comentarios de Facebook, Instagram o Twitter para que la IA extraiga el lead, el vehículo de interés y el teléfono.
          </p>

          <div class="space-y-3">
            <textarea 
              v-model="rawSocialText"
              rows="5"
              placeholder="Ej: Hola! Me llamo Eduardo Romero, vi el Focus 2017 que publicaron. Quería saber si lo tienen todavía, mi celular es 11 5849-2365."
              class="w-full p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-200 placeholder:text-slate-600 text-sm"
            ></textarea>
            
            <button 
              @click="handleHuntLead"
              :disabled="processingBot || !rawSocialText.trim()"
              class="w-full py-3 rounded-xl font-bold btn-gradient text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span v-if="processingBot" class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              <span v-else class="flex items-center gap-1.5">
                <Bot class="w-4 h-4" />
                Clasificar & Cazar Lead
              </span>
            </button>
          </div>
        </div>

        <!-- Lista de Leads Capturados -->
        <div class="space-y-3">
          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Leads en Bandeja</h3>
          
          <div v-if="loading" class="flex justify-center py-10">
            <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <div v-else-if="leads.length === 0" class="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-slate-600 text-sm">
            No se han registrado leads aún.
          </div>

          <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            <div 
              v-for="lead in leads" 
              :key="lead.id"
              @click="selectLead(lead)"
              :class="[
                'p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative overflow-hidden',
                selectedLead?.id === lead.id ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-100 text-sm">{{ lead.nombre_cliente }}</span>
                <span 
                  :class="[
                    'text-[9px] px-2 py-0.5 rounded font-extrabold uppercase',
                    lead.clasificacion === 'Caliente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    lead.clasificacion === 'Tibio' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  ]"
                >
                  {{ lead.clasificacion }}
                </span>
              </div>
              <p class="text-xs text-slate-400 flex items-center gap-1.5">
                <Car class="w-3.5 h-3.5 text-slate-500" />
                Interés: <span class="text-emerald-400 font-semibold">{{ lead.auto_interes }}</span>
              </p>
              <div class="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                <span>{{ lead.telefono_whatsapp }}</span>
                <span class="capitalize px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                  {{ lead.estado_lead.replace('_', ' ') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalle e Interacción del Lead (Derecha - 8/12) -->
      <div class="lg:col-span-8">
        <div v-if="selectedLead" class="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6 flex flex-col justify-between min-h-[500px]">
          
          <!-- Cabecera del Lead Seleccionado -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold text-white">{{ selectedLead.nombre_cliente }}</h2>
                <span 
                  :class="[
                    'text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider',
                    selectedLead.clasificacion === 'Caliente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' :
                    selectedLead.clasificacion === 'Tibio' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  ]"
                >
                  {{ selectedLead.clasificacion }}
                </span>
              </div>
              
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                <span class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5 text-slate-500" /> {{ selectedLead.telefono_whatsapp }}</span>
                <span>•</span>
                <span class="flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 text-slate-500" /> Capturado el {{ formatFecha(selectedLead.fecha_creacion) }}</span>
              </div>
            </div>

            <!-- Botón de Contacto por WhatsApp -->
            <button 
              @click="handleStartWhatsApp(selectedLead)"
              :disabled="sendingWhatsApp === selectedLead.id"
              :class="[
                'px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md text-sm',
                selectedLead.estado_lead === 'nuevo' 
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                  : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/30'
              ]"
            >
              <span v-if="sendingWhatsApp === selectedLead.id" class="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <MessageSquare v-else class="w-4 h-4 shrink-0" />
              <span>
                {{ selectedLead.estado_lead === 'nuevo' ? 'Iniciar contacto automático por WhatsApp' : 'Reenviar ficha técnica' }}
              </span>
            </button>
          </div>

          <!-- Historial de Chat / Conversación (JSONB) -->
          <div class="flex-1 overflow-y-auto space-y-4 my-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 max-h-[300px]">
            <div v-if="selectedLead.historial_conversacion.length === 0" class="text-center text-slate-600 text-sm py-10">
              No hay historial de chat registrado.
            </div>
            
            <div 
              v-for="(msg, index) in selectedLead.historial_conversacion" 
              :key="index"
              :class="[
                'flex flex-col max-w-[80%] p-3.5 rounded-xl text-sm relative',
                msg.emisor === 'cliente' 
                  ? 'bg-slate-900 border border-slate-800 text-slate-200 self-start mr-auto rounded-tl-none' 
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 self-end ml-auto rounded-tr-none'
              ]"
            >
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  {{ msg.emisor === 'cliente' ? 'Cliente' : 'ComoAuto Bot' }}
                </span>
                <span class="text-[8px] text-slate-500">{{ msg.fecha ? new Date(msg.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '' }}</span>
              </div>
              <p class="whitespace-pre-line leading-relaxed font-sans">{{ msg.mensaje }}</p>
            </div>
          </div>

          <!-- Pie del Panel de Interacción -->
          <div class="border-t border-slate-800 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-300">Estado de negociación:</span>
              <span class="px-2.5 py-1 bg-slate-900 border border-slate-800 text-white rounded-md uppercase font-bold text-[10px] tracking-wider">
                {{ selectedLead.estado_lead.replace('_', ' ') }}
              </span>
            </div>

            <div v-if="selectedLead.estado_lead !== 'nuevo'" class="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle class="w-4 h-4" />
              <span>Bot integrado y despachando alertas</span>
            </div>
          </div>

        </div>

        <div v-else class="glass-panel rounded-2xl border border-slate-800 p-8 text-center text-slate-500 min-h-[500px] flex flex-col items-center justify-center">
          <Bot class="w-12 h-12 text-slate-700 mb-3 animate-bounce" />
          <p>Selecciona un lead de la bandeja izquierda para ver los detalles de conversación y automatizar chats.</p>
        </div>
      </div>

    </div>
  </div>
</template>
