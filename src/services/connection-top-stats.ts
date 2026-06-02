import { useEffect, useSyncExternalStore } from 'react'

export type ConnectionTopStatsKind = 'outbound' | 'destination'

export interface ConnectionTopStatsItem {
  key: string
  upload: number
  download: number
  count: number
}

export interface ConnectionTopStatsSnapshot {
  uploadTotal: number
  downloadTotal: number
  connectionCount: number
  outbound: ConnectionTopStatsItem[]
  destination: ConnectionTopStatsItem[]
}

interface MutableStatsItem {
  upload: number
  download: number
  count: number
}

interface SeenConnectionStats {
  upload: number
  download: number
  outbound: string
  destination: string
}

const TOP_LIMIT = 5
const MAX_STATS_KEYS = 500
const EMPTY_KEY = '-'

const outboundStats = new Map<string, MutableStatsItem>()
const destinationStats = new Map<string, MutableStatsItem>()
const seenConnections = new Map<string, SeenConnectionStats>()
const listeners = new Set<() => void>()

let snapshot: ConnectionTopStatsSnapshot = {
  uploadTotal: 0,
  downloadTotal: 0,
  connectionCount: 0,
  outbound: [],
  destination: [],
}

const normalizeKey = (value?: string | null) => {
  const text = value?.trim()
  return text && text.length > 0 ? text : EMPTY_KEY
}

const getOutboundKey = (connection: IConnectionsItem) =>
  normalizeKey(connection.chains?.[0])

const getDestinationKey = (connection: IConnectionsItem) =>
  normalizeKey(
    connection.metadata.host ||
      connection.metadata.remoteDestination ||
      connection.metadata.destinationIP,
  )

const ensureStatsItem = (
  map: Map<string, MutableStatsItem>,
  key: string,
): MutableStatsItem => {
  const current = map.get(key)
  if (current) return current

  const created = { upload: 0, download: 0, count: 0 }
  map.set(key, created)
  return created
}

const addStats = (
  map: Map<string, MutableStatsItem>,
  key: string,
  uploadDelta: number,
  downloadDelta: number,
  countDelta: number,
) => {
  const item = ensureStatsItem(map, key)
  item.upload += Math.max(uploadDelta, 0)
  item.download += Math.max(downloadDelta, 0)
  item.count += countDelta
}

const toTopItems = (map: Map<string, MutableStatsItem>) =>
  Array.from(map.entries())
    .map(([key, value]) => ({ key, ...value }))
    .filter((item) => item.upload > 0 || item.download > 0 || item.count > 0)
    .sort((prev, next) => {
      const trafficDiff =
        next.download + next.upload - (prev.download + prev.upload)
      if (trafficDiff !== 0) return trafficDiff
      return next.count - prev.count
    })
    .slice(0, TOP_LIMIT)

const rebuildSnapshot = () => {
  snapshot = {
    uploadTotal: Array.from(outboundStats.values()).reduce(
      (total, item) => total + item.upload,
      0,
    ),
    downloadTotal: Array.from(outboundStats.values()).reduce(
      (total, item) => total + item.download,
      0,
    ),
    connectionCount: seenConnections.size,
    outbound: toTopItems(outboundStats),
    destination: toTopItems(destinationStats),
  }
}

const emit = () => {
  rebuildSnapshot()
  listeners.forEach((listener) => listener())
}

const trimStatsMap = (map: Map<string, MutableStatsItem>) => {
  if (map.size <= MAX_STATS_KEYS) return

  const keepKeys = new Set(
    Array.from(map.entries())
      .sort((prev, next) => {
        const prevTraffic = prev[1].download + prev[1].upload
        const nextTraffic = next[1].download + next[1].upload
        if (nextTraffic !== prevTraffic) return nextTraffic - prevTraffic
        return next[1].count - prev[1].count
      })
      .slice(0, MAX_STATS_KEYS)
      .map(([key]) => key),
  )

  for (const key of map.keys()) {
    if (!keepKeys.has(key)) {
      map.delete(key)
    }
  }
}

export const ingestConnectionTopStatsSnapshot = (
  connections: IConnectionsItem[],
) => {
  let changed = false
  const activeIds = new Set<string>()

  for (const connection of connections) {
    activeIds.add(connection.id)

    const outbound = getOutboundKey(connection)
    const destination = getDestinationKey(connection)
    const previous = seenConnections.get(connection.id)
    const upload = connection.upload ?? 0
    const download = connection.download ?? 0

    if (!previous) {
      seenConnections.set(connection.id, {
        upload,
        download,
        outbound,
        destination,
      })
      addStats(outboundStats, outbound, upload, download, 1)
      addStats(destinationStats, destination, upload, download, 1)
      changed = true
      continue
    }

    const counterReset =
      upload < previous.upload || download < previous.download
    const uploadDelta = counterReset
      ? upload
      : Math.max(upload - previous.upload, 0)
    const downloadDelta = counterReset
      ? download
      : Math.max(download - previous.download, 0)

    if (uploadDelta > 0 || downloadDelta > 0) {
      addStats(outboundStats, previous.outbound, uploadDelta, downloadDelta, 0)
      addStats(
        destinationStats,
        previous.destination,
        uploadDelta,
        downloadDelta,
        0,
      )
      changed = true
    }

    if (
      previous.outbound !== outbound ||
      previous.destination !== destination
    ) {
      seenConnections.set(connection.id, {
        upload,
        download,
        outbound,
        destination,
      })
      changed = true
    } else if (uploadDelta > 0 || downloadDelta > 0) {
      previous.upload = upload
      previous.download = download
    }
  }

  for (const connectionId of seenConnections.keys()) {
    if (!activeIds.has(connectionId)) {
      seenConnections.delete(connectionId)
    }
  }

  trimStatsMap(outboundStats)
  trimStatsMap(destinationStats)

  if (changed) emit()
}

export const resetConnectionTopStats = () => {
  outboundStats.clear()
  destinationStats.clear()
  seenConnections.clear()
  emit()
}

export const subscribeConnectionTopStats = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getConnectionTopStatsSnapshot = () => snapshot

export const useConnectionTopStats = () =>
  useSyncExternalStore(
    subscribeConnectionTopStats,
    getConnectionTopStatsSnapshot,
    getConnectionTopStatsSnapshot,
  )

export const useConnectionTopStatsIngest = (
  connections?: IConnectionsItem[],
) => {
  useEffect(() => {
    ingestConnectionTopStatsSnapshot(connections ?? [])
  }, [connections])
}
