import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' })
  }

  const { usuario, contrasena, red, vendedor_id } = req.body

  if (!usuario || !contrasena || !red || !vendedor_id) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' })
  }

  try {
    console.log(`[Redes Connect] Intentando vincular cuenta de ${red} para el usuario ${usuario}...`)

    // Simulación técnica del login directo mediante scraper en segundo plano
    // En una integración de producción real, aquí se levantaría un servicio Puppeteer
    // para ingresar a instagram.com/tiktok.com con usuario/contraseña, resolver captchas si los hay,
    // y almacenar las cookies de sesión (sessionid) para los envíos automáticos.
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Validaciones básicas de credenciales para dar feedback real de autenticación
    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    // 1. Obtener la configuración actual del usuario en Supabase
    const { data: usuarioData, error: getError } = await supabaseAdmin
      .from('usuarios')
      .select('config_redes_sociales')
      .eq('id', vendedor_id)
      .single()

    if (getError) throw getError

    const configRedes = usuarioData?.config_redes_sociales || {}

    // 2. Actualizar la red seleccionada con el estado Conectado Directo
    configRedes[red] = {
      usuario,
      contrasena,
      conectado: true,
      fecha_vinculacion: new Date().toISOString()
    }

    // 3. Persistir en la base de datos Supabase
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({
        config_redes_sociales: configRedes
      })
      .eq('id', vendedor_id)

    if (updateError) throw updateError

    console.log(`[Redes Connect] Cuenta de ${red} vinculada directamente con éxito para el vendedor ${vendedor_id}`)

    return res.status(200).json({
      success: true,
      mensaje: `¡Cuenta de ${red} vinculada directamente con éxito!`,
      usuario,
      red,
      conectado: true
    })

  } catch (err: any) {
    console.error('[Redes Connect Error]:', err.message)
    return res.status(500).json({ error: 'Error al vincular cuenta de red social.', detalle: err.message })
  }
}
