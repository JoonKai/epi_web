import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Skeleton, Tag } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getGroupColor } from './sourceColors'
import { useThemeMode } from '../../../theme/useThemeMode'

const STATUS_META = {
  overdue: { label: '부족', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.24)' },
  urgent:  { label: '임박', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.24)' },
  normal:  { label: '정상', color: '#34d399', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.22)' },
  nodata:  { label: '미입력', color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.22)' },
}

const FILTER_OPTIONS = [
  { label: '전체',  value: 'all',     color: '#64748b' },
  { label: '부족',  value: 'overdue', color: '#f87171' },
  { label: '임박',  value: 'urgent',  color: '#fbbf24' },
  { label: '정상',  value: 'normal',  color: '#34d399' },
  { label: '미입력', value: 'nodata', color: '#64748b' },
]

function getBarPercent(remaining, initialAmount, fallbackValues) {
  const current = Number(remaining ?? 0)
  const initial = Number(initialAmount ?? 0)
  if (initial > 0) return Math.min(100, (current / initial) * 100)
  if (current === 0) return 0
  const max = Math.max(...fallbackValues.map((v) => Number(v ?? 0)), 1)
  return Math.min(100, (current / max) * 100)
}

function getCardSurface(light) {
  return light
    ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)'
    : 'linear-gradient(180deg, rgba(20,27,43,0.96) 0%, rgba(12,18,30,0.96) 100%)'
}

/* ── Horizontal Linear Gauge (AG Charts gallery 스타일) ── */
const GAUGE_ZONES = [
  { barColor: '#ef4444', bgColor: 'rgba(239,68,68,0.18)' },  // overdue
  { barColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.14)' }, // urgent
  { barColor: '#22c55e', bgColor: 'rgba(34,197,94,0.10)' },  // normal
]

