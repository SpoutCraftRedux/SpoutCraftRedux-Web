export default defineEventHandler(async (event) => {
  await requireStaff(event)
  await useDb().orm.public.Tag.where({ slug: getRouterParam(event, 'slug')! }).deleteAndCount()
  setResponseStatus(event, 204)
  return null
})
