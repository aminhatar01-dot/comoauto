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
  RefreshCw,
  ExternalLink,
  FolderPlus,
  Sparkles,
  Plus,
  X
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados locales
const tramites = ref<any[]>([])
const loading = ref(false)
const selectedTramite = ref<any | null>(null)
const updatingTramite = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Estados para creación manual de carpetas
const showCreateModal = ref(false)
const vehiculosSinTramite = ref<any[]>([])
const selectedVehiculoId = ref('')
const nuevoClienteNombre = ref('')
const nuevoClienteDni = ref('')
const nuevoCostoTransferencia = ref(0)
const creatingFolder = ref(false)

// Checklist de documentos base
const docLabels: Record<string, string> = {
  titulo: 'Título Digital del Automotor',
  cedula_verde: 'Cédula de Identificación (Verde)',
  f08: 'Formulario 08 Firmado y Legalizado',
  verificacion_policial: 'F12 (Verificación Policial Vigente)',
  libre_deuda: 'Libre Deuda de Multas e Impuestos'
};

// Jurisdicciones del trámite en Argentina
const jurisdicciones = [
  { id: 'santa_fe', nombre: 'Santa Fe (API)' },
  { id: 'buenos_aires', nombre: 'Provincia de Buenos Aires (ARBA)' },
  { id: 'caba', nombre: 'Ciudad Autónoma de Buenos Aires (AGIP)' },
  { id: 'cordoba', nombre: 'Córdoba (Rentas Córdoba)' },
  { id: 'mendoza', nombre: 'Mendoza (ATM)' }
];
const jurisdiccionSelected = ref('santa_fe');

// Estado de subida de archivo
const uploadingDocKey = ref<string | null>(null);

// Cargar vehículos que no tienen trámite asignado
const loadVehiculosSinTramite = async () => {
  if (authStore.isDemoMode) {
    vehiculosSinTramite.value = [
      { id: 'demo-v-4', marca: 'Chevrolet', modelo: 'Cruze LTZ', anio: 2019, precio: 3800000, kilometraje: 65000 },
      { id: 'demo-v-5', marca: 'Toyota', modelo: 'Corolla XEI', anio: 2020, precio: 5200000, kilometraje: 45000 }
    ]
    return
  }

  try {
    const { data: vehs, error: errorVehs } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, anio, precio, kilometraje, estado')
      .eq('agencia_id', authStore.activeAgenciaId)
      .in('estado', ['disponible', 'reservado'])

    if (errorVehs) throw errorVehs

    const idsConTramite = tramites.value.map(t => t.vehiculo_id)
    vehiculosSinTramite.value = (vehs || []).filter((v: any) => !idsConTramite.includes(v.id))
  } catch (err: any) {
    console.error('Error al cargar vehículos sin trámite:', err.message)
  }
}

const openCreateModal = async () => {
  selectedVehiculoId.value = ''
  nuevoClienteNombre.value = ''
  nuevoClienteDni.value = ''
  nuevoCostoTransferencia.value = 0
  showCreateModal.value = true
  await loadVehiculosSinTramite()
}

