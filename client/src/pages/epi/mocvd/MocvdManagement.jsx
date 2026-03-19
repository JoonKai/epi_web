import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Alert, Button, Card, Col, Input, Row, Skeleton, Switch, Tabs, Tag, Tooltip, message } from 'antd'
import {
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'
import WorkLog from './WorkLog'

function getMachineRiskStatus(sources, forcedDown) {
  if (forcedDown) return 'forced'

  let critical = 0
  let warning = 0
  sources.forEach(({ remaining, daily_usage }) => {
    if (daily_usage <= 0) return
    const days = remaining / daily_usage
    if (days <= 7) critical += 1
    else if (days <= 20) warning += 1
  })

  if (critical > 0) return 'down'
  if (warning > 0) return 'warning'
  return 'normal'
}

const STATUS_META = {
  forced: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.28)',
    label: '강제 다운',
    icon: <CloseCircleOutlined />,
  },
  down: {
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.28)',
    label: '다운 위험',
    icon: <AlertOutlined />,
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.24)',
    label: '주의',
    icon: <WarningOutlined />,
  },
  normal: {
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.08)',
    border: 'rgba(20,184,166,0.24)',
    label: '정상',
    icon: <CheckCircleOutlined />,
  },
  inactive: {
    color: '#64748b',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.18)',
    label: '비활성',
    icon: <CloseCircleOutlined />,
  },
}

function getRiskSources(sources) {
  return sources
    .map((source) => {
      if (source.daily_usage <= 0) return { ...source, daysLeft: null, risk: 'idle' }
      const daysLeft = source.remaining / source.daily_usage
      if (daysLeft <= 7) return { ...source, daysLeft, risk: 'down' }
      if (daysLeft <= 20) return { ...source, daysLeft, risk: 'warning' }
      return { ...source, daysLeft, risk: 'normal' }
    })
    .sort((a, b) => {
      const rank = { down: 0, warning: 1, normal: 2, idle: 3 }
      if (rank[a.risk] !== rank[b.risk]) return rank[a.risk] - rank[b.risk]
      if (a.daysLeft == null && b.daysLeft == null) return a.source_name.localeCompare(b.source_name)
      if (a.daysLeft == null) return 1
      if (b.daysLeft == null) return -1
      return a.daysLeft - b.daysLeft
    })
}

function RiskBar({ name, remaining, daily_usage }) {
  const daysLeft = daily_usage > 0 ? remaining / daily_usage : null
  const color = daysLeft == null ? '#475569' : daysLeft <= 7 ? '#f43f5e' : daysLeft <= 20 ? '#f59e0b' : '#14b8a6'
  const pct = daysLeft == null ? 12 : Math.min(100, (daysLeft / 45) * 100)

  return (
    <Tooltip title={daysLeft == null ? `${name}: 사용량 미입력` : `${name}: 약 ${Math.max(daysLeft, 0).toFixed(0)}일 잔여`}>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 11,
            color: 'var(--nowa-text-muted)',
            marginBottom: 4,
          }}
        >
          <span>{name}</span>
          <span style={{ color }}>{daysLeft == null ? '-' : `${Math.max(daysLeft, 0).toFixed(0)}일`}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(196,210,226,0.14)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.25s ease' }} />
        </div>
      </div>
    </Tooltip>
  )
}

