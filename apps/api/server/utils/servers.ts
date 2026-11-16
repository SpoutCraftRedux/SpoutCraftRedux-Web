// Fields an owner edits; a pending revision holds a partial copy of these
export interface ListingFields {
  name: string
  address: string
  port: number
  shortDescription: string
  description: string
  iconHash: string | null
  bannerHash: string | null
}

export type ServerUpdate = Partial<Omit<ServerRow, 'id' | 'pendingRevision'>> & { pendingRevision?: Partial<ListingFields> | null }

export const LISTING_KEYS = ['name', 'address', 'port', 'shortDescription', 'description', 'iconHash', 'bannerHash'] as const satisfies readonly (keyof ListingFields)[]

export const targetKey = (address: string, port: number) => `${address}:${port}`

export const revisionOf = (row: ServerRow) => row.pendingRevision as Partial<ListingFields> | null

// Address and port the listing will have once any pending revision is approved
export function effectiveTarget(row: ServerRow) {
  const rev = revisionOf(row)
  return { address: rev?.address ?? row.address, port: rev?.port ?? row.port }
}

export function verifiedFor(row: ServerRow, target = effectiveTarget(row)) {
  return row.verified && row.verifiedTarget === targetKey(target.address, target.port)
}

// Owners can't change a listing while staff review it
export function editable(row: ServerRow) {
  if (row.state === 'pending') fail(409, 'Withdraw the listing from review before editing')
  return row
}

// Sets verified only if the listing still points at the target that answered
export async function markVerified(id: string, address: string, port: number) {
  const db = useDb()
  const rows = await db.query(db.raw.sql`update servers set verified = true, verified_target = ${targetKey(address, port)}, updated_at = now()
    where id = ${id} and coalesce(pending_revision->>'address', address) = ${address}
    and coalesce((pending_revision->>'port')::int, port) = ${port} returning id`
    .returnsRow({ id: { codecId: 'pg/text@1', nullable: false } }).build())
  return rows.length > 0
}

export async function updateServer(id: string, update: ServerUpdate) {
  return useDb().orm.public.Server.where({ id }).update(update)
}

export async function loadExtras(ids: string[]) {
  const db = useDb()
  const tags = new Map<string, string[]>()
  const status = new Map<string, StatusRow>()
  if (!ids.length) return { tags, status, promoted: new Set<string>() }
  const [tagRows, statusRows, promoted] = await Promise.all([
    db.orm.public.ServerTag.where(t => t.serverId.in(ids)).all(),
    db.orm.public.ServerStatus.where(s => s.serverId.in(ids)).all(),
    activePromotedIds(ids)
  ])
  for (const t of tagRows) tags.set(t.serverId, [...(tags.get(t.serverId) ?? []), t.tagSlug])
  for (const s of statusRows) status.set(s.serverId, s)
  for (const list of tags.values()) list.sort()
  return { tags, status, promoted }
}

export function statusJson(s: StatusRow | undefined) {
  if (!s) return { online: false, players: null, version: null, protocol: null, motd: null, pingMs: null, checkedAt: null, uptime24h: null }
  return {
    online: s.online,
    players: s.playersOnline == null ? null : { online: s.playersOnline, max: s.playersMax ?? 0 },
    version: s.version,
    protocol: s.protocol,
    motd: s.motd,
    pingMs: s.pingMs,
    checkedAt: s.checkedAt.toISOString(),
    uptime24h: s.uptime24h
  }
}

export function isSpoutCraftRedux(s: StatusRow | undefined) {
  return !!s?.version?.startsWith(SPOUTCRAFTREDUX_PREFIX)
}

export function summaryJson(row: ServerRow, tags: string[], status: StatusRow | undefined, promoted = false) {
  return {
    slug: row.slug,
    name: row.name,
    address: row.address,
    port: row.port,
    shortDescription: row.shortDescription,
    tags,
    iconUrl: mediaUrl(row.iconHash, 'icon'),
    bannerUrl: mediaUrl(row.bannerHash, 'banner'),
    featured: row.featured,
    promoted,
    spoutcraftredux: isSpoutCraftRedux(status),
    status: statusJson(status)
  }
}

export function serverJson(row: ServerRow, tags: string[], status: StatusRow | undefined, ownerName: string, promoted = false) {
  return {
    ...summaryJson(row, tags, status, promoted),
    description: row.description,
    website: row.website,
    discord: row.discord,
    owner: { username: ownerName },
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null
  }
}

