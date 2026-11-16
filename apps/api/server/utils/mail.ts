import { createTransport } from 'nodemailer'

let transport: ReturnType<typeof createTransport> | null | undefined

export async function sendMail(to: string | null | undefined, subject: string, text: string) {
  const { smtpUrl, mailFrom } = useRuntimeConfig()
  if (!to || !smtpUrl) return
  transport ??= createTransport(smtpUrl)
  await transport.sendMail({ from: mailFrom, to, subject, text }).catch(err => console.error('mail failed', err))
}

export async function notifyOwner(server: { ownerId: string, name: string, slug: string }, outcome: 'approved' | 'rejected' | 'changes', note?: string) {
  const owner = await useDb().orm.public.User.select('email').where({ id: server.ownerId }).first()
  const subject = {
    approved: `${server.name} is approved`,
    rejected: `${server.name} was not approved`,
    changes: `${server.name} needs changes`
  }[outcome]
  const body = [
    outcome === 'approved' ? `Your listing for ${server.name} on the SpoutCraft Redux server list is approved.` : `Staff reviewed your listing for ${server.name} on the SpoutCraft Redux server list.`,
    note ? `\nNote from staff:\n${note}` : '',
    `\nManage it at https://spoutcraftredux.org/dashboard`
  ].join('\n')
  await sendMail(owner?.email, subject, body)
}
