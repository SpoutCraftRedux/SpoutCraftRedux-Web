import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface Commit {
  author: string
  email: string
  description: string
  hash: string
  timestamp: number
}

export interface Build {
  project: string
  version: string
  build: string
  result: 'SUCCESS' | 'FAILURE'
  timestamp: number
  duration: number
  commits: Commit[]
  md5: string
  sha256: string
  file_name: string
  size: number
}

const SAFE = /^[\w.+-]{1,64}$/

export function dataDir() {
  return resolve(useRuntimeConfig().dataDir)
}

export function projects(): string[] {
  return useRuntimeConfig().projects.split(',').map((p: string) => p.trim()).filter(Boolean)
}

export function assertProject(project: string) {
  if (!projects().includes(project)) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
}

export function assertSafe(value: string, what: string) {
  if (!SAFE.test(value) || value.startsWith('.')) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${what}` })
  }
}

async function dirs(path: string) {
  try {
    return (await readdir(path, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)
  } catch {
    return []
  }
}

export async function versions(project: string) {
  const all = await dirs(join(dataDir(), project))
  const withTime = await Promise.all(all.map(async v => ({ v, t: (await stat(join(dataDir(), project, v))).birthtimeMs })))
  return withTime.sort((a, b) => a.t - b.t).map(x => x.v)
}

export async function builds(project: string, version: string) {
  const all = await dirs(join(dataDir(), project, version))
  return all.filter(b => /^\d+$/.test(b)).sort((a, b) => Number(a) - Number(b))
}

export async function getBuild(project: string, version: string, build: string): Promise<Build> {
  assertSafe(version, 'version')
  if (build === 'latest') {
    const all = await builds(project, version)
    const ok = []
    for (const b of all.reverse()) {
      const info = await getBuild(project, version, b).catch(() => null)
      if (info?.result === 'SUCCESS') {
        ok.push(info)
        break
      }
    }
    if (!ok[0]) throw createError({ statusCode: 404, statusMessage: 'No builds' })
    return ok[0]
  }
  assertSafe(build, 'build')
  try {
    return JSON.parse(await readFile(join(dataDir(), project, version, build, 'build.json'), 'utf8'))
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Build not found' })
  }
}

export function buildFile(b: Build) {
  return join(dataDir(), b.project, b.version, b.build, b.file_name)
}

let lock = Promise.resolve()

export function saveBuild(project: string, version: string, input: Omit<Build, 'project' | 'version' | 'build' | 'md5' | 'sha256' | 'size'> & { build?: string }, data: Buffer) {
  const run = lock.then(async () => {
    const existing = await builds(project, version)
    const build = input.build ?? String(existing.length ? Number(existing.at(-1)) + 1 : 1)
    assertSafe(build, 'build')
    if (existing.includes(build)) throw createError({ statusCode: 409, statusMessage: 'Build already exists' })
    const dir = join(dataDir(), project, version, build)
    const tmp = `${dir}.tmp`
    await mkdir(tmp, { recursive: true })
    const info: Build = {
      project,
      version,
      build,
      result: input.result,
      timestamp: input.timestamp,
      duration: input.duration,
      commits: input.commits,
      md5: createHash('md5').update(data).digest('hex'),
      sha256: createHash('sha256').update(data).digest('hex'),
      file_name: input.file_name,
      size: data.length
    }
    await writeFile(join(tmp, info.file_name), data)
    await writeFile(join(tmp, 'build.json'), JSON.stringify(info, null, 2))
    await rename(tmp, dir)
    return info
  })
  lock = run.then(() => undefined, () => undefined)
  return run
}