export function ownedJson(row: ServerRow, tags: string[], status: StatusRow | undefined, ownerName: string, promoted = false) {
  const rev = revisionOf(row)
  return {
    ...serverJson(row, tags, status, ownerName, promoted),
    id: row.id,
    state: row.state,
    listed: row.listed,
    verified: row.verified,
    verifyCode: row.verifyCode,
    reviewNote: row.reviewNote,
    sortWeight: row.sortWeight,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    pendingRevision: rev
      ? {
          ...Object.fromEntries(Object.entries(rev).filter(([k]) => k !== 'iconHash' && k !== 'bannerHash')),
          ...('iconHash' in rev ? { iconUrl: mediaUrl(rev.iconHash, 'icon') } : {}),
          ...('bannerHash' in rev ? { bannerUrl: mediaUrl(rev.bannerHash, 'banner') } : {}),
          submittedAt: row.revisionSubmittedAt?.toISOString() ?? null
        }
      : null
  }
}

export async function ownedById(id: string) {
  const r = await useDb().orm.public.Server.where({ id }).include('owner', o => o.select('username')).first()
  if (!r) throw createError({ statusCode: 404, message: 'Server not found' })
  const { owner, ...row } = r
  const { tags, status, promoted } = await loadExtras([id])
  return { row, json: ownedJson(row, tags.get(id) ?? [], status.get(id), owner!.username, promoted.has(id)) }
}

export async function ownServer(userId: string, id: string) {
  const row = await useDb().orm.public.Server.where({ id, ownerId: userId }).first()
  if (!row) throw createError({ statusCode: 404, message: 'Server not found' })
  return row
}

export async function setTags(serverId: string, slugs: string[]) {
  const db = useDb()
  const unique = [...new Set(slugs)]
  const known = unique.length ? await db.orm.public.Tag.where(t => t.slug.in(unique)).all() : []
  if (known.length !== unique.length) fail(400, 'Unknown tag', 'tags')
  await db.orm.public.ServerTag.where({ serverId }).deleteAndCount()
  if (unique.length) await db.orm.public.ServerTag.createAndCount(unique.map(tagSlug => ({ serverId, tagSlug })))
}

export async function uniqueSlug(name: string) {
  const base = slugify(name)
  const db = useDb()
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    const taken = await db.orm.public.Server.select('id').where({ slug }).first()
    if (!taken) return slug
  }
  return `${base}-${randomString(4)}`
}

// Applies listing changes in place, or into the pending revision once a listing is approved
export async function applyListingChanges(row: ServerRow, changes: Partial<ListingFields>, extra: ServerUpdate = {}) {
  const update: ServerUpdate = { ...extra, updatedAt: new Date() }
  const current = revisionOf(row)
  if (row.state === 'approved') {
    const rev: Partial<ListingFields> = { ...(current ?? {}) }
    for (const key of LISTING_KEYS) {
      if (changes[key] === undefined) continue
      if (changes[key] === row[key]) delete rev[key]
      else (rev as Record<string, unknown>)[key] = changes[key]
    }
    const hasRev = Object.keys(rev).length > 0
    update.pendingRevision = hasRev ? rev : null
    update.revisionSubmittedAt = hasRev ? (current ? row.revisionSubmittedAt : new Date()) : null
  } else {
    for (const key of LISTING_KEYS) if (changes[key] !== undefined) (update as Record<string, unknown>)[key] = changes[key]
  }
  const rev = row.state === 'approved' ? update.pendingRevision : null
  const address = update.address ?? rev?.address ?? row.address
  const port = update.port ?? rev?.port ?? row.port
  update.verified = row.verifiedTarget === targetKey(address, port)
  const saved = await useDb().orm.public.Server.where({ id: row.id, state: row.state }).update(update)
  if (!saved) fail(409, 'The listing changed while saving; reload and try again')
  return saved
}

// Pings a server and stores its status; an offline result keeps the last known version
export async function recordStatus(serverId: string, address: string, port: number) {
  const db = useDb()
  const result = await pingServer(address, port)
  const now = new Date()
  await db.orm.public.StatusCheck.createAndCount([{ serverId, checkedAt: now, online: result.online, players: result.playersOnline }])
  const since = new Date(Date.now() - 24 * 3600_000)
  const [uptime] = await db.query(db.raw.sql`select avg(case when online then 1.0 else 0.0 end)::real as v from status_checks where server_id = ${serverId} and checked_at >= ${since.toISOString()}::timestamptz`
    .returnsRow({ v: { codecId: 'pg/float4@1', nullable: true } }).build())
  const values = {
    online: result.online,
    playersOnline: result.playersOnline,
    playersMax: result.playersMax,
    ...(result.online ? { version: result.version, protocol: result.protocol } : {}),
    motd: result.online ? result.motd : null,
    pingMs: result.pingMs,
    uptime24h: uptime?.v ?? null,
    checkedAt: now
  }
  await db.orm.public.ServerStatus.upsert({ create: { serverId, version: null, protocol: null, ...values }, update: values })
  return result
}

export const SPOUTCRAFTREDUX_PREFIX = 'SpoutCraft Redux'
