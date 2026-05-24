import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' })
  }

  const { lead_id, nombre_cliente, telefono_whatsapp, auto_interes } = req.body

  if (!lead_id || !nombre_cliente || !telefono_whatsapp || !auto_interes) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' })
  }

  try {
    // 1. Obtener el lead y su agencia_id desde la base de datos
    const { data: lead, error: getError } = await supabaseAdmin
      .from('leads')
      .select('agencia_id, historial_conversacion')
      .eq('id', lead_id)
      .single()

    if (getError) throw getError
    const agenciaId = lead?.agencia_id
    const historial = lead?.historial_conversacion || []

    // 2. Obtener la configuración del bot de la agencia
    let config = { estrategia: 'catalogo' }
    try {
      const { data: agenciaData } = await supabaseAdmin
        .from('agencias')
        .select('config_bot')
        .eq('id', agenciaId)
        .single()
      if (agenciaData && agenciaData.config_bot) {
        config = { ...config, ...agenciaData.config_bot }
      }
    } catch (e) {
      console.warn('Error al cargar config_bot en whatsapp endpoint, usando catálogo por defecto.', e)
    }

    // 3. Seleccionar la plantilla de respuesta adecuada
    let mensajeBot = ''
    if (config.estrategia === 'financiacion') {
      mensajeBot = `¡Hola ${nombre_cliente}! 🤖 Te escribo de ComoAuto por tu consulta sobre el *${auto_interes}*. Contamos con un plan de financiación express de hasta el 50% del valor del vehículo en cuotas fijas en pesos y pre-aprobado solo con tu DNI. ¿Te interesaría realizar una simulación rápida de tu cuota?`
    } else if (config.estrategia === 'ofertas') {
      mensajeBot = `¡Hola ${nombre_cliente}! 🤖 ¡Buenas noticias! Te escribo de ComoAuto. El *${auto_interes}* en el que te interesaste cuenta con una promoción exclusiva de semana: ¡Transferencia y gestoría bonificada 100%! ¿Te gustaría reservar una visita en el salón para verlo hoy?`
    } else {
      // catálogo
      mensajeBot = `¡Hola ${nombre_cliente}! 🤖 Te escribo de ComoAuto. Vimos tu interés en el *${auto_interes}*. Te adjunto la ficha técnica: Precio y detalles disponibles en salón para entrega inmediata. ¿Te interesaría pasar a verlo o programar un test drive?`
    }

    console.log(`[WhatsApp Bot] Despachando mensaje a ${nombre_cliente} (${telefono_whatsapp}) bajo estrategia: ${config.estrategia}`)

    // 4. Añadir el mensaje de bot al historial
    historial.push({
      emisor: 'bot',
      mensaje: mensajeBot,
      fecha: new Date().toISOString()
    })

    // 5. Actualizar el lead en la base de datos Supabase
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        estado_lead: 'en_contacto',
        historial_conversacion: historial
      })
      .eq('id', lead_id)

    if (updateError) throw updateError

    return res.status(200).json({
      success: true,
      mensaje: 'Mensaje de WhatsApp automático despachado correctamente.',
      estrategia: config.estrategia,
      texto_enviado: mensajeBot
    })

  } catch (err: any) {
    console.error('Error en /api/bot/whatsapp:', err.message)
    return res.status(500).json({ error: 'Error interno del servidor al enviar mensaje.', detalle: err.message })
  }
}
