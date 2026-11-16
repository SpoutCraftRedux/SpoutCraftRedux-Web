import { and } from '@prisma/orm-postgres/orm-client'
import type { JsonValue } from '@prisma/orm-postgres/contract/types'

const DAY = 24 * 3600_000
export const DEFAULT_PROMO_SLOTS = 6

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await useDb().orm.public.Setting.where({ key }).first()
  return (row?.value as T | undefined) ?? fallback
}

export async function setSetting(key: string, value: JsonValue) {
  await useDb().orm.public.Setting.upsert({ create: { key, value }, update: { value } })
}

export const promoSlots = () => getSetting('promoSlots', DEFAULT_PROMO_SLOTS)

type Window = { start: number, end: number }

// Earliest start at or after `from` where fewer than `slots` paid promotions overlap the whole window
export function earliestStart(paid: Window[], from: number, days: number, slots: number) {
  const length = days * DAY
  const candidates = [from, ...paid.map(w => w.end).filter(e => e > from)].sort((a, b) => a - b)
  for (const c of candidates) {
    const end = c + length
    const points = [c, ...paid.map(w => w.start).filter(s => s > c && s < end)]
    const busiest = Math.max(...points.map(p => paid.filter(w => w.start <= p && w.end > p).length))
    if (busiest < slots) return c
  }
  return candidates.at(-1)!
}

export async function paidWindows() {
  const rows = await useDb().orm.public.Promotion.select('serverId', 'startsAt', 'endsAt')
    .where({ status: 'paid' }).where(p => p.endsAt.gt(new Date())).all()
  return rows.map(r => ({ serverId: r.serverId, start: r.startsAt!.getTime(), end: r.endsAt!.getTime() }))
}

// A server's new promotion queues after its own latest one
export async function nextStartFor(serverId: string | null, days: number) {
  const windows = await paidWindows()
  const own = serverId ? windows.filter(w => w.serverId === serverId).map(w => w.end) : []
  const from = Math.max(Date.now(), ...own)
  return new Date(earliestStart(windows, from, days, await promoSlots()))
}

export async function schedulePaid(promotionId: string, extra: Partial<Omit<PromotionRow, 'id'>> = {}) {
  const promotions = useDb().orm.public.Promotion
  const promo = await promotions.where({ id: promotionId }).first()
  if (!promo) return null
  if (promo.status === 'paid') return promo
  const start = extra.startsAt ? new Date(extra.startsAt) : await nextStartFor(promo.serverId, promo.days)
  const row = await promotions.where({ id: promotionId }).update({
    ...extra,
    status: 'paid',
    paidAt: new Date(),
    startsAt: start,
    endsAt: new Date(start.getTime() + promo.days * DAY)
  })
  return row!
}

export async function activePromotedIds(ids?: string[]) {
  const now = new Date()
  if (ids && !ids.length) return new Set<string>()
  const active = useDb().orm.public.Promotion.select('serverId').where({ status: 'paid' })
    .where(p => and(p.startsAt.lte(now), p.endsAt.gt(now)))
  const rows = await (ids ? active.where(p => p.serverId.in(ids)) : active).all()
  return new Set(rows.map(r => r.serverId))
}

export function promotionJson(row: PromotionRow, server?: { id: string, slug: string, name: string }) {
  const now = Date.now()
  const phase = row.status !== 'paid' ? row.status
    : row.startsAt!.getTime() > now ? 'scheduled'
      : row.endsAt!.getTime() > now ? 'active' : 'ended'
  return {
    id: row.id,
    ...(server ? { server } : {}),
    productId: row.productId,
    days: row.days,
    status: phase,
    source: row.source,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    amount: row.amount,
    currency: row.currency,
    transactionId: row.transactionId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null
  }
}
