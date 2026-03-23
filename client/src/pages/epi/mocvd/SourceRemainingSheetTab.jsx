import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Select, Space, Spin } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { panelStyle } from '../../../theme/consoleTheme'

const BORDER = '1px solid rgba(245,158,11,0.12)'
const GROUP_BORDER = '2px solid rgba(245,158,11,0.28)'
const DEFAULT_THRESHOLD_RATIO = 15
const HEADER_TOP_1 = 0
const HEADER_TOP_2 = 36
const ROW_TOP_DISABLED = 62
const ROW_TOP_DAILY = 92
const ROW_TOP_REMAINING = 122

const th1Base = {
  position: 'sticky',
  top: HEADER_TOP_1,
  background: '#242834',
  border: BORDER,
  padding: '0 4px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  height: 36,
  zIndex: 4,
}

const th2Base = {
  position: 'sticky',
  top: HEADER_TOP_2,
  background: '#1e222e',
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 14,
  whiteSpace: 'nowrap',
  height: 26,
  zIndex: 4,
}

const tdLabelBase = {
  position: 'sticky',
  left: 0,
  zIndex: 3,
  border: BORDER,
  padding: '0 8px',
  whiteSpace: 'nowrap',
  height: 30,
  fontWeight: 600,
  fontSize: 14,
  textAlign: 'center',
}

