import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  LinkRounded,
  PublicRounded,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import { ReactNode, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type ConnectionTopStatsItem,
  useConnectionTopStats,
} from '@/services/connection-top-stats'
import parseTraffic from '@/utils/parse-traffic'

interface TopListProps {
  title: string
  icon: ReactNode
  items: ConnectionTopStatsItem[]
  emptyText: string
}

const formatTraffic = (bytes: number) => {
  const [value, unit] = parseTraffic(bytes)
  return `${value} ${unit}`
}

const TopList = memo(({ title, icon, items, emptyText }: TopListProps) => {
  const theme = useTheme()
  const { t } = useTranslation()
  const maxTraffic = useMemo(
    () => Math.max(...items.map((item) => item.upload + item.download), 1),
    [items],
  )

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 0.75,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        bgcolor:
          theme.palette.mode === 'light'
            ? alpha(theme.palette.background.paper, 0.84)
            : alpha(theme.palette.background.paper, 0.5),
        backgroundImage: `radial-gradient(circle at top right, ${alpha(
          theme.palette.primary.main,
          0.12,
        )}, transparent 38%)`,
        boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.08)}`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -28,
          right: -28,
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        }}
      />
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', mb: 0.5, position: 'relative' }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 2,
            color: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            lineHeight: 0,
          }}
        >
          {icon}
        </Box>
        <Typography variant="caption" noWrap sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>

      {items.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={0.35} sx={{ position: 'relative', overflow: 'hidden' }}>
          {items.map((item, index) => {
            const total = item.upload + item.download
            const percent = Math.max((total / maxTraffic) * 100, 4)
            const rankColors = [
              theme.palette.warning.main,
              theme.palette.info.main,
              theme.palette.success.main,
            ]
            const rankColor = rankColors[index] ?? theme.palette.text.secondary

            return (
              <Box
                key={item.key}
                sx={{
                  p: 0.5,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.background.default, 0.42),
                  border: `1px solid ${alpha(theme.palette.divider, 0.16)}`,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', mb: 0.25 }}
                >
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    sx={{
                      width: 32,
                      height: 18,
                      color: theme.palette.getContrastText(rankColor),
                      bgcolor: rankColor,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      '& .MuiChip-label': { px: 0.5, fontSize: 11 },
                    }}
                  />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ flex: 1, fontWeight: 600 }}
                  >
                    {item.key}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatTraffic(total)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 3,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    },
                  }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    columnGap: 0.75,
                    rowGap: 0,
                    mt: 0.15,
                    color: 'text.secondary',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.25}
                    sx={{ alignItems: 'center' }}
                  >
                    <ArrowDownwardRounded sx={{ fontSize: 13 }} />
                    <Typography variant="caption">
                      {formatTraffic(item.download)}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.25}
                    sx={{ alignItems: 'center' }}
                  >
                    <ArrowUpwardRounded sx={{ fontSize: 13 }} />
                    <Typography variant="caption">
                      {formatTraffic(item.upload)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption">
                    {item.count}{' '}
                    {t('home.components.connectionTopStats.countUnit')}
                  </Typography>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
})

TopList.displayName = 'ConnectionTopStatsList'

export const ConnectionTopStatsCard = () => {
  const { t } = useTranslation()
  const stats = useConnectionTopStats()

  return (
    <Grid
      container
      spacing={0.75}
      columns={{ xs: 6, sm: 6, md: 12 }}
      sx={{ height: '100%' }}
    >
      <Grid size={6}>
        <TopList
          title={t('home.components.connectionTopStats.outboundTitle')}
          icon={<LinkRounded fontSize="small" />}
          items={stats.outbound}
          emptyText={t('home.components.connectionTopStats.empty')}
        />
      </Grid>
      <Grid size={6}>
        <TopList
          title={t('home.components.connectionTopStats.destinationTitle')}
          icon={<PublicRounded fontSize="small" />}
          items={stats.destination}
          emptyText={t('home.components.connectionTopStats.empty')}
        />
      </Grid>
    </Grid>
  )
}
