import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Select, Space, Spin, Tabs } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useLocation, useNavigate } from 'react-router-dom'
import { authFetch } from '../../../context/AuthContext'
import SourceChangeLogTab from './SourceChangeLogTab'
import SourceStatusBoard from './SourceStatusBoard'
import SourceMachineBoard from './SourceMachineBoard'
import { formatMachineLabel } from './machineLabel'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

const LABEL_W = 72
const CELL_W = 78
const ROW_H = 30
const HEAD1_H = 36
const HEAD2_H = 26
const FORECAST_STICKY_TOP = HEAD1_H + HEAD2_H
const STICKY_TOP_INITIAL = FORECAST_STICKY_TOP
const STICKY_TOP_THRESHOLD = STICKY_TOP_INITIAL + ROW_H
const STICKY_TOP_DAILY = STICKY_TOP_THRESHOLD + ROW_H
const STICKY_TOP_REMAINING = STICKY_TOP_DAILY + ROW_H
const STICKY_TOP_THRESHOLD_AMOUNT = STICKY_TOP_REMAINING + ROW_H
const STICKY_TOP_DAYS_LEFT = STICKY_TOP_THRESHOLD_AMOUNT + ROW_H
const STICKY_TOP_REPLACEMENT_DATE = STICKY_TOP_DAYS_LEFT + ROW_H
const BASE_BG = '#0f1117'
const BORDER = '1px solid rgba(245,158,11,0.12)'
const GROUP_BORDER = '2px solid rgba(245,158,11,0.28)'
const DEFAULT_THRESHOLD_RATIO = 15
const EDITABLE_FIELDS = ['initial_amount', 'threshold_ratio', 'daily_usage', 'remaining']

const th1Base = {
  position: 'sticky',
  top: 0,
  background: '#1c1f2a',
  border: BORDER,
  padding: '0 4px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  height: HEAD1_H,
  zIndex: 9,
}

const th2Base = {
  position: 'sticky',
  top: HEAD1_H,
  background: '#161921',
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 12,
  whiteSpace: 'nowrap',
  height: HEAD2_H,
  zIndex: 9,
}

const tdLabelBase = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  border: BORDER,
  padding: '0 8px',
  whiteSpace: 'nowrap',
  height: ROW_H,
  fontWeight: 600,
  fontSize: 14,
  textAlign: 'center',
}

const tdCellBase = {
  border: BORDER,
  padding: 0,
  height: ROW_H,
  verticalAlign: 'middle',
}

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return '-'
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function toEditingText(value) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num === 0) return ''
  return String(value)
}

function buildDerivedCell(cell) {
  const initialAmount = toNumber(cell.initial_amount)
  const thresholdRatio = toNumber(cell.threshold_ratio, DEFAULT_THRESHOLD_RATIO)
  const dailyUsage = toNumber(cell.daily_usage)
  const remaining = toNumber(cell.remaining)
  const thresholdAmount = initialAmount > 0 ? (initialAmount * thresholdRatio) / 100 : 0

  let daysLeft = null
  let replacementDate = '-'
  if (dailyUsage > 0) {
    daysLeft = Math.ceil((remaining - thresholdAmount) / dailyUsage)
    replacementDate = dayjs().add(Math.max(daysLeft, 0), 'day').format('YYYY-MM-DD')
  }

  return {
    threshold_amount: thresholdAmount,
    days_left: daysLeft,
    replacement_date: replacementDate,
  }
}

function EditCell({ cellId, activeEditKey, value, onChange, onTabNavigate, color, bg, pending }) {
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
          height: ROW_H - 2,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid #f59e0b',
          color: color ?? '#c4cdd8',
          fontSize: 13,
          textAlign: 'right',
          padding: '0 4px',
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
        height: ROW_H - 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 5,
        cursor: 'text',
        color: color ?? '#c4cdd8',
        fontSize: 13,
        background: pending ? 'rgba(245,158,11,0.08)' : (bg ?? 'transparent'),
        userSelect: 'none',
      }}
    >
      {fmt(Number(value ?? 0))}
    </div>
  )
}

