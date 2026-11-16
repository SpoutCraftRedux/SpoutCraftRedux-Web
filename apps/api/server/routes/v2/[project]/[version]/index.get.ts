export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  const version = getRouterParam(event, 'version')!
  assertProject(project)
  assertSafe(version, 'version')
  const all = await builds(project, version)
  if (!all.length && !(await versions(project)).includes(version)) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found' })
  }
  const latest = await getBuild(project, version, 'latest').catch(() => null)
  return { project, version, builds: { latest: latest?.build ?? null, all } }
})