const crearCarpetaGestoria = async () => {
  if (!selectedVehiculoId.value) {
    alert('Por favor selecciona un vehículo de la lista.')
    return
  }
  creatingFolder.value = true

  const veh = vehiculosSinTramite.value.find(v => v.id === selectedVehiculoId.value)
  if (!veh) {
    creatingFolder.value = false
    return
  }

  const nuevoTramite = {
    vehiculo_id: selectedVehiculoId.value,
    estado_tramite: 'pendiente',
    checklist_documentos: {
      titulo: false,
      cedula_verde: false,
      f08: false,
      verificacion_policial: false,
      libre_deuda: false
    },
    costo_transferencia: nuevoCostoTransferencia.value || 0,
    cliente_nombre: nuevoClienteNombre.value || '',
    cliente_dni: nuevoClienteDni.value || '',
    archivos_formularios: {}
  }

  if (authStore.isDemoMode) {
    const mockId = `tramite-${Date.now()}`
    const mockTramite = {
      id: mockId,
      ...nuevoTramite,
      vehiculos: {
        marca: veh.marca,
        modelo: veh.modelo,
        anio: veh.anio,
        precio: veh.precio,
        kilometraje: veh.kilometraje || 0
      }
    }
    tramites.value.push(mockTramite)
    selectedTramite.value = mockTramite
    showCreateModal.value = false
    creatingFolder.value = false
    alert('Carpeta de gestoría creada localmente en modo demo.')
  } else {
    try {
      const { data, error } = await supabase
        .from('tramites_gestoria')
        .insert([nuevoTramite])
        .select()
      
      if (error) {
        // Fallback: Si da error de columna no existente (p. ej. cliente_nombre), reintentar sin campos extendidos
        if (error.message.includes('cliente_nombre') || error.message.includes('column') || error.message.includes('does not exist')) {
          console.warn('Esquema extendido de gestoría no disponible en Supabase. Intentando esquema base.')
          const tramiteBase = {
            vehiculo_id: selectedVehiculoId.value,
            estado_tramite: 'pendiente',
            checklist_documentos: {
              titulo: false,
              cedula_verde: false,
              f08: false,
              verificacion_policial: false,
              libre_deuda: false
            },
            costo_transferencia: nuevoCostoTransferencia.value || 0
          }
          const { data: dataBase, error: errorBase } = await supabase
            .from('tramites_gestoria')
            .insert([tramiteBase])
            .select()

          if (errorBase) throw errorBase

          if (dataBase && dataBase[0]) {
            await loadTramites()
            const creado = tramites.value.find(t => t.vehiculo_id === selectedVehiculoId.value)
            if (creado) {
              selectedTramite.value = creado
            }
            showCreateModal.value = false
            alert('Carpeta de gestoría creada (Esquema Básico). Ejecuta alter_schema.sql en Supabase para habilitar campos de cliente.')
          }
        } else {
          throw error
        }
      } else if (data && data[0]) {
        await loadTramites()
        const creado = tramites.value.find(t => t.vehiculo_id === selectedVehiculoId.value)
        if (creado) {
          selectedTramite.value = creado
        }
        showCreateModal.value = false
        alert('Carpeta de gestoría creada con éxito.')
      }
    } catch (err: any) {
      console.error('Error al crear carpeta de gestoría:', err.message)
      alert('Error al crear carpeta: ' + err.message)
    } finally {
      creatingFolder.value = false
    }
  }
}

