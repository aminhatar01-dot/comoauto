import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Habilitar CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' })
  }

  const { apiUrl, apiToken, action, instanceName } = req.body

  if (!apiUrl || !apiToken || !action || !instanceName) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' })
  }

  const cleanApiUrl = apiUrl.replace(/\/$/, '')

  try {
    let response: any
    let targetUrl = ''

    if (action === 'create') {
      targetUrl = `${cleanApiUrl}/instance/create`
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiToken
        },
        body: JSON.stringify({
          instanceName,
          token: apiToken,
          qrcode: true
        })
      })
    } else if (action === 'connect') {
      targetUrl = `${cleanApiUrl}/instance/connect/${instanceName}`
      response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'apikey': apiToken
        }
      })
    } else if (action === 'connectionState') {
      targetUrl = `${cleanApiUrl}/instance/connectionState/${instanceName}`
      response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'apikey': apiToken
        }
      })
    } else if (action === 'logout') {
      targetUrl = `${cleanApiUrl}/instance/logout/${instanceName}`
      response = await fetch(targetUrl, {
        method: 'DELETE',
        headers: {
          'apikey': apiToken
        }
      })
    } else if (action === 'delete') {
      targetUrl = `${cleanApiUrl}/instance/delete/${instanceName}`
      response = await fetch(targetUrl, {
        method: 'DELETE',
        headers: {
          'apikey': apiToken
        }
      })
    } else {
      return res.status(400).json({ error: 'Acción no válida.' })
    }

    const contentType = response.headers.get('content-type')
    let responseData: any
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    return res.status(response.status).json({
      status: response.status,
      ok: response.ok,
      data: responseData
    })

  } catch (err: any) {
    console.error('[WhatsApp Proxy Error]:', err.message)
    return res.status(500).json({ error: 'Error al contactar con la pasarela de WhatsApp.', detalle: err.message })
  }
}
