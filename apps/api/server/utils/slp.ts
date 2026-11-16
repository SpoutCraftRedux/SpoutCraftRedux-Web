import { BlockList, Socket, isIP } from 'node:net'
import { Resolver } from 'node:dns/promises'

export interface PingResult {
  online: boolean
  version: string | null
  protocol: number | null
  playersOnline: number | null
  playersMax: number | null
  motd: string | null
  pingMs: number | null
  error?: string
}

const OFFLINE: PingResult = { online: false, version: null, protocol: null, playersOnline: null, playersMax: null, motd: null, pingMs: null }

// Separate lists: an IPv4 address would otherwise match the IPv4-mapped IPv6 rules
const BLOCKED_V4 = new BlockList()
const BLOCKED_V6 = new BlockList()
for (const [net, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) BLOCKED_V4.addSubnet(net, bits, 'ipv4')
for (const [net, bits] of [
  ['::', 128], ['::1', 128], ['::', 96], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64],
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]
] as const) BLOCKED_V6.addSubnet(net, bits, 'ipv6')

// Anything that is not a public unicast address counts as private, including unparseable input
export function isPrivateIp(ip: string) {
  const family = isIP(ip)
  if (family === 0) return true
  return family === 4 ? BLOCKED_V4.check(ip, 'ipv4') : BLOCKED_V6.check(ip, 'ipv6')
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string, onTimeout?: () => void): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error(message))
    }, ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

function resolver(timeoutMs: number) {
  const r = new Resolver({ timeout: Math.max(Math.min(timeoutMs, 2000), 100), tries: 2 })
  const servers = String(useRuntimeConfig().dnsServers ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (servers.length) r.setServers(servers)
  return r
}

async function addressesOf(dns: Resolver, host: string) {
  const [v4, v6] = await Promise.allSettled([dns.resolve4(host), dns.resolve6(host)])
  const list = [...(v4.status === 'fulfilled' ? v4.value : []), ...(v6.status === 'fulfilled' ? v6.value : [])]
  if (!list.length) throw new Error('Address does not resolve')
  return list
}

// Resolves the _minecraft._tcp SRV record like the game does, then refuses private targets
async function resolveTarget(dns: Resolver, host: string, port: number) {
  let target = { host, port }
  if (port === 25565 && isIP(host) === 0) {
    const srv = (await dns.resolveSrv(`_minecraft._tcp.${host}`).catch(() => []))
      .sort((a, b) => a.priority - b.priority || b.weight - a.weight)
    if (srv[0]) {
      const name = srv[0].name.replace(/\.$/, '')
      if (!name || isIP(name) !== 0) throw new Error('SRV record must point to a hostname')
      target = { host: name, port: srv[0].port }
    }
  }
  const ips = isIP(target.host) ? [target.host] : await addressesOf(dns, target.host)
  if (!useRuntimeConfig().allowPrivateTargets && ips.some(isPrivateIp)) throw new Error('Address points to a private network')
  return { ip: ips.find(ip => isIP(ip) === 4) ?? ips[0]!, port: target.port, host }
}

function varInt(value: number) {
  const out: number[] = []
  do {
    let byte = value & 0x7F
    value >>>= 7
    if (value) byte |= 0x80
    out.push(byte)
  } while (value)
  return Buffer.from(out)
}

function packet(id: number, payload: Buffer) {
  const body = Buffer.concat([varInt(id), payload])
  return Buffer.concat([varInt(body.length), body])
}

function readVarInt(buf: Buffer, offset: number): [number, number] | null {
  let value = 0
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null
    const byte = buf[offset + i]!
    value |= (byte & 0x7F) << (7 * i)
    if (!(byte & 0x80)) return [value, offset + i + 1]
  }
  throw new Error('VarInt too long')
}

// Plain text from any JSON chat value; non-text parts are skipped
export function plainMotd(chat: unknown, depth = 0): string {
  if (chat == null || depth > 16) return ''
  if (typeof chat === 'string') return chat.replace(/§./g, '')
  if (Array.isArray(chat)) return chat.map(c => plainMotd(c, depth + 1)).join('')
  if (typeof chat !== 'object') return ''
  const c = chat as Record<string, unknown>
  const text = typeof c.text === 'string' ? c.text : typeof c.translate === 'string' ? c.translate : ''
  return text.replace(/§./g, '') + (Array.isArray(c.extra) ? plainMotd(c.extra, depth + 1) : '')
}

