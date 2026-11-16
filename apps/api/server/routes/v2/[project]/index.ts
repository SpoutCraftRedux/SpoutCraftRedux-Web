export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  assertProject(project)
  const all = await versions(project)
  return { project, metadata: { current: all.at(-1) ?? null }, versions: all }
})
