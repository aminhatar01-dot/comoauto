<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { 
  Car, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Gauge, 
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  ListFilter
} from 'lucide-vue-next'

const authStore = useAuthStore()

// Estados de datos
const vehiculos = ref<any[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Buscador y Filtros
const searchQuery = ref('')
const selectedEstado = ref('todos')

// Estado de Modal (Agregar / Editar)
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentId = ref<string | null>(null)

// Pestaña Activa y Transacciones
const activeTab = ref('stock') // 'stock' | 'historial'
const transacciones = ref<any[]>([])
const transaccionSearch = ref('')
const transaccionFilterTipo = ref('todos')

// Formulario reactivo con campos de transacción
const form = ref({
  marca: '',
  modelo: '',
  anio: new Date().getFullYear(),
  precio: 0,
  kilometraje: 0,
  estado: 'disponible',
  dias_en_stock: 0,
  valor_compra: 0,
  costo_reparaciones: 0,
  detalles_internos: '',
  avance_preparacion: 0,
  notas_internas: '',
  transaccion_cliente_nombre: '',
  transaccion_cliente_contacto: '',
  transaccion_monto: 0,
  transaccion_vendedor_id: ''
})

// Vendedores de la agencia para asignar en transacciones
const vendedores = ref([
  { id: 'vend-1', nombre: 'Amin Határ' },
  { id: 'vend-2', nombre: 'Laura Fernández' },
  { id: 'vend-3', nombre: 'Matías Rossi' }
])

onMounted(async () => {
  await loadVehiculos()
  await loadTransacciones()
  await loadVendedores()
})

const loadVendedores = async () => {
  if (authStore.isDemoMode) return
  try {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('agencia_id', authStore.activeAgenciaId)
    if (data) vendedores.value = data
  } catch (err) {
    console.error('Error al cargar vendedores:', err)
  }
}

const loadTransacciones = async () => {
  if (authStore.isDemoMode) {
    if (transacciones.value.length === 0) {
      transacciones.value = [
        {
          id: 't-1',
          vehiculo_id: '6',
          vehiculo_info: { marca: 'Honda', modelo: 'Civic 1.8 LXS', anio: 2015 },
          tipo_transaccion: 'venta',
          monto: 3100000,
          cliente_nombre: 'Mariana Pérez',
          cliente_contacto: '+549341555987',
          vendedor_id: 'vend-1',
          vendedor_nombre: 'Amin Határ',
          fecha_transaccion: new Date(Date.now() - 5 * 86400000).toISOString()
        },
        {
          id: 't-2',
          vehiculo_id: '4',
          vehiculo_info: { marca: 'Toyota', modelo: 'Corolla 1.8 SEG', anio: 2018 },
          tipo_transaccion: 'reserva',
          monto: 540000,
          cliente_nombre: 'Roberto Sánchez',
          cliente_contacto: '+5492619876543',
          vendedor_id: 'vend-3',
          vendedor_nombre: 'Matías Rossi',
          fecha_transaccion: new Date(Date.now() - 2 * 86400000).toISOString()
        },
        {
          id: 't-3',
          vehiculo_id: '1',
          vehiculo_info: { marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017 },
          tipo_transaccion: 'compra',
          monto: 2200000,
          cliente_nombre: 'Aníbal Focus (Antiguo Dueño)',
          cliente_contacto: '+54911223344',
          vendedor_id: 'vend-1',
          vendedor_nombre: 'Amin Határ',
          fecha_transaccion: new Date(Date.now() - 58 * 86400000).toISOString()
        }
      ]
    }
  } else {
    try {
      const { data, error } = await supabase
        .from('historial_transacciones')
        .select(`
          id,
          vehiculo_id,
          vehiculo_info,
          tipo_transaccion,
          monto,
          cliente_nombre,
          cliente_contacto,
          vendedor_id,
          fecha_transaccion,
          usuarios (
            nombre
          )
        `)
        .eq('agencia_id', authStore.activeAgenciaId)
        .order('fecha_transaccion', { ascending: false })

      if (error) throw error
      if (data) {
        transacciones.value = data.map((t: any) => ({
          ...t,
          vendedor_nombre: t.usuarios?.nombre || 'Bot Autónomo'
        }))
      }
    } catch (err: any) {
      console.error('Error al cargar transacciones:', err.message)
    }
  }
}

const loadVehiculos = async () => {
  loading.value = true
  errorMsg.value = null
  
  if (authStore.isDemoMode) {
    if (vehiculos.value.length === 0) {
      vehiculos.value = [
        { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000, kilometraje: 89000, estado: 'disponible', dias_en_stock: 58, valor_compra: 2200000, costo_reparaciones: 80000, detalles_internos: 'Service de aceite y filtros, cambio de pastillas delanteras.', avance_preparacion: 100, notas_internas: 'Tomado de cliente habitual. Buen estado mecánico.' },
        { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000, kilometraje: 110000, estado: 'disponible', dias_en_stock: 62, valor_compra: 3500000, costo_reparaciones: 180000, detalles_internos: 'Service DSG y pintura de paragolpes delantero.', avance_preparacion: 80, notas_internas: 'Requiere revisión de bujes traseros próximamente.' },
        { id: '3', marca: 'Fiat', modelo: 'Cronos 1.3 Drive', anio: 2021, precio: 3900000, kilometraje: 42000, estado: 'disponible', dias_en_stock: 12, valor_compra: 2800000, costo_reparaciones: 40000, detalles_internos: 'Pulido completo y limpieza de tapizados.', avance_preparacion: 100, notas_internas: 'Único dueño, auxilio sin rodar.' },
        { id: '4', marca: 'Toyota', modelo: 'Corolla 1.8 SEG', anio: 2018, precio: 5400000, kilometraje: 95000, estado: 'reservado', dias_en_stock: 49, valor_compra: 4100000, costo_reparaciones: 90000, detalles_internos: 'Alineación, balanceo y cambio de 2 neumáticos.', avance_preparacion: 90, notas_internas: 'Reservado por seña del 10%.' },
        { id: '5', marca: 'Chevrolet', modelo: 'Cruze 1.4T LTZ', anio: 2019, precio: 5100000, kilometraje: 54000, estado: 'disponible', dias_en_stock: 75, valor_compra: 3700000, costo_reparaciones: 250000, detalles_internos: 'Reparación de turbo y cambio de bujías.', avance_preparacion: 50, notas_internas: 'Se tomó con falla mecánica ya resuelta.' },
        { id: '6', marca: 'Honda', modelo: 'Civic 1.8 LXS', anio: 2015, precio: 3100000, kilometraje: 125000, estado: 'vendido', dias_en_stock: 22, valor_compra: 2100000, costo_reparaciones: 60000, detalles_internos: 'Detailing de interior y pulido de ópticas.', avance_preparacion: 100, notas_internas: 'Venta cerrada con entrega del auto limpio.' }
      ]
    }
    loading.value = false
  } else {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('agencia_id', authStore.activeAgenciaId)
        .order('fecha_creacion', { ascending: false })

      if (error) throw error
      if (data) vehiculos.value = data
    } catch (err: any) {
      console.error('Error al cargar vehículos:', err.message)
      errorMsg.value = 'No se pudo conectar al servidor de Supabase para leer el stock.'
    } finally {
      loading.value = false
    }
  }
}

