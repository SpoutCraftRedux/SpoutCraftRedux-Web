import { z } from 'zod'

const Body = z.object({ username: fields.username, password: fields.password, email: fields.email })

export default defineEventHandler(async (event) => {
  rateLimit(event, 'register', 5, 3600_000)
  const body = await readValid(event, Body)
  if (await findByUsername(body.username)) fail(409, 'That username is taken', 'username')
  const user = await useDb().orm.public.User.create({
    id: newId('usr'),
    username: body.username,
    passwordHash: await hashPassword(body.password),
    email: body.email ?? null
  })
  await startSession(event, user!.id)
  setResponseStatus(event, 201)
  return { user: publicUser(user!, true) }
})
