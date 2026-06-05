import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  DnsOutlined,
  HelpOutlineRounded,
  HistoryEduOutlined,
  RouterOutlined,
  SettingsOutlined,
  SpeedOutlined,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BasePage } from '@/components/base'
import { ClashModeCard } from '@/components/home/clash-mode-card'
import { ConnectionTopStatsCard } from '@/components/home/connection-top-stats-card'
import { CurrentProxyCard } from '@/components/home/current-proxy-card'
import { EnhancedCard } from '@/components/home/enhanced-card'
import { EnhancedTrafficStats } from '@/components/home/enhanced-traffic-stats'
import { HomeProfileCard } from '@/components/home/home-profile-card'
import { ProxyTunCard } from '@/components/home/proxy-tun-card'
import { useProfiles } from '@/hooks/use-profiles'
import { useVerge } from '@/hooks/use-verge'
import { entry_lightweight_mode, openWebUrl } from '@/services/cmds'

const LazyTestCard = lazy(() =>
  import('@/components/home/test-card').then((module) => ({
    default: module.TestCard,
  })),
)
const LazyIpInfoCard = lazy(() =>
  import('@/components/home/ip-info-card').then((module) => ({
    default: module.IpInfoCard,
  })),
)
const LazyClashInfoCard = lazy(() =>
  import('@/components/home/clash-info-card').then((module) => ({
    default: module.ClashInfoCard,
  })),
)
const LazySystemInfoCard = lazy(() =>
  import('@/components/home/system-info-card').then((module) => ({
    default: module.SystemInfoCard,
  })),
)

const HOME_CARD_KEYS = [
  'profile',
  'proxy',
  'network',
  'mode',
  'traffic',
  'connectionTopStats',
  'test',
  'ip',
  'clashinfo',
  'systeminfo',
] as const

type HomeCardKey = (typeof HOME_CARD_KEYS)[number]

const HOME_CARD_LABEL_KEYS: Record<HomeCardKey, string> = {
  profile: 'home.page.settings.cards.profile',
  proxy: 'home.page.settings.cards.currentProxy',
  network: 'home.page.settings.cards.network',
  mode: 'home.page.settings.cards.proxyMode',
  traffic: 'home.page.settings.cards.traffic',
  connectionTopStats: 'home.page.settings.cards.connectionTopStats',
  test: 'home.page.settings.cards.tests',
  ip: 'home.page.settings.cards.ip',
  clashinfo: 'home.page.settings.cards.clashInfo',
  systeminfo: 'home.page.settings.cards.systemInfo',
}

interface HomeCardsSettings {
  info?: boolean
  profile: boolean
  proxy: boolean
  network: boolean
  mode: boolean
  traffic: boolean
  connectionTopStats: boolean
  clashinfo: boolean
  systeminfo: boolean
  test: boolean
  ip: boolean
  order?: HomeCardKey[]
}

interface HomeSettingsDialogProps {
  open: boolean
  onClose: () => void
  homeCards: HomeCardsSettings
  onSave: (cards: HomeCardsSettings) => void
}

const normalizeHomeCardOrder = (order?: HomeCardKey[]) => {
  const seenKeys = new Set<HomeCardKey>()
  const normalized: HomeCardKey[] = []

  for (const key of order ?? []) {
    if (HOME_CARD_KEYS.includes(key) && !seenKeys.has(key)) {
      seenKeys.add(key)
      normalized.push(key)
    }
  }

  for (const key of HOME_CARD_KEYS) {
    if (!seenKeys.has(key)) {
      normalized.push(key)
    }
  }

  return normalized
}

const serializeCardFlags = (cards: HomeCardsSettings) =>
  HOME_CARD_KEYS.map((key) => `${key}:${cards[key] ? 1 : 0}`)
    .concat(`order:${normalizeHomeCardOrder(cards.order).join(',')}`)
    .join('|')

