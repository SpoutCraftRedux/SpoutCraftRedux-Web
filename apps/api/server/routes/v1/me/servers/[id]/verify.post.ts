export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(event, 'verify', 6, 60_000, user.id)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  const { address, port } = effectiveTarget(row)
  const result = await pingServer(address, port)
  if (!result.online) return { verified: verifiedFor(row), motd: null, error: result.error ?? 'The server did not answer' }
  const hasCode = (result.motd ?? '').toLowerCase().includes(row.verifyCode.toLowerCase())
  const isScr = !!result.version?.startsWith(SPOUTCRAFTREDUX_PREFIX)
  const found = hasCode && isScr && await markVerified(row.id, address, port)
  return {
    verified: found || verifiedFor(row),
    motd: result.motd,
    version: result.version,
    error: !isScr
      ? `The server reports "${result.version ?? 'unknown'}". Only servers running SpoutCraft Redux can be listed.`
      : !hasCode ? `The MOTD does not contain ${row.verifyCode}` : found ? undefined : 'The address changed while verifying; verify again'
  }
})
