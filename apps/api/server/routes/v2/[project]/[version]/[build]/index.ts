export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  assertProject(project)
  return getBuild(project, getRouterParam(event, 'version')!, getRouterParam(event, 'build')!)
})
