import { LinkRounded, PublicRounded } from '@mui/icons-material'
import {
  Box,
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
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.65),
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', mb: 1.25 }}
      >
        <Box sx={{ color: theme.palette.primary.main, lineHeight: 0 }}>{icon}</Box>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((item, index) => {
            const total = item.upload + item.download
            const percent = Math.max((total / maxTraffic) * 100, 4)

            return (
              <Box key={item.key}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 0.5 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      width: 22,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    #{index + 1}
                  </Typography>
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
                    height: 5,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  {formatTraffic(item.download)} ↓ · {formatTraffic(item.upload)} ↑ ·{' '}
                  {item.count} {t('home.components.connectionTopStats.countUnit')}
                </Typography>
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
    <Grid container spacing={1.25} columns={{ xs: 6, sm: 6, md: 12 }}>
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
