import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Progress, Skeleton, Tag } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'

const STATUS_META = {
  overdue: { label: '부족', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.24)' },
  urgent: { label: '임박', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.24)' },
  normal: { label: '정상', color: '#34d399', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.22)' },
}

const FILTER_OPTIONS = [
  { label: '전체', value: 'all', color: '#64748b' },
  { label: '부족', value: 'overdue', color: '#f87171' },
  { label: '임박', value: 'urgent', color: '#fbbf24' },
  { label: '정상', value: 'normal', color: '#34d399' },
]

function getBarPercent(remaining, initialAmount, fallbackValues) {
  const current = Number(remaining ?? 0)
  const initial = Number(initialAmount ?? 0)
  if (initial > 0) {
    return Math.max(4, Math.min(100, (current / initial) * 100))
  }
  const max = Math.max(...fallbackValues.map((value) => Number(value ?? 0)), 1)
  return Math.max(4, Math.min(100, (current / max) * 100))
}

function getCardSurface(light) {
  return light
    ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)'
    : 'linear-gradient(180deg, rgba(20,27,43,0.96) 0%, rgba(12,18,30,0.96) 100%)'
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
            key: event?.status ?? 'normal',
            daysLeft: event?.days_left ?? null,
            projectedReplacementDate: event?.projected_replacement_date ?? null,
            isDisabled,
          }
        }).filter((item) => !item.isDisabled)

        const highest = sources.reduce((current, item) => {
          if (item.key === 'overdue') return 'overdue'
          if (item.key === 'urgent' && current !== 'overdue') return 'urgent'
          return current
        }, 'normal')

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {filteredCards.map((card) => {
            const meta = STATUS_META[card.highest] ?? STATUS_META.normal
            return (
              <Card
                key={card.key}
                className="nowa-card"
                styles={{ body: { padding: 16 } }}
                style={{
                  borderColor: light ? 'var(--nowa-border-strong)' : meta.border,
                  background: getCardSurface(light),
                  boxShadow: light
                    ? '0 10px 24px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9)'
                    : '0 14px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: meta.color,
                    opacity: light ? 0.9 : 0.8,
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ color: meta.color, fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
                      {formatMachineLabel(card.machine_no)}
                    </div>
                    {card.description ? (
                      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 4 }}>{card.description}</div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 9px',
                      borderRadius: 999,
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {card.sources.map((item) => {
                    const itemMeta = STATUS_META[item.key] ?? STATUS_META.normal
                    const percent = getBarPercent(
                      item.remaining,
                      item.initialAmount,
                      card.sources.map((source) => source.remaining),
                    )
                    return (
                      <div key={item.sourceName}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            color: 'var(--nowa-text-soft)',
                            fontSize: 14,
                            marginBottom: 3,
                            lineHeight: 1.2,
                          }}
                        >
                          <span style={{ fontWeight: item.key === 'normal' ? 500 : 700 }}>{item.sourceName}</span>
                          <span
                            style={{
                              color: item.key === 'normal' ? 'var(--nowa-text-soft)' : itemMeta.color,
                              fontWeight: item.key === 'normal' ? 500 : 700,
                            }}
                          >
                            {item.daysLeft == null ? '-' : `${item.daysLeft}일`}
                          </span>
                        </div>
                        <Progress
                          percent={percent}
                          showInfo={false}
                          strokeColor={item.key === 'normal' ? 'rgba(196,210,226,0.55)' : itemMeta.color}
                          trailColor={light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'}
                          size={['100%', 6]}
                        />
                      </div>
                    )
                  })}
                </div>

                {card.alertSources.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {card.alertSources.map((item) => {
                      const itemMeta = STATUS_META[item.key] ?? STATUS_META.normal
                      return (
                        <Tag
                          key={item.sourceName}
                          style={{
                            margin: 0,
                            paddingInline: 8,
                            color: itemMeta.color,
                            background: itemMeta.bg,
                            borderColor: itemMeta.border,
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 14,
                            lineHeight: '18px',
                          }}
                        >
                          {item.sourceName}
                        </Tag>
                      )
                    })}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
