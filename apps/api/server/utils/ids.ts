import { randomBytes } from 'node:crypto'

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

export function randomString(length: number, alphabet = ALPHABET) {
  const bytes = randomBytes(length)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export function newId(prefix: string) {
  return `${prefix}_${randomString(10)}`
}

export function newVerifyCode() {
  return `scr-${randomString(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789')}`
}

export function slugify(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'server'
}
