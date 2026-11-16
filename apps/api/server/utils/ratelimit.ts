import type { H3Event } from 'h3'
import { BlockList, isIP } from 'node:net'

// From https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6 (fetched 2026-11-16)
const CLOUDFLARE_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32'
]

export function cidrList(ranges: string[]) {
  const list = new BlockList()
  for (const range of ranges) {
    const [net, bits] = range.trim().split('/')
    const family = isIP(net ?? '')
    if (!family) continue
    const prefix = bits === undefined ? (family === 4 ? 32 : 128) : Number(bits)
    list.addSubnet(net!, prefix, family === 4 ? 'ipv4' : 'ipv6')
  }
  return list
}

export function inList(list: BlockList, ip: string) {
  const family = isIP(ip)
  return family !== 0 && list.check(ip, family === 4 ? 'ipv4' : 'ipv6')
}

const cloudflare = cidrList(CLOUDFLARE_RANGES)
let proxies: { source: string, list: BlockList } | undefined

function trustedProxies() {
  const source = String(useRuntimeConfig().trustedProxies ?? '')
  if (proxies?.source !== source) proxies = { source, list: cidrList(source.split(',').filter(Boolean)) }
  return proxies.list
}

const unmap = (ip: string) => ip.toLowerCase().startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip

// Peer of the edge: the socket, or the last X-Forwarded-For hop when the socket is a trusted proxy
function edgePeer(event: H3Event) {
  const socket = unmap(event.node.req.socket.remoteAddress ?? '')
  if (!inList(trustedProxies(), socket)) return socket
  const last = unmap((getHeader(event, 'x-forwarded-for') ?? '').split(',').at(-1)!.trim())
  return isIP(last) ? last : socket
}

export function clientIp(event: H3Event) {
  const peer = edgePeer(event)
  if (inList(cloudflare, peer)) {
    const cf = unmap((getHeader(event, 'cf-connecting-ip') ?? '').trim())
    if (isIP(cf)) return cf
  }
  return peer || 'unknown'
}

const MAX_BUCKETS = 50_000
const buckets = new Map<string, { count: number, resetAt: number }>()

function sweep(now: number) {
  for (const [id, b] of buckets) if (b.resetAt <= now) buckets.delete(id)
}

// Fixed-window limiter; the API runs as one instance, so memory is enough
export function rateLimit(event: H3Event, name: string, limit: number, windowMs: number, key = clientIp(event)) {
  const now = Date.now()
  const id = `${name}:${key}`
  let bucket = buckets.get(id)
  if (!bucket || bucket.resetAt <= now) {
    if (bucket) buckets.delete(id)
    if (buckets.size >= MAX_BUCKETS) sweep(now)
    while (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value!)
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(id, bucket)
  }
  bucket.count++
  if (bucket.count > limit) {
    setResponseHeader(event, 'retry-after', Math.ceil((bucket.resetAt - now) / 1000))
    throw createError({ statusCode: 429, message: 'Too many requests, try again later' })
  }
}

setInterval(() => sweep(Date.now()), 60_000).unref()
