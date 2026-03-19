import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Button, Card, Col, Input, Row, Segmented, Spin, Table, Tabs, Tag, message } from 'antd'
import { BarChartOutlined, CalendarOutlined, EditOutlined, ReloadOutlined, SaveOutlined, UnorderedListOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

const PM_RUN_ROWS = [
  { key: '78', location: 'B1F', machine_no: 78, equipment_name: 'K465i', chamber_counter: 254, filter_counter: 129, pm_cycle: 300, filter_cycle: 150, pm_expected_date: '2026-03-25', filter_expected_date: '2026-03-19', item: 'VINA 이설' },
  { key: '79', location: 'B1F', machine_no: 79, equipment_name: 'K465i', chamber_counter: 59, filter_counter: 59, pm_cycle: 300, filter_cycle: 150, pm_expected_date: '2026-05-07', filter_expected_date: '2026-04-04', item: '' },
  { key: '80', location: 'B1F', machine_no: 80, equipment_name: 'K465i', chamber_counter: 203, filter_counter: 52, pm_cycle: 300, filter_cycle: 150, pm_expected_date: '2026-04-05', filter_expected_date: '2026-04-05', item: 'VINA 이설 준비' },
  { key: '81', location: 'B1F', machine_no: 81, equipment_name: 'K465i', chamber_counter: 32, filter_counter: 32, pm_cycle: 300, filter_cycle: 150, pm_expected_date: '2026-05-13', filter_expected_date: '2026-04-10', item: 'VINA 이설 준비' },
  { key: '82', location: 'B1F', machine_no: 82, equipment_name: 'K465i', chamber_counter: 1, filter_counter: 1, pm_cycle: 300, filter_cycle: 150, pm_expected_date: '2026-05-20', filter_expected_date: '2026-04-17', item: 'VINA 이설' },
]

const PM_DAY_ROWS = [
  { key: 'bake1', location: 'B4F', machine: 'Bake1', equipment_name: 'Bake', pm_done: '2025-05-03', pm_cycle: 180, pm_expected_date: '2025-10-30', item: 'Leak 보수 준비' },
  { key: 'bake2', location: 'B4F', machine: 'Bake2', equipment_name: 'Bake', pm_done: '2025-06-01', pm_cycle: 180, pm_expected_date: '2025-11-28', item: '수리 입고 5/31' },
  { key: 'bake3', location: 'B4F', machine: 'Bake3', equipment_name: 'Bake', pm_done: '2025-03-15', pm_cycle: 180, pm_expected_date: '2025-09-11', item: '30호기 교체' },
  { key: 'bake4', location: 'B4F', machine: 'Bake4', equipment_name: 'Bake', pm_done: '2025-08-03', pm_cycle: 180, pm_expected_date: '2026-01-30', item: '' },
]

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
  fontSize: 13,
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

function daysDiff(dateText) {
  return dayjs(dateText).diff(dayjs(), 'day')
}

function statusTag(daysLeft) {
  if (daysLeft <= 7) return <Tag color="red">임박</Tag>
  if (daysLeft <= 30) return <Tag color="gold">예정</Tag>
  return <Tag color="green">정상</Tag>
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
      <div style={{ color: `${resolvedAccent}cc`, fontSize: 12, marginTop: 10, position: 'relative', zIndex: 1 }}>{sub}</div>
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
          fontSize: 13,
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
        fontSize: 13,
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
    () => rows.flatMap((row) => ['pm_base_count', 'filter_base_count', 'pm_count', 'filter_count'].map((field) => `${field}:${row.key}`)),
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
            <th style={{ ...pmHeadBase, borderLeft: PM_GROUP_BORDER, color: '#7dd3fc', fontWeight: 700 }}>PM 기준 Count</th>
            <th style={{ ...pmHeadBase, color: '#fcd34d', fontWeight: 700 }}>Filter 기준 Count</th>
            <th style={{ ...pmHeadBase, color: '#38bdf8', fontWeight: 700 }}>PM Count</th>
            <th style={{ ...pmHeadBase, color: '#fbbf24', fontWeight: 700 }}>Filter Count</th>
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
                  cellId={`pm_count:${row.key}`}
                  activeEditKey={activeEditKey}
                  value={row.pm_count}
                  color="#38bdf8"
                  bg="#0a1119"
                  onTabNavigate={handleTabNavigate}
                  onChange={(value) => onChange(row.key, 'pm_count', value)}
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

function PmStatusBoard() {
  const [displayMode, setDisplayMode] = useState('list')
  const urgentRows = useMemo(
    () => PM_RUN_ROWS.map((row) => ({ ...row, days_left: daysDiff(row.pm_expected_date) })).sort((a, b) => a.days_left - b.days_left),
    [],
  )

  const columns = [
    { title: '호기', dataIndex: 'machine_no', width: 90, render: (value) => formatMachineLabel(value) },
    { title: '위치', dataIndex: 'location', width: 80 },
    { title: '설비명', dataIndex: 'equipment_name', width: 90 },
    { title: 'PM Count', dataIndex: 'chamber_counter', width: 100 },
    { title: 'Filter Count', dataIndex: 'filter_counter', width: 100 },
    { title: 'PM 예상 일자', dataIndex: 'pm_expected_date', width: 130 },
    { title: 'Filter 예상 일자', dataIndex: 'filter_expected_date', width: 140 },
    { title: '상태', dataIndex: 'days_left', width: 90, render: (value) => statusTag(value) },
    { title: 'Item', dataIndex: 'item' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
          <div>
            <div className="nowa-page-kicker">PM 주기 현황판</div>
            <div className="nowa-page-title" style={{ fontSize: 24, marginBottom: 0 }}>MOCVD PM 주기 현황</div>
            <div className="nowa-page-desc" style={{ marginTop: 8 }}>
              PM 주기 계획 기준으로 설비별 PM/Filter 일정을 확인합니다.
            </div>
          </div>
          <Button icon={<ReloadOutlined />}>현황 새로고침</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><SummaryCard label="운영 설비" value={PM_RUN_ROWS.length} suffix="대" sub="Run 기준 PM 설비" accent="#818cf8" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="7일 이내 PM" value={urgentRows.filter((row) => row.days_left <= 7).length} suffix="대" sub="즉시 확인 필요" accent="#fb7185" gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="30일 이내 PM" value={urgentRows.filter((row) => row.days_left <= 30).length} suffix="대" sub="당월 예정" accent="#fbbf24" gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="Day 기준 설비" value={PM_DAY_ROWS.length} suffix="대" sub="Bake 설비 포함" accent="#2dd4bf" gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)" /></Col>
      </Row>

      <Card
        className="nowa-card"
        title="PM 일정 목록"
        extra={(
          <Segmented
            value={displayMode}
            onChange={setDisplayMode}
            options={[
              { label: '목록', value: 'list', icon: <UnorderedListOutlined /> },
              { label: '캘린더', value: 'calendar', icon: <CalendarOutlined /> },
            ]}
          />
        )}
      >
        {displayMode === 'list' ? (
          <Table rowKey="key" columns={columns} dataSource={urgentRows} pagination={false} scroll={{ x: 980 }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {urgentRows.map((row) => (
              <div key={row.key} style={{ padding: 16, borderRadius: 16, border: '1px solid var(--nowa-border)', background: 'var(--nowa-soft-fill)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--nowa-text)' }}>{formatMachineLabel(row.machine_no)}</strong>
                  {statusTag(row.days_left)}
                </div>
                <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13 }}>PM 예정 {row.pm_expected_date}</div>
                <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13 }}>Filter 예정 {row.filter_expected_date}</div>
                <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 8 }}>{row.item || '특이사항 없음'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function PmMachineBoard() {
  const [search, setSearch] = useState('')
  const rows = useMemo(
    () => PM_RUN_ROWS.filter((row) => `${row.machine_no} ${row.equipment_name} ${row.location}`.toLowerCase().includes(search.toLowerCase().trim())),
    [search],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card className="nowa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="호기 검색" style={{ width: 220 }} allowClear />
          <span style={{ color: 'var(--nowa-text-muted)' }}>{rows.length}대 표시</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {rows.map((row) => (
          <Card key={row.key} className="nowa-card" styles={{ body: { padding: 16 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ color: '#14b8a6', fontSize: 18, fontWeight: 800 }}>{formatMachineLabel(row.machine_no)}</div>
                <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>{row.location} / {row.equipment_name}</div>
              </div>
              {statusTag(daysDiff(row.pm_expected_date))}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PM Count</span><strong>{row.chamber_counter}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter Count</span><strong>{row.filter_counter}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PM 주기</span><strong>{row.pm_cycle}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter 주기</span><strong>{row.filter_cycle}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PM 예상 일자</span><strong>{row.pm_expected_date}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter 예상 일자</span><strong>{row.filter_expected_date}</strong></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PmInputTab() {
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
            pm_count: Number(row.pm_count ?? 0),
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
          row.pm_count !== initial.pm_count ||
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
        pm: Number(row.pm_count ?? 0),
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
        pm_count: Number(row.pm_count ?? 0),
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
          pm_count: headers.findIndex((header) => ['pmcount', 'pm_count'].includes(header)),
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
      <div className="console-toolbar">
        <div>
          <div style={sectionTitleStyle}>PM 주기 입력</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            MOCVD PM 주기 입력
          </div>
          <div style={{ color: 'rgba(220,232,255,0.72)', marginTop: 6 }}>
            기준정보의 MO 설비 전체를 기준으로 PM 기준 Count, Filter 기준 Count, PM Count, Filter Count를 입력합니다.
          </div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">{rows.length}대</div>
          <div className="console-pill" style={{ color: changedCount > 0 ? '#fbbf24' : undefined }}>변경 {changedCount}건</div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} disabled={loading || saving}>
            CSV 불러오기
          </Button>
          <Button onClick={handleReset} disabled={loading || saving}>초기화</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={loading}>
            저장
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} xl={18}>
            <Card className="console-panel" style={{ ...panelStyle, height: '100%' }} title="PM Count / Filter Count 입력">
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
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginBottom: 8 }}>
                현재 Count가 기준 Count 대비 얼마나 진행됐는지 함께 표시합니다.
              </div>
              <div style={{ maxHeight: 'calc(100vh - 330px)', overflowY: 'auto', overflowX: 'hidden' }}>
                <ReactECharts
                  theme="dark"
                  style={{ height: Math.max(360, chartRows.length * 34) }}
                  option={{
                    backgroundColor: 'transparent',
                    grid: { top: 24, bottom: 20, left: 72, right: 120 },
                    tooltip: {
                      renderMode: 'html',
                      appendToBody: true,
                      confine: false,
                      trigger: 'axis',
                      axisPointer: { type: 'shadow' },
                      extraCssText: 'white-space: nowrap; z-index: 9999;',
                      formatter: (params) => {
                        const row = chartRows[params?.[0]?.dataIndex ?? 0]
                        const pmRate = row.pmBase > 0 ? (row.pm / row.pmBase) * 100 : 0
                        const filterRate = row.filterBase > 0 ? (row.filter / row.filterBase) * 100 : 0
                        return [
                          `<strong>${row.label}</strong>`,
                          `PM Count: ${row.pm} / ${row.pmBase} (${pmRate.toFixed(1)}%)`,
                          `Filter Count: ${row.filter} / ${row.filterBase} (${filterRate.toFixed(1)}%)`,
                        ].join('<br/>')
                      },
                    },
                    legend: { top: 0, textStyle: { color: '#b0c0d0', fontSize: 11 } },
                    xAxis: {
                      type: 'value',
                      minInterval: 1,
                      axisLabel: { color: '#64748b', fontSize: 11 },
                      splitLine: { lineStyle: { color: '#1e2a3c' } },
                    },
                    yAxis: {
                      type: 'category',
                      data: chartRows.map((row) => row.label),
                      inverse: true,
                      axisLabel: { color: '#b0c0d0', fontSize: 11 },
                      axisLine: { lineStyle: { color: '#1e2a3c' } },
                    },
                    series: [
                      {
                        name: 'PM Count',
                        type: 'bar',
                        data: chartRows.map((row) => row.pm),
                        itemStyle: { color: '#38bdf8', borderRadius: [0, 6, 6, 0] },
                        barMaxWidth: 14,
                        label: {
                          show: true,
                          position: 'right',
                          color: '#cbd5e1',
                          fontSize: 11,
                          overflow: 'break',
                          formatter: ({ dataIndex, value }) => {
                            const row = chartRows[dataIndex]
                            const rate = row?.pmBase > 0 ? (Number(value) / row.pmBase) * 100 : 0
                            return `${value} / ${row?.pmBase ?? 0} (${rate.toFixed(0)}%)`
                          },
                        },
                      },
                      {
                        name: 'Filter Count',
                        type: 'bar',
                        data: chartRows.map((row) => row.filter),
                        itemStyle: { color: '#fbbf24', borderRadius: [0, 6, 6, 0] },
                        barMaxWidth: 14,
                        label: {
                          show: true,
                          position: 'right',
                          color: '#e5e7eb',
                          fontSize: 11,
                          overflow: 'break',
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
    </div>
  )
}

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.18)',
  marginBottom: 20,
  paddingBottom: 0,
}

export default function PmPlan() {
  const location = useLocation()
  const navigate = useNavigate()
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
        { key: 'status', label: <span><BarChartOutlined /> PM주기 현황판</span>, children: <PmStatusBoard /> },
        { key: 'machine', label: <span><CalendarOutlined /> 설비별 PM현황</span>, children: <PmMachineBoard /> },
        { key: 'input', label: <span><EditOutlined /> PM주기 입력</span>, children: <PmInputTab /> },
      ]}
    />
  )
}