const autoGenerarCarpetas = async () => {
  if (confirm('¿Deseas generar carpetas de gestoría automáticamente para todos los vehículos disponibles/reservados en stock que no posean trámite?')) {
    loading.value = true
    if (authStore.isDemoMode) {
      const mockAutos = [
        { id: 'demo-v-4', marca: 'Chevrolet', modelo: 'Cruze LTZ', anio: 2019, precio: 3800000, kilometraje: 65000 },
        { id: 'demo-v-5', marca: 'Toyota', modelo: 'Corolla XEI', anio: 2020, precio: 5200000, kilometraje: 45000 }
      ]
      mockAutos.forEach((v, index) => {
        const mockId = `tramite-auto-${index}-${Date.now()}`
        const mockTramite = {
          id: mockId,
          vehiculo_id: v.id,
          estado_tramite: 'pendiente',
          checklist_documentos: {
            titulo: false,
            cedula_verde: false,
            f08: false,
            verificacion_policial: false,
            libre_deuda: false
          },
          costo_transferencia: Math.round(v.precio * 0.05),
          cliente_nombre: '',
          cliente_dni: '',
          archivos_formularios: {},
          vehiculos: {
            marca: v.marca,
            modelo: v.modelo,
            anio: v.anio,
            precio: v.precio,
            kilometraje: v.kilometraje
          }
        }
        tramites.value.push(mockTramite)
      })
      if (tramites.value.length > 0) {
        selectedTramite.value = tramites.value[0]
      }
      loading.value = false
      alert('Carpetas autogeneradas con éxito en modo demo.')
    } else {
      try {
        const { data: vehs, error: errorVehs } = await supabase
          .from('vehiculos')
          .select('id, precio, marca, modelo')
          .eq('agencia_id', authStore.activeAgenciaId)
          .in('estado', ['disponible', 'reservado'])

        if (errorVehs) throw errorVehs

        const idsConTramite = tramites.value.map(t => t.vehiculo_id)
        const vehsSinTramite = (vehs || []).filter((v: any) => !idsConTramite.includes(v.id))

        if (vehsSinTramite.length === 0) {
          alert('Todos los vehículos en stock ya tienen una carpeta de gestoría asignada.')
          loading.value = false
          return
        }

        const inserts = vehsSinTramite.map((v: any) => ({
          vehiculo_id: v.id,
          estado_tramite: 'pendiente',
          checklist_documentos: {
            titulo: false,
            cedula_verde: false,
            f08: false,
            verificacion_policial: false,
            libre_deuda: false
          },
          costo_transferencia: Math.round(Number(v.precio) * 0.05),
          cliente_nombre: '',
          cliente_dni: '',
          archivos_formularios: {}
        }))

        const { error: insertError } = await supabase
          .from('tramites_gestoria')
          .insert(inserts)

        if (insertError) {
          if (insertError.message.includes('cliente_nombre') || insertError.message.includes('column') || insertError.message.includes('does not exist')) {
            console.warn('Esquema extendido de gestoría no disponible en Supabase al autogenerar. Reintentando esquema base.')
            const insertsBase = vehsSinTramite.map((v: any) => ({
              vehiculo_id: v.id,
              estado_tramite: 'pendiente',
              checklist_documentos: {
                titulo: false,
                cedula_verde: false,
                f08: false,
                verificacion_policial: false,
                libre_deuda: false
              },
              costo_transferencia: Math.round(Number(v.precio) * 0.05)
            }))
            const { error: errorBase } = await supabase
              .from('tramites_gestoria')
              .insert(insertsBase)

            if (errorBase) throw errorBase
            await loadTramites()
            alert(`Se han autogenerado ${insertsBase.length} carpetas de gestoría (Esquema Básico).`);
          } else {
            throw insertError
          }
        } else {
          await loadTramites()
          alert(`Se han autogenerado ${inserts.length} carpetas de gestoría.`);
        }
      } catch (err: any) {
        console.error('Error al autogenerar carpetas:', err.message)
        alert('Error al autogenerar carpetas: ' + err.message)
      } finally {
        loading.value = false
      }
    }
  }
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
        cliente_nombre: 'Eduardo Romero',
        cliente_dni: '32.485.962',
        archivos_formularios: {
          titulo: { nombre: 'titulo_focus_firmado.pdf', url: '#', fecha: '25/05/2026' }
        },
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
        cliente_nombre: '',
        cliente_dni: '',
        archivos_formularios: {},
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
        cliente_nombre: 'Carlos Spinetta',
        cliente_dni: '29.124.856',
        archivos_formularios: {
          titulo: { nombre: 'titulo_sandero.pdf', url: '#', fecha: '22/05/2026' },
          cedula_verde: { nombre: 'cedula_verde_sandero.png', url: '#', fecha: '22/05/2026' },
          f08: { nombre: 'f08_digital_firmado.pdf', url: '#', fecha: '23/05/2026' },
          verificacion_policial: { nombre: 'f12_policial.pdf', url: '#', fecha: '23/05/2026' },
          libre_deuda: { nombre: 'libre_deuda_santa_fe.pdf', url: '#', fecha: '24/05/2026' }
        },
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
          cliente_nombre,
          cliente_dni,
          archivos_formularios,
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
        tramites.value = filtered.map(item => ({
          ...item,
          cliente_nombre: item.cliente_nombre || '',
          cliente_dni: item.cliente_dni || '',
          archivos_formularios: item.archivos_formularios || {}
        }))
        if (filtered.length > 0 && !selectedTramite.value) {
          selectedTramite.value = tramites.value[0]
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
  
  // Si se desmarca, remover metadatos de archivos
  if (!selectedTramite.value.checklist_documentos[docKey] && selectedTramite.value.archivos_formularios?.[docKey]) {
    delete selectedTramite.value.archivos_formularios[docKey]
  }

  // Recalcular estado del trámite automáticamente
  const prog = calcularProgreso(selectedTramite.value.checklist_documentos)
  if (prog === 100) {
    selectedTramite.value.estado_tramite = 'finalizado'
  } else if (prog > 0) {
    selectedTramite.value.estado_tramite = 'en_proceso'
  } else {
    selectedTramite.value.estado_tramite = 'pendiente'
  }

  // Guardar cambios
  await handleSaveTramite()
}

// Subida de Archivos (Demo o Supabase Storage)
const handleFileUpload = async (event: Event, docKey: string) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0 || !selectedTramite.value) return
  
  const file = input.files[0]
  uploadingDocKey.value = docKey

  if (authStore.isDemoMode) {
    setTimeout(() => {
      if (!selectedTramite.value.archivos_formularios) {
        selectedTramite.value.archivos_formularios = {}
      }
      selectedTramite.value.archivos_formularios[docKey] = {
        nombre: file.name,
        url: '#',
        fecha: new Date().toLocaleDateString('es-AR')
      }
      selectedTramite.value.checklist_documentos[docKey] = true
      
      const prog = calcularProgreso(selectedTramite.value.checklist_documentos)
      if (prog === 100) {
        selectedTramite.value.estado_tramite = 'finalizado'
      } else {
        selectedTramite.value.estado_tramite = 'en_proceso'
      }
      uploadingDocKey.value = null
      alert(`Archivo '${file.name}' subido con éxito a la carpeta del vehículo (Demo)`)
    }, 1200)
  } else {
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${authStore.activeAgenciaId}/${selectedTramite.value.id}/${docKey}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('formularios-gestoria')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('formularios-gestoria')
        .getPublicUrl(filePath)

      if (!selectedTramite.value.archivos_formularios) {
        selectedTramite.value.archivos_formularios = {}
      }

      selectedTramite.value.archivos_formularios[docKey] = {
        nombre: file.name,
        url: publicUrl,
        fecha: new Date().toLocaleDateString('es-AR')
      }
      selectedTramite.value.checklist_documentos[docKey] = true
      
      const prog = calcularProgreso(selectedTramite.value.checklist_documentos)
      if (prog === 100) {
        selectedTramite.value.estado_tramite = 'finalizado'
      } else {
        selectedTramite.value.estado_tramite = 'en_proceso'
      }

      await handleSaveTramite()
      alert(`¡Archivo '${file.name}' cargado en la nube!`)
    } catch (err: any) {
      console.error('Error al subir archivo:', err.message)
      alert('Error en la carga: ' + err.message)
    } finally {
      uploadingDocKey.value = null
    }
  }
}

