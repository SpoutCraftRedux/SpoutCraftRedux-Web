import { createReadStream } from 'node:fs'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  assertProject(project)
  const b = await getBuild(project, getRouterParam(event, 'version')!, getRouterParam(event, 'build')!)
  if (b.result !== 'SUCCESS') throw createError({ statusCode: 404, statusMessage: 'Build failed' })
  setResponseHeaders(event, {
    'content-type': 'application/java-archive',
    'content-disposition': `attachment; filename="${b.file_name}"`,
    'content-length': b.size,
    'x-checksum-sha256': b.sha256,
    'cache-control': getRouterParam(event, 'build') === 'latest' ? 'public, max-age=60' : 'public, max-age=31536000, immutable'
  })
  return sendStream(event, createReadStream(buildFile(b)))
})
