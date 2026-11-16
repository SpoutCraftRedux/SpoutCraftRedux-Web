export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(event, 'upload', 20, 600_000, user.id)
  assertUploadSize(event, 'icon')
  const row = editable(await ownServer(user.id, getRouterParam(event, 'id')!))
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data.length)
  if (!file) fail(400, 'Upload an image as "file"', 'file')
  const hash = await storeImage('icon', file.data)
  await applyListingChanges(row, { iconHash: hash })
  return (await ownedById(row.id)).json
})
