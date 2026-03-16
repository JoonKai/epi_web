import { useEffect, useMemo, useState } from 'react'
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
  Typography,
} from 'antd'
import {
  AlertOutlined,
  CalendarOutlined,
  FilterOutlined,
  LeftOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'

const STATUS_META = {
  overdue: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: '부족' },
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

function SummaryCard({ label, value, suffix, icon, gradient = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', sub }) {
  return (
    <div className="nowa-kpi-card" style={{ background: gradient }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'var(--nowa-soft-fill-strong)',
          color: 'var(--nowa-contrast-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1 }}>
        {value}
        {suffix ? <span style={{ fontSize: 15, marginLeft: 4, color: 'var(--nowa-contrast-text-soft)' }}>{suffix}</span> : null}
      </div>
      {sub ? <div style={{ color: 'var(--nowa-contrast-text-muted)', fontSize: 12, marginTop: 8 }}>{sub}</div> : null}
    </div>
  )
}

function SectionCard({ title, extra, children, bodyStyle }) {
  return (
    <Card
      className="nowa-card"
      title={<span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>}
      extra={extra}
      styles={{ body: { padding: 24, ...bodyStyle }, header: { minHeight: 56 } }}
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
  const [displayMode, setDisplayMode] = useState('calendar')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  useEffect(() => {
    dayjs.locale('ko')
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

  const visibleListEvents = useMemo(() => {
    const prefix = viewMode === 'year' ? selectedDate.format('YYYY') : selectedDate.format('YYYY-MM')
    return filteredEvents.filter((item) => item.projected_replacement_date?.startsWith(prefix))
  }, [filteredEvents, selectedDate, viewMode])

  const groupedVisibleListEvents = useMemo(() => {
    const map = new Map()

    visibleListEvents.forEach((item) => {
      const key = item.projected_replacement_date
      if (!key) return
      const bucket = map.get(key) ?? []
      bucket.push(item)
      map.set(key, bucket)
    })

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: [...items].sort((a, b) => {
          const riskDiff = getRiskOrder(a.status) - getRiskOrder(b.status)
          if (riskDiff !== 0) return riskDiff
          return a.machine_no - b.machine_no
        }),
      }))
  }, [visibleListEvents])

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
    const items = eventsByDate.get(current.format('YYYY-MM-DD')) ?? []
    const isCurrentMonth = current.month() === selectedDate.month()
    const isSelected = current.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
    const isToday = current.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')

    return (
      <div
        style={{
          minHeight: 122,
          height: '100%',
          padding: 8,
          borderRadius: 14,
          border: isSelected
            ? '1px solid rgba(99,102,241,0.65)'
            : isCurrentMonth
              ? '1px solid var(--nowa-border)'
              : '1px solid rgba(255,255,255,0.03)',
          background: isSelected
            ? 'rgba(99,102,241,0.12)'
            : isCurrentMonth
              ? 'rgba(255,255,255,0.02)'
              : 'transparent',
          boxShadow: isSelected ? 'inset 0 0 0 1px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <div
          style={{
            color: isToday
              ? '#a5b4fc'
              : isCurrentMonth
                ? 'var(--nowa-text)'
                : 'rgba(255,255,255,0.2)',
            fontSize: 13,
            fontWeight: isCurrentMonth ? 800 : 500,
            marginBottom: 8,
          }}
        >
          {current.date()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.slice(0, 2).map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.normal
            return (
              <div
                key={item.id}
                style={{
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: meta.bg,
                  color: meta.color,
                  fontSize: 11,
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
          {items.length > 2 && (
            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11 }}>
              +{items.length - 2}건
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
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>일정 없음</div>
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13 }}>{items.length}건 예정</div>
            {overdue > 0 && (
              <Tag style={{ margin: 0, width: 'fit-content', color: '#f87171', background: 'rgba(248,113,113,0.12)', borderColor: 'transparent' }}>
                부족 {overdue}
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
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          border: '1px solid var(--nowa-border)',
          background: light
            ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 100%)'
            : 'linear-gradient(180deg, rgba(38,57,93,0.92) 0%, rgba(34,49,79,0.92) 100%)',
          boxShadow: 'var(--nowa-shadow-card)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="nowa-page-kicker">??? ??</div>
            <div className="nowa-page-title" style={{ fontSize: 24, marginBottom: 0 }}>
              MOCVD 소스교체 현황판
            </div>
            <div className="nowa-page-desc" style={{ marginTop: 8 }}>
              소스 입력에서 저장한 기준값과 현재 잔량 기준으로 교체 일정을 자동 계산합니다.
            </div>
          </div>
          <Button className="nowa-btn" icon={<ReloadOutlined />} onClick={fetchStatus}>
            현황 새로고침
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="대상 호기"
            value={totalMachines}
            suffix="대"
            icon={<ToolOutlined />}
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
            gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)"
            sub="즉시 확인 필요"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryCard
            label="잔량 부족"
            value={overdueCount}
            suffix="건"
            icon={<AlertOutlined />}
            gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)"
            sub="소스 교체 초과"
          />
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
                    legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
                    xAxis: {
                      type: 'category',
                      data: list.map(m => `${m.machine_no}`),
                      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
                      axisLine: { lineStyle: { color: '#1e2a3c' } },
                    },
                    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                    series: [
                      {
                        name: '부족',
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
                    axisLabel: { color: '#64748b', fontSize: 11, rotate: 20 },
                    axisLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e2a3c' } } },
                  series: [{
                    type: 'bar',
                    data: counts.map((v, i) => ({ value: v, itemStyle: { color: buckets[i].color, borderRadius: [4, 4, 0, 0] } })),
                    barMaxWidth: 48,
                    label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
                  }],
                }
              })()}
            />
          </SectionCard>
        </Col>
      </Row>

      <Card className="nowa-card" styles={{ body: { padding: 22 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Typography.Text style={{ color: 'var(--nowa-text-soft)', fontSize: 16, fontWeight: 800 }}>
            {selectedDate.format('YYYY-MM-DD')} 일정
          </Typography.Text>
          <Space wrap>
            <Button className="nowa-btn" icon={<LeftOutlined />} onClick={() => setSelectedDate((prev) => prev.subtract(1, 'day'))}>
              이전날
            </Button>
            <Button className="nowa-btn" disabled={isTodaySelected} onClick={() => setSelectedDate(dayjs())}>
              오늘
            </Button>
            <Button className="nowa-btn" icon={<RightOutlined />} iconPosition="end" onClick={() => setSelectedDate((prev) => prev.add(1, 'day'))}>
              다음날
            </Button>
          </Space>
        </div>

        {selectedDateEvents.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="선택한 날짜 일정이 없습니다." style={{ padding: '18px 0 4px' }} />
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {selectedDateEvents.map((item) => {
              const meta = STATUS_META[item.status] ?? STATUS_META.normal
              return (
                <Tag
                  key={item.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    color: meta.color,
                    background: meta.bg,
                    borderColor: 'transparent',
                    fontSize: 14,
                  }}
                >
                  {formatMachineLabel(item.machine_no)} {item.source_label}
                </Tag>
              )
            })}
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <SectionCard
            title="월간 교체 일정"
            extra={(
              <Segmented
                size="middle"
                value={displayMode}
                onChange={setDisplayMode}
                options={[
                  { label: '캘린더', value: 'calendar', icon: <CalendarOutlined /> },
                  { label: '목록', value: 'list', icon: <UnorderedListOutlined /> },
                ]}
              />
            )}
          >
            {visibleListEvents.length === 0 ? (
              <div style={{ padding: '18px 0 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <Button
                    className="nowa-btn"
                    icon={<LeftOutlined />}
                    onClick={() => setSelectedDate((prev) => prev.subtract(1, 'month'))}
                  >
                    이전달
                  </Button>
                  <span style={{ minWidth: 120, textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--nowa-text)' }}>
                    {selectedDate.year()}년 {selectedDate.month() + 1}월
                  </span>
                  <Button
                    className="nowa-btn"
                    icon={<RightOutlined />}
                    iconPosition="end"
                    onClick={() => setSelectedDate((prev) => prev.add(1, 'month'))}
                  >
                    다음달
                  </Button>
                  <Button onClick={() => setSelectedDate(dayjs())} size="small">이번 달</Button>
                </div>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 일정 데이터가 없습니다." />
              </div>
            ) : displayMode === 'calendar' ? (
              <Calendar
                value={selectedDate}
                mode={viewMode}
                fullscreen={false}
                onSelect={(value) => setSelectedDate(value)}
                onPanelChange={(value, mode) => {
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
                          이번 달
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {groupedVisibleListEvents.map(({ date, items }) => (
                  <div
                    key={date}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 18,
                      border: '1px solid var(--nowa-border)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
                      {formatDate(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {items.map((item) => {
                        const meta = STATUS_META[item.status] ?? STATUS_META.normal
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: '12px 14px',
                              borderRadius: 14,
                              background: 'rgba(11,18,36,0.42)',
                              border: '1px solid rgba(99,113,153,0.14)',
                            }}
                          >
                            <div style={{ color: 'var(--nowa-text)', fontWeight: 700 }}>
                              {formatMachineLabel(item.machine_no)} / {item.source_label}
                            </div>
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
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={9}>
          <SectionCard title="소스별 요약">
            {sourceSummary.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 소스 요약이 없습니다." style={{ padding: '36px 0 18px' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sourceSummary.slice(0, 8).map((item) => (
                  <div
                    key={item.source_label}
                    style={{
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
                        부족 {item.overdue}
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

    </div>
  )
}

export default SourceStatusBoard
