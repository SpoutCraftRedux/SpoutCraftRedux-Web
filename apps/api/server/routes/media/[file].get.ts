import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const file = getRouterParam(event, 'file')!
  const match = /^([a-f0-9]{64})\.(png|webp)$/.exec(file)
  if (!match) throw createError({ statusCode: 404, message: 'Not found' })
  const path = join(mediaDir(), file)
  const info = await stat(path).catch(() => null)
  if (!info) throw createError({ statusCode: 404, message: 'Not found' })
  setResponseHeaders(event, {
    'content-type': match[2] === 'png' ? 'image/png' : 'image/webp',
    'content-length': info.size,
    'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': '*'
  })
  return sendStream(event, createReadStream(path))
})
