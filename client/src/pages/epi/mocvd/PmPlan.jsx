import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Alert, Button, Calendar, Card, Col, Input, Modal, Row, Segmented, Select, Spin, Table, Tabs, Tag, TimePicker, message } from 'antd'
import { AppstoreOutlined, BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, FolderOutlined, LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SyncOutlined, UnorderedListOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'
import PageBanner from '../../../components/PageBanner'


const PM_ROW_H = 34
const PM_HEAD_H = 38
const PM_BORDER = '1px solid rgba(245,158,11,0.12)'
const PM_GROUP_BORDER = '2px solid rgba(245,158,11,0.28)'

const pmHeadBase = {
  position: 'sticky',
  top: 0,
  background: '#242834',
  border: PM_BORDER,
  padding: '0 6px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  height: PM_HEAD_H,
  zIndex: 9,
}

const pmLabelBase = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  border: PM_BORDER,
  padding: '0 10px',
  whiteSpace: 'nowrap',
  height: PM_ROW_H,
  fontWeight: 700,
  fontSize: 14,
  textAlign: 'center',
}

const pmCellBase = {
  border: PM_BORDER,
  padding: 0,
  height: PM_ROW_H,
  verticalAlign: 'middle',
}

function formatMachineLabel(machineNo) {
  if (machineNo == null || machineNo === '') return '-'
  return `MO#${machineNo}호기`
}

function parseMachineNo(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const match = text.match(/(\d+)/)
  if (!match) return null
  const machineNo = Number(match[1])
  return Number.isFinite(machineNo) ? machineNo : null
}

function normalizeCsvHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function parseCsvText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}


function toEditingText(value) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num === 0) return ''
  return String(value)
}

function SummaryCard({ label, value, suffix, sub, accent, gradient = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', icon = <CalendarOutlined /> }) {
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
      <div style={{ position: 'absolute', inset: 0, background: gradient, opacity: 0.14, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient, opacity: 0.95 }} />
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
      <div style={{ color: `${resolvedAccent}cc`, fontSize: 14, marginTop: 10, position: 'relative', zIndex: 1 }}>{sub}</div>
    </div>
  )
}

function PmEditCell({ cellId, activeEditKey, value, onChange, onTabNavigate, color, bg }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(toEditingText(value))
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) setLocal(toEditingText(value))
  }, [value, editing])

  useEffect(() => {
    if (activeEditKey === cellId) {
      setLocal(toEditingText(value))
      setEditing(true)
    }
  }, [activeEditKey, cellId, value])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select()
  }, [editing])

  const commit = () => {
    if (local.trim() === '') {
      onChange(0)
      setEditing(false)
      return
    }
    const num = parseFloat(local)
    if (!Number.isNaN(num)) onChange(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Tab') {
            event.preventDefault()
            commit()
            onTabNavigate?.(cellId, event.shiftKey ? -1 : 1)
          }
          if (event.key === 'Escape') setEditing(false)
        }}
        autoFocus
        style={{
          width: '100%',
          height: PM_ROW_H - 2,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid #f59e0b',
          color,
          fontSize: 14,
          textAlign: 'right',
          padding: '0 6px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => {
        setLocal(toEditingText(value))
        setEditing(true)
      }}
      style={{
        width: '100%',
        height: PM_ROW_H - 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 6,
        cursor: 'text',
        color,
        fontSize: 14,
        background: bg,
        userSelect: 'none',
      }}
    >
      {Number(value ?? 0).toFixed(0)}
    </div>
  )
}

