import { version as appVersion } from '@root/package.json'

type VersionParts = {
  main: number[]
  pre: (number | string)[]
}

type GitHubRelease = {
  tag_name: string
  name: string | null
  body: string | null
  html_url: string
  draft: boolean
}

export type AppUpdate = {
  available: true
  version: string
  body: string | null
  releaseUrl: string
}

const RELEASES_API =
  'https://api.github.com/repos/ClaraCora/Corage/releases?per_page=30'
const SEMVER_FULL_REGEX =
  /^\d+(?:\.\d+){1,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

const normalizeVersion = (input: string | null | undefined): string | null => {
  if (typeof input !== 'string') return null
  const normalized = input.trim().replace(/^v/i, '')
  return normalized && SEMVER_FULL_REGEX.test(normalized) ? normalized : null
}

const splitVersion = (version: string): VersionParts => {
  const versionWithoutBuild = version.split('+')[0]
  const [mainPart, preRelease] = versionWithoutBuild.split('-')
  const main = mainPart.split('.').map((part) => Number.parseInt(part, 10))
  const pre =
    preRelease?.split('.').map((token) => {
      const numeric = Number.parseInt(token, 10)
      return Number.isNaN(numeric) ? token : numeric
    }) ?? []

  return { main, pre }
}

const compareVersions = (a: string, b: string): number => {
  const partsA = splitVersion(a)
  const partsB = splitVersion(b)
  const length = Math.max(partsA.main.length, partsB.main.length)

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA.main[i] ?? 0) - (partsB.main[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }

  if (partsA.pre.length === 0 && partsB.pre.length === 0) return 0
  if (partsA.pre.length === 0) return 1
  if (partsB.pre.length === 0) return -1

  const preLength = Math.max(partsA.pre.length, partsB.pre.length)
  for (let i = 0; i < preLength; i += 1) {
    const aToken = partsA.pre[i]
    const bToken = partsB.pre[i]
    if (aToken === undefined) return -1
    if (bToken === undefined) return 1
    if (aToken === bToken) continue
    if (typeof aToken === 'number' && typeof bToken === 'number') {
      return aToken > bToken ? 1 : -1
    }
    if (typeof aToken === 'number') return -1
    if (typeof bToken === 'number') return 1
    return aToken > bToken ? 1 : -1
  }

  return 0
}

export const checkUpdateSafe = async (): Promise<AppUpdate | null> => {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`GitHub release check failed: ${response.status}`)
  }

  const localVersion = normalizeVersion(appVersion)
  if (!localVersion) return null

  const releases = (await response.json()) as GitHubRelease[]
  const latest = releases
    .filter((release) => !release.draft)
    .map((release) => ({
      release,
      version: normalizeVersion(release.tag_name),
    }))
    .filter(
      (item): item is { release: GitHubRelease; version: string } =>
        item.version !== null,
    )
    .sort((a, b) => compareVersions(b.version, a.version))[0]

  if (!latest || compareVersions(latest.version, localVersion) <= 0) return null

  return {
    available: true,
    version: latest.version,
    body: latest.release.body,
    releaseUrl: latest.release.html_url,
  }
}