function stickyDataRowStyle(top, bg, color = 'inherit', zIndex = 3) {
  return {
    position: 'sticky',
    top,
    background: bg,
    color,
    zIndex,
  }
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

function getHatchBackground(base) {
  return `repeating-linear-gradient(155deg, rgba(245,158,11,0.22) 0px, rgba(245,158,11,0.22) 1px, ${base} 1px, ${base} 18px)`
}

function ToggleBadge({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid rgba(245,158,11,0.24)',
        background: active ? 'rgba(239,68,68,0.18)' : 'rgba(15,23,42,0.4)',
        color: active ? '#fca5a5' : 'rgba(196,210,226,0.74)',
        borderRadius: 999,
        minWidth: 56,
        height: 22,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {active ? '사용안함' : '사용중'}
    </button>
  )
}

function EditField({ value, color, bg, onChange, pending, disabled = false }) {
  const [local, setLocal] = useState(value ?? '')

  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  return (
    <input
      value={local === 0 ? '' : local}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value
        setLocal(next)
        onChange(next === '' ? 0 : Number(next))
      }}
      style={{
        width: '100%',
        height: 30,
        background: disabled ? getHatchBackground(bg) : pending ? 'rgba(245,158,11,0.08)' : bg,
        border: 'none',
        outline: 'none',
        color: disabled ? 'rgba(196,210,226,0.42)' : color,
        textAlign: 'right',
        padding: '0 6px',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  )
}

export default function SourceRemainingSheetTab() {
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
        setMachines(rows.map((row) => ({ ...row, machine_no: row.machine_no, description: row.description })))
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
              is_disabled: Boolean(row[`${name}_is_disabled`] ?? false),
            }
          })
        })

        setCellData(nextCellData)
        setPendingKeys(new Set())
        setStatusSettings(json.status_settings ?? { overdue_days: 0, urgent_days: 7 })
      })
      .catch((err) => setError(typeof err === 'string' ? err : '잔량기입 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredMachines = useMemo(() => {
    const keyword = quickFilter.trim().toLowerCase()
    if (!keyword) return machines
    return machines.filter(
      (machine) =>
        String(machine.machine_no).includes(keyword) ||
        formatMachineLabel(machine.machine_no).toLowerCase().includes(keyword) ||
        String(machine.description ?? '').toLowerCase().includes(keyword),
    )
  }, [machines, quickFilter])

  const dateRows = useMemo(
    () =>
      Array.from({ length: forecastDays }, (_, index) => {
        const next = dayjs().add(index, 'day')
        return { label: `${next.month() + 1}/${next.date()}`, daysAhead: index }
      }),
    [forecastDays],
  )

  const handleChange = (machineNo, sourceName, field, value) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: Number(value ?? 0) } }))
    setPendingKeys((prev) => new Set([...prev, key]))
  }

  const handleToggleDisabled = (machineNo, sourceName) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({
      ...prev,
      [key]: { ...prev[key], is_disabled: !prev[key]?.is_disabled },
    }))
    setPendingKeys((prev) => new Set([...prev, key]))
  }

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
          is_disabled: Boolean(cell.is_disabled),
          unit: 'kg',
        }
      })

      const res = await authFetch('/api/mocvd/sources/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '잔량기입 저장에 실패했습니다.')
      fetchData()
    } catch (err) {
      setError(err.message || '잔량기입 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const saveStatusSettings = async () => {
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

  const editableRows = [
    ['일사용량', 'daily_usage', '#fbbf24', '#100e00', ROW_TOP_DAILY],
    ['잔량', 'remaining', '#86efac', '#060f06', ROW_TOP_REMAINING],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <div className="console-toolbar">
        <div>
          <div style={{ color: 'var(--console-text)', fontSize: 18, fontWeight: 800, marginTop: 4 }}>잔량기입 시트</div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 4 }}>
            특정 호기·특정 소스를 사용안함으로 둘 수 있고, 비활성 셀은 사선 처리됩니다.
          </div>
        </div>
      </div>

      <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space wrap size={16}>
            <div style={{ color: 'var(--nowa-text-soft)', fontSize: 14, fontWeight: 700 }}>상태 기준 설정</div>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>부족 기준(일)</span>
              <InputNumber min={0} value={statusSettings.overdue_days} onChange={(value) => setStatusSettings((prev) => ({ ...prev, overdue_days: Number(value ?? 0) }))} />
            </Space>
            <Space size={8}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>임박 기준(일)</span>
              <InputNumber min={0} value={statusSettings.urgent_days} onChange={(value) => setStatusSettings((prev) => ({ ...prev, urgent_days: Number(value ?? 0) }))} />
            </Space>
          </Space>
          <Button onClick={saveStatusSettings} loading={settingsSaving}>기준 저장</Button>
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
            <Input value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)} placeholder="호기 검색" style={{ width: 150 }} allowClear />
            <Select value={forecastDays} onChange={setForecastDays} style={{ width: 100 }} options={[15, 30, 60, 90].map((value) => ({ value, label: `${value}일` }))} />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={pendingKeys.size === 0}>전체 저장</Button>
          </Space>
        )}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          사용안함을 켜면 해당 호기의 해당 소스는 계산과 현황판에서 제외됩니다.
        </div>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
            <Spin tip="잔량기입 데이터를 불러오는 중입니다." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14 }}>
              <colgroup>
                <col style={{ width: 88 }} />
                {filteredMachines.map((machine) =>
                  sourceNames.map((sourceName) => <col key={`${machine.machine_no}:${sourceName}`} style={{ width: 82 }} />),
                )}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ position: 'sticky', top: HEADER_TOP_1, left: 0, zIndex: 5, background: '#171b26', color: 'rgba(196,210,226,0.7)', border: BORDER, height: 36 }}>구분</th>
                  {filteredMachines.map((machine) => (
                    <th key={machine.machine_no} colSpan={sourceNames.length} style={{ position: 'sticky', top: HEADER_TOP_1, background: '#242834', color: '#fbbf24', border: BORDER, borderLeft: GROUP_BORDER, height: 36, fontWeight: 700, zIndex: 4 }}>
                      {formatMachineLabel(machine.machine_no)}
                    </th>
                  ))}
                </tr>
                <tr>
                  {filteredMachines.map((machine) =>
                    sourceNames.map((sourceName, index) => (
                      <th key={`${machine.machine_no}:${sourceName}:head`} style={{ ...th2Base, borderLeft: index === 0 ? GROUP_BORDER : BORDER, color: 'rgba(180,196,210,0.7)' }}>
                        {sourceName}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdLabelBase, ...stickyDataRowStyle(ROW_TOP_DISABLED, '#1a1510', '#fbbf24', 6), borderRight: GROUP_BORDER }}>사용안함</td>
                  {filteredMachines.map((machine) =>
                    sourceNames.map((sourceName, index) => {
                      const key = `${machine.machine_no}:${sourceName}`
                      const disabled = Boolean(cellData[key]?.is_disabled)
                      return (
                        <td key={`${key}:disabled`} style={{ ...stickyDataRowStyle(ROW_TOP_DISABLED, disabled ? getHatchBackground('#1a1510') : '#1a1510', 'inherit', 6), border: BORDER, borderLeft: index === 0 ? GROUP_BORDER : BORDER, height: 30, textAlign: 'center' }}>
                          <ToggleBadge active={disabled} onClick={() => handleToggleDisabled(machine.machine_no, sourceName)} />
                        </td>
                      )
                    }),
                  )}
                </tr>
                {editableRows.map(([label, field, color, bg, top]) => (
                  <tr key={field}>
                    <td style={{ ...tdLabelBase, ...stickyDataRowStyle(top, bg, color, field === 'daily_usage' ? 5 : 4), borderRight: GROUP_BORDER }}>{label}</td>
                    {filteredMachines.map((machine) =>
                      sourceNames.map((sourceName, index) => {
                        const key = `${machine.machine_no}:${sourceName}`
                        const disabled = Boolean(cellData[key]?.is_disabled)
                        return (
                          <td key={`${key}:${field}`} style={{ ...stickyDataRowStyle(top, bg, 'inherit', field === 'daily_usage' ? 5 : 4), border: BORDER, borderLeft: index === 0 ? GROUP_BORDER : BORDER, height: 30 }}>
                            <EditField
                              value={cellData[key]?.[field] ?? 0}
                              color={color}
                              bg={bg}
                              pending={pendingKeys.has(key)}
                              disabled={disabled}
                              onChange={(value) => handleChange(machine.machine_no, sourceName, field, value)}
                            />
                          </td>
                        )
                      }),
                    )}
                  </tr>
                ))}
                {dateRows.map(({ label, daysAhead }, rowIndex) => (
                  <tr key={label} style={{ background: rowIndex % 2 === 0 ? '#171b26' : '#131619' }}>
                    <td style={{ ...tdLabelBase, background: rowIndex % 2 === 0 ? '#171b26' : '#131619', color: rowIndex === 0 ? 'rgba(251,191,36,0.82)' : 'rgba(196,210,226,0.82)', borderRight: GROUP_BORDER }}>{label}</td>
                    {filteredMachines.map((machine) =>
                      sourceNames.map((sourceName, index) => {
                        const key = `${machine.machine_no}:${sourceName}`
                        const disabled = Boolean(cellData[key]?.is_disabled)
                        const remaining = cellData[key]?.remaining ?? 0
                        const dailyUsage = cellData[key]?.daily_usage ?? 0
                        const projected = dailyUsage === 0 ? null : Math.max(0, remaining - daysAhead * dailyUsage)
                        const baseBg = rowIndex % 2 === 0 ? '#171b26' : '#131619'
                        if (daysAhead === 0) {
                          return (
                            <td key={`${key}:${label}`} style={{ border: BORDER, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: baseBg, height: 30 }}>
                              <EditField
                                value={cellData[key]?.remaining ?? 0}
                                color="rgba(196,210,226,0.8)"
                                bg={baseBg}
                                pending={pendingKeys.has(key)}
                                disabled={disabled}
                                onChange={(value) => handleChange(machine.machine_no, sourceName, 'remaining', value)}
                              />
                            </td>
                          )
                        }
                        return (
                          <td key={`${key}:${label}`} style={{ border: BORDER, borderLeft: index === 0 ? GROUP_BORDER : BORDER, background: disabled ? getHatchBackground(baseBg) : baseBg, color: disabled ? 'rgba(196,210,226,0.42)' : 'rgba(196,210,226,0.8)', textAlign: 'right', paddingRight: 6, height: 30 }}>
                            {disabled || projected == null ? '-' : fmt(projected)}
                          </td>
                        )
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
