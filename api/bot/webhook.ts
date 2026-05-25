import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verificación GET de Meta (Webhooks verification)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode && token) {
      if (mode === 'subscribe' && token === 'comoauto_secret_token_verify_2026') {
        console.log('[Webhook Meta] Verificación exitosa.')
        return res.status(200).send(challenge)
      } else {
        return res.status(403).json({ error: 'Token de verificación inválido.' })
      }
    }
    return res.status(400).json({ error: 'Parámetros inválidos.' })
  }

  // 2. Procesamiento de eventos POST (Mensajes entrantes)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar GET o POST.' })
  }

  const payload = req.body
  console.log('[Webhook Event] Recibido payload:', JSON.stringify(payload))

  try {
    let senderId = ''
    let senderName = 'Cliente Redes'
    let messageText = ''
    let canal: 'facebook' | 'instagram' | 'tiktok' = 'instagram'
    let recipientId = '' // ID de la página/cuenta destino para asociar al vendedor

    // A. Detectar formato Meta (Facebook Messenger o Instagram Direct)
    if (payload.object === 'page' || payload.object === 'instagram') {
      canal = payload.object === 'page' ? 'facebook' : 'instagram'
      const entry = payload.entry?.[0]
      recipientId = entry?.id || ''

      // Procesar mensaje directo (messaging)
      if (entry?.messaging?.[0]) {
        const messagingEvent = entry.messaging[0]
        senderId = messagingEvent.sender?.id || ''
        messageText = messagingEvent.message?.text || ''
      }
      // Procesar comentario (changes)
      else if (entry?.changes?.[0]) {
        const change = entry.changes[0]
        if (change.field === 'feed' || change.field === 'comments' || change.field === 'messages') {
          senderId = change.value?.from?.id || ''
          senderName = change.value?.from?.name || 'Cliente Redes'
          messageText = change.value?.message || change.value?.text || ''
        }
      }
    }
    // B. Detectar formato TikTok DM Webhook
    else if (payload.event === 'message' || payload.event_id) {
      canal = 'tiktok'
      senderId = payload.content?.sender_openid || payload.sender_openid || ''
      messageText = payload.content?.text || payload.text || ''
      recipientId = payload.content?.recipient_openid || ''
    }

    if (!senderId || !messageText) {
      console.warn('[Webhook] No se pudo extraer senderId o messageText. Ignorando evento.')
      return res.status(200).json({ success: false, info: 'Payload no procesable.' })
    }

    console.log(`[Webhook] Evento parsed: Canal: ${canal}, Remitente: ${senderId}, Mensaje: "${messageText}", Destinatario: ${recipientId}`)

    // 3. Buscar vendedor y agencia propietaria de la cuenta
    let vendedorAsignadoId: string | null = null
    let agenciaId: string | null = null
    let metaToken = ''
    let tiktokToken = ''
    let configBotAgencia = { encendido: true, hora_inicio: '09:00', hora_fin: '20:00', estrategia: 'catalogo' }

    // Consultar todos los usuarios para mapear por sus configuraciones de canales
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, agencia_id, nombre, config_redes_sociales')

    if (usuarios && usuarios.length > 0) {
      // Buscar match por usuario de red, access token o destinatario
      const match = usuarios.find((u: any) => {
        const redes = u.config_redes_sociales || {}
        if (canal === 'instagram' && (redes.instagram?.usuario?.includes(senderId) || redes.instagram?.usuario?.includes(recipientId))) return true
        if (canal === 'tiktok' && (redes.tiktok?.usuario?.includes(senderId) || redes.tiktok?.usuario?.includes(recipientId))) return true
        if (redes.meta_access_token && canal !== 'tiktok') return true
        if (redes.tiktok_access_token && canal === 'tiktok') return true
        return false
      })

      if (match) {
        vendedorAsignadoId = match.id
        agenciaId = match.agencia_id
        metaToken = match.config_redes_sociales?.meta_access_token || ''
        tiktokToken = match.config_redes_sociales?.tiktok_access_token || ''
        console.log(`[Webhook] Mapeado a vendedor: ${match.nombre} (Agencia: ${agenciaId})`)
      } else {
        // Fallback: Tomar el primer usuario de la base de datos
        vendedorAsignadoId = usuarios[0].id
        agenciaId = usuarios[0].agencia_id
        metaToken = usuarios[0].config_redes_sociales?.meta_access_token || ''
        tiktokToken = usuarios[0].config_redes_sociales?.tiktok_access_token || ''
        console.log(`[Webhook Fallback] Mapeado a vendedor por defecto: ${usuarios[0].nombre}`)
      }
    }

    if (!agenciaId) {
      throw new Error('No se encontró ninguna agencia para asignar este lead.')
    }

    // Cargar la configuración del bot de la agencia
    const { data: agenciaData } = await supabaseAdmin
      .from('agencias')
      .select('config_bot')
      .eq('id', agenciaId)
      .single()

    if (agenciaData && agenciaData.config_bot) {
      configBotAgencia = { ...configBotAgencia, ...agenciaData.config_bot }
    }

    // 4. Analizador Semántico IA: Determinar vehículo de interés
    // Obtener los vehículos disponibles de la agencia para el cotejo semántico
    const { data: vehiculos } = await supabaseAdmin
      .from('vehiculos')
      .select('id, marca, modelo, precio')
      .eq('agencia_id', agenciaId)
      .eq('estado', 'disponible')

    let autoInteres = 'Indeterminado'
    let autoPrecio = 0
    if (vehiculos && vehiculos.length > 0) {
      for (const v of vehiculos) {
        if (messageText.toLowerCase().includes(v.marca.toLowerCase()) || 
            messageText.toLowerCase().includes(v.modelo.toLowerCase())) {
          autoInteres = `${v.marca} ${v.modelo}`
          autoPrecio = Number(v.precio || 0)
          break
        }
      }
    }

    // 5. Cargar o crear el Lead en Supabase
    const telefonoLeadIdentificador = `${canal}:${senderId}`
    let leadExistente: any = null

    const { data: getLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('agencia_id', agenciaId)
      .eq('telefono_whatsapp', telefonoLeadIdentificador)
      .maybeSingle()

    let historialConversacion: any[] = []

    if (getLead) {
      leadExistente = getLead
      historialConversacion = getLead.historial_conversacion || []
      console.log(`[Webhook] Lead existente encontrado. ID: ${leadExistente.id}`)
    }

    // Agregar el mensaje actual del cliente al historial
    historialConversacion.push({
      emisor: 'cliente',
      mensaje: messageText,
      fecha: new Date().toISOString()
    })

    let leadId = ''

    if (leadExistente) {
      leadId = leadExistente.id
      await supabaseAdmin
        .from('leads')
        .update({
          historial_conversacion: historialConversacion,
          estado_lead: 'nuevo' // Marcar de nuevo como nuevo por mensaje entrante
        })
        .eq('id', leadId)
    } else {
      // Crear nuevo Lead
      const { data: nuevoLead, error: createError } = await supabaseAdmin
        .from('leads')
        .insert([{
          agencia_id: agenciaId,
          nombre_cliente: senderName === 'Cliente Redes' ? `Usuario ${canal.toUpperCase()} ${senderId.slice(-4)}` : senderName,
          telefono_whatsapp: telefonoLeadIdentificador,
          estado_lead: 'nuevo',
          vendedor_asignado_id: vendedorAsignadoId,
          historial_conversacion: historialConversacion,
          auto_interes: autoInteres !== 'Indeterminado' ? autoInteres : 'Consulta General'
        }])
        .select()
        .single()

      if (createError) throw createError
      leadId = nuevoLead.id
      console.log(`[Webhook] Nuevo lead creado de forma automática. ID: ${leadId}`)
    }

    // 6. Respuesta Automática del Bot por IA si está encendido y en horario
    let botRespondio = false
    let respuestaTexto = ''

    // Comprobación de horario de atención
    const ahora = new Date()
    const horaActualStr = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const enHorario = horaActualStr >= configBotAgencia.hora_inicio && horaActualStr <= configBotAgencia.hora_fin

    if (configBotAgencia.encendido && enHorario) {
      if (configBotAgencia.estrategia === 'financiacion') {
        respuestaTexto = `¡Hola! 🤖 Te escribo de ComoAuto. Respecto a tu consulta, contamos con planes de financiación express de hasta el 50% del valor de la unidad en cuotas fijas en pesos, pre-aprobado solo con tu DNI. ¿Te interesaría simular tu plan?`
      } else if (configBotAgencia.estrategia === 'ofertas') {
        respuestaTexto = `¡Hola! 🤖 ¡Buenas noticias! Te escribo de ComoAuto. Si concretas esta semana, te bonificamos el 100% del costo de gestoría y transferencia. ¿Te gustaría agendar una visita al salón?`
      } else {
        respuestaTexto = `¡Hola! 🤖 Gracias por contactarte con ComoAuto. Vimos tu consulta. ${autoInteres !== 'Indeterminado' ? `El precio del *${autoInteres}* es de $${autoPrecio.toLocaleString()} ARS.` : ''} ¿Te gustaría que un asesor comercial te llame para darte más detalles?`
      }

      // Enviar la respuesta a la API de la red social correspondiente de forma real
      let enviadoReal = false
      if ((canal === 'instagram' || canal === 'facebook') && metaToken) {
        try {
          const metaRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${metaToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: respuestaTexto }
            })
          })
          if (metaRes.ok) {
            enviadoReal = true
            console.log('[Webhook Meta API] Respuesta enviada con éxito.')
          } else {
            console.warn('[Webhook Meta API] Error enviando respuesta:', await metaRes.json())
          }
        } catch (metaErr: any) {
          console.error('[Webhook Meta API] Excepción al enviar:', metaErr.message)
        }
      } else if (canal === 'tiktok' && tiktokToken) {
        try {
          const tiktokRes = await fetch(`https://open.tiktokapis.com/v1.3/im/send/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tiktokToken}`
            },
            body: JSON.stringify({
              recipient_openid: senderId,
              message: { text: respuestaTexto }
            })
          })
          if (tiktokRes.ok) {
            enviadoReal = true
            console.log('[Webhook TikTok API] Respuesta enviada con éxito.')
          } else {
            console.warn('[Webhook TikTok API] Error enviando respuesta:', await tiktokRes.json())
          }
        } catch (tiktokErr: any) {
          console.error('[Webhook TikTok API] Excepción al enviar:', tiktokErr.message)
        }
      }

      // Guardar en el historial la respuesta del bot
      historialConversacion.push({
        emisor: 'bot',
        mensaje: respuestaTexto,
        fecha: new Date().toISOString()
      })

      await supabaseAdmin
        .from('leads')
        .update({
          historial_conversacion: historialConversacion,
          estado_lead: 'en_contacto'
        })
        .eq('id', leadId)

      botRespondio = true
      console.log(`[Webhook Bot] Respuesta automatizada despachada. Canal: ${canal}. Envío Real: ${enviadoReal}`)
    } else {
      console.log(`[Webhook Bot] Bot apagado o fuera de rango horario (${horaActualStr}). No se despacha respuesta automática.`)
    }

    return res.status(200).json({
      success: true,
      lead_id: leadId,
      bot_respondio: botRespondio,
      texto_respuesta: respuestaTexto,
      asignado_a: vendedorAsignadoId
    })

  } catch (err: any) {
    console.error('[Webhook Error] Error procesando webhook:', err.message)
    return res.status(500).json({ error: 'Error interno del servidor procesando evento.', detalle: err.message })
  }
}
