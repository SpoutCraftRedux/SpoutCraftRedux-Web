import type { User } from '~/utils/servers'

let pending: Promise<User | null> | null = null

export function useAuth() {
  const user = useState<User | null>('auth-user', () => null)
  const ready = useState('auth-ready', () => false)
  const api = useApi()

  const isStaff = computed(() => user.value?.role === 'staff')

  async function load(force = false): Promise<User | null> {
    if (import.meta.server) return null
    if (ready.value && !force) return user.value
    pending ??= api<{ user: User }>('/auth/me')
      .then(res => res.user)
      .catch(() => null)
      .then((value) => {
        user.value = value
        ready.value = true
        pending = null
        return value
      })
    return pending
  }

  async function login(username: string, password: string) {
    const res = await api<{ user: User }>('/auth/login', { method: 'POST', body: { username, password } })
    user.value = res.user
    ready.value = true
    return res.user
  }

  async function register(body: { username: string, password: string, email?: string }) {
    const res = await api<{ user: User }>('/auth/register', { method: 'POST', body })
    user.value = res.user
    ready.value = true
    return res.user
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      ready.value = true
    }
  }

  return { user, ready, isStaff, load, login, register, logout }
}

export function safeRedirect(value: unknown, fallback = '/dashboard') {
  const target = Array.isArray(value) ? value[0] : value
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : fallback
}
