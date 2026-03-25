import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Spin } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getGroupColor } from './sourceColors'

const BORDER = '1px solid rgba(245,158,11,0.12)'
const GROUP_BORDER = '2px solid rgba(245,158,11,0.28)'
const DEFAULT_THRESHOLD_RATIO = 15

const th1Base = {
  position: 'sticky',
  top: 0,
  background: '#242834',
  border: BORDER,
  padding: '0 4px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  height: 36,
  zIndex: 3,
}

const th2Base = {
  position: 'sticky',
  top: 36,
  background: '#1e222e',
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 14,
  whiteSpace: 'nowrap',
  height: 26,
  zIndex: 3,
}

const tdLabelBase = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  border: BORDER,
  padding: '0 8px',
  whiteSpace: 'nowrap',
  height: 30,
  fontWeight: 600,
  fontSize: 14,
  textAlign: 'center',
}

const tdCellBase = {
  border: BORDER,
  padding: 0,
  height: 30,
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

function getHatchBackground(base) {
  return `repeating-linear-gradient(155deg, rgba(245,158,11,0.22) 0px, rgba(245,158,11,0.22) 1px, ${base} 1px, ${base} 18px)`
}

function buildDerivedCell(cell) {
  if (cell?.is_disabled) {
    return { thresholdAmount: null, replacementDate: '-' }
  }
  const initialAmount = toNumber(cell.initial_amount)
  const thresholdRatio = toNumber(cell.threshold_ratio, DEFAULT_THRESHOLD_RATIO)
  const dailyUsage = toNumber(cell.daily_usage)
  const remaining = toNumber(cell.remaining)
  const thresholdAmount = initialAmount > 0 ? (initialAmount * thresholdRatio) / 100 : 0

  let replacementDate = '-'
  if (dailyUsage > 0) {
    const daysLeft = Math.ceil((remaining - thresholdAmount) / dailyUsage)
    const next = new Date()
    next.setDate(next.getDate() + Math.max(daysLeft, 0))
    replacementDate = next.toISOString().slice(0, 10)
  }

  return { thresholdAmount, replacementDate }
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
      {active ? '?덊븿' : '?ъ슜'}
    </button>
  )
}

function EditField({ value, color, bg, onChange, pending, disabled = false, readOnly = false }) {
  const [local, setLocal] = useState(value ?? '')

  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  return (
    <input
      value={local === 0 ? '' : local}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(event) => {
        setLocal(event.target.value)
      }}
      onBlur={(event) => {
        const next = event.target.value
        onChange(next === '' ? 0 : Number(next))
      }}
      style={{
        width: '100%',
        height: 30,
        background: disabled ? getHatchBackground(bg) : pending ? 'rgba(245,158,11,0.08)' : bg,
        border: 'none',
        outline: 'none',
        color: disabled || readOnly ? 'rgba(196,210,226,0.72)' : color,
        textAlign: 'right',
        padding: '0 6px',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
      }}
    />
  )
}