const HomeSettingsDialog = ({
  open,
  onClose,
  homeCards,
  onSave,
}: HomeSettingsDialogProps) => {
  const { t } = useTranslation()
  const [cards, setCards] = useState<HomeCardsSettings>(homeCards)
  const { patchVerge } = useVerge()
  const order = normalizeHomeCardOrder(cards.order)

  const handleToggle = (key: HomeCardKey) => {
    setCards((prev) => ({
      ...prev,
      [key]: !prev[key],
      order: normalizeHomeCardOrder(prev.order),
    }))
  }

  const handleMove = (key: HomeCardKey, direction: -1 | 1) => {
    setCards((prev) => {
      const currentOrder = normalizeHomeCardOrder(prev.order)
      const index = currentOrder.indexOf(key)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) {
        return prev
      }

      const nextOrder = [...currentOrder]
      ;[nextOrder[index], nextOrder[nextIndex]] = [
        nextOrder[nextIndex],
        nextOrder[index],
      ]

      return { ...prev, order: nextOrder }
    })
  }

  const handleSave = async () => {
    const nextCards = { ...cards, order: normalizeHomeCardOrder(cards.order) }
    await patchVerge({
      home_cards: nextCards as unknown as Record<string, boolean>,
    })
    onSave(nextCards)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('home.page.settings.title')}</DialogTitle>
      <DialogContent>
        <FormGroup>
          {order.map((key, index) => (
            <Stack
              key={key}
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <FormControlLabel
                sx={{ flex: 1, minWidth: 0 }}
                control={
                  <Checkbox
                    checked={cards[key] || false}
                    onChange={() => handleToggle(key)}
                  />
                }
                label={t(HOME_CARD_LABEL_KEYS[key])}
              />
              <IconButton
                size="small"
                disabled={index === 0}
                onClick={() => handleMove(key, -1)}
              >
                <ArrowUpwardRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={index === order.length - 1}
                onClick={() => handleMove(key, 1)}
              >
                <ArrowDownwardRounded fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shared.actions.cancel')}</Button>
        <Button onClick={handleSave} color="primary">
          {t('shared.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const HomePage = () => {
  const { t } = useTranslation()
  const { verge } = useVerge()
  const { current, mutateProfiles } = useProfiles()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localHomeCards, setLocalHomeCards] = useState<{
    value: HomeCardsSettings
    baseSignature: string
  } | null>(null)

  const defaultCards = useMemo<HomeCardsSettings>(
    () => ({
      info: false,
      profile: true,
      proxy: true,
      network: true,
      mode: true,
      traffic: true,
      connectionTopStats: true,
      clashinfo: true,
      systeminfo: true,
      test: true,
      ip: true,
      order: [...HOME_CARD_KEYS],
    }),
    [],
  )

  const vergeHomeCards = useMemo<HomeCardsSettings | null>(
    () => (verge?.home_cards as HomeCardsSettings | undefined) ?? null,
    [verge],
  )

  const remoteHomeCards = useMemo<HomeCardsSettings>(
    () => ({
      ...defaultCards,
      ...(vergeHomeCards ?? {}),
      order: normalizeHomeCardOrder(vergeHomeCards?.order),
    }),
    [defaultCards, vergeHomeCards],
  )

  const remoteSignature = useMemo(
    () => serializeCardFlags(remoteHomeCards),
    [remoteHomeCards],
  )

  const pendingLocalCards = useMemo<HomeCardsSettings | null>(() => {
    if (!localHomeCards) return null
    return localHomeCards.baseSignature === remoteSignature
      ? localHomeCards.value
      : null
  }, [localHomeCards, remoteSignature])

  const effectiveHomeCards = pendingLocalCards ?? remoteHomeCards
  const effectiveHomeCardOrder = useMemo(
    () => normalizeHomeCardOrder(effectiveHomeCards.order),
    [effectiveHomeCards.order],
  )

  const toGithubDoc = useLockFn(() => {
    return openWebUrl('https://clash-verge-rev.github.io/index.html')
  })

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const renderCard = useCallback(
    (cardKey: HomeCardKey, component: React.ReactNode, size: number = 6) => {
      if (!effectiveHomeCards[cardKey]) return null

      return (
        <Grid size={size} key={cardKey}>
          {component}
        </Grid>
      )
    },
    [effectiveHomeCards],
  )

  const handleSaveSettings = (newCards: HomeCardsSettings) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() =>
        setLocalHomeCards({
          value: newCards,
          baseSignature: remoteSignature,
        }),
      )
    } else {
      setTimeout(
        () =>
          setLocalHomeCards({
            value: newCards,
            baseSignature: remoteSignature,
          }),
        0,
      )
    }
  }

  const cardRenderers = useMemo<Record<HomeCardKey, () => React.ReactNode>>(
    () => ({
      profile: () =>
        renderCard(
          'profile',
          <HomeProfileCard
            current={current}
            onProfileUpdated={mutateProfiles}
          />,
        ),
      proxy: () => renderCard('proxy', <CurrentProxyCard />),
      network: () => renderCard('network', <NetworkSettingsCard />),
      mode: () => renderCard('mode', <ClashModeEnhancedCard />),
      traffic: () =>
        renderCard(
          'traffic',
          <EnhancedCard
            title={t('home.page.cards.trafficStats')}
            icon={<SpeedOutlined />}
            iconColor="secondary"
          >
            <EnhancedTrafficStats />
          </EnhancedCard>,
          12,
        ),
      connectionTopStats: () =>
        renderCard(
          'connectionTopStats',
          <EnhancedCard
            title={t('home.page.cards.connectionTopStats')}
            icon={<SpeedOutlined />}
            iconColor="primary"
            noContentPadding
            hideHeader
          >
            <ConnectionTopStatsCard />
          </EnhancedCard>,
          12,
        ),
      test: () =>
        renderCard(
          'test',
          <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
            <LazyTestCard />
          </Suspense>,
        ),
      ip: () =>
        renderCard(
          'ip',
          <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
            <LazyIpInfoCard />
          </Suspense>,
        ),
      clashinfo: () =>
        renderCard(
          'clashinfo',
          <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
            <LazyClashInfoCard />
          </Suspense>,
        ),
      systeminfo: () =>
        renderCard(
          'systeminfo',
          <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
            <LazySystemInfoCard />
          </Suspense>,
        ),
    }),
    [current, mutateProfiles, renderCard, t],
  )

  const orderedCards = useMemo(
    () => effectiveHomeCardOrder.map((key) => cardRenderers[key]()),
    [cardRenderers, effectiveHomeCardOrder],
  )

  const dialogKey = useMemo(
    () => `${serializeCardFlags(effectiveHomeCards)}:${settingsOpen ? 1 : 0}`,
    [effectiveHomeCards, settingsOpen],
  )

  return (
    <BasePage
      title={t('home.page.title')}
      contentStyle={{ padding: 2 }}
      header={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={t('home.page.tooltips.lightweightMode')} arrow>
            <IconButton
              onClick={async () => await entry_lightweight_mode()}
              size="small"
              color="inherit"
            >
              <HistoryEduOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('home.page.tooltips.manual')} arrow>
            <IconButton onClick={toGithubDoc} size="small" color="inherit">
              <HelpOutlineRounded />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('home.page.tooltips.settings')} arrow>
            <IconButton onClick={openSettings} size="small" color="inherit">
              <SettingsOutlined />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Grid container spacing={1.5} columns={{ xs: 6, sm: 6, md: 12 }}>
        {orderedCards}
      </Grid>

      <HomeSettingsDialog
        key={dialogKey}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        homeCards={effectiveHomeCards}
        onSave={handleSaveSettings}
      />
    </BasePage>
  )
}

const NetworkSettingsCard = () => {
  const { t } = useTranslation()
  return (
    <EnhancedCard
      title={t('home.page.cards.networkSettings')}
      icon={<DnsOutlined />}
      iconColor="primary"
      action={null}
    >
      <ProxyTunCard />
    </EnhancedCard>
  )
}

const ClashModeEnhancedCard = () => {
  const { t } = useTranslation()
  return (
    <EnhancedCard
      title={t('home.page.cards.proxyMode')}
      icon={<RouterOutlined />}
      iconColor="info"
      action={null}
    >
      <ClashModeCard />
    </EnhancedCard>
  )
}

export default HomePage
