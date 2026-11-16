import { z } from 'zod'

const Body = z.object({
  name: fields.name.optional(),
  address: fields.address.optional(),
  port: fields.port.optional(),
  shortDescription: fields.shortDescription.optional(),
  description: fields.description.optional(),
  tags: fields.tags.optional(),
  website: fields.website,
  discord: fields.discord,
  listed: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = editable(await ownServer(user.id, getRouterParam(event, 'id')!))
  const body = await readValid(event, Body)
  if (body.address && isPrivateHost(body.address)) fail(400, 'Address must be public', 'address')
  const extra: ServerUpdate = {}
  if (body.website !== undefined) extra.website = body.website
  if (body.discord !== undefined) extra.discord = body.discord
  if (body.listed !== undefined) extra.listed = body.listed
  await applyListingChanges(row, {
    name: body.name,
    address: body.address,
    port: body.port,
    shortDescription: body.shortDescription,
    description: body.description
  }, extra)
  if (body.tags) await setTags(row.id, body.tags)
  return (await ownedById(row.id)).json
})