function MachineCard({ machine_no, description, is_active, forcedDown, sources }) {
  const { isLight } = useThemeMode()
  const status = is_active ? getMachineRiskStatus(sources, forcedDown) : 'inactive'
  const meta = STATUS_META[status]
  const riskySources = getRiskSources(sources)
  const aggregateSource = forcedDown ? null : riskySources.find((item) => item.daysLeft != null) ?? null

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${meta.border}`,
        background: isLight ? 'var(--nowa-bg-raised)' : meta.bg,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 248,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: meta.color }}>{formatMachineLabel(machine_no)}</div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, marginTop: 2 }}>{description || '설비 설명 없음'}</div>
        </div>
        <Tag style={{ margin: 0, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 999, fontWeight: 700 }}>
          {meta.icon} {meta.label}
        </Tag>
      </div>

      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>다운 리스크 요인</div>
        {forcedDown ? (
          <div style={{ color: meta.color, fontSize: 12, fontWeight: 700 }}>강제 다운으로 지정된 설비입니다.</div>
        ) : aggregateSource == null ? (
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>등록된 리스크 데이터가 없습니다.</div>
        ) : (
          <RiskBar key={`${machine_no}:aggregate-source`} name="소스" remaining={aggregateSource.daysLeft} daily_usage={1} />
        )}
      </div>

      <div style={{ marginTop: 'auto', color: 'var(--nowa-text-muted)', fontSize: 12 }}>
        {forcedDown ? '현황판에서 강제 다운 상태로 표시됩니다.' : '현재 소스 상태를 기준으로 리스크를 표시합니다.'}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, suffix, gradient, accent, icon, sub }) {
  const resolvedAccent = accent || gradient.match(/#[0-9a-fA-F]{6}/)?.[0] || '#aeb8c9'
  return (
    <div
      className="nowa-kpi-card"
      style={{
        minHeight: 124,
        padding: '16px 18px',
        borderRadius: 18,
        background: `linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(10,15,27,0.98) 100%), ${gradient}`,
        border: '1px solid rgba(196,210,226,0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: gradient, opacity: 0.14, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient, opacity: 0.95 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ color: resolvedAccent, fontSize: 12, fontWeight: 700, paddingTop: 2 }}>{label}</div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: `${resolvedAccent}18`,
            border: `1px solid ${resolvedAccent}30`,
            color: resolvedAccent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 10, color: 'var(--nowa-text)', fontSize: 30, fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 1 }}>
        {value}
        {suffix ? <span style={{ fontSize: 14, marginLeft: 4, color: `${resolvedAccent}cc`, fontWeight: 700 }}>{suffix}</span> : null}
      </div>
      {sub ? <div style={{ color: `${resolvedAccent}cc`, fontSize: 12, marginTop: 10, position: 'relative', zIndex: 1 }}>{sub}</div> : null}
    </div>
  )
}

function ForceDownTab({ machineList, pendingForcedDownMap, onToggle, onResetAll, onSave, saving }) {
  const rows = machineList.filter((machine) => machine.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card className="nowa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--nowa-text)' }}>장비 강제 다운</div>
            <div style={{ color: 'var(--nowa-text-muted)', marginTop: 4 }}>특정 MO 설비를 수동으로 다운 상태로 고정합니다.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={onResetAll} disabled={saving}>
              전설비 정상화
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
              저장
            </Button>
          </div>
        </div>
      </Card>

      <Row gutter={[12, 12]}>
        {rows.map((machine) => {
          const forced = pendingForcedDownMap[machine.machine_no] ?? false
          return (
            <Col key={machine.machine_no} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: forced ? '#ef4444' : 'var(--nowa-text)', fontWeight: 800, fontSize: 16 }}>
                      {formatMachineLabel(machine.machine_no)}
                    </div>
                    <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>
                      {machine.description || '설비 설명 없음'}
                    </div>
                  </div>
                  <Switch checked={forced} onChange={(checked) => onToggle(machine.machine_no, checked)} />
                </div>
                <div style={{ marginTop: 14, color: forced ? '#ef4444' : 'var(--nowa-text-muted)', fontSize: 12, fontWeight: forced ? 700 : 500 }}>
                  {forced ? '현황판에서 강제 다운으로 표시됩니다.' : '현재는 강제 다운 미적용 상태입니다.'}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

function OverviewTab({ machineList, filtered, filter, setFilter, search, setSearch, fetchAll }) {
  const statusMap = useMemo(() => {
    const next = {}
    machineList.forEach((machine) => {
      next[machine.machine_no] = machine.is_active ? getMachineRiskStatus(machine.sources, machine.forced_down) : 'inactive'
    })
    return next
  }, [machineList])

  const activeCount = machineList.filter((machine) => machine.is_active).length
  const downCount = machineList.filter((machine) => statusMap[machine.machine_no] === 'down' || statusMap[machine.machine_no] === 'forced').length
  const warningCount = machineList.filter((machine) => statusMap[machine.machine_no] === 'warning').length

  const filterButtons = [
    { key: 'all', label: '전체', color: undefined },
    { key: 'forced', label: '강제 다운', color: '#ef4444' },
    { key: 'down', label: '다운 위험', color: '#f43f5e' },
    { key: 'warning', label: '주의', color: '#f59e0b' },
    { key: 'normal', label: '정상', color: '#14b8a6' },
  ]

  const riskChartRows = machineList
    .map((machine) => {
      const riskSources = getRiskSources(machine.sources)
      return {
        machine_no: machine.machine_no,
        forced: machine.forced_down ? 1 : 0,
        down: machine.forced_down ? 0 : riskSources.filter((item) => item.risk === 'down').length,
        warning: machine.forced_down ? 0 : riskSources.filter((item) => item.risk === 'warning').length,
      }
    })
    .filter((machine) => machine.forced > 0 || machine.down > 0 || machine.warning > 0)
    .sort((a, b) => (b.forced + b.down + b.warning) - (a.forced + a.down + a.warning))
    .slice(0, 20)

  const distributionBuckets = [
    { label: '7일 이내', max: 7, color: '#f43f5e' },
    { label: '14일 이내', max: 14, color: '#fb7185' },
    { label: '30일 이내', max: 30, color: '#f59e0b' },
    { label: '60일 이내', max: 60, color: '#60a5fa' },
    { label: '60일 초과', max: Number.POSITIVE_INFINITY, color: '#14b8a6' },
  ]
  const distributionCounts = distributionBuckets.map(() => 0)
  machineList.forEach((machine) => {
    if (machine.forced_down) {
      distributionCounts[0] += 1
      return
    }
    machine.sources.forEach((source) => {
      if (source.daily_usage <= 0) return
      const daysLeft = source.remaining / source.daily_usage
      for (let i = 0; i < distributionBuckets.length; i += 1) {
        if (daysLeft <= distributionBuckets[i].max) {
          distributionCounts[i] += 1
          break
        }
      }
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div>
            <div className="nowa-page-kicker">설비 관리</div>
            <div className="nowa-page-title" style={{ fontSize: 24 }}>MOCVD 장비 현황판</div>
            <div className="nowa-page-desc">현재 소스 사용 데이터와 강제 다운 지정 상태를 기준으로 장비 상태를 보여줍니다.</div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} className="nowa-btn">
            현황 새로고침
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <SummaryCard label="가동 설비" value={activeCount} suffix="대" accent="#818cf8" gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" icon={<ToolOutlined />} sub="현재 운영 중인 설비" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="다운 위험 설비" value={downCount} suffix="대" accent="#fb7185" gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)" icon={<AlertOutlined />} sub="강제 다운 포함" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="주의 설비" value={warningCount} suffix="대" accent="#fbbf24" gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)" icon={<WarningOutlined />} sub="단기 점검 필요 대상" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>설비 다운 위험 현황</span>} styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            {riskChartRows.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Alert message="다운 위험 설비가 없습니다." type="success" showIcon />
              </div>
            ) : (
              <ReactECharts
                theme="dark"
                style={{ height: 220 }}
                option={{
                  backgroundColor: 'transparent',
                  grid: { top: 16, bottom: 44, left: 36, right: 16 },
                  tooltip: { trigger: 'axis' },
                  legend: { bottom: 4, textStyle: { color: '#b0c0d0', fontSize: 11 } },
                  xAxis: {
                    type: 'category',
                    data: riskChartRows.map((row) => `${row.machine_no}`),
                    axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
                    axisLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  yAxis: {
                    type: 'value',
                    minInterval: 1,
                    axisLabel: { color: '#64748b', fontSize: 11 },
                    splitLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  series: [
                    { name: '강제 다운', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.forced), itemStyle: { color: '#ef4444' }, barMaxWidth: 28 },
                    { name: '다운 위험', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.down), itemStyle: { color: '#f43f5e' }, barMaxWidth: 28 },
                    { name: '주의', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.warning), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
                  ],
                }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>다운 예상 시기 분포</span>} styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            <ReactECharts
              theme="dark"
              style={{ height: 220 }}
              option={{
                backgroundColor: 'transparent',
                grid: { top: 16, bottom: 44, left: 48, right: 16 },
                tooltip: { trigger: 'axis' },
                xAxis: {
                  type: 'category',
                  data: distributionBuckets.map((bucket) => bucket.label),
                  axisLabel: { color: '#64748b', fontSize: 11, rotate: 20 },
                  axisLine: { lineStyle: { color: '#1e2a3c' } },
                },
                yAxis: {
                  type: 'value',
                  minInterval: 1,
                  axisLabel: { color: '#64748b', fontSize: 11 },
                  splitLine: { lineStyle: { color: '#1e2a3c' } },
                },
                series: [
                  {
                    type: 'bar',
                    data: distributionCounts.map((value, index) => ({ value, itemStyle: { color: distributionBuckets[index].color, borderRadius: [4, 4, 0, 0] } })),
                    barMaxWidth: 48,
                    label: { show: true, position: 'top', color: '#b0c0d0', fontSize: 11 },
                  },
                ],
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="nowa-card" styles={{ body: { padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder="호기 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => setFilter(button.key)}
              style={{
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
                border: filter === button.key ? `1.5px solid ${button.color ?? '#6366f1'}` : '1.5px solid rgba(100,116,139,0.25)',
                background: filter === button.key ? (button.color ? `${button.color}22` : 'rgba(99,102,241,0.12)') : 'transparent',
                color: filter === button.key ? button.color ?? '#a5b4fc' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>{filtered.length}대 표시</span>
      </Card>

      <Row gutter={[12, 12]}>
        {filtered.map((machine) => (
          <Col key={machine.machine_no} xs={24} sm={12} md={8} lg={6} xl={4}>
            <MachineCard {...machine} />
          </Col>
        ))}
      </Row>

      {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>조건에 맞는 설비가 없습니다.</div> : null}
    </div>
  )
}

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.18)',
  marginBottom: 20,
  paddingBottom: 0,
}

export default function MocvdManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [sourceData, setSourceData] = useState({ rows: [], source_names: [] })
  const [forcedDown, setForcedDown] = useState([])
  const [pendingForcedDownMap, setPendingForcedDownMap] = useState({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, sRes, fRes] = await Promise.all([
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/sources/all'),
        authFetch('/api/mocvd/forced-down'),
      ])
      const [mJson, sJson, fJson] = await Promise.all([mRes.json(), sRes.json(), fRes.json()])
      setMachines(Array.isArray(mJson) ? mJson : [])
      setSourceData(sJson)
      const machineNos = Array.isArray(fJson.machine_nos) ? fJson.machine_nos : []
      setForcedDown(machineNos)
      setPendingForcedDownMap(Object.fromEntries(machineNos.map((machineNo) => [machineNo, true])))
    } catch {
      setError('MOCVD 설비 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const machineList = useMemo(() => {
    const rows = sourceData.rows ?? []
    const sourceNames = sourceData.source_names ?? []
    const rowMap = new Map(rows.map((row) => [row.machine_no, row]))
    const forcedDownSet = new Set(forcedDown)

    return machines.map((machine) => {
      const row = rowMap.get(machine.machine_no) ?? {}
      const sources = sourceNames.map((name) => ({
        source_name: name,
        remaining: row[name] ?? 0,
        daily_usage: row[`${name}_daily_usage`] ?? 0,
      }))
      return { ...machine, forced_down: forcedDownSet.has(machine.machine_no), sources }
    })
  }, [machines, sourceData, forcedDown])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return machineList.filter((machine) => {
      if (
        keyword &&
        !`${machine.machine_no}`.includes(keyword) &&
        !formatMachineLabel(machine.machine_no).toLowerCase().includes(keyword) &&
        !(machine.description ?? '').toLowerCase().includes(keyword)
      ) {
        return false
      }
      const status = machine.is_active ? getMachineRiskStatus(machine.sources, machine.forced_down) : 'inactive'
      if (filter !== 'all' && status !== filter) return false
      return true
    })
  }, [machineList, search, filter])

  const handleToggleForcedDown = useCallback((machineNo, checked) => {
    setPendingForcedDownMap((prev) => {
      const next = { ...prev }
      if (checked) next[machineNo] = true
      else delete next[machineNo]
      return next
    })
  }, [])

  const handleResetAllForcedDown = useCallback(() => {
    setPendingForcedDownMap({})
  }, [])

  const handleSaveForcedDown = useCallback(async () => {
    setSaving(true)
    try {
      const machineNos = Object.entries(pendingForcedDownMap)
        .filter(([, checked]) => checked)
        .map(([machineNo]) => Number(machineNo))
        .sort((a, b) => a - b)

      const res = await authFetch('/api/mocvd/forced-down', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_nos: machineNos }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || '강제 다운 저장에 실패했습니다.')
      }

      message.success('장비 강제 다운 상태를 저장했습니다.')
      setForcedDown(machineNos)
    } catch (error) {
      message.error(error.message || '강제 다운 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [pendingForcedDownMap])

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (error) return <Alert type="error" showIcon message={error} />

  return (
    <Tabs
      tabBarStyle={tabBarStyle}
      items={[
        {
          key: 'overview',
          label: <span><DashboardOutlined /> 장비 현황판</span>,
          children: (
            <OverviewTab
              machineList={machineList}
              filtered={filtered}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              fetchAll={fetchAll}
            />
          ),
        },
        {
          key: 'forced-down',
          label: <span><PoweroffOutlined /> 장비 강제 다운</span>,
          children: (
            <ForceDownTab
              machineList={machineList}
              pendingForcedDownMap={pendingForcedDownMap}
              onToggle={handleToggleForcedDown}
              onResetAll={handleResetAllForcedDown}
              onSave={handleSaveForcedDown}
              saving={saving}
            />
          ),
        },
        {
          key: 'work-log',
          label: <span><FileTextOutlined /> 업무 일지</span>,
          children: <div style={{ paddingTop: 12 }}><WorkLog /></div>,
        },
        {
          key: 'equipment-history',
          label: <span><HistoryOutlined /> 장비 이력</span>,
          children: (
            <div style={{ paddingTop: 24, textAlign: 'center', color: 'rgba(196,210,226,0.4)', fontSize: 14 }}>
              장비 이력 기능이 추가될 예정입니다.
            </div>
          ),
        },
      ]}
    />
  )
}
