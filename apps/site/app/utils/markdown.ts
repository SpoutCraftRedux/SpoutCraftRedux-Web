interface MdNode {
  type: string
  tag?: string
  value?: string
  props?: Record<string, unknown>
  children?: MdNode[]
}

const allowedTags = new Set([
  'p', 'a', 'strong', 'em', 'del', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote',
  'h3', 'h4', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
])

const headingMap: Record<string, string> = { h1: 'h3', h2: 'h3', h3: 'h4', h4: 'h4', h5: 'h4', h6: 'h4' }

const safeUrl = (value: unknown) => typeof value === 'string' && /^(https?:\/\/|mailto:)/i.test(value.trim())

function cleanProps(tag: string, props: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {}
  if (tag === 'a' && safeUrl(props.href)) {
    out.href = props.href
    out.target = '_blank'
    out.rel = 'nofollow noopener noreferrer ugc'
  }
  if (tag === 'pre') {
    if (typeof props.code === 'string') out.code = props.code
    if (typeof props.language === 'string' && /^[\w+-]{1,20}$/.test(props.language)) out.language = props.language
  }
  if ((tag === 'th' || tag === 'td') && ['left', 'right', 'center'].includes(String(props.align))) out.align = props.align
  return out
}

function sanitize(nodes: MdNode[] = []): MdNode[] {
  return nodes.flatMap<MdNode>((node) => {
    if (node.type === 'text') return [{ type: 'text', value: String(node.value ?? '') }]
    if (node.type !== 'element' || !node.tag) return []
    // Owner images would load from any host, so only their alt text is kept
    if (node.tag === 'img') return typeof node.props?.alt === 'string' && node.props.alt ? [{ type: 'text', value: node.props.alt }] : []
    const tag = headingMap[node.tag] ?? node.tag
    const children = sanitize(node.children)
    if (!allowedTags.has(tag)) return ['script', 'style', 'template', 'iframe'].includes(tag) ? [] : children
    return [{ type: 'element', tag, props: cleanProps(tag, node.props), children }]
  })
}

export async function renderSafeMarkdown(source: string) {
  const parsed = await parseMarkdown(source, { highlight: false, toc: false, contentHeading: false })
  return { type: 'root' as const, children: sanitize(parsed.body.children as MdNode[]) as typeof parsed.body.children }
}
