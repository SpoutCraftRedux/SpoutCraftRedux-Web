import { z } from 'zod'

const Body = z.object({ username: z.string().max(100), password: z.string().max(200) })

export default defineEventHandler(async (event) => {
  rateLimit(event, 'login', 10, 60_000)
  const body = await readValid(event, Body)
  const user = await findByUsername(body.username)
  if (!user || !(await checkPassword(user.passwordHash, body.password))) fail(401, 'Wrong username or password')
  if (user.banned) fail(403, 'This account is banned')
  await startSession(event, user.id)
  return { user: publicUser(user, true) }
})
