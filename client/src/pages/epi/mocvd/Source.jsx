import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Select, Space, Spin, Tabs } from 'antd'
import { BarChartOutlined, BookOutlined, EditOutlined, HeatMapOutlined, ReloadOutlined, SaveOutlined, TableOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useLocation, useNavigate } from 'react-router-dom'
import { authFetch } from '../../../context/AuthContext'
import SourceChangeLogTab from './SourceChangeLogTab'
import SourceStatusBoard from './SourceStatusBoard'
import SourceMachineBoard from './SourceMachineBoard'
import SourceTableSheetTab from './SourceTableSheetTab'
import SourceMachineConfigTab from './SourceMachineConfigTab'
import { formatMachineLabel } from './machineLabel'
import { getSourceColor } from './sourceColors'
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
const BASE_BG = '#171b26'
const BORDER = '1px solid rgba(180,196,210,0.32)'
const GROUP_BORDER = '3px solid #2d7aaa'
const DEFAULT_THRESHOLD_RATIO = 15
const EDITABLE_FIELDS = ['initial_amount', 'threshold_ratio', 'daily_usage', 'remaining']

const th1Base = {
  position: 'sticky',
  top: 0,
  background: '#242834',
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
  background: '#1e222e',
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 14,
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
          fontSize: 14,
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
        fontSize: 14,
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
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>?곗씠?곌? ?놁뒿?덈떎.</div>
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
                background: '#171b26',
                width: LABEL_W,
                fontSize: 14,
                color: 'rgba(196,210,226,0.6)',
              }}
            >
              援щ텇
            </th>
            {machines.map((machine, mi) => (
              <th
                key={machine.machine_no}
                colSpan={sourceNames.length}
                style={{
                  ...th1Base,
                  borderLeft: mi === 0 ? BORDER : GROUP_BORDER,
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
            {machines.map((machine, mi) =>
              sourceNames.map((sourceName, index) => (
                <th
                  key={`${machine.machine_no}:${sourceName}`}
                  style={{
                    ...th2Base,
                    borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
                    color: getSourceColor(index).main,
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
            <td style={{ ...tdLabelBase, background: '#0d1520', color: '#38bdf8', borderRight: BORDER }}>???</td>
            {machines.map((machine, mi) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={`${key}:initial_amount`} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_INITIAL, zIndex: 7, borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER, background: '#0a1119' }}>
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
            <td style={{ ...tdLabelBase, background: '#1a1400', color: '#f59e0b', borderRight: BORDER }}>援먯껜湲곗?(%)</td>
            {machines.map((machine, mi) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={`${key}:threshold_ratio`} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_THRESHOLD, zIndex: 7, borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER, background: '#110e00' }}>
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
            <td style={{ ...tdLabelBase, background: '#191500', color: '#fbbf24', borderRight: BORDER }}>?쇱궗?⑸웾</td>
            {machines.map((machine, mi) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={key} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_DAILY, zIndex: 7, borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER, background: '#100e00' }}>
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
            <td style={{ ...tdLabelBase, background: '#0a1a0a', color: '#86efac', borderRight: BORDER }}>?붾웾</td>
            {machines.map((machine, mi) =>
              sourceNames.map((sourceName, index) => {
                const key = `${machine.machine_no}:${sourceName}`
                return (
                  <td key={key} style={{ ...tdCellBase, position: 'sticky', top: STICKY_TOP_REMAINING, zIndex: 7, borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER, background: '#060f06' }}>
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
            <td style={{ ...tdLabelBase, background: '#1a0d00', color: '#f97316', borderRight: BORDER }}>?????</td>
            {machines.map((machine, mi) =>
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
                      borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
                      background: '#110a00',
                      color: '#f97316',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 14,
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
            <td style={{ ...tdLabelBase, background: '#161200', color: '#facc15', borderRight: BORDER }}>?? ???</td>
            {machines.map((machine, mi) =>
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
                      borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
                      background: '#0f0d00',
                      color: derived.days_left != null && derived.days_left <= 7 ? '#f87171' : '#facc15',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {derived.days_left == null ? '-' : `${derived.days_left}?`}
                  </td>
                )
              }),
            )}
          </tr>

          <tr>
            <td style={{ ...tdLabelBase, background: '#091420', color: '#60a5fa', borderRight: BORDER }}>?? ???</td>
            {machines.map((machine, mi) =>
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
                      borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
                      background: '#060f18',
                      color: '#60a5fa',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 14,
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
                  color: rowIndex === 0 ? 'rgba(251,191,36,0.82)' : 'rgba(196,210,226,0.82)',
                  borderRight: BORDER,
                  fontWeight: rowIndex === 0 ? 800 : 700,
                }}
              >
                {label}
              </td>
              {machines.map((machine, mi) =>
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
                        borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
                        background: isCritical ? 'rgba(239,68,68,0.12)' : isLow ? 'rgba(251,191,36,0.07)' : undefined,
                        color: isCritical ? '#f87171' : isLow ? '#fbbf24' : 'rgba(196,210,226,0.8)',
                        textAlign: 'right',
                        paddingRight: 5,
                        fontSize: 14,
                        fontWeight: isCritical || isLow ? 700 : 500,
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
      .catch((err) => setError(typeof err === 'string' ? err : '?꾩껜 ?뚯뒪 ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??'))
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
      if (!res.ok) throw new Error(json.detail || '?꾩껜 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.')
      fetchData()
    } catch (err) {
      setError(err.message || '?꾩껜 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.')
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
      if (!res.ok) throw new Error(json.detail || '?곹깭 湲곗? ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.')
      setStatusSettings(json)
    } catch (err) {
      setError(err.message || '?곹깭 湲곗? ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const filteredMachines = useMemo(() => {
    const keyword = quickFilter.trim().toLowerCase()
    if (!keyword) return machines
    return machines.filter(
      (machine) => String(machine.machine_no).includes(keyword) || `mo#${machine.machine_no}?멸린`.includes(keyword),
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
            MOCVD ?꾩껜 ?뚯뒪 ?낅젰
          </div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 4 }}>
            珥덇린?? 援먯껜湲곗?, ?쇱궗?⑸웾, ?붾웾?????붾㈃?먯꽌 ?낅젰?섍퀬 ?꾨옒 ?덉륫媛믪쓣 諛붾줈 ?뺤씤?⑸땲??
          </div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">{machines.length}?</div>
          <div className="console-pill">{sourceNames.length}醫낅쪟</div>
          <div className="console-pill" style={{ color: pendingKeys.size > 0 ? '#c4b5fd' : undefined }}>
            蹂寃?{pendingKeys.size}嫄?          </div>
        </div>
      </div>

      <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space wrap size={16}>
            <div style={{ color: 'var(--nowa-text-soft)', fontSize: 14, fontWeight: 700 }}>?곹깭 湲곗? ?ㅼ젙</div>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>遺議?湲곗?(??</span>
              <InputNumber min={0} value={statusSettings.overdue_days} onChange={(value) => handleStatusSettingChange('overdue_days', value)} />
            </Space>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>?꾨컯 湲곗?(??</span>
              <InputNumber min={0} value={statusSettings.urgent_days} onChange={(value) => handleStatusSettingChange('urgent_days', value)} />
            </Space>
          </Space>
          <Button onClick={handleSaveStatusSettings} loading={settingsSaving}>
            湲곗? ???          </Button>
        </div>
      </Card>

      {error ? <Alert type="error" message={error} /> : null}

      <Card
        className="console-panel"
        style={{ ...panelStyle, minHeight: 0, overflow: 'hidden' }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        title="?꾩껜 ?ㅻ퉬 ?뚯뒪 ?낅젰"
        extra={(
          <Space wrap>
            <Input
              value={quickFilter}
              onChange={(event) => setQuickFilter(event.target.value)}
              placeholder="?멸린 寃??
              style={{ width: 150 }}
              allowClear
            />
            <Select
              value={forecastDays}
              onChange={setForecastDays}
              style={{ width: 120 }}
              options={[
                { value: 15, label: '15?? },
                { value: 30, label: '30?? },
                { value: 60, label: '60?? },
                { value: 90, label: '90?? },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              ?덈줈怨좎묠
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={pendingKeys.size === 0}>
              ?꾩껜 ???            </Button>
          </Space>
        )}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          湲곗〈 ?뚯뒪 ?낅젰 ?쒖뿉 援먯껜 湲곗? ?낅젰???듯빀?덉뒿?덈떎. 珥덇린?? 援먯껜湲곗?(%), ?쇱궗?⑸웾, ?붾웾???낅젰?섎㈃ 援먯껜湲곗??됯낵 ?덉긽 援먯껜?쇱씠 ?먮룞 怨꾩궛?섎ŉ ?덉륫 湲곌컙? 15/30/60/90?쇰줈 諛붽퓭 蹂????덉뒿?덈떎.
        </div>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
            <Spin tip="?꾩껜 ?ㅻ퉬 ?곗씠?곕? 遺덈윭?ㅻ뒗 以묒엯?덈떎." />
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
        title="?ㅻ퉬蹂??붾웾 ?꾨떖??
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          ???낅젰?쒖? 媛숈? ??湲곗??쇰줈 ?뚯뒪蹂??붾웾 ?꾨떖?⑥쓣 ?쒖떆?⑸땲?? 珥덇린???鍮??붾웾 鍮꾩쑉??留됰?濡?蹂댁엯?덈떎.
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
                    background: '#171b26',
                    width: LABEL_W,
                    fontSize: 14,
                    color: 'rgba(196,210,226,0.6)',
                  }}
                >
                  援щ텇
                </th>
                {filteredMachines.map((machine, mi) => (
                  <th
                    key={`chart-head:${machine.machine_no}`}
                    colSpan={sourceNames.length}
                    style={{
                      ...th1Base,
                      borderLeft: mi === 0 ? BORDER : GROUP_BORDER,
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
                {filteredMachines.map((machine, mi) =>
                  sourceNames.map((sourceName, index) => (
                    <th
                      key={`chart-sub:${machine.machine_no}:${sourceName}`}
                      style={{
                        ...th2Base,
                        borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
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
                <td style={{ ...tdLabelBase, background: '#171b26', color: '#86efac', borderRight: BORDER }}>
                  ?붾웾 ?꾨떖??                </td>
                {filteredMachines.map((machine, mi) =>
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
                          borderLeft: index === 0 && mi > 0 ? GROUP_BORDER : BORDER,
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
                        <div style={{ marginTop: 8, textAlign: 'center', color, fontSize: 14, fontWeight: 800 }}>
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
    const allowed = ['status-board', 'machine-board', 'input', 'table-sheet', 'machine-config', 'change-log']
    return allowed.includes(tab) ? tab : 'status-board'
  }, [location.search])

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => navigate(`/epi/mocvd/source?tab=${key}`)}
      tabBarStyle={{
        borderBottom: '1px solid rgba(245,158,11,0.18)',
        marginBottom: 20,
        paddingBottom: 0,
        fontSize: 16,
      }}
      items={[
        { key: 'status-board', label: <span><BarChartOutlined />{"\uC18C\uC2A4\uAD50\uCCB4 \uD604\uD669\uD310"}</span>, children: <SourceStatusBoard /> },
        { key: 'machine-board', label: <span><HeatMapOutlined />{"\uC124\uBE44\uBCC4 \uC18C\uC2A4\uD604\uD669"}</span>, children: <SourceMachineBoard /> },
        { key: 'input', label: <span><EditOutlined />{"\uC794\uB7C9\uAE30\uC785"}</span>, children: <SourceInputTab /> },
        { key: 'table-sheet', label: <span><TableOutlined />TABLE</span>, children: <SourceTableSheetTab /> },
        { key: 'machine-config', label: <span><TableOutlined />{"설비 / 소스 구성"}</span>, children: <SourceMachineConfigTab /> },
        { key: 'change-log', label: <span><BookOutlined />{"\uC18C\uC2A4\uAD50\uCCB4 \uC791\uC5C5\uC77C\uC9C0"}</span>, children: <SourceChangeLogTab /> },
      ]}
    />
  )
}