// Remover archivo de la carpeta
const removerArchivo = async (docKey: string) => {
  if (!selectedTramite.value) return
  if (confirm(`¿Estás seguro de eliminar el archivo adjunto para ${docLabels[docKey]}?`)) {
    if (selectedTramite.value.archivos_formularios) {
      delete selectedTramite.value.archivos_formularios[docKey]
    }
    selectedTramite.value.checklist_documentos[docKey] = false

    const prog = calcularProgreso(selectedTramite.value.checklist_documentos)
    if (prog === 100) {
      selectedTramite.value.estado_tramite = 'finalizado'
    } else if (prog > 0) {
      selectedTramite.value.estado_tramite = 'en_proceso'
    } else {
      selectedTramite.value.estado_tramite = 'pendiente'
    }

    await handleSaveTramite()
  }
}

// Guardar los datos del trámite
const handleSaveTramite = async () => {
  if (!selectedTramite.value) return
  updatingTramite.value = selectedTramite.value.id
  successMsg.value = null

  if (authStore.isDemoMode) {
    setTimeout(() => {
      updatingTramite.value = null
      successMsg.value = 'Trámite y cliente guardados localmente (Demo)'
      setTimeout(() => { successMsg.value = null }, 3000)
    }, 800)
  } else {
    try {
      const { error } = await supabase
        .from('tramites_gestoria')
        .update({
          checklist_documentos: selectedTramite.value.checklist_documentos,
          estado_tramite: selectedTramite.value.estado_tramite,
          costo_transferencia: selectedTramite.value.costo_transferencia,
          cliente_nombre: selectedTramite.value.cliente_nombre,
          cliente_dni: selectedTramite.value.cliente_dni,
          archivos_formularios: selectedTramite.value.archivos_formularios
        })
        .eq('id', selectedTramite.value.id)
      
      if (error) {
        if (error.message.includes('cliente_nombre') || error.message.includes('column') || error.message.includes('does not exist')) {
          console.warn('Esquema extendido no disponible en guardado. Intentando con campos básicos.')
          const { error: errorBase } = await supabase
            .from('tramites_gestoria')
            .update({
              checklist_documentos: selectedTramite.value.checklist_documentos,
              estado_tramite: selectedTramite.value.estado_tramite,
              costo_transferencia: selectedTramite.value.costo_transferencia
            })
            .eq('id', selectedTramite.value.id)

          if (errorBase) throw errorBase
          successMsg.value = '¡Cambios guardados! (Esquema Básico)'
          setTimeout(() => { successMsg.value = null }, 4000)
        } else {
          throw error
        }
      } else {
        successMsg.value = '¡Cambios sincronizados en la nube!'
        setTimeout(() => { successMsg.value = null }, 3000)
      }
    } catch (err: any) {
      console.error('Error al guardar trámite:', err.message)
      alert('Error al guardar cambios: ' + err.message)
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
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
          <FileText class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Gestoría & Trámites</h1>
          <p class="text-slate-400 text-sm mt-0.5">Control de documentación y gestoría para transferencias de stock</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button 
          @click="openCreateModal"
          class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <FolderPlus class="w-4 h-4" />
          <span>Crear Carpeta</span>
        </button>

        <button 
          v-if="authStore.profile?.rol === 'admin'"
          @click="autoGenerarCarpetas"
          class="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Auto-generar para todo el stock"
        >
          <Sparkles class="w-4 h-4 text-emerald-400 animate-pulse" />
          <span class="hidden md:inline">Auto-generar</span>
        </button>

        <button 
          @click="loadTramites"
          class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Refrescar trámites"
        >
          <RefreshCw class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Listado de Trámites en Curso (Izquierda - 5/12) -->
      <div class="lg:col-span-5 space-y-4">
        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Carpetas en Curso</h3>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="tramites.length === 0" class="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center space-y-4">
          <p class="text-slate-500 text-sm">No hay carpetas de gestoría creadas.</p>
          <div v-if="authStore.profile?.rol === 'admin'" class="flex justify-center">
            <button 
              @click="autoGenerarCarpetas"
              class="px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles class="w-3.5 h-3.5" />
              Auto-generar carpetas para el stock
            </button>
          </div>
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

          <!-- Datos del Cliente y Ubicación del Trámite -->
          <div class="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Cliente & Jurisdicción</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-450 uppercase mb-1">Nombre Completo del Cliente</label>
                <input 
                  v-model="selectedTramite.cliente_nombre" 
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-gray-100 text-xs transition-all"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-455 uppercase mb-1">DNI / CUIT del Cliente</label>
                <input 
                  v-model="selectedTramite.cliente_dni" 
                  type="text"
                  placeholder="Ej: 30.123.456"
                  class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-gray-100 text-xs transition-all"
                />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-450 uppercase mb-1">Provincia de Radicación (Jurisdicción)</label>
              <select 
                v-model="jurisdiccionSelected"
                class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-slate-300 text-xs transition-all"
              >
                <option v-for="j in jurisdicciones" :key="j.id" :value="j.id">{{ j.nombre }}</option>
              </select>
            </div>
          </div>

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

          <!-- Checklist de Documentos con Switches e Inputs de Archivo -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Checklist de Documentación & Archivos Cargados</h3>
            
            <div class="space-y-3.5">
              <div 
                v-for="(label, key) in docLabels" 
                :key="key"
                class="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-805 transition-all flex flex-col gap-3 group"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div 
                      @click="toggleDoc(key)"
                      :class="[
                        'p-2 rounded-lg transition-all cursor-pointer',
                        selectedTramite.checklist_documentos[key] 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-slate-950 text-slate-600'
                      ]"
                    >
                      <CheckCircle2 v-if="selectedTramite.checklist_documentos[key]" class="w-4 h-4" />
                      <HelpCircle v-else class="w-4 h-4" />
                    </div>
                    <span 
                      @click="toggleDoc(key)"
                      :class="[
                        'text-sm font-semibold transition-all cursor-pointer',
                        selectedTramite.checklist_documentos[key] ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-350'
                      ]"
                    >
                      {{ label }}
                    </span>
                  </div>

                  <!-- Control Switch Estilizado -->
                  <div 
                    @click="toggleDoc(key)"
                    :class="[
                      'w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer',
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

                <!-- Sección del Archivo Real Cargado -->
                <div class="flex items-center justify-between border-t border-slate-950 pt-2.5 text-xs">
                  <div v-if="selectedTramite.archivos_formularios?.[key]" class="flex items-center gap-2 text-cyan-400 font-semibold truncate max-w-[70%]">
                    <FileText class="w-4 h-4 shrink-0 text-cyan-400" />
                    <span class="truncate" :title="selectedTramite.archivos_formularios[key].nombre">{{ selectedTramite.archivos_formularios[key].nombre }}</span>
                    <span class="text-[9px] text-slate-500 font-normal">({{ selectedTramite.archivos_formularios[key].fecha }})</span>
                  </div>
                  
                  <div v-else class="text-slate-600 flex items-center gap-1.5">
                    <AlertCircle class="w-3.5 h-3.5 text-slate-500" />
                    <span>Sin archivo cargado</span>
                  </div>

                  <!-- Botones de Acción sobre el archivo -->
                  <div class="flex items-center gap-2">
                    <div v-if="selectedTramite.archivos_formularios?.[key]" class="flex gap-2">
                      <a 
                        :href="selectedTramite.archivos_formularios[key].url"
                        target="_blank"
                        class="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 text-[10px] font-bold rounded"
                      >
                        Ver/Descargar
                      </a>
                      <button 
                        @click="removerArchivo(key)"
                        class="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-rose-400 text-[10px] font-bold rounded cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                    
                    <label v-else-if="uploadingDocKey !== key" class="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 text-[10px] font-bold rounded cursor-pointer transition-colors">
                      <span>Cargar Archivo</span>
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        class="hidden" 
                        @change="handleFileUpload($event, key)"
                      />
                    </label>
                    <span v-else class="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <RefreshCw class="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Cargando...</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Directorio de Trámites y Enlaces Oficiales (Argentina - DNRPA) -->
          <div class="p-4 rounded-xl bg-slate-950/40 border border-slate-900 space-y-4">
            <h4 class="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <span>Trámites Rápidos & Enlaces Oficiales (DNRPA / AFIP)</span>
            </h4>
            
            <p class="text-[10px] text-slate-400 leading-relaxed">
              Solicita formularios, verifica la radicación de patentes y accede a turnos de registros oficiales nacionales y locales:
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold font-sans">
              <!-- Botones Nacionales -->
              <a href="https://www.dnrpa.gov.ar/portalciudadano/tramite/08-digital" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-slate-350">
                <span>DNRPA: Iniciar 08 Digital</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <a href="https://www.dnrpa.gov.ar/portalciudadano/radicacion-por-patente" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-slate-355">
                <span>DNRPA: Radicación por Patente</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <a href="https://www.dnrpa.gov.ar/portalciudadano/informes-online" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-slate-350">
                <span>DNRPA: Pedido de Informe de Dominio</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <a href="https://www.argentina.gob.ar/seguridadvial/licenciadeconducir/cenat" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-slate-350">
                <span>CENAT: Libre Deuda de Infracciones</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <a href="https://www.afip.gob.ar/coti/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-slate-350">
                <span>AFIP: Solicitar Certificado COTI</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <!-- Botones Locales Dinámicos según Jurisdicción -->
              <!-- Buenos Aires -->
              <a v-if="jurisdiccionSelected === 'buenos_aires'" href="https://vpa.mseg.gba.gov.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>VPA: Verificación Policial GBA</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>
              <a v-if="jurisdiccionSelected === 'buenos_aires'" href="https://web.arba.gov.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>ARBA: Patentes e Impuestos</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <!-- Santa Fe -->
              <a v-if="jurisdiccionSelected === 'santa_fe'" href="https://www.santafe.gov.ar/index.php/tramites/modulopublico/detalle?id=111527" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>VPF: Verificación Policial Santa Fe</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>
              <a v-if="jurisdiccionSelected === 'santa_fe'" href="https://www.santafe.gov.ar/api" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>API Santa Fe: Impuesto Patente</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <!-- CABA -->
              <a v-if="jurisdiccionSelected === 'caba'" href="https://verificacion.controlciudadano.gob.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>Verificación Policial CABA</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>
              <a v-if="jurisdiccionSelected === 'caba'" href="https://www.agip.gob.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>AGIP CABA: Patentes</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>

              <!-- Cordoba -->
              <a v-if="jurisdiccionSelected === 'cordoba'" href="https://verificacionespoliciales.cba.gov.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>Verificación Policial Córdoba</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>
              <a v-if="jurisdiccionSelected === 'cordoba'" href="https://www.rentascordoba.gob.ar/" target="_blank" class="p-2.5 bg-slate-900 border border-slate-850 hover:border-cyan-500/30 rounded-lg flex justify-between items-center group transition-all text-cyan-400">
                <span>Rentas Córdoba: Patentes</span>
                <ExternalLink class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </a>
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

    <!-- Modal de Creación de Carpeta de Gestoría -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
      <div class="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 p-6 space-y-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <!-- Header -->
        <div class="flex justify-between items-center border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2">
            <FolderPlus class="w-5 h-5 text-emerald-400" />
            <h3 class="text-xl font-bold text-white">Nueva Carpeta de Gestoría</h3>
          </div>
          <button @click="showCreateModal = false" class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-all">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          
          <!-- Selector de Vehículo sin Carpeta -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Vehículo del Stock</label>
            <select 
              v-model="selectedVehiculoId"
              class="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
            >
              <option value="" disabled>Selecciona un vehículo disponible/reservado...</option>
              <option v-for="v in vehiculosSinTramite" :key="v.id" :value="v.id">
                {{ v.marca }} {{ v.modelo }} (Año {{ v.anio }} - Precio: ${{ Number(v.precio || 0).toLocaleString() }})
              </option>
            </select>
            <p v-if="vehiculosSinTramite.length === 0" class="text-[10px] text-amber-500 font-semibold mt-1">
              * Todos los vehículos de tu stock ya tienen carpeta de gestoría iniciada.
            </p>
          </div>

          <!-- Campos Cliente -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Cliente (Opcional)</label>
              <input 
                v-model="nuevoClienteNombre"
                type="text"
                placeholder="Ej: Eduardo Romero"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">DNI / CUIT (Opcional)</label>
              <input 
                v-model="nuevoClienteDni"
                type="text"
                placeholder="Ej: 32.485.962"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <!-- Costo Estimado -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Costo Estimado de Transferencia (ARS)</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <DollarSign class="w-4 h-4" />
              </span>
              <input 
                v-model.number="nuevoCostoTransferencia"
                type="number"
                placeholder="Ej: 150000"
                class="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all font-semibold"
              />
            </div>
            <p class="text-[10px] text-slate-500 mt-1 leading-normal">
              * Se calculará por defecto el 5% si dejas en 0. Podrás editarlo después.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button 
            @click="showCreateModal = false"
            class="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button 
            @click="crearCarpetaGestoria"
            :disabled="creatingFolder || !selectedVehiculoId"
            class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span v-if="creatingFolder" class="w-3.5 h-3.5 border border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            <Plus v-else class="w-3.5 h-3.5" />
            <span>Crear Carpeta</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