function ExcelTable({ machines, sourceNames, cellData, dateRows, pendingKeys, onChange }) {
  const colCount = machines.length * sourceNames.length
  const [activeEditKey, setActiveEditKey] = useState(null)
  const wrapperRef = useRef(null)
  const orderedEditKeys = useMemo(
    () =>
      EDITABLE_FIELDS.flatMap((field) =>
        machines.flatMap((machine) => sourceNames.map((sourceName) => `${field}:${machine.machine_no}:${sourceName}`)),
      ),
    [machines, sourceNames],
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
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const stickyTops = [
      STICKY_TOP_INITIAL,
      STICKY_TOP_THRESHOLD,
      STICKY_TOP_DAILY,
      STICKY_TOP_REMAINING,
      STICKY_TOP_THRESHOLD_AMOUNT,
      STICKY_TOP_DAYS_LEFT,
      STICKY_TOP_REPLACEMENT_DATE,
    ]

    stickyTops.forEach((top, index) => {
      const cell = wrapper.querySelector(`tbody tr:nth-child(${index + 1}) td:first-child`)
      if (!(cell instanceof HTMLElement)) return
      cell.style.top = `${top}px`
      cell.style.zIndex = '11'
    })
  }, [machines, sourceNames, cellData, dateRows])

  if (colCount === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>데이터가 없습니다.</div>
  }

  return (
    <div ref={wrapperRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)', position: 'relative' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14 }}>
        <colgroup>
          <col style={{ width: LABEL_W, minWidth: LABEL_W }} />
          {machines.map((machine) =>
            sourceNames.map((sourceName) => (
              <col key={`${machine.machine_no}:${sourceName}`} style={{ width: CELL_W, minWidth: CELL_W }} />
            )),
          )}
        </colgroup>

        <thead>
          <tr>
            <th
              rowSpan={2}
              style={{
                ...th1Base,
                left: 0,
                zIndex: 12,
                background: '#0f1117',
                width: LABEL_W,
                fontSize: 13,
                color: 'rgba(148,163,184,0.6)',
              }}
            >
              구분
            </th>
            {machines.map((machine) => (
              <th
                key={machine.machine_no}
                colSpan={sourceNames.length}
                style={{
                  ...th1Base,
                  borderLeft: GROUP_BORDER,
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: 1,
                }}
              >
                {formatMachineLabel(machine.machine_no)}
              </th>
            ))}
          </tr>
          <tr>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => (
                <th
                  key={`${machine.machine_no}:${sourceName}`}
                  style={{
                    ...th2Base,
                    borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                    color: 'rgba(180,196,210,0.7)',
                  }}
                >
                  {sourceName}
                </th>
              )),
            )}
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ ...tdLabelBase, background: '#0d1520', color: '#38bdf8', borderRight: GROUP_BORDER }}>초기량</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={`${key}:initial_amount`} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_INITIAL, zIndex: 7, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: '#0a1119' }}>
                    <EditCell
                      cellId={`initial_amount:${machine.machine_no}:${sourceName}`}
                      activeEditKey={activeEditKey}
                      value={cellData[key]?.initial_amount ?? 0}
                      color="#38bdf8"
                      bg="#0a1119"
                      pending={pendingKeys.has(key)}
                      onTabNavigate={handleTabNavigate}
                      onChange={(value) => onChange(machine.machine_no, sourceName, 'initial_amount', value)}
                    />
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#1a1400', color: '#f59e0b', borderRight: GROUP_BORDER }}>교체기준(%)</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={`${key}:threshold_ratio`} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_THRESHOLD, zIndex: 7, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: '#110e00' }}>
                    <EditCell
                      cellId={`threshold_ratio:${machine.machine_no}:${sourceName}`}
                      activeEditKey={activeEditKey}
                      value={cellData[key]?.threshold_ratio ?? DEFAULT_THRESHOLD_RATIO}
                      color="#f59e0b"
                      bg="#110e00"
                      pending={pendingKeys.has(key)}
                      onTabNavigate={handleTabNavigate}
                      onChange={(value) => onChange(machine.machine_no, sourceName, 'threshold_ratio', value)}
                    />
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#191500', color: '#fbbf24', borderRight: GROUP_BORDER }}>일사용량</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={key} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_DAILY, zIndex: 7, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: '#100e00' }}>
                    <EditCell
                      cellId={`daily_usage:${machine.machine_no}:${sourceName}`}
                      activeEditKey={activeEditKey}
                      value={cellData[key]?.daily_usage ?? 0}
                      color="#fbbf24"
                      bg="#100e00"
                      pending={pendingKeys.has(key)}
                      onTabNavigate={handleTabNavigate}
                      onChange={(value) => onChange(machine.machine_no, sourceName, 'daily_usage', value)}
                    />
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#0a1a0a', color: '#86efac', borderRight: GROUP_BORDER }}>잔량</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={key} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_REMAINING, zIndex: 7, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: '#060f06' }}>
                    <EditCell
                      cellId={`remaining:${machine.machine_no}:${sourceName}`}
                      activeEditKey={activeEditKey}
                      value={cellData[key]?.remaining ?? 0}
                      color="#86efac"
                      bg="#060f06"
                      pending={pendingKeys.has(key)}
                      onTabNavigate={handleTabNavigate}
                      onChange={(value) => onChange(machine.machine_no, sourceName, 'remaining', value)}
                    />
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#1a0d00', color: '#f97316', borderRight: GROUP_BORDER }}>교체기준량</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                const derived = buildDerivedCell(cellData[key] ?? {})
                return (
                  <td
                    key={`${key}:threshold_amount`}
                    style={{
                      ...tdCellBase,
                      position: 'sticky',
                      top: STICKY_TOP_THRESHOLD_AMOUNT,
                      zIndex: 7,
                      borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                      background: '#110a00',
                      color: '#f97316',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {fmt(derived.threshold_amount)}
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#161200', color: '#facc15', borderRight: GROUP_BORDER }}>예상 잔여일</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                const derived = buildDerivedCell(cellData[key] ?? {})
                return (
                  <td
                    key={`${key}:days_left`}
                    style={{
                      ...tdCellBase,
                      position: 'sticky',
                      top: STICKY_TOP_DAYS_LEFT,
                      zIndex: 7,
                      borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                      background: '#0f0d00',
                      color: derived.days_left != null && derived.days_left <= 7 ? '#f87171' : '#facc15',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {derived.days_left == null ? '-' : `${derived.days_left}일`}
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#091420', color: '#60a5fa', borderRight: GROUP_BORDER }}>예상 교체일</td>
            {machines.map((machine) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                const derived = buildDerivedCell(cellData[key] ?? {})
                return (
                  <td
                    key={`${key}:replacement_date`}
                    style={{
                      ...tdCellBase,
                      position: 'sticky',
                      top: STICKY_TOP_REPLACEMENT_DATE,
                      zIndex: 7,
                      borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                      background: '#060f18',
                      color: '#60a5fa',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {derived.replacement_date}
                  </td>
                )
              }),
            )}
          </tr>

          {dateRows.map(({ label, daysAhead }, rowIndex) => (
            <tr key={label} style={{ background: rowIndex % 2 === 0 ? BASE_BG : '#131619' }}>
              <td
                style={{
                  ...tdLabelBase,
                  background: rowIndex % 2 === 0 ? BASE_BG : '#131619',
                  color: 'rgba(148,163,184,0.55)',
                  borderRight: GROUP_BORDER,
                }}
              >
                {label}
              </td>
              {machines.map((machine) =>
                sourceNames.map((sourceName, index) => {
                  const key = `${machine.machine_no}:${sourceName}`
                  const remaining = cellData[key]?.remaining ?? 0
                  const dailyUsage = cellData[key]?.daily_usage ?? 0
                  const projected = dailyUsage === 0 ? null : Math.max(0, remaining - daysAhead * dailyUsage)
                  const isCritical = projected !== null && projected <= 0
                  const isLow = projected !== null && projected > 0 && remaining > 0 && projected < remaining * 0.15

                  return (
                    <td
                      key={`${key}:${label}`}
                      style={{
                        ...tdCellBase,
                        borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                        background: isCritical ? 'rgba(239,68,68,0.12)' : isLow ? 'rgba(251,191,36,0.07)' : undefined,
                        color: isCritical ? '#f87171' : isLow ? '#fbbf24' : '#475569',
                        textAlign: 'right',
                        paddingRight: 5,
                        fontSize: 13,
                      }}
                    >
                      {projected === null ? '-' : fmt(projected)}
                    </td>
                  )
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceInputTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [sourceNames, setSourceNames] = useState([])
  const [cellData, setCellData] = useState({})
  const [pendingKeys, setPendingKeys] = useState(new Set())
  const [quickFilter, setQuickFilter] = useState('')
  const [forecastDays, setForecastDays] = useState(15)
  const [statusSettings, setStatusSettings] = useState({ overdue_days: 0, urgent_days: 7 })
  const [settingsSaving, setSettingsSaving] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/mocvd/sources/all')
      .then((res) => (res.ok ? res.json() : res.json().then((json) => Promise.reject(json.detail || res.status))))
      .then((json) => {
        const rows = json.rows ?? []
        const names = json.source_names ?? []
        setMachines(rows.map((row) => ({ machine_no: row.machine_no, description: row.description })))
        setSourceNames(names)

        const nextCellData = {}
        rows.forEach((row) => {
          names.forEach((name) => {
            const key = `${row.machine_no}:${name}`
            nextCellData[key] = {
              remaining: row[name] ?? 0,
              daily_usage: row[`${name}_daily_usage`] ?? 0,
              initial_amount: row[`${name}_initial_amount`] ?? 0,
              threshold_ratio: row[`${name}_threshold_ratio`] ?? DEFAULT_THRESHOLD_RATIO,
            }
          })
        })

        setCellData(nextCellData)
        setPendingKeys(new Set())
        setStatusSettings(json.status_settings ?? { overdue_days: 0, urgent_days: 7 })
      })
      .catch((err) => setError(typeof err === 'string' ? err : '전체 소스 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleChange = useCallback((machineNo, sourceName, field, value) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: Number(value ?? 0) } }))
    setPendingKeys((prev) => new Set([...prev, key]))
  }, [])

  const handleSave = async () => {
    if (pendingKeys.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const changes = [...pendingKeys].map((key) => {
        const colonIndex = key.indexOf(':')
        const machine_no = Number(key.slice(0, colonIndex))
        const source_name = key.slice(colonIndex + 1)
        const cell = cellData[key] ?? {}
        return {
          machine_no,
          source_name,
          remaining: cell.remaining ?? 0,
          daily_usage: cell.daily_usage ?? 0,
          initial_amount: cell.initial_amount ?? 0,
          threshold_ratio: cell.threshold_ratio ?? DEFAULT_THRESHOLD_RATIO,
          unit: 'kg',
        }
      })

      const res = await authFetch('/api/mocvd/sources/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '전체 저장에 실패했습니다.')
      fetchData()
    } catch (err) {
      setError(err.message || '전체 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusSettingChange = (field, value) => {
    setStatusSettings((prev) => {
      const nextValue = Number(value ?? 0)
      if (field === 'overdue_days') {
        return {
          overdue_days: Math.max(0, nextValue),
          urgent_days: Math.max(prev.urgent_days, Math.max(0, nextValue)),
        }
      }
      return {
        ...prev,
        urgent_days: Math.max(prev.overdue_days, Math.max(0, nextValue)),
      }
    })
  }

  const handleSaveStatusSettings = async () => {
    setSettingsSaving(true)
    setError(null)
    try {
      const payload = {
        overdue_days: Number(statusSettings.overdue_days ?? 0),
        urgent_days: Number(statusSettings.urgent_days ?? 7),
      }
      const res = await authFetch('/api/mocvd/source-status-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '상태 기준 저장에 실패했습니다.')
      setStatusSettings(json)
    } catch (err) {
      setError(err.message || '상태 기준 저장에 실패했습니다.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const filteredMachines = useMemo(() => {
    const keyword = quickFilter.trim().toLowerCase()
    if (!keyword) return machines
    return machines.filter(
      (machine) => String(machine.machine_no).includes(keyword) || `mo#${machine.machine_no}호기`.includes(keyword),
    )
  }, [machines, quickFilter])

  const dateRows = useMemo(() => {
    const today = new Date()
    return Array.from({ length: forecastDays }, (_, index) => {
      const next = new Date(today)
      next.setDate(next.getDate() + index + 1)
      return { label: `${next.getMonth() + 1}/${next.getDate()}`, daysAhead: index + 1 }
    })
  }, [forecastDays])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <div className="console-toolbar">
        <div>
          <div style={{ color: 'var(--console-text)', fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            MOCVD 전체 소스 입력
          </div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>
            초기량, 교체기준, 일사용량, 잔량을 한 화면에서 입력하고 아래 예측값을 바로 확인합니다.
          </div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">{machines.length}대</div>
          <div className="console-pill">{sourceNames.length}종류</div>
          <div className="console-pill" style={{ color: pendingKeys.size > 0 ? '#c4b5fd' : undefined }}>
            변경 {pendingKeys.size}건
          </div>
        </div>
      </div>

      <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space wrap size={16}>
            <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13, fontWeight: 700 }}>상태 기준 설정</div>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>부족 기준(일)</span>
              <InputNumber min={0} value={statusSettings.overdue_days} onChange={(value) => handleStatusSettingChange('overdue_days', value)} />
            </Space>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>임박 기준(일)</span>
              <InputNumber min={0} value={statusSettings.urgent_days} onChange={(value) => handleStatusSettingChange('urgent_days', value)} />
            </Space>
          </Space>
          <Button onClick={handleSaveStatusSettings} loading={settingsSaving}>
            기준 저장
          </Button>
        </div>
      </Card>

      {error ? <Alert type="error" message={error} /> : null}

      <Card
        className="console-panel"
        style={{ ...panelStyle, minHeight: 0, overflow: 'hidden' }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        title="전체 설비 소스 입력"
        extra={(
          <Space wrap>
            <Input
              value={quickFilter}
              onChange={(event) => setQuickFilter(event.target.value)}
              placeholder="호기 검색"
              style={{ width: 150 }}
              allowClear
            />
            <Select
              value={forecastDays}
              onChange={setForecastDays}
              style={{ width: 120 }}
              options={[
                { value: 15, label: '15일' },
                { value: 30, label: '30일' },
                { value: 60, label: '60일' },
                { value: 90, label: '90일' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={pendingKeys.size === 0}>
              전체 저장
            </Button>
          </Space>
        )}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 12 }}>
          기존 소스 입력 표에 교체 기준 입력을 통합했습니다. 초기량, 교체기준(%), 일사용량, 잔량을 입력하면 교체기준량과 예상 교체일이 자동 계산되며 예측 기간은 15/30/60/90일로 바꿔 볼 수 있습니다.
        </div>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
            <Spin tip="전체 설비 데이터를 불러오는 중입니다." />
          </div>
        ) : (
          <ExcelTable
            machines={filteredMachines}
            sourceNames={sourceNames}
            cellData={cellData}
            dateRows={dateRows}
            pendingKeys={pendingKeys}
            onChange={handleChange}
          />
        )}
      </Card>

      <Card
        className="nowa-card"
        title="설비별 잔량 도달율"
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 12 }}>
          위 입력표와 같은 열 기준으로 소스별 잔량 도달율을 표시합니다. 초기량 대비 잔량 비율이 막대로 보입니다.
        </div>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14 }}>
            <colgroup>
              <col style={{ width: LABEL_W, minWidth: LABEL_W }} />
              {filteredMachines.map((machine) =>
                sourceNames.map((sourceName) => (
                  <col key={`chart:${machine.machine_no}:${sourceName}`} style={{ width: CELL_W, minWidth: CELL_W }} />
                )),
              )}
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    ...th1Base,
                    left: 0,
                    zIndex: 12,
                    background: '#0f1117',
                    width: LABEL_W,
                    fontSize: 13,
                    color: 'rgba(148,163,184,0.6)',
                  }}
                >
                  구분
                </th>
                {filteredMachines.map((machine) => (
                  <th
                    key={`chart-head:${machine.machine_no}`}
                    colSpan={sourceNames.length}
                    style={{
                      ...th1Base,
                      borderLeft: GROUP_BORDER,
                      color: '#fbbf24',
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: 1,
                    }}
                  >
                    {formatMachineLabel(machine.machine_no)}
                  </th>
                ))}
              </tr>
              <tr>
                {filteredMachines.map((machine) =>
                  sourceNames.map((sourceName, index) => (
                    <th
                      key={`chart-sub:${machine.machine_no}:${sourceName}`}
                      style={{
                        ...th2Base,
                        borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                        color: 'rgba(180,196,210,0.7)',
                      }}
                    >
                      {sourceName}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdLabelBase, background: '#0f1117', color: '#86efac', borderRight: GROUP_BORDER }}>
                  잔량 도달율
                </td>
                {filteredMachines.map((machine) =>
                  sourceNames.map((sourceName, index) => {
                    const key = `${machine.machine_no}:${sourceName}`
                    const cell = cellData[key]
                    const initialAmount = Number(cell?.initial_amount ?? 0)
                    const remaining = Number(cell?.remaining ?? 0)
                    const rate = initialAmount > 0 ? Math.max(0, Math.min(100, (remaining / initialAmount) * 100)) : 0
                    const color = rate <= 15 ? '#f43f5e' : rate <= 40 ? '#f59e0b' : '#14b8a6'

                    return (
                      <td
                        key={`chart-cell:${key}`}
                        title={`${formatMachineLabel(machine.machine_no)} / ${sourceName} - ${rate.toFixed(1)}% (${remaining.toFixed(2)} / ${initialAmount.toFixed(2)})`}
                        style={{
                          ...tdCellBase,
                          borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                          background: '#10151d',
                          padding: '8px 6px 6px',
                          height: 132,
                          verticalAlign: 'bottom',
                        }}
                      >
                        <div style={{ height: 86, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: 28,
                              height: `${Math.max(4, rate * 0.86)}px`,
                              borderRadius: '8px 8px 0 0',
                              background: color,
                              boxShadow: `0 8px 18px ${color}22`,
                              transition: 'height 0.2s ease',
                            }}
                          />
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'center', color, fontSize: 12, fontWeight: 800 }}>
                          {rate.toFixed(0)}%
                        </div>
                      </td>
                    )
                  }),
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default function Source() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    const allowed = ['status-board', 'machine-board', 'input', 'change-log']
    return allowed.includes(tab) ? tab : 'status-board'
  }, [location.search])

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => navigate(`/epi/mocvd/source?tab=${key}`)}
      items={[
        { key: 'status-board', label: '소스교체 현황판', children: <SourceStatusBoard /> },
        { key: 'machine-board', label: '설비별 소스현황', children: <SourceMachineBoard /> },
        { key: 'input', label: '소스 입력', children: <SourceInputTab /> },
        { key: 'change-log', label: '소스교체 작업 일지', children: <SourceChangeLogTab /> },
      ]}
    />
  )
}
