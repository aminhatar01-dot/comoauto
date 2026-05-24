import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Usamos el cliente de Supabase con Service Role Key en el backend para poder saltarnos RLS e insertar el lead de forma directa
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Asegurar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' })
  }

  const { text, agencia_id } = req.body

  if (!text || !agencia_id) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: text o agencia_id.' })
  }

  try {
    // LÓGICA SEMÁNTICA HEURÍSTICA DE EXTRACCIÓN
    const lowerText = text.toLowerCase()

    // 1. Extraer vehículo de interés
    const marcasModelos = [
      { marca: 'Ford', modelos: ['focus', 'fiesta', 'ecosport', 'ranger', 'ka'] },
      { marca: 'Volkswagen', modelos: ['gol', 'vento', 'amarok', 'polo', 't-cross'] },
      { marca: 'Toyota', modelos: ['corolla', 'hilux', 'etios', 'yaris', 'sw4'] },
      { marca: 'Fiat', modelos: ['cronos', 'toro', 'mobi', 'argo', 'uno'] },
      { marca: 'Chevrolet', modelos: ['cruze', 'onix', 'tracker', 's10', 'prisma'] },
      { marca: 'Peugeot', modelos: ['208', '308', '2008', 'partner'] }
    ]

    let autoDetectado = 'Indeterminado'
    for (const item of marcasModelos) {
      if (lowerText.includes(item.marca.toLowerCase())) {
        autoDetectado = item.marca
        for (const mod of item.modelos) {
          if (lowerText.includes(mod)) {
            autoDetectado = `${item.marca} ${mod.charAt(0).toUpperCase() + mod.slice(1)}`
            break
          }
        }
        break
      }
    }

    if (autoDetectado === 'Indeterminado') {
      for (const item of marcasModelos) {
        for (const mod of item.modelos) {
          if (lowerText.includes(mod)) {
            autoDetectado = `${item.marca} ${mod.charAt(0).toUpperCase() + mod.slice(1)}`
            break
          }
        }
        if (autoDetectado !== 'Indeterminado') break
      }
    }

    // 2. Extraer teléfono
    const telMatch = text.match(/(\+?\d{2,4}\s?\d{3,4}[-\s]?\d{4})/g)
    const telefono = telMatch ? telMatch[0].trim() : '+54911' + Math.floor(10000000 + Math.random() * 90000000)

    // 3. Extraer nombre
    const nameMatch = text.match(/(?:soy|nombre es|me llamo)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||
                      text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/)
    const nombre = nameMatch ? nameMatch[1].trim() : 'Cliente Web'

    // Clasificación semántica inicial
    const esCaliente = lowerText.includes('comprar') || lowerText.includes('precio') || lowerText.includes('interesa') || lowerText.includes('permuta')
    const clasificacion = esCaliente ? 'Caliente' : 'Tibio'

    // 4. Obtener configuración del Bot de la Agencia
    let config = { encendido: true, hora_inicio: '09:00', hora_fin: '20:00', estrategia: 'catalogo' }
    try {
      const { data: agenciaData } = await supabaseAdmin
        .from('agencias')
        .select('config_bot')
        .eq('id', agencia_id)
        .single()
      if (agenciaData && agenciaData.config_bot) {
        config = { ...config, ...agenciaData.config_bot }
      }
    } catch (e) {
      console.warn('No se pudo cargar la configuración de la agencia, se usan valores por defecto.', e)
    }

    // 5. Validar Horario Comercial (Hora de Servidor ajustada a UTC-3 Argentina)
    const ahora = new Date()
    const ahoraArg = new Date(ahora.getTime() - (3 * 60 * 60 * 1000)) // Conversión simple a UTC-3
    const horaActualStr = ahoraArg.toISOString().substring(11, 16) // Extrae HH:MM

    const dentroDeHorario = config.encendido && (horaActualStr >= config.hora_inicio && horaActualStr <= config.hora_fin)

    // Historial inicial
    const historial = [
      {
        emisor: 'cliente',
        mensaje: text,
        fecha: ahora.toISOString()
      }
    ]

    // Si está fuera de horario, añadir mensaje de encolamiento
    if (!dentroDeHorario && config.encendido) {
      historial.push({
        emisor: 'bot',
        mensaje: `[Sistema] Fuera de horario comercial (${config.hora_inicio} a ${config.hora_fin}). Mensaje encolado. Te contactaremos pronto.`,
        fecha: ahora.toISOString()
      })
    }

    // 6. Ruteo Rotativo Multi-vendedor
    let vendedorAsignadoId: string | null = null
    try {
      const { data: usuarios } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('agencia_id', agencia_id)
        .in('rol', ['vendedor', 'admin'])

      if (usuarios && usuarios.length > 0) {
        // Buscar el último lead asignado en esta agencia
        const { data: ultimoLead } = await supabaseAdmin
          .from('leads')
          .select('vendedor_asignado_id')
          .eq('agencia_id', agencia_id)
          .not('vendedor_asignado_id', 'is', null)
          .order('fecha_creacion', { ascending: false })
          .limit(1)

        const ultimoVendedorId = ultimoLead && ultimoLead.length > 0 ? ultimoLead[0].vendedor_asignado_id : null
        const indexUltimo = usuarios.findIndex(u => u.id === ultimoVendedorId)
        
        // Asignar al siguiente de forma rotatoria
        const siguienteIndex = (indexUltimo + 1) % usuarios.length
        vendedorAsignadoId = usuarios[siguienteIndex].id
      }
    } catch (e) {
      console.warn('Error al ejecutar el ruteo rotativo:', e)
    }

    // 7. Registrar lead en Supabase
    const { data: nuevoLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        agencia_id,
        nombre_cliente: nombre,
        telefono_whatsapp: telefono,
        estado_lead: 'nuevo',
        vendedor_asignado_id: vendedorAsignadoId,
        historial_conversacion: historial
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Retornar éxito
    return res.status(200).json({
      success: true,
      lead: nuevoLead,
      extraccion: {
        auto_detectado: autoDetectado,
        nombre,
        telefono,
        clasificacion,
        dentro_de_horario: dentroDeHorario,
        vendedor_asignado_id: vendedorAsignadoId
      }
    })

  } catch (err: any) {
    console.error('Error en /api/bot/hunt:', err.message)
    return res.status(500).json({ error: 'Error interno del servidor al registrar lead.', detalle: err.message })
  }
}
