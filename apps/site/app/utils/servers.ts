import { z } from 'zod'

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export type Role = 'user' | 'staff'

export interface User {
  id: string
  username: string
  role: Role
  email?: string | null
  createdAt: string
  banned?: boolean
}

export interface ServerStatus {
  online: boolean
  players: { online: number, max: number } | null
  version: string | null
  protocol: number | null
  motd: string | null
  pingMs: number | null
  checkedAt: string | null
  uptime24h: number | null
}

export interface ServerSummary {
  slug: string
  name: string
  address: string
  port: number
  shortDescription: string
  tags: string[]
  iconUrl: string | null
  bannerUrl: string | null
  featured: boolean
  promoted: boolean
  spoutcraftredux: boolean
  status: ServerStatus | null
}

export interface Server extends ServerSummary {
  description: string
  website: string | null
  discord: string | null
  owner: { username: string }
  createdAt: string
  approvedAt: string | null
}

export type ServerState = 'draft' | 'pending' | 'approved' | 'changes_requested' | 'rejected'

export type RevisionFields = Partial<Pick<Server, 'name' | 'address' | 'port' | 'shortDescription' | 'description' | 'iconUrl' | 'bannerUrl'>>

export interface OwnedServer extends Server {
  id: string
  state: ServerState
  listed: boolean
  verified: boolean
  verifyCode: string
  reviewNote: string | null
  pendingRevision: (RevisionFields & { submittedAt: string }) | null
  sortWeight?: number
  submittedAt?: string | null
}

export interface Tag {
  slug: string
  name: string
  count: number
}

export interface Paged {
  page: number
  perPage: number
  total: number
}

export type ReportReason = 'offline' | 'wrong_info' | 'inappropriate' | 'scam' | 'other'

export interface Report {
  id: string
  server: { id: string, slug: string, name: string } | null
  reason: ReportReason
  details: string | null
  reporter: { username: string } | null
  status: 'open' | 'resolved'
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface QueueItem {
  server: OwnedServer
  kind: 'new' | 'revision'
  submittedAt: string
}

export interface VerifyResult {
  verified: boolean
  motd: string | null
  version: string | null
  error?: string
}

export type PromotionStatus = 'scheduled' | 'active' | 'ended' | 'cancelled' | 'refunded'

export interface Promotion {
  id: string
  days: number
  status: PromotionStatus
  source: 'tebex' | 'staff'
  startsAt: string
  endsAt: string
  amount: string | null
  currency: string | null
  transactionId: string | null
  note: string | null
  createdAt: string
  paidAt: string | null
}

export interface AdminPromotion extends Promotion {
  server: { id: string, slug: string, name: string } | null
}

export const promotionStatusMeta: Record<PromotionStatus, { label: string, color: BadgeColor }> = {
  scheduled: { label: 'Scheduled', color: 'info' },
  active: { label: 'Active', color: 'success' },
  ended: { label: 'Ended', color: 'neutral' },
  cancelled: { label: 'Cancelled', color: 'warning' },
  refunded: { label: 'Refunded', color: 'error' }
}

export function formatAmount(promotion: Pick<Promotion, 'amount' | 'currency'>) {
  if (promotion.amount == null) return '—'
  const value = Number(promotion.amount)
  if (!promotion.currency || !Number.isFinite(value)) return promotion.amount
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: promotion.currency }).format(value)
  } catch {
    return `${promotion.amount} ${promotion.currency}`
  }
}

export const reportReasons: { label: string, value: ReportReason }[] = [
  { label: 'Server is offline', value: 'offline' },
  { label: 'Wrong information', value: 'wrong_info' },
  { label: 'Inappropriate content', value: 'inappropriate' },
  { label: 'Scam', value: 'scam' },
  { label: 'Something else', value: 'other' }
]

export const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Most players', value: 'players' },
  { label: 'Newest', value: 'newest' },
  { label: 'Name', value: 'name' }
] as const

export type SortValue = typeof sortOptions[number]['value']

export const stateMeta: Record<ServerState, { label: string, color: BadgeColor, icon: string }> = {
  draft: { label: 'Draft', color: 'neutral', icon: 'i-lucide-pencil-line' },
  pending: { label: 'In review', color: 'info', icon: 'i-lucide-hourglass' },
  approved: { label: 'Approved', color: 'success', icon: 'i-lucide-circle-check' },
  changes_requested: { label: 'Changes requested', color: 'warning', icon: 'i-lucide-message-square-warning' },
  rejected: { label: 'Rejected', color: 'error', icon: 'i-lucide-circle-x' }
}

export const reasonLabel = (reason: string) => reportReasons.find(r => r.value === reason)?.label ?? reason

export function serverAddress(server: Pick<ServerSummary, 'address' | 'port'>) {
  return server.port && server.port !== 25565 ? `${server.address}:${server.port}` : server.address
}

export function formatPlayers(status: ServerStatus | null | undefined) {
  if (!status?.online || !status.players) return '—'
  return `${status.players.online.toLocaleString()} / ${status.players.max.toLocaleString()}`
}

export function formatUptime(value: number | null | undefined) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(value >= 0.999 || value === 0 ? 0 : 1)}%`
}

export function formatIso(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function canSubmit(server: OwnedServer) {
  return server.verified && ['draft', 'changes_requested', 'rejected'].includes(server.state)
}

const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/i
const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

function isPrivateIpv4(value: string) {
  const [a = 0, b = 0] = value.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

const optionalHttps = z.string().trim().max(200).refine(v => !v || /^https:\/\/[^\s/]+\.[^\s]+$/i.test(v), 'Must be an https:// URL')

export const usernameSchema = z.string().trim()
  .min(3, 'At least 3 characters')
  .max(24, 'At most 24 characters')
  .regex(/^\w+$/, 'Letters, numbers and underscores only')

export const passwordSchema = z.string().min(10, 'At least 10 characters').max(200, 'At most 200 characters')

export const serverFormSchema = z.object({
  name: z.string().trim().min(3, 'At least 3 characters').max(48, 'At most 48 characters'),
  address: z.string().trim().toLowerCase()
    .refine(v => ipv4Pattern.test(v) || hostnamePattern.test(v), 'Enter a hostname or IPv4 address')
    .refine(v => !ipv4Pattern.test(v) || !isPrivateIpv4(v), 'Private, loopback and link-local addresses are not allowed'),
  port: z.number({ error: 'Enter a port' }).int().min(1, '1 to 65535').max(65535, '1 to 65535'),
  shortDescription: z.string().trim().min(10, 'At least 10 characters').max(120, 'At most 120 characters'),
  description: z.string().max(5000, 'At most 5000 characters'),
  tags: z.array(z.string()).min(1, 'Pick at least one tag').max(5, 'Pick up to 5 tags'),
  website: optionalHttps,
  discord: optionalHttps.refine(v => !v || /^https:\/\/(www\.)?(discord\.gg|discord\.com)\//i.test(v), 'Must be a discord.gg or discord.com link')
})

export type ServerFormData = z.output<typeof serverFormSchema>

export const iconRules = { types: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 512 * 1024, label: 'PNG, JPEG or WebP, up to 512 KB. Shown at 64×64.' }
export const bannerRules = { types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], maxBytes: 2 * 1024 * 1024, label: 'PNG, JPEG, WebP or GIF, up to 2 MB. Shown at 468×60, animation is kept.' }
