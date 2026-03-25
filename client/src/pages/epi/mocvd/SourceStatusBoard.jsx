import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import {
  Alert,
  Button,
  Calendar,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from 'antd'
import {
  AlertOutlined,
  FilterOutlined,
  LeftOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'
import PageBanner from '../../../components/PageBanner'

const STATUS_META = {
  overdue: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: '긴급' },
  urgent: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: '임박' },
  upcoming: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: '예정' },
  normal: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: '정상' },
}

function formatDate(value) {
  if (!value) return '-'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value
}

function getRiskOrder(status) {
  if (status === 'overdue') return 0
  if (status === 'urgent') return 1
  if (status === 'upcoming') return 2
  return 3
}

function SummaryCard({ label, value, suffix, icon, accent, gradient = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', sub }) {
  const resolvedAccent = accent || gradient.match(/#[0-9a-fA-F]{6}/)?.[0] || '#aeb8c9'
  return (
    <div
      className="nowa-kpi-card"
      style={{
        minHeight: 124,
        padding: '16px 18px',
        borderRadius: 18,
        background: `linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(10,15,27,0.98) 100%), ${gradient}`,
        border: '1px solid var(--nowa-border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `${gradient}`,
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: gradient,
          opacity: 0.95,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ color: resolvedAccent, fontSize: 14, fontWeight: 700, paddingTop: 2 }}>{label}</div>
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
      {sub ? <div style={{ color: `${resolvedAccent}cc`, fontSize: 14, marginTop: 10, position: 'relative', zIndex: 1 }}>{sub}</div> : null}
    </div>
  )
}

function SectionCard({ title, extra, children, bodyStyle, style }) {
  return (
    <Card
      className="nowa-card"
      title={<span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>}
      extra={extra}
      styles={{ body: { padding: 24, ...bodyStyle }, header: { minHeight: 56 } }}
      style={style}
    >
      {children}
    </Card>
  )
}

function SourceStatusBoard() {
  const { isLight: light } = useThemeMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [viewMode, setViewMode] = useState('month')
  const calendarColRef = useRef(null)
  const blockPanelChangeRef = useRef(false)
  const [calendarHeight, setCalendarHeight] = useState(null)
  const [holidays, setHolidays] = useState({}) // { 'YYYY-MM-DD': name }
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  useEffect(() => {
    dayjs.locale('ko')
  }, [])

  useEffect(() => {
    authFetch(`/api/shift/holidays?year=${selectedDate.year()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map = {}
          data.forEach(h => { map[h.date] = h.name })
          setHolidays(map)
        }
      })
      .catch(() => {})
  }, [selectedDate.year()])

  useEffect(() => {
    if (!calendarColRef.current) return
    const observer = new ResizeObserver(entries => {
      setCalendarHeight(entries[0].contentRect.height)
    })
    observer.observe(calendarColRef.current)
    return () => observer.disconnect()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/mocvd/source-status')
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || '소스 현황을 불러오지 못했습니다.')
      setData(json)
    } catch (err) {
      setError(err.message || '소스 현황을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const events = data?.events ?? []

  const sourceSummary = useMemo(() => {
    const map = new Map()
    events.forEach((item) => {
      const current = map.get(item.source_label) ?? {
        source_label: item.source_label,
        count: 0,
        overdue: 0,
        urgent: 0,
        nearest: item.projected_replacement_date,
      }
      current.count += 1
      if (item.status === 'overdue') current.overdue += 1
      if (item.status === 'urgent') current.urgent += 1
      if (item.projected_replacement_date && (!current.nearest || item.projected_replacement_date < current.nearest)) {
        current.nearest = item.projected_replacement_date
      }
      map.set(item.source_label, current)
    })

    return [...map.values()].sort((a, b) => {
      if (b.overdue !== a.overdue) return b.overdue - a.overdue
      if (b.urgent !== a.urgent) return b.urgent - a.urgent
      return a.source_label.localeCompare(b.source_label)
    })
  }, [events])

  const sourceOptions = useMemo(
    () => sourceSummary.map((item) => ({ value: item.source_label, label: item.source_label })),
    [sourceSummary],
  )

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const target = `${item.machine_no} ${formatMachineLabel(item.machine_no)} ${item.area ?? ''} ${item.source_label}`.toLowerCase()
      if (searchText && !target.includes(searchText.toLowerCase().trim())) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (sourceFilter !== 'all' && item.source_label !== sourceFilter) return false
      return true
    })
  }, [events, searchText, sourceFilter, statusFilter])

  const machineSummary = useMemo(() => {
    const map = new Map()

    filteredEvents.forEach((item) => {
      const current = map.get(item.machine_no) ?? {
        key: item.machine_no,
        machine_no: item.machine_no,
        area: item.area || '-',
        highestRisk: item.status,
        focusSources: [],
        nextDate: item.projected_replacement_date,
        reflected: 0,
      }

      if (getRiskOrder(item.status) < getRiskOrder(current.highestRisk)) {
        current.highestRisk = item.status
      }

      current.focusSources.push(item.source_label)

      if (item.projected_replacement_date && (!current.nextDate || item.projected_replacement_date < current.nextDate)) {
        current.nextDate = item.projected_replacement_date
      }

      if (item.projected_replacement_date) current.reflected += 1
      map.set(item.machine_no, current)
    })

    return [...map.values()]
      .map((item) => ({ ...item, focusSources: [...new Set(item.focusSources)].slice(0, 4) }))
      .sort((a, b) => {
        const riskDiff = getRiskOrder(a.highestRisk) - getRiskOrder(b.highestRisk)
        if (riskDiff !== 0) return riskDiff
        return (a.nextDate || '9999-12-31').localeCompare(b.nextDate || '9999-12-31')
      })
  }, [filteredEvents])

  const eventsByDate = useMemo(() => {
    const map = new Map()

    filteredEvents.forEach((item) => {
      if (!item.projected_replacement_date) return
      const key = item.projected_replacement_date
      const bucket = map.get(key) ?? []
      bucket.push(item)
      map.set(key, bucket)
    })

    return map
  }, [filteredEvents])

  const eventsByMonth = useMemo(() => {
    const map = new Map()

    filteredEvents.forEach((item) => {
      if (!item.projected_replacement_date) return
      const key = dayjs(item.projected_replacement_date).format('YYYY-MM')
      const bucket = map.get(key) ?? []
      bucket.push(item)
      map.set(key, bucket)
    })

    return map
  }, [filteredEvents])

  const selectedDateEvents = useMemo(
    () => eventsByDate.get(selectedDate.format('YYYY-MM-DD')) ?? [],
    [eventsByDate, selectedDate],
  )

  const machineColumns = [
    {
      title: '호기',
      dataIndex: 'machine_no',
      width: 140,
      render: (value) => <span style={{ fontWeight: 700 }}>{formatMachineLabel(value)}</span>,
    },
    { title: '라인', dataIndex: 'area', width: 90 },
    {
      title: '위험도',
      dataIndex: 'highestRisk',
      width: 110,
      render: (value) => {
        const meta = STATUS_META[value] ?? STATUS_META.normal
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              color: meta.color,
              background: meta.bg,
              fontWeight: 700,
            }}
          >
            {meta.label}
          </span>
        )
      },
    },
    {
      title: '집중 확인 소스',
      dataIndex: 'focusSources',
      render: (values) => (
        <Space size={[6, 6]} wrap>
          {values.map((value) => <Tag key={value} color="blue">{value}</Tag>)}
        </Space>
      ),
    },
    { title: '다음 교체', dataIndex: 'nextDate', width: 120, render: formatDate },
    { title: '입력 반영', dataIndex: 'reflected', width: 110, render: (value) => `${value}건` },
  ]

  const renderDateCell = (current) => {
    const dateStr = current.format('YYYY-MM-DD')
    const items = eventsByDate.get(dateStr) ?? []
    const isCurrentMonth = current.month() === selectedDate.month()

    if (!isCurrentMonth) return <div style={{ minHeight: 110 }} />

    const isSelected = dateStr === selectedDate.format('YYYY-MM-DD')
    const isToday = dateStr === dayjs().format('YYYY-MM-DD')
    const dow = current.day()
    const isSat = dow === 6
    const isSun = dow === 0
    const holiday = holidays[dateStr]
    const isHoliday = !!holiday || isSun

    const dateNumColor = isHoliday ? '#f87171' : isSat ? '#7dd3fc' : 'var(--nowa-text)'

    let bg = 'transparent'
    if (isSelected) bg = 'rgba(245,158,11,0.08)'
    else if (isToday) bg = 'rgba(99,179,237,0.06)'
    else if (isHoliday) bg = 'rgba(248,113,113,0.04)'
    else if (isSat) bg = 'rgba(125,211,252,0.03)'

    return (
      <div
        style={{
          minHeight: 110,
          height: '100%',
          padding: '8px 8px 6px',
          background: bg,
          borderTop: isSelected
            ? '2px solid rgba(245,158,11,0.85)'
            : isToday
            ? '2px solid rgba(99,179,237,0.7)'
            : isHoliday
            ? '2px solid rgba(248,113,113,0.35)'
            : isSat
            ? '2px solid rgba(125,211,252,0.25)'
            : '2px solid transparent',
          transition: 'background 0.15s',
        }}
      >
        {/* 날짜 숫자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: isToday ? '#fff' : isSelected ? '#fbbf24' : dateNumColor,
              background: isToday
                ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                : isSelected
                ? 'rgba(245,158,11,0.15)'
                : 'transparent',
              boxShadow: isToday ? '0 2px 8px rgba(59,130,246,0.5)' : 'none',
              flexShrink: 0,
            }}
          >
            {current.date()}
          </div>
          {/* 공휴일 이름 */}
          {holiday && (
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#f87171',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              flex: 1,
            }}>
              {holiday}
            </div>
          )}
          {/* 일정 건수 도트 */}
          {items.length > 0 && (
            <div style={{
              marginLeft: 'auto',
              fontSize: 14,
              fontWeight: 700,
              color: 'rgba(148,163,184,0.6)',
              flexShrink: 0,
            }}>
              {items.length}건
            </div>
          )}
        </div>

        {/* 일정 아이템 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.slice(0, 3).map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.normal
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 7px 3px 5px',
                  borderRadius: 6,
                  background: `${meta.color}12`,
                  borderLeft: `3px solid ${meta.color}`,
                  color: meta.color,
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatMachineLabel(item.machine_no)} {item.source_label}
              </div>
            )
          })}
          {items.length > 3 && (
            <div style={{
              padding: '2px 7px',
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(148,163,184,0.65)',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6,
              textAlign: 'center',
            }}>
              +{items.length - 3}건 더보기
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMonthCell = (current) => {
    const items = eventsByMonth.get(current.format('YYYY-MM')) ?? []
    const overdue = items.filter((item) => item.status === 'overdue').length
    const urgent = items.filter((item) => item.status === 'urgent').length

    return (
      <div
        style={{
          minHeight: 120,
          padding: 14,
          borderRadius: 16,
          border: '1px solid var(--nowa-border)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ color: 'var(--nowa-text)', fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
          {current.format('M월')}
        </div>
        {items.length === 0 ? (
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>일정 없음</div>
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ color: 'var(--nowa-text-soft)', fontSize: 14 }}>{items.length}건 예정</div>
            {overdue > 0 && (
              <Tag style={{ margin: 0, width: 'fit-content', color: '#f87171', background: 'rgba(248,113,113,0.12)', borderColor: 'transparent' }}>
                긴급 {overdue}
              </Tag>
            )}
            {urgent > 0 && (
              <Tag style={{ margin: 0, width: 'fit-content', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', borderColor: 'transparent' }}>
                임박 {urgent}
              </Tag>
            )}
          </Space>
        )}
      </div>
    )
  }

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />
  if (error) return <Alert type="error" showIcon message={error} />

  const totalMachines = new Set(events.map((item) => item.machine_no)).size
  const overdueCount = events.filter((item) => item.status === 'overdue').length
  const urgentCount = events.filter((item) => item.status === 'urgent').length
  const isTodaySelected = selectedDate.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageBanner
        kicker="소스 관리"
        title="MOCVD 소스교체 현황판"
        desc="소스 입력에서 저장한 기준값과 현재 잔량 기준으로 교체 일정을 자동 계산합니다."
        extra={(
          <Button className="nowa-btn" icon={<ReloadOutlined />} onClick={fetchStatus}>
            현황 새로고침
          </Button>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="대상 호기"
            value={totalMachines}
            suffix="대"
            icon={<ToolOutlined />}
            accent="#818cf8"
            gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)"
            sub="현재 운영 중인 장비"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="소스 항목"
            value={events.length}
            suffix="건"
            icon={<NodeIndexOutlined />}
            accent="#2dd4bf"
            gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)"
            sub="등록된 교체 일정"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="교체 임박/초과"
            value={overdueCount + urgentCount}
            suffix="건"
            icon={<WarningOutlined />}
            accent="#fbbf24"
            gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)"
            sub="즉시 확인 필요"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="잔량 긴급"
            value={overdueCount}
            suffix="건"
            icon={<AlertOutlined />}
            accent="#fb7185"
            gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)"
            sub="소스 교체 초과"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <SectionCard title="소스별 요약">
            {sourceSummary.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 소스 요약이 없습니다." style={{ padding: '36px 0 18px' }} />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {sourceSummary.slice(0, 8).map((item) => (
                  <div
                    key={item.source_label}
                    style={{
                      flex: '1 1 220px',
                      padding: '14px 16px',
                      borderRadius: 16,
                      border: '1px solid var(--nowa-border)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>{item.source_label}</div>
                      <Tag color="blue">{item.count}건</Tag>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <span className="nowa-pill" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}>
                        긴급 {item.overdue}
                      </span>
                      <span className="nowa-pill" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)' }}>
                        임박 {item.urgent}
                      </span>
                      <span className="nowa-pill" style={{ background: 'var(--nowa-button-bg)', color: 'var(--nowa-text-muted)' }}>
                        최근 {formatDate(item.nearest)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <SectionCard title="설비별 위험 현황" bodyStyle={{ padding: '8px 12px 4px' }}>
            {(() => {
              const machineMap = new Map()
              events.forEach(item => {
                const c = machineMap.get(item.machine_no) ?? { machine_no: item.machine_no, overdue: 0, urgent: 0 }
                if (item.status === 'overdue') c.overdue++
                if (item.status === 'urgent') c.urgent++
                machineMap.set(item.machine_no, c)
              })
              const list = [...machineMap.values()]
                .filter(m => m.overdue > 0 || m.urgent > 0)
                .sort((a, b) => (b.overdue + b.urgent) - (a.overdue + a.urgent))
                .slice(0, 20)
              return (
                <ReactECharts
                  theme={light ? undefined : 'dark'}
                  style={{ height: 220 }}
                  option={{
                    backgroundColor: 'transparent',
                    grid: { top: 16, bottom: 44, left: 36, right: 16 },
                    tooltip: { trigger: 'axis' },
                    legend: { bottom: 4, textStyle: { color: '#b0c0d0', fontSize: 14 } },
                    xAxis: {
                      type: 'category',
                      data: list.map(m => `${m.machine_no}`),
                      axisLabel: { color: '#64748b', fontSize: 14, rotate: 30 },
                      axisLine: { lineStyle: { color: '#1e2a3c' } },
                    },
                    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 14 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                    series: [
                      {
                        name: '긴급',
                        type: 'bar',
                        stack: 'risk',
                        data: list.map(m => m.overdue),
                        itemStyle: { color: '#f87171' },
                        barMaxWidth: 28,
                      },
                      {
                        name: '임박',
                        type: 'bar',
                        stack: 'risk',
                        data: list.map(m => m.urgent),
                        itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] },
                        barMaxWidth: 28,
                      },
                    ],
                  }}
                />
              )
            })()}
          </SectionCard>
        </Col>
        <Col xs={24} md={12}>
          <SectionCard title="교체 예정 시기 분포" bodyStyle={{ padding: '8px 12px 4px' }}>
            <ReactECharts
              theme={light ? undefined : 'dark'}
              style={{ height: 220 }}
              option={(() => {
                const today = dayjs()
                const buckets = [
                  { label: '7일 이내', max: 7, color: '#f87171' },
                  { label: '14일 이내', max: 14, color: '#fb923c' },
                  { label: '30일 이내', max: 30, color: '#fbbf24' },
                  { label: '60일 이내', max: 60, color: '#60a5fa' },
                  { label: '60일 초과', max: Infinity, color: '#34d399' },
                ]
                const counts = buckets.map(() => 0)
                events.forEach(item => {
                  if (!item.projected_replacement_date) return
                  const diff = dayjs(item.projected_replacement_date).diff(today, 'day')
                  for (let i = 0; i < buckets.length; i++) {
                    if (diff <= buckets[i].max) { counts[i]++; break }
                  }
                })
                return {
                  backgroundColor: 'transparent',
                  grid: { top: 16, bottom: 44, left: 48, right: 16 },
                  tooltip: { trigger: 'axis' },
                  xAxis: {
                    type: 'category',
                    data: buckets.map(b => b.label),
                    axisLabel: { color: '#64748b', fontSize: 14, rotate: 20 },
                    axisLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 14 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                  series: [{
                    type: 'bar',
                    data: counts.map((v, i) => ({ value: v, itemStyle: { color: buckets[i].color, borderRadius: [4, 4, 0, 0] } })),
                    barMaxWidth: 48,
                    label: { show: true, position: 'top', color: '#b0c0d0', fontSize: 14 },
                  }],
                }
              })()}
            />
          </SectionCard>
        </Col>
      </Row>

      <style>{`
        .day-card-abs.ant-card { display: flex !important; flex-direction: column !important; }
        .day-card-abs > .ant-card-body { flex: 1 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; min-height: 0 !important; }
      `}</style>
      <div style={{ position: 'relative' }}>
        {/* 왼쪽 캘린더가 부모 높이 결정 */}
        <div style={{ marginRight: 'calc((100% - 16px) * 7 / 24 + 16px)' }}>
          <SectionCard
            title="월간 교체 일정"
          >
            <>
              <style>{`
                .source-cal-wrap .ant-picker-cell:not(.ant-picker-cell-in-view) { pointer-events: none !important; }
                .source-cal-wrap .ant-picker-cell-in-view:hover > div { background: rgba(245,158,11,0.06) !important; }
                .source-cal-wrap .ant-picker-panel { background: transparent !important; }
                .source-cal-wrap table { border-collapse: collapse !important; }
                .source-cal-wrap thead th { padding: 6px 0 10px !important; font-size: 12px !important; font-weight: 700 !important; color: rgba(148,163,184,0.7) !important; letter-spacing: 0.5px !important; }
                .source-cal-wrap td { padding: 0 !important; border: 1px solid rgba(255,255,255,0.04) !important; }
              `}</style>
              {(() => {
                const offset = selectedDate.startOf('month').day()
                const rowsNeeded = Math.ceil((offset + selectedDate.daysInMonth()) / 7)
                if (rowsNeeded < 6) {
                  return <style>{`.source-cal-wrap table tbody tr:last-child { display: none !important; }`}</style>
                }
                return null
              })()}
              <div className="source-cal-wrap"><Calendar
                value={selectedDate}
                mode={viewMode}
                fullscreen={false}
                onSelect={(value) => {
                  if (value.month() !== selectedDate.month()) {
                    blockPanelChangeRef.current = true
                    return
                  }
                  setSelectedDate(value)
                }}
                onPanelChange={(value, mode) => {
                  if (blockPanelChangeRef.current) {
                    blockPanelChangeRef.current = false
                    setViewMode(mode)
                    return
                  }
                  setSelectedDate(value)
                  setViewMode(mode)
                }}
                headerRender={({ value, onChange, onTypeChange }) => {
                  const currentYear = dayjs().year()
                  const yearOptions = Array.from({ length: 9 }, (_, index) => {
                    const year = currentYear - 4 + index
                    return { value: year, label: `${year}년` }
                  })

                  const goPrev = () => {
                    const next = viewMode === 'month' ? value.subtract(1, 'month') : value.subtract(1, 'year')
                    onChange(next); setSelectedDate(next)
                  }
                  const goNext = () => {
                    const next = viewMode === 'month' ? value.add(1, 'month') : value.add(1, 'year')
                    onChange(next); setSelectedDate(next)
                  }
                  const goToday = () => {
                    const next = dayjs()
                    onChange(next); setSelectedDate(next)
                  }

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                      {/* 현재 월 표시 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                          type="text"
                          icon={<LeftOutlined />}
                          onClick={goPrev}
                          style={{ color: 'var(--nowa-text-muted)', border: '1px solid var(--nowa-border)' }}
                        />
                        <div style={{ minWidth: 130, textAlign: 'center' }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--nowa-text)', letterSpacing: -0.5 }}>
                            {value.year()}년 {value.month() + 1}월
                          </span>
                        </div>
                        <Button
                          type="text"
                          icon={<RightOutlined />}
                          onClick={goNext}
                          style={{ color: 'var(--nowa-text-muted)', border: '1px solid var(--nowa-border)' }}
                        />
                        <Button onClick={goToday} size="small" style={{ marginLeft: 4 }}>
                          오늘
                        </Button>
                      </div>

                      {/* 오른쪽 컨트롤 */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Select
                          value={value.year()}
                          style={{ width: 110 }}
                          options={yearOptions}
                          onChange={(year) => {
                            const next = value.year(year)
                            onChange(next); setSelectedDate(next)
                          }}
                        />
                        <Segmented
                          value={viewMode}
                          onChange={(nextMode) => {
                            onTypeChange(nextMode)
                            setViewMode(nextMode)
                          }}
                          options={[
                            { label: '월간', value: 'month' },
                            { label: '연간', value: 'year' },
                          ]}
                        />
                      </div>
                    </div>
                  )
                }}
                fullCellRender={(current, info) => {
                  if (info.type === 'date') return renderDateCell(current)
                  if (info.type === 'month') return renderMonthCell(current)
                  return info.originNode
                }}
              />
              </div>
            </>
          </SectionCard>

        </div>

        {/* 날짜별 일정 카드: 절대위치로 캘린더 카드와 동일 높이 */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'calc((100% - 16px) * 7 / 24)',
          display: 'flex', flexDirection: 'column',
        }}>
          <Card
            className="nowa-card day-card-abs"
            title={
              <span style={{ fontSize: 15, fontWeight: 800 }}>
                {selectedDate.format('YYYY-MM-DD')} 일정
              </span>
            }
            styles={{ body: { padding: '14px 18px' } }}
            style={{ height: '100%' }}
          >
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 14 }}>
              <Button size="small" className="nowa-btn" icon={<LeftOutlined />} onClick={() => setSelectedDate((prev) => prev.subtract(1, 'day'))}>이전날</Button>
              <Button size="small" className="nowa-btn" disabled={isTodaySelected} onClick={() => setSelectedDate(dayjs())}>오늘</Button>
              <Button size="small" className="nowa-btn" icon={<RightOutlined />} iconPosition="end" onClick={() => setSelectedDate((prev) => prev.add(1, 'day'))}>다음날</Button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="선택한 날짜 일정이 없습니다." style={{ padding: '24px 0 8px' }} />
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {selectedDateEvents.map((item) => {
                  const meta = STATUS_META[item.status] ?? STATUS_META.normal
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: meta.bg,
                        border: `1px solid ${meta.color}30`,
                        boxShadow: `inset 3px 0 0 ${meta.color}`,
                      }}
                    >
                      <span style={{ color: meta.color, fontWeight: 700, fontSize: 14 }}>
                        {formatMachineLabel(item.machine_no)} {item.source_label}
                      </span>
                      <span style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        borderRadius: 999,
                        color: meta.color,
                        background: 'rgba(0,0,0,0.2)',
                        fontSize: 14,
                        fontWeight: 700,
                      }}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SourceStatusBoard