// Filtrado de vehículos reactivo
const filteredVehiculos = computed(() => {
  return vehiculos.value.filter(v => {
    const matchesSearch = `${v.marca} ${v.modelo}`.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesEstado = selectedEstado.value === 'todos' || v.estado === selectedEstado.value
    return matchesSearch && matchesEstado
  })
})

// Filtrado de transacciones reactivo
const filteredTransacciones = computed(() => {
  return transacciones.value.filter(t => {
    const autoStr = `${t.vehiculo_info?.marca} ${t.vehiculo_info?.modelo}`.toLowerCase()
    const clienteStr = (t.cliente_nombre || '').toLowerCase()
    const matchesSearch = autoStr.includes(transaccionSearch.value.toLowerCase()) || 
                          clienteStr.includes(transaccionSearch.value.toLowerCase())
    
    const matchesTipo = transaccionFilterTipo.value === 'todos' || t.tipo_transaccion === transaccionFilterTipo.value
    return matchesSearch && matchesTipo
  })
})

// Abrir Modal para Nuevo Vehículo
const openNewModal = () => {
  isEditing.value = false
  currentId.value = null
  form.value = {
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    precio: 0,
    kilometraje: 0,
    estado: 'disponible',
    dias_en_stock: 0,
    valor_compra: 0,
    costo_reparaciones: 0,
    detalles_internos: '',
    avance_preparacion: 0,
    notas_internas: '',
    transaccion_cliente_nombre: '',
    transaccion_cliente_contacto: '',
    transaccion_monto: 0,
    transaccion_vendedor_id: ''
  }
  isModalOpen.value = true
}

