import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DnsOutlined,
  DragIndicatorRounded,
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
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
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

// 定义首页卡片设置接口
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

type HomeCardsSettings = Record<HomeCardKey, boolean> & {
  info?: boolean
  order?: HomeCardKey[]
}

const normalizeHomeCardOrder = (order?: string[]) => {
  const homeCardKeySet = new Set<string>(HOME_CARD_KEYS)
  const knownOrder = (order ?? []).filter((key): key is HomeCardKey =>
    homeCardKeySet.has(key),
  )
  return [...new Set([...knownOrder, ...HOME_CARD_KEYS])]
}

// 首页设置对话框组件接口
interface HomeSettingsDialogProps {
  open: boolean
  onClose: () => void
  homeCards: HomeCardsSettings
  onSave: (cards: HomeCardsSettings) => void
}

const serializeCardFlags = (cards: HomeCardsSettings) =>
  [
    ...HOME_CARD_KEYS.map((key) => `${key}:${cards[key] ? 1 : 0}`),
    `order:${normalizeHomeCardOrder(cards.order).join(',')}`,
  ].join('|')

const getHomeCardLabel = (
  key: HomeCardKey,
  t: ReturnType<typeof useTranslation>['t'],
) => {
  const labels: Record<HomeCardKey, string> = {
    profile: t('home.page.settings.cards.profile'),
    proxy: t('home.page.settings.cards.currentProxy'),
    network: t('home.page.settings.cards.network'),
    mode: t('home.page.settings.cards.proxyMode'),
    traffic: t('home.page.settings.cards.traffic'),
    connectionTopStats: t('home.page.settings.cards.connectionTopStats'),
    test: t('home.page.settings.cards.tests'),
    ip: t('home.page.settings.cards.ip'),
    clashinfo: t('home.page.settings.cards.clashInfo'),
    systeminfo: t('home.page.settings.cards.systemInfo'),
  }
  return labels[key]
}

// 首页设置对话框组件
const HomeSettingsDialog = ({
  open,
  onClose,
  homeCards,
  onSave,
}: HomeSettingsDialogProps) => {
  const { t } = useTranslation()
  const [cards, setCards] = useState<HomeCardsSettings>(homeCards)
  const { patchVerge } = useVerge()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const orderedKeys = useMemo(
    () => normalizeHomeCardOrder(cards.order),
    [cards.order],
  )

  const handleToggle = (key: HomeCardKey) => {
    setCards((prev: HomeCardsSettings) => ({
      ...prev,
      [key]: !prev[key],
      order: normalizeHomeCardOrder(prev.order),
    }))
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setCards((prev) => {
      const order = normalizeHomeCardOrder(prev.order)
      const oldIndex = order.indexOf(active.id as HomeCardKey)
      const newIndex = order.indexOf(over.id as HomeCardKey)
      if (oldIndex === -1 || newIndex === -1) return prev

      return {
        ...prev,
        order: arrayMove(order, oldIndex, newIndex),
      }
    })
  }, [])

  const handleSave = async () => {
    const nextCards: HomeCardsSettings = { ...cards, order: orderedKeys }
    await patchVerge({ home_cards: nextCards })
    onSave(nextCards)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('home.page.settings.title')}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedKeys}>
            <List
              dense
              disablePadding
              sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              {orderedKeys.map((key) => (
                <SortableHomeCardItem
                  key={key}
                  id={key}
                  checked={cards[key] || false}
                  label={getHomeCardLabel(key, t)}
                  dragHandleLabel={t('home.page.settings.dragHandle')}
                  onToggle={() => handleToggle(key)}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
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

interface SortableHomeCardItemProps {
  id: HomeCardKey
  checked: boolean
  label: string
  dragHandleLabel: string
  onToggle: () => void
}

const SortableHomeCardItem = ({
  id,
  checked,
  label,
  dragHandleLabel,
  onToggle,
}: SortableHomeCardItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  )

  return (
    <ListItem
      ref={setNodeRef}
      disableGutters
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: isDragging ? 'action.hover' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
      style={style}
    >
      <FormControlLabel
        sx={{ flex: 1, m: 0 }}
        control={<Checkbox checked={checked} onChange={onToggle} />}
        label={
          <ListItemText
            primary={label}
            slotProps={{ primary: { variant: 'body2' } }}
          />
        }
      />
      <IconButton
        edge="end"
        size="small"
        sx={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        aria-label={dragHandleLabel}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorRounded fontSize="small" />
      </IconButton>
    </ListItem>
  )
}

const HomePage = () => {
  const { t } = useTranslation()
  const { verge } = useVerge()
  const { current, mutateProfiles } = useProfiles()

  // 设置弹窗的状态
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localHomeCards, setLocalHomeCards] = useState<{
    value: HomeCardsSettings
    baseSignature: string
  } | null>(null)

  // 卡片显示状态
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
    () => vergeHomeCards ?? defaultCards,
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
  const effectiveCardOrder = useMemo(
    () => normalizeHomeCardOrder(effectiveHomeCards.order),
    [effectiveHomeCards.order],
  )

  // 文档链接函数
  const toGithubDoc = useLockFn(() => {
    return openWebUrl('https://clash-verge-rev.github.io/index.html')
  })

  // 新增：打开设置弹窗
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

  // 新增：保存设置时用requestIdleCallback/setTimeout
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

  const cardRenderers = useMemo(
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
    () => effectiveCardOrder.map((key) => cardRenderers[key]()),
    [cardRenderers, effectiveCardOrder],
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

      {/* 首页设置弹窗 */}
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

// 增强版网络设置卡片组件
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

// 增强版 Clash 模式卡片组件
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
