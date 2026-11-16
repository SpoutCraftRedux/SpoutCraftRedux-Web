import type { H3Event } from 'h3'
import { z } from 'zod'

export function fail(statusCode: number, message: string, field?: string): never {
  throw createError({ statusCode, message, data: field ? { field } : undefined })
}

export function parseWith<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]!
    fail(400, issue.message, issue.path.map(String).join('.') || undefined)
  }
  return result.data
}

// JSON bodies only, so plain HTML forms can't reach these routes
export async function readValid<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const length = getHeader(event, 'content-length')
  const hasBody = !!getHeader(event, 'transfer-encoding') || (length !== undefined && length !== '0')
  if (!hasBody) return parseWith(schema, {})
  const type = (getHeader(event, 'content-type') ?? '').split(';')[0]!.trim().toLowerCase()
  if (type !== 'application/json') fail(415, 'Send the body as application/json')
  const body = await readBody(event).catch(() => fail(400, 'Body must be JSON'))
  return parseWith(schema, body ?? {})
}

export function queryValid<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  return parseWith(schema, getQuery(event))
}

const optionalUrl = (check: (u: URL) => boolean, message: string) => z.union([
  z.literal('').transform(() => null),
  z.null(),
  z.string().max(200).url(message).refine((s) => {
    try {
      const u = new URL(s)
      return u.protocol === 'https:' && check(u)
    } catch {
      return false
    }
  }, message)
]).optional()

export const fields = {
  username: z.string().regex(/^\w{3,24}$/, 'Username must be 3 to 24 letters, digits or underscores'),
  password: z.string().min(10, 'Password must be at least 10 characters').max(200, 'Password is too long'),
  email: z.union([z.literal('').transform(() => null), z.null(), z.string().max(200).email('Email address is not valid')]).optional(),
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(48, 'Name must be at most 48 characters'),
  address: z.string().trim().toLowerCase().max(253).regex(/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$|^\d{1,3}(\.\d{1,3}){3}$/, 'Address must be a hostname or IPv4 address'),
  port: z.coerce.number().int().min(1).max(65535),
  shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(120, 'Short description must be at most 120 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters'),
  tags: z.array(z.string()).min(1, 'Pick at least one tag').max(5, 'Pick at most 5 tags'),
  website: optionalUrl(() => true, 'Website must be an https:// URL'),
  discord: optionalUrl(u => ['discord.gg', 'discord.com', 'www.discord.com'].includes(u.hostname), 'Discord link must be on discord.gg or discord.com')
}