export default function SourceTableSheetTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [sourceNames, setSourceNames] = useState([])
  const [cellData, setCellData] = useState({})
  const [pendingKeys, setPendingKeys] = useState(new Set())
  const [quickFilter, setQuickFilter] = useState('')
  const [machineGroupMap, setMachineGroupMap] = useState({})

  useEffect(() => {
    authFetch('/api/admin/machine-groups')
      .then(r => r.ok ? r.json() : [])
      .then(groups => {
        const map = {}
        groups.forEach(g => g.machine_nos.forEach(no => { map[no] = g.name }))
        setMachineGroupMap(map)
      })
      .catch(() => {})
  }, [])

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
      })
      .catch((err) => setError(typeof err === 'string' ? err : '소스 계산 데이터를 불러오지 못했습니다.'))
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

  const handleChange = (machineNo, sourceName, field, value) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: Number(value ?? 0) } }))
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
      if (!res.ok) throw new Error(json.detail || '소스 계산 저장에 실패했습니다.')
      fetchData()
    } catch (err) {
      setError(err.message || '소스 계산 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {error ? <Alert type="error" message={error} /> : null}

      <Card
        className="nowa-card"
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(245,158,11,0.14)' }}>
          <Input value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)} placeholder="호기 검색" style={{ width: 150 }} allowClear />
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={pendingKeys.size === 0}>전체 저장</Button>
        </div>

        <div style={{ padding: '0 2px 12px', color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          `일사용량`, `잔량`은 잔량기입 데이터를 그대로 표시합니다. 이 화면에서는 `초기량`, `교체기준(%)`만 수정합니다.
        </div>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
            <Spin tip="소스 계산 데이터를 불러오는 중입니다." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.14)' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14 }}>
              <colgroup>
                <col style={{ width: 108 }} />
                {sourceNames.flatMap((sourceName) => [
                  <col key={`${sourceName}:initial`} style={{ width: 84 }} />,
                  <col key={`${sourceName}:daily`} style={{ width: 84 }} />,
                  <col key={`${sourceName}:remain`} style={{ width: 84 }} />,
                  <col key={`${sourceName}:ratio`} style={{ width: 92 }} />,
                  <col key={`${sourceName}:threshold`} style={{ width: 90 }} />,
                  <col key={`${sourceName}:date`} style={{ width: 112 }} />,
                ])}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ position: 'sticky', top: 0, left: 0, zIndex: 4, background: '#171b26', color: 'rgba(196,210,226,0.7)', border: BORDER, height: 36 }}>MO</th>
                  {sourceNames.map((sourceName) => (
                    <th key={`group:${sourceName}`} colSpan={6} style={{ ...th1Base, borderLeft: GROUP_BORDER, color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>
                      {sourceName}
                    </th>
                  ))}
                </tr>
                <tr>
                  {sourceNames.flatMap((sourceName) => [
                    <th key={`${sourceName}:head-initial`} style={{ ...th2Base, borderLeft: GROUP_BORDER, color: '#38bdf8' }}>초기량</th>,
                    <th key={`${sourceName}:head-daily`} style={{ ...th2Base, color: '#fbbf24' }}>일사용량</th>,
                    <th key={`${sourceName}:head-remaining`} style={{ ...th2Base, color: '#86efac' }}>잔량</th>,
                    <th key={`${sourceName}:head-ratio`} style={{ ...th2Base, color: '#f59e0b' }}>교체기준(%)</th>,
                    <th key={`${sourceName}:head-threshold`} style={{ ...th2Base, color: '#f97316' }}>교체 기준량</th>,
                    <th key={`${sourceName}:head-date`} style={{ ...th2Base, color: '#60a5fa' }}>예상 교체일</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine, rowIndex) => {
                  const grpName = machineGroupMap[machine.machine_no]
                  const rowBg = rowIndex % 2 === 0 ? '#171b26' : '#131619'
                  const gc = getGroupColor(grpName)
                  const labelBg = gc ? gc.row : rowBg
                  return (
                  <tr key={`row:${machine.machine_no}`} style={{ background: rowBg }}>
                    <td style={{ ...tdLabelBase, left: 0, background: labelBg, color: '#fbbf24', borderRight: BORDER, borderLeft: gc ? `2px solid ${gc.border}` : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>{formatMachineLabel(machine.machine_no)}</span>
                        {grpName && gc && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: gc.text, background: gc.bg, border: `1px solid ${gc.border}`, borderRadius: 3, padding: '0 5px', lineHeight: '15px' }}>
                            {grpName}
                          </span>
                        )}
                      </div>
                    </td>
                    {sourceNames.flatMap((sourceName) => {
                      const key = `${machine.machine_no}:${sourceName}`
                      const cell = cellData[key] ?? {}
                      const derived = buildDerivedCell(cell)
                      const disabled = Boolean(cell.is_disabled)
                      return [
                        <td key={`${key}:initial`} style={{ ...tdCellBase, borderLeft: GROUP_BORDER, background: '#0a1119' }}>
                          <EditField value={cell.initial_amount ?? 0} color="#38bdf8" bg="#0a1119" pending={pendingKeys.has(key)} disabled={disabled} onChange={(value) => handleChange(machine.machine_no, sourceName, 'initial_amount', value)} />
                        </td>,
                        <td key={`${key}:daily`} style={{ ...tdCellBase, background: '#100e00' }}>
                          <EditField value={cell.daily_usage ?? 0} color="#fbbf24" bg="#100e00" pending={pendingKeys.has(key)} readOnly />
                        </td>,
                        <td key={`${key}:remaining`} style={{ ...tdCellBase, background: '#060f06' }}>
                          <EditField value={cell.remaining ?? 0} color="#86efac" bg="#060f06" pending={pendingKeys.has(key)} readOnly />
                        </td>,
                        <td key={`${key}:ratio`} style={{ ...tdCellBase, background: '#110e00' }}>
                          <EditField value={cell.threshold_ratio ?? DEFAULT_THRESHOLD_RATIO} color="#f59e0b" bg="#110e00" pending={pendingKeys.has(key)} disabled={disabled} onChange={(value) => handleChange(machine.machine_no, sourceName, 'threshold_ratio', value)} />
                        </td>,
                        <td key={`${key}:threshold`} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#110a00') : '#110a00', color: disabled ? 'rgba(196,210,226,0.5)' : '#f97316', textAlign: 'right', paddingRight: 6, fontWeight: 700 }}>
                          {disabled ? '-' : fmt(derived.thresholdAmount)}
                        </td>,
                        <td key={`${key}:date`} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#060f18') : '#060f18', color: disabled ? 'rgba(196,210,226,0.5)' : '#60a5fa', textAlign: 'center', fontWeight: 700 }}>
                          {disabled ? '-' : derived.replacementDate}
                        </td>,
                      ]
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

