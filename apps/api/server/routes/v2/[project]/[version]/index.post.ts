import { timingSafeEqual } from 'node:crypto'

// Upload a build: multipart with `file` and optional `build`, `result`, `duration`, `timestamp`, `commits` (JSON)
export default defineEventHandler(async (event) => {
  const token = useRuntimeConfig().uploadToken
  const given = getHeader(event, 'authorization')?.replace(/^Bearer /, '') ?? ''
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const project = getRouterParam(event, 'project')!
  const version = getRouterParam(event, 'version')!
  assertProject(project)
  assertSafe(version, 'version')

  const parts = await readMultipartFormData(event) ?? []
  const field = (name: string) => parts.find(p => p.name === name && !p.filename)?.data.toString('utf8')
  const file = parts.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Missing file' })
  const fileName = file.filename!.split(/[\\/]/).pop()!
  assertSafe(fileName, 'file name')
  if (!fileName.endsWith('.jar')) throw createError({ statusCode: 400, statusMessage: 'Only .jar files' })

  let commits = []
  try {
    commits = JSON.parse(field('commits') ?? '[]')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid commits JSON' })
  }

  const info = await saveBuild(project, version, {
    build: field('build') || undefined,
    result: field('result') === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
    timestamp: Number(field('timestamp')) || Date.now(),
    duration: Number(field('duration')) || 0,
    commits: Array.isArray(commits) ? commits.slice(0, 100).map(toCommit) : [],
    file_name: fileName
  }, file.data)
  setResponseStatus(event, 201)
  return info
})

function toCommit(c: Record<string, unknown>): Commit {
  const t = c.timestamp
  return {
    author: String(c.author ?? ''),
    email: String(c.email ?? ''),
    description: String(c.description ?? ''),
    hash: String(c.hash ?? ''),
    timestamp: typeof t === 'number' ? t : Date.parse(String(t)) || 0
  }
}