function PmInputSheet({ rows, onChange }) {
  const [activeEditKey, setActiveEditKey] = useState(null)
  const orderedEditKeys = useMemo(
    () => rows.flatMap((row) => ['pm_base_count', 'filter_base_count', 'chamber_count', 'filter_count'].map((field) => `${field}:${row.key}`)),
    [rows],
  )

  const handleTabNavigate = useCallback(
    (cellId, direction) => {
      const currentIndex = orderedEditKeys.indexOf(cellId)
      if (currentIndex < 0) return
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= orderedEditKeys.length) {
        setActiveEditKey(null)
        return
      }
      setActiveEditKey(orderedEditKeys[nextIndex])
    },
    [orderedEditKeys],
  )

  if (rows.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>표시할 설비가 없습니다.</div>
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', position: 'relative' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: 760, fontSize: 14 }}>
        <colgroup>
          <col style={{ width: 160, minWidth: 160 }} />
          <col style={{ width: 160, minWidth: 160 }} />
          <col style={{ width: 180, minWidth: 180 }} />
          <col style={{ width: 150, minWidth: 150 }} />
          <col style={{ width: 160, minWidth: 160 }} />
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                ...pmHeadBase,
                left: 0,
                zIndex: 12,
                background: '#171b26',
                width: 160,
                color: 'rgba(196,210,226,0.6)',
              }}
            >
              호기
            </th>
            <th style={{ ...pmHeadBase, borderLeft: PM_GROUP_BORDER, color: '#7dd3fc', fontWeight: 700 }}>PM 기준 횟수</th>
            <th style={{ ...pmHeadBase, color: '#fcd34d', fontWeight: 700 }}>필터 교체 기준 횟수</th>
            <th style={{ ...pmHeadBase, color: '#38bdf8', fontWeight: 700 }}>챔버사용횟수</th>
            <th style={{ ...pmHeadBase, color: '#fbbf24', fontWeight: 700 }}>필터사용횟수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={{ ...pmLabelBase, background: '#171b26', color: '#fbbf24', borderRight: PM_GROUP_BORDER, textAlign: 'left', paddingLeft: 14 }}>
                {formatMachineLabel(row.machine_no)}
              </td>
              <td style={{ ...pmCellBase, borderLeft: PM_GROUP_BORDER, background: '#081019' }}>
                <PmEditCell
                  cellId={`pm_base_count:${row.key}`}
                  activeEditKey={activeEditKey}
                  value={row.pm_base_count}
                  color="#7dd3fc"
                  bg="#081019"
                  onTabNavigate={handleTabNavigate}
                  onChange={(value) => onChange(row.key, 'pm_base_count', value)}
                />
              </td>
              <td style={{ ...pmCellBase, background: '#110d00' }}>
                <PmEditCell
                  cellId={`filter_base_count:${row.key}`}
                  activeEditKey={activeEditKey}
                  value={row.filter_base_count}
                  color="#fcd34d"
                  bg="#110d00"
                  onTabNavigate={handleTabNavigate}
                  onChange={(value) => onChange(row.key, 'filter_base_count', value)}
                />
              </td>
              <td style={{ ...pmCellBase, background: '#0a1119' }}>
                <PmEditCell
                  cellId={`chamber_count:${row.key}`}
                  activeEditKey={activeEditKey}
                  value={row.chamber_count}
                  color="#38bdf8"
                  bg="#0a1119"
                  onTabNavigate={handleTabNavigate}
                  onChange={(value) => onChange(row.key, 'chamber_count', value)}
                />
              </td>
              <td style={{ ...pmCellBase, background: '#100e00' }}>
                <PmEditCell
                  cellId={`filter_count:${row.key}`}
                  activeEditKey={activeEditKey}
                  value={row.filter_count}
                  color="#fbbf24"
                  bg="#100e00"
                  onTabNavigate={handleTabNavigate}
                  onChange={(value) => onChange(row.key, 'filter_count', value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function pmStatus(remaining, { critical = 5, urgent = 20 } = {}) {
  if (remaining <= 0)        return { label: '교체필요', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', glow: 'rgba(248,113,113,0.15)' }
  if (remaining <= critical) return { label: '긴급',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', glow: 'rgba(248,113,113,0.15)' }
  if (remaining <= urgent)   return { label: '임박',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)',   glow: 'rgba(251,191,36,0.08)' }
  return                            { label: '정상',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)',  glow: 'rgba(74,222,128,0.05)' }
}

function MachineStatusCard({ row, thresholds = {} }) {
  const pmPct = Math.min(100, row.pm_base_count > 0 ? (row.chamber_count / row.pm_base_count) * 100 : 0)
  const filterPct = Math.min(100, row.filter_base_count > 0 ? (row.filter_count / row.filter_base_count) * 100 : 0)
  const pmRemaining = row.pm_base_count - row.chamber_count
  const filterRemaining = row.filter_base_count - row.filter_count

  // 더 나쁜 상태 기준으로 카드 상태 결정
  const pmSt = pmStatus(pmRemaining, thresholds)
  const filterSt = pmStatus(filterRemaining, thresholds)
  const cardSt = pmRemaining <= filterRemaining ? pmSt : filterSt

  const pmBarColor = pmSt.color === '#4ade80' ? '#7dd3fc' : pmSt.color
  const filterBarColor = filterSt.color === '#4ade80' ? '#a78bfa' : filterSt.color

  return (
    <div style={{
      borderRadius: 18,
      border: `1px solid ${cardSt.border}`,
      background: 'linear-gradient(145deg, rgba(30,34,46,0.98) 0%, rgba(22,26,36,0.98) 100%)',
      boxShadow: `0 4px 24px ${cardSt.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
      overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${cardSt.color}, transparent)` }} />
      <div style={{ padding: '14px 16px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--nowa-text)', letterSpacing: -0.3 }}>
              {formatMachineLabel(row.machine_no)}
            </div>
            {row.description && (
              <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', marginTop: 2 }}>{row.description}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <div style={{ padding: '3px 10px', borderRadius: 999, background: pmSt.bg, color: pmSt.color, fontSize: 14, fontWeight: 800, border: `1px solid ${pmSt.border}` }}>
              Chamber {pmSt.label}
            </div>
            <div style={{ padding: '3px 10px', borderRadius: 999, background: filterSt.bg, color: filterSt.color, fontSize: 14, fontWeight: 800, border: `1px solid ${filterSt.border}` }}>
              Filter {filterSt.label}
            </div>
          </div>
        </div>

        {/* PM 진행률 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7dd3fc' }}>Chamber Count</span>
            <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.6)' }}>
              {row.chamber_count} / {row.pm_base_count}
              <span style={{ color: pmBarColor, fontWeight: 700, marginLeft: 4 }}>
                ({pmRemaining > 0 ? `잔여 ${pmRemaining}` : `${Math.abs(pmRemaining)} 초과`})
              </span>
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999, width: `${pmPct}%`,
              background: `linear-gradient(90deg, ${pmBarColor}cc, ${pmBarColor})`,
              boxShadow: `0 0 8px ${pmBarColor}60`, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Filter 진행률 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>Filter Count</span>
            <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.6)' }}>
              {row.filter_count} / {row.filter_base_count}
              <span style={{ color: filterBarColor, fontWeight: 700, marginLeft: 4 }}>
                ({filterRemaining > 0 ? `잔여 ${filterRemaining}` : `${Math.abs(filterRemaining)} 초과`})
              </span>
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999, width: `${filterPct}%`,
              background: `linear-gradient(90deg, ${filterBarColor}cc, ${filterBarColor})`,
              boxShadow: `0 0 8px ${filterBarColor}60`, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PmStatusBoard({ refreshKey, thresholds = {} }) {
  const { critical = 5, urgent = 20 } = thresholds
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/pm-counters')
      const json = await res.json().catch(() => [])
      if (Array.isArray(json)) {
        setRows(json.map((r) => ({
          key: String(r.machine_no),
          machine_no: Number(r.machine_no),
          description: r.description || '',
          chamber_count: Number(r.chamber_count ?? 0),
          pm_base_count: Number(r.pm_base_count ?? 0),
          filter_count: Number(r.filter_count ?? 0),
          filter_base_count: Number(r.filter_base_count ?? 0),
        })))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows, refreshKey])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aRem = Math.min(a.pm_base_count - a.chamber_count, a.filter_base_count - a.filter_count)
      const bRem = Math.min(b.pm_base_count - b.chamber_count, b.filter_base_count - b.filter_count)
      return aRem - bRem
    })
  }, [rows])

  const needPm = rows.filter((r) => r.pm_base_count - r.chamber_count <= 0).length
  const criticalPm = rows.filter((r) => { const rem = r.pm_base_count - r.chamber_count; return rem > 0 && rem <= critical }).length
  const urgentPm = rows.filter((r) => { const rem = r.pm_base_count - r.chamber_count; return rem > critical && rem <= urgent }).length
  const needFilter = rows.filter((r) => r.filter_count >= r.filter_base_count).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageBanner
        kicker="PM 주기 현황판"
        title="MOCVD PM 주기 현황"
        desc="PM 기준 횟수 대비 현재 사용 횟수를 기준으로 교체 필요 설비를 확인합니다."
        extra={(
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>새로고침</Button>
        )}
      />

      {/* KPI 카드 */}
      <Row gutter={[14, 14]}>
        <Col xs={24} sm={12} xl={5}>
          <SummaryCard label="전체 설비" value={rows.length} suffix="대" sub="PM 관리 대상"
            gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" icon={<AppstoreOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={5}>
          <SummaryCard label="교체 필요" value={needPm} suffix="대" sub="기준 횟수 도달"
            gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)" icon={<WarningOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={5}>
          <SummaryCard label="긴급" value={criticalPm} suffix="대" sub={`잔여 ${critical}런 이하`}
            gradient="linear-gradient(135deg,#f43f5e 0%,#f87171 100%)" icon={<WarningOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={5}>
          <SummaryCard label="임박" value={urgentPm} suffix="대" sub={`잔여 ${urgent}런 이하`}
            gradient="linear-gradient(135deg,#f59e0b 0%,#eab308 100%)" icon={<ClockCircleOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <SummaryCard label="Filter 교체 필요" value={needFilter} suffix="대" sub="기준 횟수 도달"
            gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)" icon={<CheckCircleOutlined />} />
        </Col>
      </Row>

      {/* PM 캘린더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid rgba(125,211,252,0.6)', paddingLeft: 12, marginTop: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--nowa-text)' }}>PM 일정 캘린더</span>
      </div>
      <PmCalendarBoard refreshKey={refreshKey} />

    </div>
  )
}

function PmCalendarBoard({ refreshKey }) {
  const blockPanelChangeRef = useRef(false)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [viewMode, setViewMode] = useState('month')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ machine_no: null, title: '', detail: '', actor: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/equipment-history')
      const json = await res.json().catch(() => [])
      if (Array.isArray(json)) setEvents(json.filter(e => e.event_type === 'pm'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    authFetch('/api/mocvd/machines').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMachines(data.filter(m => m.is_active))
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents, refreshKey])

  const eventsByDate = useMemo(() => {
    const map = new Map()
    events.forEach(e => {
      const d = e.occurred_at ? e.occurred_at.slice(0, 10) : null
      if (!d) return
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(e)
    })
    return map
  }, [events])

  const eventsByMonth = useMemo(() => {
    const map = new Map()
    events.forEach(e => {
      const m = e.occurred_at ? e.occurred_at.slice(0, 7) : null
      if (!m) return
      if (!map.has(m)) map.set(m, [])
      map.get(m).push(e)
    })
    return map
  }, [events])

  const selectedDateEvents = useMemo(() =>
    eventsByDate.get(selectedDate.format('YYYY-MM-DD')) ?? []
  , [selectedDate, eventsByDate])

  const isTodaySelected = selectedDate.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')

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

    const dateNumColor = isSun ? '#f87171' : isSat ? '#7dd3fc' : 'var(--nowa-text)'
    let bg = 'transparent'
    if (isSelected) bg = 'rgba(245,158,11,0.08)'
    else if (isToday) bg = 'rgba(99,179,237,0.06)'
    else if (isSun) bg = 'rgba(248,113,113,0.04)'
    else if (isSat) bg = 'rgba(125,211,252,0.03)'

    return (
      <div style={{
        minHeight: 110, height: '100%', padding: '8px 8px 6px', background: bg,
        borderTop: isSelected ? '2px solid rgba(245,158,11,0.85)'
          : isToday ? '2px solid rgba(99,179,237,0.7)'
          : isSun ? '2px solid rgba(248,113,113,0.3)'
          : isSat ? '2px solid rgba(125,211,252,0.2)'
          : '2px solid transparent',
        transition: 'background 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, flexShrink: 0,
            color: isToday ? '#fff' : isSelected ? '#fbbf24' : dateNumColor,
            background: isToday ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : isSelected ? 'rgba(245,158,11,0.15)' : 'transparent',
            boxShadow: isToday ? '0 2px 8px rgba(59,130,246,0.5)' : 'none',
          }}>{current.date()}</div>
          {items.length > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: 'rgba(148,163,184,0.6)', flexShrink: 0 }}>
              {items.length}건
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.slice(0, 3).map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 7px 3px 5px', borderRadius: 6,
              background: 'rgba(125,211,252,0.1)', borderLeft: '3px solid #7dd3fc',
              color: '#7dd3fc', fontSize: 14, fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {formatMachineLabel(e.machine_no)}
            </div>
          ))}
          {items.length > 3 && (
            <div style={{
              padding: '2px 7px', fontSize: 14, fontWeight: 600,
              color: 'rgba(148,163,184,0.65)', background: 'rgba(255,255,255,0.04)',
              borderRadius: 6, textAlign: 'center',
            }}>+{items.length - 3}건 더보기</div>
          )}
        </div>
      </div>
    )
  }

  const renderMonthCell = (current) => {
    const items = eventsByMonth.get(current.format('YYYY-MM')) ?? []
    return (
      <div style={{ minHeight: 120, padding: 14, borderRadius: 16, border: '1px solid var(--nowa-border)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ color: 'var(--nowa-text)', fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{current.format('M월')}</div>
        {items.length === 0
          ? <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>PM 없음</div>
          : <div style={{ color: '#7dd3fc', fontSize: 14, fontWeight: 700 }}>{items.length}건</div>
        }
      </div>
    )
  }

  const handleAddPm = async () => {
    if (!addForm.machine_no) { message.warning('설비를 선택하세요'); return }
    setAddSaving(true)
    try {
      const res = await authFetch('/api/mocvd/equipment-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_no: addForm.machine_no,
          event_type: 'pm', severity: 'medium',
          title: addForm.title || `PM 수행 - ${formatMachineLabel(addForm.machine_no)}`,
          detail: addForm.detail,
          occurred_at: selectedDate.format('YYYY-MM-DD'),
          actor: addForm.actor,
        }),
      })
      if (!res.ok) throw new Error('저장 실패')
      message.success('PM 이력이 등록되었습니다.')
      setShowAdd(false)
      setAddForm({ machine_no: null, title: '', detail: '', actor: '' })
      fetchEvents()
    } catch (e) { message.error(e.message) }
    finally { setAddSaving(false) }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      const res = await authFetch(`/api/mocvd/equipment-history/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      message.success('삭제되었습니다.')
      fetchEvents()
    } catch (e) { message.error(e.message) }
    finally { setDeleting(null) }
  }

  // 달력 행 수 계산 (5행이면 마지막 행 숨김)
  const offset = selectedDate.startOf('month').day()
  const rowsNeeded = Math.ceil((offset + selectedDate.daysInMonth()) / 7)

  return (
    <>
      <style>{`
        .pm-cal-wrap .ant-picker-cell:not(.ant-picker-cell-in-view) { pointer-events: none !important; }
        .pm-cal-wrap .ant-picker-cell-in-view:hover > div { background: rgba(245,158,11,0.06) !important; }
        .pm-cal-wrap .ant-picker-panel { background: transparent !important; }
        .pm-cal-wrap table { border-collapse: collapse !important; }
        .pm-cal-wrap thead th { padding: 6px 0 10px !important; font-size: 12px !important; font-weight: 700 !important; color: rgba(148,163,184,0.7) !important; letter-spacing: 0.5px !important; }
        .pm-cal-wrap td { padding: 0 !important; border: 1px solid rgba(255,255,255,0.04) !important; }
        .pm-day-card.ant-card { display: flex !important; flex-direction: column !important; }
        .pm-day-card > .ant-card-body { flex: 1 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; min-height: 0 !important; }
        ${rowsNeeded < 6 ? '.pm-cal-wrap table tbody tr:last-child { display: none !important; }' : ''}
      `}</style>

      <div style={{ position: 'relative' }}>
        {/* 왼쪽: 캘린더 (오른쪽 패널 너비만큼 margin) */}
        <div style={{ marginRight: 'calc((100% - 16px) * 7 / 24 + 16px)' }}>
          <Card className="nowa-card" styles={{ body: { padding: '20px 24px' } }}>
            <Spin spinning={loading}>
              <div className="pm-cal-wrap">
                <Calendar
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
                    const yearOptions = Array.from({ length: 9 }, (_, i) => {
                      const y = dayjs().year() - 4 + i
                      return { value: y, label: `${y}년` }
                    })
                    const goPrev = () => { const n = viewMode === 'month' ? value.subtract(1, 'month') : value.subtract(1, 'year'); onChange(n); setSelectedDate(n) }
                    const goNext = () => { const n = viewMode === 'month' ? value.add(1, 'month') : value.add(1, 'year'); onChange(n); setSelectedDate(n) }
                    const goToday = () => { const n = dayjs(); onChange(n); setSelectedDate(n) }
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Button type="text" icon={<LeftOutlined />} onClick={goPrev} style={{ color: 'var(--nowa-text-muted)', border: '1px solid var(--nowa-border)' }} />
                          <div style={{ minWidth: 130, textAlign: 'center' }}>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--nowa-text)', letterSpacing: -0.5 }}>
                              {value.year()}년 {value.month() + 1}월
                            </span>
                          </div>
                          <Button type="text" icon={<RightOutlined />} onClick={goNext} style={{ color: 'var(--nowa-text-muted)', border: '1px solid var(--nowa-border)' }} />
                          <Button onClick={goToday} size="small" style={{ marginLeft: 4 }}>오늘</Button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Select value={value.year()} style={{ width: 110 }} options={yearOptions}
                            onChange={(y) => { const n = value.year(y); onChange(n); setSelectedDate(n) }} />
                          <Segmented value={viewMode}
                            onChange={(m) => { onTypeChange(m); setViewMode(m) }}
                            options={[{ label: '월간', value: 'month' }, { label: '연간', value: 'year' }]} />
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
            </Spin>
          </Card>
        </div>

        {/* 오른쪽: 선택 날짜 상세 (절대위치) */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'calc((100% - 16px) * 7 / 24)',
          display: 'flex', flexDirection: 'column',
        }}>
          <Card
            className="nowa-card pm-day-card"
            title={<span style={{ fontSize: 15, fontWeight: 800 }}>{selectedDate.format('YYYY-MM-DD')} 일정</span>}
            styles={{ body: { padding: '14px 18px' } }}
            style={{ height: '100%' }}
          >
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="small" icon={<LeftOutlined />} onClick={() => setSelectedDate(d => d.subtract(1, 'day'))}>이전날</Button>
                <Button size="small" disabled={isTodaySelected} onClick={() => setSelectedDate(dayjs())}>오늘</Button>
                <Button size="small" icon={<RightOutlined />} iconPosition="end" onClick={() => setSelectedDate(d => d.add(1, 'day'))}>다음날</Button>
              </div>
              <Button size="small" type="primary" icon={<PlusOutlined />}
                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                onClick={() => setShowAdd(true)}>
                PM 등록
              </Button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--nowa-text-muted)', fontSize: 14 }}>
                선택한 날짜 일정이 없습니다.
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {selectedDateEvents.map(e => (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(125,211,252,0.08)', border: '1px solid rgba(125,211,252,0.18)',
                    boxShadow: 'inset 3px 0 0 #7dd3fc',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#7dd3fc', fontWeight: 800, fontSize: 14 }}>{formatMachineLabel(e.machine_no)}</div>
                      <div style={{ color: 'var(--nowa-text)', fontSize: 14, marginTop: 2 }}>{e.title}</div>
                      {e.detail && <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 2 }}>{e.detail}</div>}
                      {e.actor && <div style={{ color: 'rgba(196,210,226,0.68)', fontSize: 14, marginTop: 2 }}>담당: {e.actor}</div>}
                    </div>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      loading={deleting === e.id} onClick={() => handleDelete(e.id)} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* PM 등록 모달 */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAdd(false)}>
          <div style={{
            width: 420, maxWidth: '95vw', borderRadius: 18,
            background: 'linear-gradient(145deg,#1a2032,#141824)', border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(245,158,11,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 15 }}>PM 이력 등록 — {selectedDate.format('YYYY-MM-DD')}</span>
              <Button size="small" type="text" onClick={() => setShowAdd(false)}>✕</Button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', marginBottom: 5 }}>설비 *</div>
                <Select style={{ width: '100%' }} placeholder="설비 선택" showSearch
                  value={addForm.machine_no}
                  onChange={v => setAddForm(f => ({ ...f, machine_no: v }))}
                  options={machines.map(m => ({ value: m.machine_no, label: formatMachineLabel(m.machine_no) }))}
                  filterOption={(input, option) => String(option.label).includes(input)} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', marginBottom: 5 }}>제목</div>
                <Input placeholder="예: Chamber PM 수행" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', marginBottom: 5 }}>상세</div>
                <Input.TextArea rows={2} placeholder="상세 내용 (선택)" value={addForm.detail} onChange={e => setAddForm(f => ({ ...f, detail: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', marginBottom: 5 }}>담당자</div>
                <Input placeholder="담당자명" value={addForm.actor} onChange={e => setAddForm(f => ({ ...f, actor: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <Button onClick={() => setShowAdd(false)}>취소</Button>
                <Button type="primary" loading={addSaving} onClick={handleAddPm}
                  style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>등록</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PmMachineBoard({ refreshKey, thresholds = {} }) {
  const [search, setSearch] = useState('')
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/pm-counters')
      const json = await res.json().catch(() => [])
      if (Array.isArray(json)) {
        setAllRows(json.map((r) => ({
          key: String(r.machine_no),
          machine_no: Number(r.machine_no),
          description: r.description || '',
          chamber_count: Number(r.chamber_count ?? 0),
          pm_base_count: Number(r.pm_base_count ?? 0),
          filter_count: Number(r.filter_count ?? 0),
          filter_base_count: Number(r.filter_base_count ?? 0),
        })))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows, refreshKey])

  const rows = useMemo(() => {
    const filtered = allRows.filter((r) => String(r.machine_no).includes(search.trim()) || r.description.toLowerCase().includes(search.toLowerCase().trim()))
    return [...filtered].sort((a, b) => {
      const aRem = Math.min(a.pm_base_count - a.chamber_count, a.filter_base_count - a.filter_count)
      const bRem = Math.min(b.pm_base_count - b.chamber_count, b.filter_base_count - b.filter_count)
      return aRem - bRem
    })
  }, [allRows, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="호기 검색" style={{ width: 220 }} allowClear />
        <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>{rows.length}대 표시</span>
      </div>
      <Spin spinning={loading}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {rows.map((row) => <MachineStatusCard key={row.key} row={row} thresholds={thresholds} />)}
        </div>
      </Spin>
    </div>
  )
}

function usePmCycleGlobal(onApplied) {
  const [pmBase, setPmBase]         = useState('')
  const [filterBase, setFilterBase] = useState('')
  const [fetched, setFetched]       = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    authFetch('/api/mocvd/pm-counters')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPmBase(String(data[0].pm_base_count ?? ''))
          setFilterBase(String(data[0].filter_base_count ?? ''))
        }
        setFetched(true)
      })
      .catch(() => setFetched(true))
  }, [])

  const handleApply = async () => {
    const pb = Number(pmBase)
    const fb = Number(filterBase)
    if (isNaN(pb) || isNaN(fb) || pb < 0 || fb < 0) { message.warning('올바른 숫자를 입력하세요.'); return }
    setSaving(true)
    try {
      const listRes = await authFetch('/api/mocvd/pm-counters')
      const list = await listRes.json()
      if (!listRes.ok || !Array.isArray(list)) throw new Error('조회 실패')
      const items = list.map(m => ({
        machine_no: m.machine_no,
        chamber_count: m.chamber_count,
        pm_base_count: pb,
        filter_count: m.filter_count,
        filter_base_count: fb,
      }))
      const res = await authFetch('/api/mocvd/pm-counters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) throw new Error('저장 실패')
      message.success(`전체 ${list.length}개 기기에 PM 주기 적용 완료`)
      onApplied?.()
    } catch (e) {
      message.error(e.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return { pmBase, filterBase, setPmBase, setFilterBase, saving, handleApply, fetched }
}

function PmSyncCard({ onSynced }) {
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [paths, setPaths]             = useState(['', '', ''])
  const [pathSaving, setPathSaving]   = useState(false)
  const [schedule, setSchedule]       = useState(['07:00', '19:00'])
  const [schedSaving, setSchedSaving] = useState(false)
  const [logs, setLogs]               = useState([])
  const pollRef = useRef(null)
  const [browseOpen, setBrowseOpen]   = useState(false)
  const [browseIdx, setBrowseIdx]     = useState(null)
  const [browsePath, setBrowsePath]   = useState('')
  const [browseDirs, setBrowseDirs]   = useState([])
  const [browseFiles, setBrowseFiles] = useState([])
  const [browseParent, setBrowseParent] = useState(null)
  const [browseLoading, setBrowseLoading] = useState(false)

  const fetchLogs = useCallback(() => {
    authFetch('/api/admin/sync-pm-counter/logs')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLogs(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    authFetch('/api/admin/sync-pm-counter/paths')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPaths(data) })
      .catch(() => {})
    authFetch('/api/admin/sync-pm-counter/schedule')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSchedule(data) })
      .catch(() => {})
    fetchLogs()
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [fetchLogs])

  const handleSaveSchedule = async () => {
    setSchedSaving(true)
    try {
      const res = await authFetch('/api/admin/sync-pm-counter/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      })
      if (!res.ok) throw new Error('저장 실패')
      message.success('스케줄 저장 완료')
    } catch (e) { message.error(e.message) }
    finally { setSchedSaving(false) }
  }

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch('/api/admin/sync-pm-counter/status')
        const json = await res.json().catch(() => ({}))
        if (!json.running) {
          stopPolling()
          setLoading(false)
          if (json.result) {
            setResult(json.result)
            if (json.result.error_count === 0) {
              message.success(`동기화 완료 — ${json.result.updated_count}개 호기 업데이트`)
            } else {
              message.warning(`동기화 완료 (경고 ${json.result.error_count}건)`)
            }
            onSynced?.()
            fetchLogs()
          }
        }
      } catch {
        stopPolling(); setLoading(false); message.error('상태 확인 실패')
      }
    }, 2000)
  }

  const openBrowse = async (idx) => {
    setBrowseIdx(idx)
    setBrowseOpen(true)
    await loadBrowse('')
  }

  const loadBrowse = async (path) => {
    setBrowseLoading(true)
    try {
      const res = await authFetch(`/api/admin/file-browse?path=${encodeURIComponent(path)}`)
      if (!res.ok) { message.error('접근할 수 없는 경로입니다.'); return }
      const data = await res.json()
      setBrowsePath(data.path)
      setBrowseParent(data.parent)
      setBrowseDirs(data.dirs)
      setBrowseFiles(data.files)
    } catch { message.error('파일 탐색 실패') }
    finally { setBrowseLoading(false) }
  }

  const handleBrowseSelectFile = (fileName) => {
    const sep = browsePath.endsWith('\\') || browsePath.endsWith('/') ? '' : '\\'
    const fullPath = browsePath + sep + fileName
    setPaths(prev => prev.map((v, idx) => idx === browseIdx ? fullPath : v))
    setBrowseOpen(false)
  }

  const handleSavePaths = async () => {
    setPathSaving(true)
    try {
      const res = await authFetch('/api/admin/sync-pm-counter/paths', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paths),
      })
      if (!res.ok) throw new Error('저장 실패')
      message.success('경로 저장 완료')
    } catch (e) { message.error(e.message) }
    finally { setPathSaving(false) }
  }

  const handleSync = async () => {
    setLoading(true); setResult(null)
    try {
      const res = await authFetch('/api/admin/sync-pm-counter', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '동기화 시작 실패')
      if (json.status === 'running') message.info('이미 동기화가 진행 중입니다.')
      startPolling()
    } catch (e) { setLoading(false); message.error(e.message) }
  }

  return (
    <Card
      className="nowa-card"
      title={<span style={{ color: '#f59e0b', fontWeight: 800 }}><SyncOutlined style={{ marginRight: 6 }} />PM 카운터 동기화</span>}
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      {/* 경로 설정 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>엑셀 파일 경로</div>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 40, opacity: 0.5, fontSize: 14, flexShrink: 0 }}>파일 {i + 1}</span>
            <Input
              value={p}
              onChange={e => setPaths(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`예: \\\\서버\\공유폴더\\파일${i + 1}.xlsm`}
              style={{ fontFamily: 'monospace', fontSize: 14 }}
            />
            <Button icon={<FolderOpenOutlined />} onClick={() => openBrowse(i)} title="파일 열기" />
          </div>
        ))}
        <Button size="small" onClick={handleSavePaths} loading={pathSaving} style={{ marginTop: 4 }}>
          경로 저장
        </Button>
      </div>

      {/* 파일 탐색 모달 */}
      <Modal
        title={<span><FolderOpenOutlined style={{ marginRight: 6 }} />파일 선택</span>}
        open={browseOpen}
        onCancel={() => setBrowseOpen(false)}
        footer={null}
        width={560}
      >
        <div style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>
          {browsePath || '드라이브 선택'}
        </div>
        <Spin spinning={browseLoading}>
          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 4 }}>
            {browseParent !== null && (
              <div
                onClick={() => loadBrowse(browseParent)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6, color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LeftOutlined style={{ fontSize: 11 }} /> 상위 폴더
              </div>
            )}
            {browseDirs.map(d => (
              <div
                key={d}
                onClick={() => loadBrowse((browsePath ? (browsePath.endsWith('\\') ? browsePath : browsePath + '\\') : '') + d)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderOutlined style={{ color: '#f59e0b' }} />
                <span>{d}</span>
              </div>
            ))}
            {browseFiles.map(f => (
              <div
                key={f}
                onClick={() => handleBrowseSelectFile(f)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <SaveOutlined style={{ color: '#4ade80' }} />
                <span style={{ color: '#4ade80' }}>{f}</span>
              </div>
            ))}
            {browseDirs.length === 0 && browseFiles.length === 0 && !browseLoading && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                엑셀 파일이 없습니다
              </div>
            )}
          </div>
        </Spin>
      </Modal>

      {/* 자동 실행 시간 설정 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>자동 실행 시간</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {schedule.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TimePicker
                value={t ? dayjs(`2000-01-01T${t}:00`) : null}
                format="HH:mm"
                size="small"
                minuteStep={10}
                onChange={(_, str) => setSchedule(prev => prev.map((v, idx) => idx === i ? str : v))}
                style={{ width: 90 }}
              />
              {schedule.length > 1 && (
                <Button
                  size="small" type="text" danger
                  icon={<DeleteOutlined />}
                  onClick={() => setSchedule(prev => prev.filter((_, idx) => idx !== i))}
                />
              )}
            </div>
          ))}
          {schedule.length < 6 && (
            <Button
              size="small" icon={<PlusOutlined />}
              onClick={() => setSchedule(prev => [...prev, '12:00'])}
            >
              추가
            </Button>
          )}
          <Button
            size="small" icon={<ClockCircleOutlined />}
            loading={schedSaving} onClick={handleSaveSchedule}
            type="primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
          >
            시간 저장
          </Button>
        </div>
      </div>

      {/* 동기화 버튼 */}
      <div style={{ marginBottom: result ? 16 : 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button type="primary" icon={<SyncOutlined spin={loading} />} loading={loading} onClick={handleSync}
          style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}>
          지금 동기화
        </Button>
        <span style={{ fontSize: 14, opacity: 0.55 }}>
          매일 {schedule.join(' / ')} 자동 실행 · 네트워크 드라이브 업무일지 → PM 카운터 DB 업데이트
        </span>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ opacity: 0.6, fontSize: 14 }}>마지막 동기화: {result.synced_at}</div>
          {result.updated_count > 0 && (
            <Alert type="success" icon={<CheckCircleOutlined />} showIcon
              message={`${result.updated_count}개 호기 업데이트 완료`}
              description={
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.updated.map((r) => (
                    <Tag key={r.machine_no} color="green">{r.machine_no}호기 — PM: {r.chamber_count} / Filter: {r.filter_count}</Tag>
                  ))}
                </div>
              }
            />
          )}
          {result.error_count > 0 && (
            <Alert type="warning" icon={<WarningOutlined />} showIcon
              message={`${result.error_count}건 경고`}
              description={<ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                {result.errors.map((e, i) => <li key={i} style={{ fontSize: 14 }}>{e}</li>)}
              </ul>}
            />
          )}
          {result.updated_count === 0 && result.error_count === 0 && (
            <Alert type="info" message="업데이트할 데이터가 없습니다." showIcon />
          )}
        </div>
      )}

      {/* 동기화 실행 로그 */}
      {logs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>실행 로그</div>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.map((log) => {
              const isOk = log.error_count === 0
              return (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px', borderRadius: 6, fontSize: 14,
                  background: isOk ? 'rgba(34,197,94,0.07)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${isOk ? 'rgba(34,197,94,0.18)' : 'rgba(248,113,113,0.2)'}`,
                }}>
                  <span style={{ color: isOk ? '#4ade80' : '#f87171', flexShrink: 0, fontSize: 14 }}>
                    {isOk ? '✓' : '!'}
                  </span>
                  <span style={{ color: 'rgba(196,210,226,0.75)', flexShrink: 0 }}>{log.synced_at}</span>
                  <span style={{
                    flexShrink: 0, fontSize: 14, padding: '1px 6px', borderRadius: 10,
                    background: log.triggered_by === 'auto' ? 'rgba(125,211,252,0.15)' : 'rgba(245,158,11,0.15)',
                    color: log.triggered_by === 'auto' ? '#7dd3fc' : '#f59e0b',
                  }}>
                    {log.triggered_by === 'auto' ? '자동' : '수동'}
                  </span>
                  <span style={{ color: isOk ? '#86efac' : '#fca5a5' }}>
                    {isOk
                      ? `${log.updated_count}개 호기 업데이트`
                      : `${log.updated_count}개 업데이트, 경고 ${log.error_count}건`}
                  </span>
                  {log.errors.length > 0 && (
                    <span style={{ color: '#f87171', opacity: 0.75 }}>— {log.errors[0]}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function PmSettingsCard({ onApplied, thresholds = {}, onChange }) {
  // PM 주기 일괄 설정
  const { pmBase, filterBase, setPmBase, setFilterBase, saving, handleApply, fetched } = usePmCycleGlobal(onApplied)

  // 상태 기준 설정
  const { critical = 5, urgent = 20 } = thresholds
  const [localCritical, setLocalCritical] = useState(String(critical))
  const [localUrgent, setLocalUrgent] = useState(String(urgent))
  useEffect(() => { setLocalCritical(String(critical)) }, [critical])
  useEffect(() => { setLocalUrgent(String(urgent)) }, [urgent])

  const handleSaveThreshold = () => {
    const c = Number(localCritical)
    const u = Number(localUrgent)
    if (!Number.isFinite(c) || c < 1 || !Number.isFinite(u) || u < 1) { message.warning('1 이상의 숫자를 입력하세요.'); return }
    if (c >= u) { message.warning('긴급 기준은 임박 기준보다 작아야 합니다.'); return }
    onChange({ critical: c, urgent: u })
    message.success('상태 기준이 저장되었습니다.')
  }

  if (!fetched) return null

  return (
    <Card className="nowa-card" styles={{ body: { padding: '14px 20px' } }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
        {/* PM 주기 일괄 설정 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b', whiteSpace: 'nowrap' }}>PM 주기 일괄 설정</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.7)', whiteSpace: 'nowrap' }}>PM 주기</span>
            <Input value={pmBase} onChange={e => setPmBase(e.target.value)} style={{ width: 110, fontFamily: 'monospace', fontWeight: 700 }} suffix={<span style={{ fontSize: 14, opacity: 0.5 }}>런</span>} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.7)', whiteSpace: 'nowrap' }}>필터 주기</span>
            <Input value={filterBase} onChange={e => setFilterBase(e.target.value)} style={{ width: 110, fontFamily: 'monospace', fontWeight: 700 }} suffix={<span style={{ fontSize: 14, opacity: 0.5 }}>런</span>} />
          </div>
          <Button type="primary" loading={saving} onClick={handleApply} style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}>전체 적용</Button>
        </div>

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* 상태 기준 설정 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#818cf8', whiteSpace: 'nowrap' }}>상태 기준 설정</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#f87171', whiteSpace: 'nowrap', fontWeight: 600 }}>긴급 기준</span>
            <Input value={localCritical} onChange={e => setLocalCritical(e.target.value)} onPressEnter={handleSaveThreshold} style={{ width: 100, fontFamily: 'monospace', fontWeight: 700 }} suffix={<span style={{ fontSize: 14, opacity: 0.5 }}>런</span>} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#fbbf24', whiteSpace: 'nowrap', fontWeight: 600 }}>임박 기준</span>
            <Input value={localUrgent} onChange={e => setLocalUrgent(e.target.value)} onPressEnter={handleSaveThreshold} style={{ width: 100, fontFamily: 'monospace', fontWeight: 700 }} suffix={<span style={{ fontSize: 14, opacity: 0.5 }}>런</span>} />
          </div>
          <Button onClick={handleSaveThreshold} style={{ background: '#6366f1', borderColor: '#6366f1', color: '#fff', fontWeight: 700 }}>기준 저장</Button>
        </div>
      </div>
    </Card>
  )
}

function PmInputTab({ onSaved, thresholds = {}, onThresholdChange }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState([])
  const [initialRows, setInitialRows] = useState([])
  const fileInputRef = useRef(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/pm-counters')
      const json = await res.json().catch(() => [])
      const nextRows = Array.isArray(json)
        ? json.map((row) => ({
            key: String(row.machine_no),
            machine_no: Number(row.machine_no),
            description: row.description || '',
            chamber_count: Number(row.chamber_count ?? 0),
            pm_base_count: Number(row.pm_base_count ?? 0),
            filter_count: Number(row.filter_count ?? 0),
            filter_base_count: Number(row.filter_base_count ?? 0),
          }))
        : []
      setRows(nextRows)
      setInitialRows(nextRows.map((row) => ({ ...row })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const changedCount = useMemo(
    () =>
      rows.filter((row, index) => {
        const initial = initialRows[index]
        if (!initial) return true
        return (
          row.chamber_count !== initial.chamber_count ||
          row.pm_base_count !== initial.pm_base_count ||
          row.filter_count !== initial.filter_count ||
          row.filter_base_count !== initial.filter_base_count
        )
      }).length,
    [initialRows, rows],
  )

  const updateCount = useCallback((key, field, value) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: Number(value ?? 0) } : row)))
  }, [])

  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        label: formatMachineLabel(row.machine_no),
        pm: Number(row.chamber_count ?? 0),
        pmBase: Number(row.pm_base_count ?? 0),
        filter: Number(row.filter_count ?? 0),
        filterBase: Number(row.filter_base_count ?? 0),
      })),
    [rows],
  )

  const handleReset = useCallback(() => {
    setRows(initialRows.map((row) => ({ ...row })))
  }, [initialRows])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const payload = rows.map((row) => ({
        machine_no: row.machine_no,
        chamber_count: Number(row.chamber_count ?? 0),
        pm_base_count: Number(row.pm_base_count ?? 0),
        filter_count: Number(row.filter_count ?? 0),
        filter_base_count: Number(row.filter_base_count ?? 0),
      }))
      const res = await authFetch('/api/mocvd/pm-counters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'PM 카운트 저장에 실패했습니다.')
      }
      message.success('PM 카운트를 저장했습니다.')
      onSaved?.()
      fetchRows()
    } catch (error) {
      message.error(error.message || 'PM 카운트 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [fetchRows, rows])

  const handleCsvImport = useCallback((event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCsvText(String(reader.result ?? ''))
        if (parsed.length < 2) throw new Error('CSV 데이터가 비어 있습니다.')

        const headers = parsed[0].map(normalizeCsvHeader)
        const machineIndex = headers.findIndex((header) => ['호기', 'mocvd', 'mo', 'machine', 'machineno', 'machine_no'].includes(header))
        if (machineIndex < 0) throw new Error('호기 컬럼을 찾지 못했습니다.')

        const fieldMap = {
          chamber_count: headers.findIndex((header) => ['pmcount', 'chamber_count'].includes(header)),
          filter_count: headers.findIndex((header) => ['filtercount', 'filter_count'].includes(header)),
          pm_base_count: headers.findIndex((header) => ['pm기준count', 'pmbasecount', 'pm_base_count'].includes(header)),
          filter_base_count: headers.findIndex((header) => ['filter기준count', 'filterbasecount', 'filter_base_count'].includes(header)),
        }

        const importedMap = new Map()
        parsed.slice(1).forEach((cells) => {
          const machineNo = parseMachineNo(cells[machineIndex])
          if (!machineNo) return
          const next = {}
          Object.entries(fieldMap).forEach(([field, index]) => {
            if (index < 0) return
            const value = Number(cells[index] ?? 0)
            if (Number.isFinite(value)) next[field] = value
          })
          importedMap.set(machineNo, next)
        })

        if (importedMap.size === 0) throw new Error('반영할 설비 데이터가 없습니다.')

        let updatedCount = 0
        setRows((prev) =>
          prev.map((row) => {
            const imported = importedMap.get(row.machine_no)
            if (!imported) return row
            updatedCount += 1
            return { ...row, ...imported }
          }),
        )
        message.success(`CSV 반영 완료: ${updatedCount}대`)
      } catch (error) {
        message.error(error.message || 'CSV 불러오기에 실패했습니다.')
      }
    }
    reader.onerror = () => message.error('CSV 파일을 읽지 못했습니다.')
    reader.readAsText(file)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PmSettingsCard onApplied={fetchRows} thresholds={thresholds} onChange={onThresholdChange} />

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} xl={18}>
            <Card
              className="console-panel"
              style={{ ...panelStyle, height: '100%' }}
              title="챔버사용횟수 / 필터사용횟수 입력"
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button size="small" onClick={handleReset} disabled={loading || saving}>초기화</Button>
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={loading}>저장</Button>
                </div>
              }
            >
              <PmInputSheet rows={rows} onChange={updateCount} />
            </Card>
          </Col>
          <Col xs={24} xl={6}>
            <Card
              className="nowa-card"
              title="설비별 Count 비교"
              styles={{ body: { padding: '10px 10px 4px' } }}
              style={{ height: '100%' }}
            >
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginBottom: 8 }}>
                현재 Count가 기준 Count 대비 얼마나 진행됐는지 함께 표시합니다.
              </div>
              <div style={{ maxHeight: 'calc(100vh - 330px)', overflowY: 'auto', overflowX: 'hidden' }}>
                <ReactECharts
                  style={{ height: Math.max(360, chartRows.length * 40) }}
                  option={{
                    backgroundColor: 'transparent',
                    grid: { top: 32, bottom: 16, left: 72, right: 130 },
                    tooltip: {
                      renderMode: 'html',
                      appendToBody: true,
                      confine: false,
                      position: (point) => [point[0] + 16, point[1] - 10],
                      trigger: 'axis',
                      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(245,158,11,0.04)' } },
                      backgroundColor: '#1a2236',
                      borderColor: 'rgba(245,158,11,0.25)',
                      extraCssText: 'white-space:nowrap;z-index:9999;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);',
                      textStyle: { color: '#e2e8f0', fontSize: 14 },
                      formatter: (params) => {
                        const row = chartRows[params?.[0]?.dataIndex ?? 0]
                        const pmRate = row.pmBase > 0 ? (row.pm / row.pmBase) * 100 : 0
                        const filterRate = row.filterBase > 0 ? (row.filter / row.filterBase) * 100 : 0
                        return [
                          `<span style="font-weight:800;color:#f59e0b">${row.label}</span>`,
                          `<span style="color:#7dd3fc">■</span> 챔버사용횟수: <b>${row.pm}</b> / ${row.pmBase} <span style="color:#7dd3fc">(${pmRate.toFixed(1)}%)</span>`,
                          `<span style="color:#fcd34d">■</span> 필터사용횟수: <b>${row.filter}</b> / ${row.filterBase} <span style="color:#fcd34d">(${filterRate.toFixed(1)}%)</span>`,
                        ].join('<br/>')
                      },
                    },
                    legend: {
                      top: 4, right: 8,
                      itemWidth: 10, itemHeight: 10,
                      textStyle: { color: 'rgba(214,222,232,0.65)', fontSize: 14 },
                      data: [
                        { name: '챔버사용횟수', icon: 'roundRect', itemStyle: { color: '#7dd3fc' } },
                        { name: '필터사용횟수', icon: 'roundRect', itemStyle: { color: '#fcd34d' } },
                      ],
                    },
                    xAxis: {
                      type: 'value',
                      minInterval: 1,
                      axisLabel: { color: 'rgba(196,210,226,0.68)', fontSize: 14 },
                      axisLine: { show: false },
                      axisTick: { show: false },
                      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
                    },
                    yAxis: {
                      type: 'category',
                      data: chartRows.map((row) => row.label),
                      inverse: true,
                      axisLabel: { color: 'rgba(245,158,11,0.85)', fontSize: 14, fontWeight: 700 },
                      axisLine: { lineStyle: { color: 'rgba(245,158,11,0.15)' } },
                      axisTick: { show: false },
                    },
                    series: [
                      {
                        name: '챔버사용횟수',
                        type: 'bar',
                        data: chartRows.map((row) => row.pm),
                        barMaxWidth: 12,
                        itemStyle: {
                          borderRadius: [0, 6, 6, 0],
                          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [{ offset: 0, color: 'rgba(125,211,252,0.9)' }, { offset: 1, color: 'rgba(125,211,252,0.25)' }] },
                        },
                        label: {
                          show: true, position: 'right',
                          color: 'rgba(196,210,226,0.7)', fontSize: 14,
                          formatter: ({ dataIndex, value }) => {
                            const row = chartRows[dataIndex]
                            const rate = row?.pmBase > 0 ? (Number(value) / row.pmBase) * 100 : 0
                            return `${value} / ${row?.pmBase ?? 0} (${rate.toFixed(0)}%)`
                          },
                        },
                      },
                      {
                        name: '필터사용횟수',
                        type: 'bar',
                        data: chartRows.map((row) => row.filter),
                        barMaxWidth: 12,
                        itemStyle: {
                          borderRadius: [0, 6, 6, 0],
                          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.9)' }, { offset: 1, color: 'rgba(245,158,11,0.25)' }] },
                        },
                        label: {
                          show: true, position: 'right',
                          color: 'rgba(196,210,226,0.7)', fontSize: 14,
                          formatter: ({ dataIndex, value }) => {
                            const row = chartRows[dataIndex]
                            const rate = row?.filterBase > 0 ? (Number(value) / row.filterBase) * 100 : 0
                            return `${value} / ${row?.filterBase ?? 0} (${rate.toFixed(0)}%)`
                          },
                        },
                      },
                    ],
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
      <PmSyncCard onSynced={() => { fetchRows(); onSaved?.() }} />
    </div>
  )
}

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.18)',
  marginBottom: 20,
  paddingBottom: 0,
  fontSize: 16,
}

export default function PmPlan() {
  const location = useLocation()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const handleSaved = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pm_thresholds') || '{}')
      return { critical: Number(saved.critical) > 0 ? Number(saved.critical) : 5, urgent: Number(saved.urgent) > 0 ? Number(saved.urgent) : 20 }
    } catch { return { critical: 5, urgent: 20 } }
  })
  const handleThresholdChange = useCallback((val) => {
    setThresholds(val)
    localStorage.setItem('pm_thresholds', JSON.stringify(val))
  }, [])

  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    const allowed = ['status', 'machine', 'input']
    return allowed.includes(tab) ? tab : 'status'
  }, [location.search])

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => navigate(`/epi/mocvd/pm-plan?tab=${key}`)}
      tabBarStyle={tabBarStyle}
      items={[
        { key: 'status',  label: <span><BarChartOutlined />  PM주기 현황판</span>,  children: <PmStatusBoard refreshKey={refreshKey} thresholds={thresholds} /> },
        { key: 'machine', label: <span><AppstoreOutlined />  설비별 PM현황</span>,  children: <PmMachineBoard refreshKey={refreshKey} thresholds={thresholds} /> },
        { key: 'input',   label: <span><EditOutlined />      PM주기 입력</span>,    children: <PmInputTab onSaved={handleSaved} thresholds={thresholds} onThresholdChange={handleThresholdChange} /> },
      ]}
    />
  )
}