function LinearGauge({ value, threshold }) {
  const t1 = Math.max(5, Math.min(45, threshold))
  const t2 = Math.min(t1 * 2, 60)
  const pct = Math.max(0, Math.min(100, value))

  if (pct <= 0) {
    return <div style={{ height: 7, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }} />
  }

  const zones = [
    { from: 0,  to: t1,  ...GAUGE_ZONES[0] },
    { from: t1, to: t2,  ...GAUGE_ZONES[1] },
    { from: t2, to: 100, ...GAUGE_ZONES[2] },
  ]

  return (
    <div style={{ display: 'flex', gap: 2, height: 7 }}>
      {zones.map(({ from, to, barColor, bgColor }, i) => {
        const zoneWidth = to - from
        const filled = Math.max(0, Math.min(pct, to) - from)
        const filledRatio = filled / zoneWidth
        const isFirst = i === 0
        const isLast = i === zones.length - 1
        const r = '5px'
        return (
          <div
            key={i}
            style={{
              flex: zoneWidth,
              position: 'relative',
              background: bgColor,
              borderRadius: isFirst ? `${r} 0 0 ${r}` : isLast ? `0 ${r} ${r} 0` : 0,
              overflow: 'hidden',
            }}
          >
            {filledRatio > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${filledRatio * 100}%`,
                  background: barColor,
                  borderRadius: 'inherit',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const SourceGaugeRow = memo(function SourceGaugeRow({ source, light }) {
  const itemMeta = STATUS_META[source.key] ?? STATUS_META.normal
  const threshold = Math.max(5, Math.min(45, source.thresholdRatio ?? 15))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: light ? '#374151' : '#94a3b8' }}>
          {source.sourceName}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: source.key === 'normal' ? (light ? '#9ca3af' : '#475569') : itemMeta.color }}>
          {source.daysLeft != null ? `${source.daysLeft}일` : '-'}
        </span>
      </div>
      <LinearGauge value={source.percent} threshold={threshold} />
    </div>
  )
})

function MachineSourceChart({ sources, light }) {
  const remainings = useMemo(() => sources.map((s) => s.remaining), [sources])

  const enriched = useMemo(
    () =>
      sources.map((s) => ({
        ...s,
        percent: getBarPercent(s.remaining, s.initialAmount, remainings),
      })),
    [sources, remainings],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {enriched.map((s) => (
        <SourceGaugeRow key={s.sourceName} source={s} light={light} />
      ))}
    </div>
  )
}

export default function SourceMachineBoard() {
  const { isLight: light } = useThemeMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [sourceNames, setSourceNames] = useState([])
  const [statusSettings, setStatusSettings] = useState({ overdue_days: 0, urgent_days: 7 })
  const [statusEvents, setStatusEvents] = useState([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [machineGroupMap, setMachineGroupMap] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sourceRes, statusRes] = await Promise.all([
        authFetch('/api/mocvd/sources/all'),
        authFetch('/api/mocvd/source-status'),
      ])
      const [sourceJson, statusJson] = await Promise.all([sourceRes.json(), statusRes.json()])

      if (!sourceRes.ok || !statusRes.ok) {
        throw new Error(sourceJson.detail || statusJson.detail || '설비별 소스 현황을 불러오지 못했습니다.')
      }

      setRows(sourceJson.rows ?? [])
      setSourceNames(sourceJson.source_names ?? [])
      setStatusSettings(statusJson.settings ?? sourceJson.status_settings ?? { overdue_days: 0, urgent_days: 7 })
      setStatusEvents(statusJson.events ?? [])
    } catch (err) {
      setError(err.message || '설비별 소스 현황을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    authFetch('/api/admin/machine-groups')
      .then((r) => (r.ok ? r.json() : []))
      .then((groups) => {
        const map = {}
        groups.forEach((g) => g.machine_nos.forEach((no) => { map[no] = g.name }))
        setMachineGroupMap(map)
      })
      .catch(() => {})
  }, [])

  const eventMap = useMemo(() => {
    const next = new Map()
    statusEvents.forEach((item) => {
      next.set(`${item.machine_no}-${item.source_label}`, item)
    })
    return next
  }, [statusEvents])

  const cards = useMemo(
    () =>
      rows.map((row) => {
        const sources = sourceNames.map((sourceName) => {
          const isDisabled = Boolean(row[`${sourceName}_is_disabled`] ?? false)
          const remaining = Number(row[sourceName] ?? 0)
          const dailyUsage = Number(row[`${sourceName}_daily_usage`] ?? 0)
          const initialAmount = Number(row[`${sourceName}_initial_amount`] ?? 0)
          const thresholdRatio = Number(row[`${sourceName}_threshold_ratio`] ?? 15)
          const event = eventMap.get(`${row.machine_no}-${sourceName}`)

          return {
            sourceName,
            remaining,
            dailyUsage,
            initialAmount,
            thresholdRatio,
            key: event?.status ?? 'nodata',
            daysLeft: event?.days_left ?? null,
            projectedReplacementDate: event?.projected_replacement_date ?? null,
            isDisabled,
          }
        }).filter((item) => !item.isDisabled)

        const highest = sources.reduce((current, item) => {
          if (item.key === 'overdue') return 'overdue'
          if (item.key === 'urgent' && current !== 'overdue') return 'urgent'
          if (item.key === 'normal' && current === 'nodata') return 'normal'
          return current
        }, 'nodata')

        return {
          key: row.machine_no,
          machine_no: row.machine_no,
          description: row.description,
          highest,
          sources,
          alertSources: sources.filter((item) => item.key !== 'normal'),
        }
      }),
    [eventMap, rows, sourceNames],
  )

  const filteredCards = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return cards.filter((card) => {
      if (statusFilter !== 'all' && card.highest !== statusFilter) return false
      if (!keyword) return true
      return (
        formatMachineLabel(card.machine_no).toLowerCase().includes(keyword) ||
        String(card.description ?? '').toLowerCase().includes(keyword)
      )
    })
  }, [cards, searchText, statusFilter])

  const groupedCards = useMemo(() => {
    const orderMap = {}
    const groupCards = {}
    filteredCards.forEach((card) => {
      const name = machineGroupMap[card.machine_no] ?? '미분류'
      if (!(name in orderMap)) {
        orderMap[name] = Object.keys(orderMap).length
        groupCards[name] = []
      }
      groupCards[name].push(card)
    })
    return Object.entries(groupCards).sort((a, b) => orderMap[a[0]] - orderMap[b[0]])
  }, [filteredCards, machineGroupMap])

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />
  if (error) return <Alert type="error" message={error} showIcon />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              prefix={<SearchOutlined />}
              placeholder="호기 검색"
              style={{ width: 240 }}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {FILTER_OPTIONS.map((option) => {
                const active = statusFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    style={{
                      minWidth: 74,
                      height: 44,
                      padding: '0 20px',
                      borderRadius: 999,
                      border: `2px solid ${active ? option.color : light ? '#cbd5e1' : 'rgba(196,210,226,0.28)'}`,
                      background: active
                        ? light
                          ? `${option.color}14`
                          : `${option.color}1a`
                        : light
                          ? '#ffffff'
                          : 'rgba(15,23,42,0.72)',
                      color: active ? option.color : light ? '#64748b' : 'var(--nowa-text-muted)',
                      fontSize: 17,
                      fontWeight: 800,
                      lineHeight: 1,
                      boxShadow: active
                        ? light
                          ? `0 6px 16px ${option.color}18`
                          : `0 6px 18px ${option.color}18`
                        : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>
              부족 기준 {statusSettings.overdue_days}일 / 임박 기준 {statusSettings.urgent_days}일
            </span>
            <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>{filteredCards.length}대 표시</span>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      {filteredCards.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 설비별 소스 현황이 없습니다." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedCards.map(([groupName, gcards]) => {
            const gc = getGroupColor(groupName)
            return (
              <div key={groupName}>
                {/* 그룹 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 14px', borderRadius: 8,
                    fontSize: 14, fontWeight: 800,
                    color: gc ? gc.text : '#94a3b8',
                    background: gc ? gc.bg : 'rgba(148,163,184,0.10)',
                    border: `1px solid ${gc ? gc.border : 'rgba(148,163,184,0.22)'}`,
                  }}>
                    {groupName}
                  </span>
                  <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>{gcards.length}대</span>
                  <div style={{ flex: 1, height: 1, background: gc ? gc.border : 'rgba(148,163,184,0.15)' }} />
                </div>

                {/* 그룹 카드 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {gcards.map((card) => {
                    const meta = STATUS_META[card.highest] ?? STATUS_META.normal
                    return (
                      <Card
                        key={card.key}
                        className="nowa-card"
                        styles={{ body: { padding: '10px 12px' } }}
                        style={{
                          borderColor: light ? 'var(--nowa-border-strong)' : meta.border,
                          background: getCardSurface(light),
                          boxShadow: light
                            ? '0 4px 12px rgba(15,23,42,0.07)'
                            : '0 6px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: meta.color, opacity: 0.9 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ color: meta.color, fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
                            {formatMachineLabel(card.machine_no)}
                          </div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 7px', borderRadius: 999,
                            color: meta.color, background: meta.bg,
                            border: `1px solid ${meta.border}`,
                            fontWeight: 700, fontSize: 14, flexShrink: 0,
                          }}>
                            {meta.label}
                          </span>
                        </div>
                        <MachineSourceChart sources={card.sources} light={light} />
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
