import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Alert, Button, Card, Col, Input, Row, Skeleton, Tag, Tooltip } from 'antd'
import { ReloadOutlined, SearchOutlined, ToolOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'

// ─── 상태 계산 ─────────────────────────────────────────────────
function getMachineStatus(sources) {
  let critical = 0, warning = 0
  sources.forEach(({ remaining, daily_usage }) => {
    if (daily_usage <= 0) return
    const days = remaining / daily_usage
    if (days <= 7)  critical++
    else if (days <= 20) warning++
  })
  if (critical > 0) return 'critical'
  if (warning  > 0) return 'warning'
  return 'normal'
}

const STATUS_META = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', label: '부족', icon: <WarningOutlined /> },
  warning:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.3)',   label: '임박', icon: <WarningOutlined /> },
  normal:   { color: '#34d399', bg: 'rgba(52,211,153,0.06)',   border: 'rgba(52,211,153,0.2)',   label: '정상', icon: <CheckCircleOutlined /> },
}

// ─── 소스 레벨 바 ──────────────────────────────────────────────
function SourceBar({ name, remaining, daily_usage }) {
  const days = daily_usage > 0 ? remaining / daily_usage : null
  const color = days === null ? '#475569' : days <= 7 ? '#f87171' : days <= 20 ? '#fbbf24' : '#34d399'
  const pct   = days === null ? 50 : Math.min(100, (days / 60) * 100)

  return (
    <Tooltip title={days === null ? `${name}: ${remaining.toFixed(1)} (일사용량 미입력)` : `${name}: ${remaining.toFixed(1)} / ${days.toFixed(0)}일 후 소진`}>
      <div style={{ marginBottom: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
          <span>{name}</span>
          <span style={{ color }}>{days === null ? '-' : `${days.toFixed(0)}일`}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>
    </Tooltip>
  )
}

// ─── 호기 카드 ─────────────────────────────────────────────────
function MachineCard({ machine_no, description, is_active, sources }) {
  const { isLight: light } = useThemeMode()
  const status = is_active ? getMachineStatus(sources) : 'off'
  const meta   = STATUS_META[status] ?? STATUS_META.normal

  const criticalSources = sources.filter(s => s.daily_usage > 0 && s.remaining / s.daily_usage <= 7)
  const warnSources     = sources.filter(s => s.daily_usage > 0 && s.remaining / s.daily_usage > 7 && s.remaining / s.daily_usage <= 20)

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${is_active ? meta.border : 'rgba(100,116,139,0.2)'}`,
      background: is_active ? meta.bg : (light ? 'var(--nowa-soft-fill)' : 'rgba(255,255,255,0.01)'),
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      opacity: is_active ? 1 : 0.45,
      transition: 'all 0.2s',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: is_active ? meta.color : 'var(--nowa-text-muted)' }}>
            {formatMachineLabel(machine_no)}
          </div>
          {description && (
            <div style={{ fontSize: 11, color: 'var(--nowa-text-muted)', marginTop: 1 }}>{description}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {is_active ? (
            <Tag style={{ margin: 0, fontSize: 10, padding: '0 6px', color: meta.color, background: 'transparent', border: `1px solid ${meta.border}` }}>
              {meta.icon} {meta.label}
            </Tag>
          ) : (
            <Tag style={{ margin: 0, fontSize: 10, padding: '0 6px', color: 'var(--nowa-text-muted)', background: 'transparent', border: '1px solid rgba(100,116,139,0.3)' }}>
              <CloseCircleOutlined /> 비활성
            </Tag>
          )}
        </div>
      </div>

      {/* 소스 바 */}
      {sources.length > 0 && (
        <div>
          {sources.map(s => (
            <SourceBar key={s.source_name} name={s.source_name} remaining={s.remaining} daily_usage={s.daily_usage} />
          ))}
        </div>
      )}

      {/* 경고 뱃지 */}
      {(criticalSources.length > 0 || warnSources.length > 0) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {criticalSources.map(s => (
            <span key={s.source_name} style={{ fontSize: 10, background: 'rgba(248,113,113,0.15)', color: '#f87171', borderRadius: 6, padding: '1px 6px' }}>
              {s.source_name}
            </span>
          ))}
          {warnSources.map(s => (
            <span key={s.source_name} style={{ fontSize: 10, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', borderRadius: 6, padding: '1px 6px' }}>
              {s.source_name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 요약 카드 ─────────────────────────────────────────────────
function SummaryCard({ label, value, suffix, gradient, icon }) {
  const { isLight: light } = useThemeMode()
  return (
    <div style={{
      borderRadius: 20, padding: '20px 22px',
      background: light ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)' : gradient,
      border: light ? '1px solid var(--nowa-border)' : 'none',
      boxShadow: 'var(--nowa-shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 6,
      minHeight: 120, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -14, top: -14, width: 80, height: 80, borderRadius: '50%', background: light ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', right: 14, top: 14, width: 40, height: 40, borderRadius: 12, background: light ? 'var(--nowa-primary-soft)' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: light ? 'var(--nowa-primary)' : '#fff' }}>
        {icon}
      </div>
      <div style={{ color: light ? 'var(--nowa-text-muted)' : 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ color: light ? 'var(--nowa-text)' : '#fff', fontWeight: 900, lineHeight: 1 }}>
        <span style={{ fontSize: 40 }}>{value}</span>
        {suffix && <span style={{ fontSize: 16, marginLeft: 4, opacity: 0.85 }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── 메인 ──────────────────────────────────────────────────────
function MocvdManagement() {
  const { isLight: light } = useThemeMode()
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [machines,    setMachines]    = useState([])
  const [sourceData,  setSourceData]  = useState({ rows: [], source_names: [] })
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all') // all | critical | warning | normal

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, sRes] = await Promise.all([
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/sources/all'),
      ])
      const mJson = await mRes.json()
      const sJson = await sRes.json()
      setMachines(Array.isArray(mJson) ? mJson : [])
      setSourceData(sJson)
    } catch {
      setError('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // 호기별 소스 목록 합치기
  const machineList = useMemo(() => {
    const rows     = sourceData.rows ?? []
    const srcNames = sourceData.source_names ?? []
    const rowMap   = new Map(rows.map(r => [r.machine_no, r]))

    return machines.map(m => {
      const row  = rowMap.get(m.machine_no) ?? {}
      const sources = srcNames.map(name => ({
        source_name: name,
        remaining:   row[name] ?? 0,
        daily_usage: row[`${name}_daily_usage`] ?? 0,
      }))
      return { ...m, sources }
    })
  }, [machines, sourceData])

  const statusMap = useMemo(() => {
    const m = {}
    machineList.forEach(machine => {
      m[machine.machine_no] = machine.is_active ? getMachineStatus(machine.sources) : 'off'
    })
    return m
  }, [machineList])

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return machineList.filter(m => {
      if (kw && !`${m.machine_no}`.includes(kw) && !`mo#${m.machine_no}호기`.includes(kw) && !(m.description ?? '').toLowerCase().includes(kw)) return false
      if (filter === 'critical' && statusMap[m.machine_no] !== 'critical') return false
      if (filter === 'warning'  && statusMap[m.machine_no] !== 'warning')  return false
      if (filter === 'normal'   && statusMap[m.machine_no] !== 'normal')   return false
      return true
    })
  }, [machineList, search, filter, statusMap])

  const criticalCount = machineList.filter(m => statusMap[m.machine_no] === 'critical').length
  const warningCount  = machineList.filter(m => statusMap[m.machine_no] === 'warning').length
  const activeCount   = machineList.filter(m => m.is_active).length

  const FILTER_BTNS = [
    { key: 'all',      label: '전체',   color: undefined },
    { key: 'critical', label: '부족',   color: '#f87171' },
    { key: 'warning',  label: '임박',   color: '#fbbf24' },
    { key: 'normal',   label: '정상',   color: '#34d399' },
  ]

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (error)   return <Alert type="error" showIcon message={error} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 헤더 */}
      <div style={{
        padding: 24, borderRadius: 22,
        border: '1px solid var(--nowa-border)',
        background: light ? 'var(--nowa-hero-bg)' : 'var(--nowa-hero-bg)',
        boxShadow: 'var(--nowa-shadow-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              MOCVD 현황판
            </div>
            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>
              전체 설비의 소스 잔량 및 소진 예측을 한눈에 확인합니다.
            </div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} className="nowa-btn">현황 새로고침</Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <SummaryCard label="가동 중 설비" value={activeCount} suffix="대"
            gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            icon={<ToolOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="소스 부족 설비" value={criticalCount} suffix="대"
            gradient="linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)"
            icon={<WarningOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="교체 임박 설비" value={warningCount} suffix="대"
            gradient="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
            icon={<WarningOutlined />} />
        </Col>
      </Row>

      {/* 차트 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>설비별 위험 현황</span>}
            styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            {(() => {
              const list = machineList
                .map(m => {
                  let critical = 0, warning = 0
                  m.sources.forEach(({ remaining, daily_usage }) => {
                    if (daily_usage <= 0) return
                    const days = remaining / daily_usage
                    if (days <= 7) critical++
                    else if (days <= 20) warning++
                  })
                  return { machine_no: m.machine_no, critical, warning }
                })
                .filter(m => m.critical > 0 || m.warning > 0)
                .sort((a, b) => (b.critical + b.warning) - (a.critical + a.warning))
                .slice(0, 20)
              if (list.length === 0) return (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  위험 설비 없음
                </div>
              )
              return (
                <ReactECharts
                  theme="dark"
                  style={{ height: 220 }}
                  option={{
                    backgroundColor: 'transparent',
                    grid: { top: 16, bottom: 44, left: 36, right: 16 },
                    tooltip: { trigger: 'axis' },
                    legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
                    xAxis: {
                      type: 'category',
                      data: list.map(m => `${m.machine_no}호`),
                      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
                      axisLine: { lineStyle: { color: '#1e2a3c' } },
                    },
                    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                    series: [
                      { name: '부족(7일↓)', type: 'bar', stack: 'risk', data: list.map(m => m.critical), itemStyle: { color: '#f87171' }, barMaxWidth: 28 },
                      { name: '임박(20일↓)', type: 'bar', stack: 'risk', data: list.map(m => m.warning), itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
                    ],
                  }}
                />
              )
            })()}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>소진 예정 시기 분포</span>}
            styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            <ReactECharts
              theme="dark"
              style={{ height: 220 }}
              option={(() => {
                const buckets = [
                  { label: '7일 이내', max: 7, color: '#f87171' },
                  { label: '14일 이내', max: 14, color: '#fb923c' },
                  { label: '30일 이내', max: 30, color: '#fbbf24' },
                  { label: '60일 이내', max: 60, color: '#60a5fa' },
                  { label: '60일 초과', max: Infinity, color: '#34d399' },
                ]
                const counts = buckets.map(() => 0)
                machineList.forEach(m => {
                  m.sources.forEach(({ daily_usage, remaining }) => {
                    if (daily_usage <= 0) return
                    const days = remaining / daily_usage
                    for (let i = 0; i < buckets.length; i++) {
                      if (days <= buckets[i].max) { counts[i]++; break }
                    }
                  })
                })
                return {
                  backgroundColor: 'transparent',
                  grid: { top: 16, bottom: 44, left: 48, right: 16 },
                  tooltip: { trigger: 'axis' },
                  xAxis: {
                    type: 'category',
                    data: buckets.map(b => b.label),
                    axisLabel: { color: '#64748b', fontSize: 11, rotate: 20 },
                    axisLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                  series: [{
                    type: 'bar',
                    data: counts.map((v, i) => ({ value: v, itemStyle: { color: buckets[i].color, borderRadius: [4, 4, 0, 0] } })),
                    barMaxWidth: 48,
                    label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
                  }],
                }
              })()}
            />
          </Card>
        </Col>
      </Row>

      {/* 필터 / 검색 */}
      <Card className="nowa-card" styles={{ body: { padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder="호기 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTER_BTNS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                border: filter === btn.key ? `1.5px solid ${btn.color ?? '#6366f1'}` : '1.5px solid rgba(100,116,139,0.25)',
                background: filter === btn.key ? (btn.color ? `${btn.color}22` : 'rgba(99,102,241,0.12)') : 'transparent',
                color: filter === btn.key ? (btn.color ?? '#a5b4fc') : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>
          {filtered.length}대 표시
        </span>
      </Card>

      {/* 호기 카드 그리드 */}
      <Row gutter={[12, 12]}>
        {filtered.map(m => (
          <Col key={m.machine_no} xs={24} sm={12} md={8} lg={6} xl={4}>
            <MachineCard {...m} />
          </Col>
        ))}
      </Row>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>조건에 맞는 설비가 없습니다.</div>
      )}
    </div>
  )
}

export default MocvdManagement
