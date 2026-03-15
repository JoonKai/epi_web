import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Progress, Segmented, Skeleton, Tag } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'

const STATUS_META = {
  overdue: { label: '부족', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.24)' },
  urgent: { label: '임박', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.24)' },
  normal: { label: '정상', color: '#34d399', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.22)' },
}

function getSourceStatus(remaining, dailyUsage, initialAmount, thresholdRatio) {
  const remain = Number(remaining ?? 0)
  const usage = Number(dailyUsage ?? 0)
  const initial = Number(initialAmount ?? 0)
  const ratio = Number(thresholdRatio ?? 15)
  const thresholdAmount = initial > 0 ? (initial * ratio) / 100 : 0

  if (initial > 0 && remain <= thresholdAmount) return { key: 'overdue', daysLeft: 0 }
  if (remain <= 0) return { key: 'overdue', daysLeft: 0 }
  if (usage <= 0) return { key: 'normal', daysLeft: null }

  const daysLeft = Math.ceil((remain - thresholdAmount) / usage)
  if (daysLeft <= 7) return { key: 'overdue', daysLeft }
  if (daysLeft <= 15) return { key: 'urgent', daysLeft }
  return { key: 'normal', daysLeft }
}

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
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/mocvd/sources/all')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.detail || '설비별 소스현황을 불러오지 못했습니다.')
      }
      setRows(json.rows ?? [])
      setSourceNames(json.source_names ?? [])
    } catch (err) {
      setError(err.message || '설비별 소스현황을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const cards = useMemo(
    () =>
      rows.map((row) => {
        const sources = sourceNames.map((sourceName) => {
          const remaining = Number(row[sourceName] ?? 0)
          const dailyUsage = Number(row[`${sourceName}_daily_usage`] ?? 0)
          const initialAmount = Number(row[`${sourceName}_initial_amount`] ?? 0)
          const thresholdRatio = Number(row[`${sourceName}_threshold_ratio`] ?? 15)
          return {
            sourceName,
            remaining,
            dailyUsage,
            initialAmount,
            thresholdRatio,
            ...getSourceStatus(remaining, dailyUsage, initialAmount, thresholdRatio),
          }
        })

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
    [rows, sourceNames],
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
            <Segmented
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '전체', value: 'all' },
                { label: '부족', value: 'overdue' },
                { label: '임박', value: 'urgent' },
                { label: '정상', value: 'normal' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>{filteredCards.length}대 표시</span>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      {filteredCards.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 설비별 소스현황이 없습니다." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {filteredCards.map((card) => {
            const meta = STATUS_META[card.highest]
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
                      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>{card.description}</div>
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
                      fontSize: 11,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {card.sources.map((item) => {
                    const itemMeta = STATUS_META[item.key]
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
                            fontSize: 11,
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
                          strokeColor={item.key === 'normal' ? 'rgba(148,163,184,0.55)' : itemMeta.color}
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
                      const itemMeta = STATUS_META[item.key]
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
                            fontSize: 11,
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
