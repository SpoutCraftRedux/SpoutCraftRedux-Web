export interface ProjectResponse {
  project: string
  metadata: { current: string | null }
  versions: string[]
}

export interface VersionResponse {
  project: string
  version: string
  builds: { latest: string | null, all: string[] }
}

export interface BuildCommit {
  author: string
  email: string
  description: string
  hash: string
  timestamp: number
}

export interface BuildResponse {
  project: string
  version: string
  build: string
  result: string
  timestamp: number
  duration: number
  commits: BuildCommit[]
  md5: string
  sha256: string
  file_name: string
  size: number
}

export interface DownloadProject {
  id: string
  label: string
  description: string
  icon: string
  repo: string
}

export const downloadProjects: DownloadProject[] = [
  {
    id: 'spoutcraftredux-server',
    label: 'Server',
    description: 'Paperclip server jar. Runs on Java 25 and loads Paper and Purpur plugins.',
    icon: 'i-lucide-server',
    repo: 'https://github.com/SpoutCraftRedux/SpoutCraftRedux-Server'
  },
  {
    id: 'spoutcraftredux-fabric',
    label: 'Client',
    description: 'Fabric mod. Place it in the mods folder alongside Fabric Loader and Fabric API.',
    icon: 'i-lucide-puzzle',
    repo: 'https://github.com/SpoutCraftRedux/SpoutCraftRedux-Client'
  }
]

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

export function isNotFound(error: unknown) {
  const err = error as { statusCode?: number, status?: number, response?: { status?: number } } | null
  return err?.statusCode === 404 || err?.status === 404 || err?.response?.status === 404
}
