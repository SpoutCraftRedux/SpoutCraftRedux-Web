const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

function allowedOrigins() {
  const list = String(useRuntimeConfig().corsOrigins).split(',').map(o => o.trim()).filter(Boolean)
  return import.meta.dev ? [...list, 'http://localhost:3000'] : list
}

function refererOrigin(referer: string | undefined) {
  try {
    return referer ? new URL(referer).origin : undefined
  } catch {
    return undefined
  }
}

// Credentialed CORS for the website on the v1 API; writes must come from an allowed origin
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/v1')) return
  const origin = getHeader(event, 'origin')
  const allowed = allowedOrigins()
  if (origin && allowed.includes(origin)) {
    setResponseHeaders(event, {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': 600,
      'vary': 'origin'
    })
  } else if (event.method === 'GET') {
    setResponseHeader(event, 'access-control-allow-origin', '*')
  }
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
  if (!SAFE_METHODS.includes(event.method)) {
    const source = origin ?? refererOrigin(getHeader(event, 'referer'))
    if (!source || !allowed.includes(source)) throw createError({ statusCode: 403, message: 'Requests must come from the SpoutCraft Redux website' })
  }
})
