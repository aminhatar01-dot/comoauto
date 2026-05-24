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

// Formulario reactivo
const form = ref({
  marca: '',
  modelo: '',
  anio: new Date().getFullYear(),
  precio: 0,
  kilometraje: 0,
  estado: 'disponible',
  dias_en_stock: 0
})

onMounted(async () => {
  await loadVehiculos()
})

const loadVehiculos = async () => {
  loading.value = true
  errorMsg.value = null
  
  if (authStore.isDemoMode) {
    // Si no hay vehículos en memoria para demo, creamos los iniciales
    if (vehiculos.value.length === 0) {
      vehiculos.value = [
        { id: '1', marca: 'Ford', modelo: 'Focus III 2.0 SE', anio: 2017, precio: 3400000, kilometraje: 89000, estado: 'disponible', dias_en_stock: 58 },
        { id: '2', marca: 'Volkswagen', modelo: 'Vento 2.0 TSI Sportline', anio: 2016, precio: 4950000, kilometraje: 110000, estado: 'disponible', dias_en_stock: 62 },
        { id: '3', marca: 'Fiat', modelo: 'Cronos 1.3 Drive', anio: 2021, precio: 3900000, kilometraje: 42000, estado: 'disponible', dias_en_stock: 12 },
        { id: '4', marca: 'Toyota', modelo: 'Corolla 1.8 SEG', anio: 2018, precio: 5400000, kilometraje: 95000, estado: 'reservado', dias_en_stock: 49 },
        { id: '5', marca: 'Chevrolet', modelo: 'Cruze 1.4T LTZ', anio: 2019, precio: 5100000, kilometraje: 54000, estado: 'disponible', dias_en_stock: 75 },
        { id: '6', marca: 'Honda', modelo: 'Civic 1.8 LXS', anio: 2015, precio: 3100000, kilometraje: 125000, estado: 'vendido', dias_en_stock: 22 }
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
    dias_en_stock: 0
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
    dias_en_stock: Number(veh.dias_en_stock)
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
    // Modo Demo en Memoria
    setTimeout(() => {
      if (isEditing.value && currentId.value) {
        // Editar
        const index = vehiculos.value.findIndex(v => v.id === currentId.value)
        if (index !== -1) {
          vehiculos.value[index] = {
            ...vehiculos.value[index],
            ...form.value
          }
          showSuccess('Vehículo actualizado exitosamente (Demo)')
        }
      } else {
        // Crear
        const nuevo = {
          id: 'veh-' + Date.now(),
          ...form.value
        }
        vehiculos.value.unshift(nuevo)
        showSuccess('Vehículo agregado al inventario (Demo)')
      }
      isModalOpen.value = false
      loading.value = false
    }, 600)
  } else {
    // Guardar en Supabase real
    try {
      if (isEditing.value && currentId.value) {
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
            dias_en_stock: form.value.dias_en_stock
          })
          .eq('id', currentId.value)

        if (error) throw error
        showSuccess('¡Vehículo actualizado correctamente!')
      } else {
        // Insert
        const { error } = await supabase
          .from('vehiculos')
          .insert({
            agencia_id: authStore.activeAgenciaId,
            marca: form.value.marca,
            modelo: form.value.modelo,
            anio: form.value.anio,
            precio: form.value.precio,
            kilometraje: form.value.kilometraje,
            estado: form.value.estado,
            dias_en_stock: form.value.dias_en_stock
          })

        if (error) throw error
        showSuccess('¡Vehículo agregado al stock de la concesionaria!')
      }
      isModalOpen.value = false
      await loadVehiculos()
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
          <div class="grid grid-cols-2 gap-4 border-t border-b border-slate-800/60 py-3 text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-slate-500" />
              <span>Año {{ veh.anio }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Gauge class="w-4 h-4 text-slate-500" />
              <span>{{ veh.kilometraje.toLocaleString() }} km</span>
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
          <div class="flex justify-between items-baseline pt-2">
            <span class="text-xs text-slate-400 uppercase tracking-wider">Precio en Salón</span>
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

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
            <select 
              v-model="form.estado"
              class="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 outline-none text-slate-200 text-sm transition-all"
            >
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
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
