import { z } from 'zod'

const Body = z.object({
  name: fields.name,
  address: fields.address,
  port: fields.port.default(25565),
  shortDescription: fields.shortDescription,
  description: fields.description.default(''),
  tags: fields.tags,
  website: fields.website,
  discord: fields.discord
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(event, 'create-server', 10, 3600_000, user.id)
  const body = await readValid(event, Body)
  if (isPrivateHost(body.address)) fail(400, 'Address must be public', 'address')
  const id = newId('srv')
  await useDb().orm.public.Server.createAndCount([{
    id,
    slug: await uniqueSlug(body.name),
    ownerId: user.id,
    name: body.name,
    address: body.address,
    port: body.port,
    shortDescription: body.shortDescription,
    description: body.description,
    website: body.website ?? null,
    discord: body.discord ?? null,
    verifyCode: newVerifyCode()
  }])
  await setTags(id, body.tags)
  setResponseStatus(event, 201)
  return (await ownedById(id)).json
})
