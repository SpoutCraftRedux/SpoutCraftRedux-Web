import type { H3Event } from 'h3'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, access, rename, readdir, stat, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

export type ImageKind = 'icon' | 'banner'

const LIMITS: Record<ImageKind, { maxBytes: number, formats: string[] }> = {
  icon: { maxBytes: 512 * 1024, formats: ['png', 'jpeg', 'webp'] },
  banner: { maxBytes: 2 * 1024 * 1024, formats: ['png', 'jpeg', 'webp', 'gif'] }
}
const MULTIPART_OVERHEAD = 16 * 1024
const MAX_FRAMES = 200
const MAX_PIXELS = 40_000_000
const MAX_JOBS = 2
const MAX_QUEUED = 16

export function mediaDir() {
  return resolve(useRuntimeConfig().mediaDir)
}

export function mediaUrl(hash: string | null | undefined, kind: ImageKind) {
  if (!hash) return null
  return `${useRuntimeConfig().publicUrl}/media/${hash}.${kind === 'icon' ? 'png' : 'webp'}`
}

// Checks the declared size before any of the body is read
export function assertUploadSize(event: H3Event, kind: ImageKind) {
  if (getHeader(event, 'transfer-encoding')) fail(411, 'Send uploads with a Content-Length header')
  const length = getHeader(event, 'content-length')
  if (!length || !/^\d+$/.test(length)) fail(411, 'Send uploads with a Content-Length header')
  if (Number(length) > LIMITS[kind].maxBytes + MULTIPART_OVERHEAD) fail(413, `Image must be at most ${LIMITS[kind].maxBytes / 1024} KB`, 'file')
  if (!(getHeader(event, 'content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) fail(415, 'Upload the image as multipart/form-data')
}

let active = 0
const waiting: (() => void)[] = []

// Keeps image work to a couple of libuv threads so argon2 and file reads keep running
async function imageJob<T>(job: () => Promise<T>): Promise<T> {
  if (active >= MAX_JOBS && waiting.length >= MAX_QUEUED) fail(503, 'Image processing is busy, try again shortly')
  while (active >= MAX_JOBS) await new Promise<void>(r => waiting.push(r))
  active++
  try {
    return await job()
  } finally {
    active--
    waiting.shift()?.()
  }
}

// Re-encodes the upload (which also drops metadata) and stores it under its SHA-256
export async function storeImage(kind: ImageKind, data: Buffer) {
  const limit = LIMITS[kind]
  if (data.length > limit.maxBytes) fail(400, `Image must be at most ${limit.maxBytes / 1024} KB`, 'file')
  const animated = kind === 'banner'
  const input = { animated, limitInputPixels: MAX_PIXELS }
  const out = await imageJob(async () => {
    let meta
    try {
      meta = await sharp(data, input).metadata()
    } catch {
      fail(400, 'File is not a supported image', 'file')
    }
    if (!meta.format || !limit.formats.includes(meta.format)) fail(400, `Image must be ${limit.formats.join(', ').toUpperCase()}`, 'file')
    const frames = meta.pages ?? 1
    const frameHeight = meta.pageHeight ?? meta.height ?? 0
    if ((meta.width ?? 0) > 4096 || frameHeight > 4096) fail(400, 'Image is too large', 'file')
    if (frames > MAX_FRAMES) fail(400, `Animated banners can have at most ${MAX_FRAMES} frames`, 'file')
    if ((meta.width ?? 0) * frameHeight * frames > MAX_PIXELS) fail(400, 'Image is too large', 'file')
    const pipeline = kind === 'icon'
      ? sharp(data, input).resize(64, 64, { fit: 'cover' }).png()
      : sharp(data, input).resize(468, 60, { fit: 'cover' }).webp({ quality: 85 })
    return pipeline.timeout({ seconds: 10 }).toBuffer().catch((err: Error) => {
      if (/timeout/i.test(err.message)) fail(400, 'Image took too long to process', 'file')
      fail(400, 'File is not a supported image', 'file')
    })
  })
  const hash = createHash('sha256').update(out).digest('hex')
  const dir = mediaDir()
  await mkdir(dir, { recursive: true })
  const file = join(dir, `${hash}.${kind === 'icon' ? 'png' : 'webp'}`)
  await access(file).catch(async () => {
    const tmp = `${file}.${randomString(8)}.tmp`
    await writeFile(tmp, out)
    await rename(tmp, file)
  })
  return hash
}

// Deletes media older than `minAgeMs` that no listing or pending revision uses
export async function pruneMedia(minAgeMs: number) {
  const db = useDb()
  const rows = await db.query(db.raw.sql`select h from (
    select icon_hash as h from servers union select banner_hash from servers
    union select pending_revision->>'iconHash' from servers union select pending_revision->>'bannerHash' from servers
  ) t where h is not null`.returnsRow({ h: { codecId: 'pg/text@1', nullable: false } }).build())
  const used = new Set(rows.map(r => r.h))
  const dir = mediaDir()
  const names = await readdir(dir).catch(() => [] as string[])
  let removed = 0
  for (const name of names) {
    const match = /^([a-f0-9]{64})\.(png|webp)(\..+\.tmp)?$/.exec(name)
    if (!match || (used.has(match[1]!) && !match[3])) continue
    const info = await stat(join(dir, name)).catch(() => null)
    if (!info || Date.now() - info.mtimeMs < minAgeMs) continue
    await unlink(join(dir, name)).then(() => removed++, () => null)
  }
  return removed
}