// Abrir Modal para Editar Vehículo
const openEditModal = (veh: any) => {
  isEditing.value = true
  currentId.value = veh.id
  form.value = {
    marca: veh.marca,
    modelo: veh.modelo,
    anio: veh.anio,
    precio: Number(veh.precio),
    kilometraje: Number(veh.kilometraje),
    estado: veh.estado,
    dias_en_stock: Number(veh.dias_en_stock),
    valor_compra: Number(veh.valor_compra || 0),
    costo_reparaciones: Number(veh.costo_reparaciones || 0),
    detalles_internos: veh.detalles_internos || '',
    avance_preparacion: Number(veh.avance_preparacion || 0),
    notas_internas: veh.notas_internas || '',
    transaccion_cliente_nombre: '',
    transaccion_cliente_contacto: '',
    transaccion_monto: Number(veh.precio),
    transaccion_vendedor_id: authStore.profile?.id || ''
  }
  isModalOpen.value = true
}

// Guardar (Crear o Actualizar)
const handleSave = async () => {
  if (!form.value.marca || !form.value.modelo || form.value.precio <= 0) {
    errorMsg.value = 'Por favor, completa los campos requeridos.'
    return
  }

  loading.value = true
  errorMsg.value = null

  if (authStore.isDemoMode) {
    setTimeout(() => {
      if (isEditing.value && currentId.value) {
        // Editar
        const index = vehiculos.value.findIndex(v => v.id === currentId.value)
        if (index !== -1) {
          const vehAnterior = vehiculos.value[index]
          const estadoAnterior = vehAnterior.estado
          const estadoNuevo = form.value.estado
          
          vehiculos.value[index] = {
            ...vehiculos.value[index],
            ...form.value
          }
          
          // Registrar transacción si cambia a reservado o vendido
          if (estadoNuevo !== estadoAnterior && (estadoNuevo === 'reservado' || estadoNuevo === 'vendido')) {
            const vend = vendedores.value.find(v => v.id === form.value.transaccion_vendedor_id)
            transacciones.value.unshift({
              id: 't-' + Date.now(),
              vehiculo_id: currentId.value,
              vehiculo_info: { marca: form.value.marca, modelo: form.value.modelo, anio: form.value.anio },
              tipo_transaccion: estadoNuevo === 'reservado' ? 'reserva' : 'venta',
              monto: form.value.transaccion_monto || form.value.precio,
              cliente_nombre: form.value.transaccion_cliente_nombre || 'Cliente Demo',
              cliente_contacto: form.value.transaccion_cliente_contacto || '',
              vendedor_id: form.value.transaccion_vendedor_id || 'vend-1',
              vendedor_nombre: vend ? vend.nombre : 'Amin Határ',
              fecha_transaccion: new Date().toISOString()
            })
          }
          showSuccess('Vehículo actualizado exitosamente (Demo)')
        }
      } else {
        // Crear
        const nuevoId = 'veh-' + Date.now()
        const nuevo = {
          id: nuevoId,
          ...form.value
        }
        vehiculos.value.unshift(nuevo)
        
        // Registrar compra
        if (form.value.valor_compra > 0) {
          transacciones.value.unshift({
            id: 't-' + Date.now(),
            vehiculo_id: nuevoId,
            vehiculo_info: { marca: form.value.marca, modelo: form.value.modelo, anio: form.value.anio },
            tipo_transaccion: 'compra',
            monto: form.value.valor_compra,
            cliente_nombre: form.value.transaccion_cliente_nombre || 'Toma de Unidad',
            cliente_contacto: form.value.transaccion_cliente_contacto || '',
            vendedor_id: authStore.profile?.id || 'vend-1',
            vendedor_nombre: authStore.profile?.nombre || 'Amin Határ',
            fecha_transaccion: new Date().toISOString()
          })
        }
        showSuccess('Vehículo agregado al inventario (Demo)')
      }
      isModalOpen.value = false
      loading.value = false
    }, 600)
  } else {
    try {
      if (isEditing.value && currentId.value) {
        // Obtener estado anterior
        const vehAnterior = vehiculos.value.find(v => v.id === currentId.value)
        const estadoAnterior = vehAnterior ? vehAnterior.estado : null
        const estadoNuevo = form.value.estado

        // Update
        const { error } = await supabase
          .from('vehiculos')
          .update({
            marca: form.value.marca,
            modelo: form.value.modelo,
            anio: form.value.anio,
            precio: form.value.precio,
            kilometraje: form.value.kilometraje,
            estado: form.value.estado,
            dias_en_stock: form.value.dias_en_stock,
            valor_compra: form.value.valor_compra,
            costo_reparaciones: form.value.costo_reparaciones,
            detalles_internos: form.value.detalles_internos,
            avance_preparacion: form.value.avance_preparacion,
            notas_internas: form.value.notas_internas
          })
          .eq('id', currentId.value)

        if (error) throw error

        // Registrar transacción
        if (estadoNuevo !== estadoAnterior && (estadoNuevo === 'reservado' || estadoNuevo === 'vendido')) {
          const { error: tError } = await supabase
            .from('historial_transacciones')
            .insert({
              agencia_id: authStore.activeAgenciaId,
              vehiculo_id: currentId.value,
              vehiculo_info: { marca: form.value.marca, modelo: form.value.modelo, anio: form.value.anio },
              tipo_transaccion: estadoNuevo === 'reservado' ? 'reserva' : 'venta',
              monto: form.value.transaccion_monto || form.value.precio,
              cliente_nombre: form.value.transaccion_cliente_nombre || 'Cliente Final',
              cliente_contacto: form.value.transaccion_cliente_contacto || '',
              vendedor_id: form.value.transaccion_vendedor_id || authStore.profile?.id || null
            })
          if (tError) console.error('Error al registrar transacción:', tError.message)
        }

        showSuccess('¡Vehículo actualizado correctamente!')
      } else {
        // Insert
        const { data: insertedData, error } = await supabase
          .from('vehiculos')
          .insert({
            agencia_id: authStore.activeAgenciaId,
            marca: form.value.marca,
            modelo: form.value.modelo,
            anio: form.value.anio,
            precio: form.value.precio,
            kilometraje: form.value.kilometraje,
            estado: form.value.estado,
            dias_en_stock: form.value.dias_en_stock,
            valor_compra: form.value.valor_compra,
            costo_reparaciones: form.value.costo_reparaciones,
            detalles_internos: form.value.detalles_internos,
            avance_preparacion: form.value.avance_preparacion,
            notas_internas: form.value.notas_internas
          })
          .select()
          .single()

        if (error) throw error

        // Registrar compra
        if (insertedData && form.value.valor_compra > 0) {
          const { error: tError } = await supabase
            .from('historial_transacciones')
            .insert({
              agencia_id: authStore.activeAgenciaId,
              vehiculo_id: insertedData.id,
              vehiculo_info: { marca: form.value.marca, modelo: form.value.modelo, anio: form.value.anio },
              tipo_transaccion: 'compra',
              monto: form.value.valor_compra,
              cliente_nombre: form.value.transaccion_cliente_nombre || 'Toma de Unidad',
              cliente_contacto: form.value.transaccion_cliente_contacto || '',
              vendedor_id: authStore.profile?.id || null
            })
          if (tError) console.error('Error al registrar compra:', tError.message)
        }

        showSuccess('¡Vehículo agregado al stock de la concesionaria!')
      }
      isModalOpen.value = false
      await loadVehiculos()
      await loadTransacciones()
    } catch (err: any) {
      console.error('Error al guardar vehículo:', err.message)
      errorMsg.value = err.message || 'Error al guardar los datos del auto.'
    } finally {
      loading.value = false
    }
  }
}