const int = (v: unknown) => Number.isInteger(v) ? v as number : null

function fromStatus(s: Record<string, unknown>, pingMs: number | null): PingResult {
  const version = (s.version && typeof s.version === 'object' ? s.version : {}) as Record<string, unknown>
  const players = (s.players && typeof s.players === 'object' ? s.players : {}) as Record<string, unknown>
  return {
    online: true,
    version: typeof version.name === 'string' ? version.name.slice(0, 100) : null,
    protocol: int(version.protocol),
    playersOnline: int(players.online),
    playersMax: int(players.max),
    motd: plainMotd(s.description).slice(0, 500),
    pingMs
  }
}

function slp(target: { ip: string, port: number, host: string }, timeoutMs: number): Promise<PingResult> {
  return new Promise((done) => {
    const socket = new Socket()
    let buf = Buffer.alloc(0)
    let status: Record<string, unknown> | null = null
    let sentAt = 0
    let settled = false
    const finish = (result: PingResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      done(result)
    }
    const fallback = (error: string) => finish(status ? fromStatus(status, null) : { ...OFFLINE, error })
    const timer = setTimeout(() => fallback('Timed out'), timeoutMs)
    socket.on('error', err => fallback(err.message))
    socket.on('close', () => fallback('Connection closed'))
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      if (buf.length > 1 << 20) return finish({ ...OFFLINE, error: 'Response too large' })
      try {
        while (!settled) {
          const len = readVarInt(buf, 0)
          if (!len) return
          if (len[0] < 1 || len[0] > 1 << 20) throw new Error('Malformed response')
          if (buf.length < len[1] + len[0]) return
          const frame = buf.subarray(len[1], len[1] + len[0])
          buf = buf.subarray(len[1] + len[0])
          const id = readVarInt(frame, 0)
          if (!id) throw new Error('Malformed response')
          if (id[0] === 0 && !status) {
            const strLen = readVarInt(frame, id[1])
            if (!strLen) throw new Error('Malformed response')
            const parsed: unknown = JSON.parse(frame.subarray(strLen[1], strLen[1] + strLen[0]).toString('utf8'))
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Malformed status')
            status = parsed as Record<string, unknown>
            sentAt = Date.now()
            const payload = Buffer.alloc(8)
            payload.writeBigInt64BE(BigInt(sentAt))
            socket.write(packet(1, payload))
          } else if (id[0] === 1 && status) {
            finish(fromStatus(status, Date.now() - sentAt))
          }
        }
      } catch (err) {
        finish({ ...OFFLINE, error: err instanceof SyntaxError ? 'Malformed status' : (err as Error).message })
      }
    })
    socket.connect(target.port, target.ip, () => {
      const hostBuf = Buffer.from(target.host, 'utf8')
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(target.port)
      socket.write(packet(0, Buffer.concat([varInt(-1), varInt(hostBuf.length), hostBuf, portBuf, varInt(1)])))
      socket.write(packet(0, Buffer.alloc(0)))
    })
  })
}

// DNS and the ping share one deadline; the dialed address is the one that was checked
export async function pingServer(address: string, port: number, timeoutMs = 5000): Promise<PingResult> {
  const started = Date.now()
  const dns = resolver(timeoutMs)
  let target
  try {
    target = await withTimeout(resolveTarget(dns, address, port), timeoutMs, 'DNS lookup timed out', () => dns.cancel())
  } catch (err) {
    return { ...OFFLINE, error: (err as Error).message }
  }
  return slp(target, Math.max(timeoutMs - (Date.now() - started), 1))
}

// Rejects literal private IPs up front; hostnames are checked after DNS when pinged
export function isPrivateHost(address: string) {
  if (useRuntimeConfig().allowPrivateTargets) return false
  return isIP(address) !== 0 && isPrivateIp(address) || address === 'localhost' || address.endsWith('.local') || address.endsWith('.internal')
}
