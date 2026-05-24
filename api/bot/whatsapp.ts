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
    // 1. Simulación de llamada de salida a Evolution API / n8n Webhook
    // En producción, harías algo como:
    // await fetch('https://mi-servidor-n8n.com/webhook/despachar-whatsapp', { method: 'POST', body: JSON.stringify(...) })
    console.log(`[WhatsApp Bot] Despachando mensaje a ${nombre_cliente} (${telefono_whatsapp}) sobre el interés en ${auto_interes}`)

    // Mensaje automático del Bot
    const mensajeBot = `¡Hola ${nombre_cliente}! 🤖 Te escribo de ComoAuto. Vimos tu interés en el *${auto_interes}*. Te adjunto la ficha técnica: Precio y detalles disponibles en salón. ¿Te interesaría venir a verlo o hacer un test drive?`

    // 2. Obtener el historial actual del lead
    const { data: lead, error: getError } = await supabaseAdmin
      .from('leads')
      .select('historial_conversacion')
      .eq('id', lead_id)
      .single()

    if (getError) throw getError

    const historial = lead?.historial_conversacion || []
    
    // 3. Añadir el mensaje de bot al historial
    historial.push({
      emisor: 'bot',
      mensaje: mensajeBot,
      fecha: new Date().toISOString()
    })

    // 4. Actualizar el lead en la base de datos Supabase
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
      mensaje: 'Ficha del vehículo y contacto despachados con éxito.',
      texto_enviado: mensajeBot
    })

  } catch (err: any) {
    console.error('Error en /api/bot/whatsapp:', err.message)
    return res.status(500).json({ error: 'Error interno del servidor al enviar mensaje.', detalle: err.message })
  }
}