// Eliminar Vehículo
const handleDelete = async (id: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este vehículo de tu inventario? Esta acción es irreversible.')) return

  loading.value = true
  if (authStore.isDemoMode) {
    setTimeout(() => {
      vehiculos.value = vehiculos.value.filter(v => v.id !== id)
      showSuccess('Vehículo removido del stock (Demo)')
      loading.value = false
    }, 500)
  } else {
    try {
      const { error } = await supabase
        .from('vehiculos')
        .delete()
        .eq('id', id)

      if (error) throw error
      showSuccess('Vehículo eliminado con éxito de Supabase.')
      await loadVehiculos()
      await loadTransacciones()
    } catch (err: any) {
      console.error('Error al eliminar vehículo:', err.message)
      errorMsg.value = 'No se pudo eliminar el vehículo. Verifica dependencias en trámites de gestoría.'
    } finally {
      loading.value = false
    }
  }
}

// Helpers visuales
const showSuccess = (msg: string) => {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = null }, 3500)
}

const formatMoneda = (val: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)
}

const formatFecha = (isoString: string) => {
  const d = new Date(isoString)
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-8 relative">
    
    <!-- Encabezado de la página -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Car class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Inventario de Stock</h1>
          <p class="text-slate-400 text-sm mt-0.5">Controla, agrega y edita los vehículos reales de tu agencia</p>
        </div>
      </div>
      
      <button 
        @click="openNewModal"
        class="px-4 py-2.5 rounded-xl btn-gradient text-slate-950 font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 text-sm"
      >
        <Plus class="w-4 h-4 text-slate-950 stroke-[2.5]" />
        <span>Agregar Vehículo</span>
      </button>
    </div>

    <!-- Mensajes Rápidos -->
    <div v-if="successMsg" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
      <CheckCircle2 class="w-5 h-5 shrink-0" />
      <span>{{ successMsg }}</span>
    </div>
    <div v-if="errorMsg" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
      <AlertTriangle class="w-5 h-5 shrink-0" />
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Selector de Pestañas Principales -->
    <div class="flex gap-4 border-b border-slate-800 pb-3">
      <button 
        @click="activeTab = 'stock'" 
        :class="['px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer', activeTab === 'stock' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white']"
      >
        Inventario de Stock
      </button>
      <button 
        @click="activeTab = 'historial'" 
        :class="['px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer', activeTab === 'historial' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white']"
      >
        Historial de Transacciones
      </button>
    </div>

    <!-- Contenido según Pestaña Activa -->
    <div v-if="activeTab === 'stock'" class="space-y-6">
      <!-- Barra de Filtros y Búsqueda -->
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <!-- Buscador -->
        <div class="relative w-full md:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search class="w-4.5 h-4.5" />
          </span>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por marca o modelo..."
            class="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-200 text-sm placeholder:text-slate-600 transition-all"
          />
        </div>

        <!-- Selector de Estado -->
        <div class="flex items-center gap-3 w-full md:w-auto justify-end">
          <ListFilter class="w-4 h-4 text-slate-400 shrink-0" />
          <select 
            v-model="selectedEstado"
            class="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:border-emerald-500 outline-none transition-all w-full md:w-48"
          >
            <option value="todos">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="reservado">Reservados</option>
            <option value="vendido">Vendidos</option>
          </select>
        </div>
      </div>

      <!-- Cargando -->
      <div v-if="loading && vehiculos.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 text-sm mt-4">Actualizando catálogo de vehículos...</p>
      </div>

      <!-- Catálogo de Vehículos (Grilla) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="veh in filteredVehiculos" 
          :key="veh.id"
          class="glass-panel rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 flex flex-col relative overflow-hidden group shadow-lg"
        >
          <!-- Badge de Estado -->
          <span 
            :class="[
              'absolute top-4 right-4 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border',
              veh.estado === 'disponible' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              veh.estado === 'reservado' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
              'bg-slate-800 text-slate-400 border-slate-700'
            ]"
          >
            {{ veh.estado }}
          </span>

          <!-- Contenido principal -->
          <div class="p-6 flex-1 space-y-4">
            <div>
              <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest">{{ veh.marca }}</span>
              <h3 class="text-lg font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">{{ veh.modelo }}</h3>
            </div>

            <!-- Métricas del vehículo -->
            <div class="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-slate-500" />
                <span>Año {{ veh.anio }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Gauge class="w-4 h-4 text-slate-500" />
                <span>{{ veh.kilometraje.toLocaleString() }} km</span>
              </div>
            </div>

            <!-- Progreso de Preparación (Control de Procesos) -->
            <div class="space-y-1 pt-1">
              <div class="flex justify-between text-[10px] font-bold text-slate-450 uppercase">
                <span>Preparación / Alistamiento</span>
                <span class="text-cyan-400">{{ veh.avance_preparacion || 0 }}%</span>
              </div>
              <div class="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  :style="{ width: (veh.avance_preparacion || 0) + '%' }"
                ></div>
              </div>
            </div>

            <!-- Datos Financieros Internos (Solo Agencia) -->
            <div class="p-3 bg-slate-950/50 border border-slate-900 rounded-xl space-y-1.5 text-[10px]">
              <div class="flex justify-between text-slate-450">
                <span>Valor de Compra:</span>
                <span class="font-bold text-slate-200">{{ formatMoneda(veh.valor_compra || 0) }}</span>
              </div>
              <div class="flex justify-between text-slate-455">
                <span>Costo Reparaciones:</span>
                <span class="font-bold text-rose-400">+{{ formatMoneda(veh.costo_reparaciones || 0) }}</span>
              </div>
              <div class="flex justify-between border-t border-slate-900 pt-1.5 font-bold text-slate-400">
                <span>Inversión Total:</span>
                <span class="text-white">{{ formatMoneda((veh.valor_compra || 0) + (veh.costo_reparaciones || 0)) }}</span>
              </div>
              <div class="flex justify-between text-[9px] pt-0.5 border-t border-dashed border-slate-900/60">
                <span class="text-slate-500 font-medium">Margen Estimado:</span>
                <span class="text-emerald-400 font-extrabold">{{ formatMoneda(veh.precio - ((veh.valor_compra || 0) + (veh.costo_reparaciones || 0))) }}</span>
              </div>
            </div>

            <!-- Alerta de Stock Estancado -->
            <div 
              v-if="veh.dias_en_stock > 45 && veh.estado === 'disponible'"
              class="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl animate-pulse"
            >
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>Stock parado: {{ veh.dias_en_stock }} días</span>
            </div>

            <!-- Precio -->
            <div class="flex justify-between items-baseline pt-1 border-t border-slate-800/60">
              <span class="text-xs text-slate-450 uppercase tracking-wider font-semibold">Precio de Lista</span>
              <span class="text-xl font-extrabold text-white">{{ formatMoneda(veh.precio) }}</span>
            </div>
          </div>

          <!-- Acciones del Inventario -->
          <div class="px-6 py-4 bg-slate-900/50 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <button 
              @click="openEditModal(veh)"
              class="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Editar Datos</span>
            </button>
            
            <button 
              @click="handleDelete(veh.id)"
              class="py-2 px-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
              title="Borrar de stock"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Sin Resultados -->
        <div 
          v-if="filteredVehiculos.length === 0"
          class="col-span-full p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-500 text-sm"
        >
          No se encontraron vehículos que coincidan con la búsqueda.
        </div>
      </div>
    </div>

    <!-- Pestaña de Historial de Transacciones -->
    <div v-else class="space-y-4">
      <!-- Filtros para Transacciones -->
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div class="relative w-full md:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search class="w-4.5 h-4.5" />
          </span>
          <input 
            v-model="transaccionSearch"
            type="text"
            placeholder="Buscar por cliente o auto..."
            class="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-200 text-sm placeholder:text-slate-600 transition-all"
          />
        </div>

        <select 
          v-model="transaccionFilterTipo"
          class="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:border-emerald-500 outline-none transition-all w-full md:w-48"
        >
          <option value="todos">Todos los Tipos</option>
          <option value="compra">Compras / Tomas</option>
          <option value="reserva">Reservas</option>
          <option value="venta">Ventas</option>
        </select>
      </div>

      <!-- Tabla Premium de Historial -->
      <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/20">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400 uppercase">
              <th class="p-4">Fecha</th>
              <th class="p-4">Vehículo</th>
              <th class="p-4">Tipo</th>
              <th class="p-4">Monto</th>
              <th class="p-4">Cliente / Contacto</th>
              <th class="p-4">Vendedor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr v-if="filteredTransacciones.length === 0">
              <td colspan="6" class="p-8 text-center text-slate-500">
                No se registraron transacciones aún.
              </td>
            </tr>
            <tr 
              v-for="t in filteredTransacciones" 
              :key="t.id"
              class="hover:bg-slate-900/30 transition-colors"
            >
              <td class="p-4 whitespace-nowrap text-xs text-slate-500">
                {{ formatFecha(t.fecha_transaccion) }}
              </td>
              <td class="p-4 font-semibold text-white">
                {{ t.vehiculo_info?.marca }} {{ t.vehiculo_info?.modelo }}
                <span class="text-xs text-slate-500 block">Año {{ t.vehiculo_info?.anio }}</span>
              </td>
              <td class="p-4 whitespace-nowrap">
                <span 
                  :class="[
                    'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border',
                    t.tipo_transaccion === 'compra' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    t.tipo_transaccion === 'reserva' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  ]"
                >
                  {{ t.tipo_transaccion === 'compra' ? 'Compra / Toma' : t.tipo_transaccion }}
                </span>
              </td>
              <td class="p-4 font-bold text-white whitespace-nowrap">
                {{ formatMoneda(t.monto) }}
              </td>
              <td class="p-4">
                <span class="font-semibold text-slate-200 block">{{ t.cliente_nombre || 'N/D' }}</span>
                <span class="text-xs text-slate-500">{{ t.cliente_contacto || 'Sin contacto' }}</span>
              </td>
              <td class="p-4 text-xs font-medium text-cyan-400">
                👤 {{ t.vendedor_nombre }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE CARGA Y EDICIÓN -->
    <div 
      v-if="isModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg glass-panel rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl relative">
        <button 
          @click="isModalOpen = false" 
          class="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition-all cursor-pointer"
        >
          <X class="w-4.5 h-4.5" />
        </button>

        <div>
          <h2 class="text-xl font-bold text-white">{{ isEditing ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo' }}</h2>
          <p class="text-xs text-slate-400 mt-1">Completa los campos del catálogo para publicarlo en el stock del SaaS</p>
        </div>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Marca *</label>
              <input 
                v-model="form.marca" 
                type="text" 
                required
                placeholder="Ej: Ford"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Modelo *</label>
              <input 
                v-model="form.modelo" 
                type="text" 
                required
                placeholder="Ej: Focus III 2.0"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Año *</label>
              <input 
                v-model.number="form.anio" 
                type="number" 
                required
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kilometraje (km)</label>
              <input 
                v-model.number="form.kilometraje" 
                type="number"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Precio (ARS) *</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <DollarSign class="w-4 h-4" />
                </span>
                <input 
                  v-model.number="form.precio" 
                  type="number" 
                  required
                  class="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Días en Stock</label>
              <input 
                v-model.number="form.dias_en_stock" 
                type="number"
                class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
              />
            </div>
          </div>

          <!-- Información Interna (Privada) -->
          <div class="border-t border-slate-900 pt-4 space-y-4">
            <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Información Interna (Solo Agencia)</span>
            </h4>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Valor Toma / Compra</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <DollarSign class="w-4 h-4" />
                  </span>
                  <input 
                    v-model.number="form.valor_compra" 
                    type="number" 
                    class="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-gray-100 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Costo Reparaciones</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <DollarSign class="w-4 h-4" />
                  </span>
                  <input 
                    v-model.number="form.costo_reparaciones" 
                    type="number" 
                    class="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-gray-100 text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Avance de Preparación (%)</label>
                <div class="flex items-center gap-3">
                  <input 
                    v-model.number="form.avance_preparacion" 
                    type="range" 
                    min="0"
                    max="100"
                    step="5"
                    class="flex-1 accent-cyan-500 bg-slate-950 cursor-pointer"
                  />
                  <span class="text-xs font-bold text-cyan-400 shrink-0 w-8 text-right">{{ form.avance_preparacion }}%</span>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Detalles de Alistamiento</label>
                <input 
                  v-model="form.detalles_internos" 
                  type="text" 
                  placeholder="Ej: Service DSG, pintura"
                  class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-gray-100 text-xs transition-all"
                />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notas Internas</label>
              <textarea 
                v-model="form.notas_internas" 
                rows="2"
                placeholder="Notas mecánicas o comerciales internas..."
                class="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-slate-350 text-xs transition-all"
              ></textarea>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado Público</label>
            <select 
              v-model="form.estado"
              class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-200 text-sm transition-all"
            >
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>

          <!-- Sección de Datos de la Transacción (Condicional) -->
          <div 
            v-if="form.estado === 'reservado' || form.estado === 'vendido' || (!isEditing && form.valor_compra > 0)"
            class="border-t border-slate-900 pt-4 space-y-4 text-left"
          >
            <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Datos del Cliente & Transacción (Historial)</span>
            </h4>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {{ form.estado === 'reservado' || form.estado === 'vendido' ? 'Nombre del Comprador' : 'Nombre del Vendedor (Toma)' }}
                </label>
                <input 
                  v-model="form.transaccion_cliente_nombre" 
                  type="text" 
                  placeholder="Ej: Juan Pérez"
                  class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
                />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teléfono / Contacto</label>
                <input 
                  v-model="form.transaccion_cliente_contacto" 
                  type="text" 
                  placeholder="Ej: +54 9 341 555-001"
                  class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
                />
              </div>
            </div>

            <div v-if="form.estado === 'reservado' || form.estado === 'vendido'" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Monto de la Operación (ARS)</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <DollarSign class="w-4 h-4" />
                  </span>
                  <input 
                    v-model.number="form.transaccion_monto" 
                    type="number" 
                    class="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-gray-100 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vendedor a Cargo</label>
                <select 
                  v-model="form.transaccion_vendedor_id"
                  class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-200 text-sm transition-all"
                >
                  <option value="">Selecciona un vendedor</option>
                  <option v-for="v in vendedores" :key="v.id" :value="v.id">{{ v.nombre }}</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            class="w-full py-3 rounded-xl font-bold btn-gradient text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg text-sm mt-6"
          >
            <span>{{ isEditing ? 'Guardar Cambios' : 'Ingresar al Stock' }}</span>
          </button>
        </form>
      </div>
    </div>

  </div>
</template>
