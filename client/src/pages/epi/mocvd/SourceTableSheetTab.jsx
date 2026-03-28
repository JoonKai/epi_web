import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Modal, Space, Spin } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getGroupColor } from './sourceColors'

const BORDER = '1px solid rgba(245,158,11,0.28)'
const GROUP_BORDER = '2px solid rgba(245,158,11,0.5)'
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
  if (v >= 100) return String(parseFloat(v.toFixed(1)))
  return String(parseFloat(v.toFixed(2)))
}

function fmtOrBlank(v) {
  if (!v) return ''
  return fmt(v)
}

function getHatchBackground(base) {
  return `repeating-linear-gradient(155deg, rgba(245,158,11,0.65) 0px, rgba(245,158,11,0.65) 1px, ${base} 1px, ${base} 12px)`
}

function navigateCell(row, col, dRow, dCol) {
  const el = document.querySelector(`[data-grid-row="${row + dRow}"][data-grid-col="${col + dCol}"]`)
  if (!el) return
  el.focus()
  if (el.tagName === 'INPUT') el.select()
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

function EditField({ value, color, bg, onChange, pending, disabled = false, readOnly = false, gridRow, gridCol }) {
  const [local, setLocal] = useState(value ?? '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  const handleKeyDown = (e) => {
    const row = gridRow ?? NaN
    const col = gridCol ?? NaN
    if (isNaN(row) || isNaN(col)) return
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateCell(row, col, -1, 0); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateCell(row, col, 1, 0); return }
    if (e.key === 'Enter') { e.preventDefault(); navigateCell(row, col, 0, 1); return }
    if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
      e.preventDefault(); navigateCell(row, col, 0, -1); return
    }
    if (e.key === 'ArrowRight') {
      const len = (e.currentTarget.value ?? '').length
      if (e.currentTarget.selectionStart === len && e.currentTarget.selectionEnd === len) {
        e.preventDefault(); navigateCell(row, col, 0, 1); return
      }
    }
  }

  return (
    <input
      value={local === 0 ? '' : local}
      disabled={disabled}
      readOnly={readOnly}
      data-grid-row={gridRow}
      data-grid-col={gridCol}
      onChange={(event) => {
        setLocal(event.target.value)
      }}
      onKeyDown={handleKeyDown}
      onFocus={(e) => { setFocused(true); e.target.select() }}
      onBlur={(event) => {
        setFocused(false)
        const next = event.target.value
        onChange(next === '' ? 0 : Number(next))
      }}
      style={{
        display: 'block',
        width: '100%',
        height: 30,
        background: disabled ? getHatchBackground(bg) : bg,
        border: 'none',
        outline: 'none',
        caretColor: 'transparent',
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
  const [cellMemos, setCellMemos] = useState({})
  const [focusedCell, setFocusedCell] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [memoEdit, setMemoEdit] = useState(null)
  const [memoText, setMemoText] = useState('')

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
        const nextMemos = {}
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
            const memoObj = row[`${name}_memo`] ?? {}
            Object.entries(memoObj).forEach(([field, text]) => {
              if (text) nextMemos[`${key}:${field}`] = text
            })
          })
        })

        setCellData(nextCellData)
        setCellMemos(nextMemos)
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
        // cellMemos에서 이 key에 해당하는 필드 메모 수집
        const memo = {}
        Object.entries(cellMemos).forEach(([memoKey, text]) => {
          if (memoKey.startsWith(`${key}:`)) {
            const field = memoKey.slice(key.length + 1)
            memo[field] = text
          }
        })
        return {
          machine_no,
          source_name,
          remaining: cell.remaining ?? 0,
          daily_usage: cell.daily_usage ?? 0,
          initial_amount: cell.initial_amount ?? 0,
          threshold_ratio: cell.threshold_ratio ?? DEFAULT_THRESHOLD_RATIO,
          unit: 'kg',
          memo,
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

  const handleContextMenu = useCallback((e, key) => {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - 100)
    setContextMenu({ x, y, key })
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [contextMenu])

  const handleApplyToColumn = useCallback(() => {
    const { key } = contextMenu
    const lastColon = key.lastIndexOf(':')
    const cellKey = key.slice(0, lastColon)        // machineNo:sourceName
    const field = key.slice(lastColon + 1)         // 'initial' | 'ratio'
    const dataField = field === 'initial' ? 'initial_amount' : 'threshold_ratio'
    const colonIdx = cellKey.indexOf(':')
    const sourceName = cellKey.slice(colonIdx + 1)
    const value = cellData[cellKey]?.[dataField] ?? 0

    setCellData((prev) => {
      const next = { ...prev }
      filteredMachines.forEach((machine) => {
        const k = `${machine.machine_no}:${sourceName}`
        if (next[k] && !next[k].is_disabled) next[k] = { ...next[k], [dataField]: value }
      })
      return next
    })
    setPendingKeys((prev) => {
      const next = new Set(prev)
      filteredMachines.forEach((machine) => {
        const k = `${machine.machine_no}:${sourceName}`
        if (cellData[k] && !cellData[k].is_disabled) next.add(k)
      })
      return next
    })
    setContextMenu(null)
  }, [contextMenu, cellData, filteredMachines])

  const handleMemoSave = useCallback(() => {
    setCellMemos((prev) => {
      const next = { ...prev }
      if (memoText.trim()) next[memoEdit] = memoText.trim()
      else delete next[memoEdit]
      return next
    })
    // 메모가 속한 machineNo:sourceName 키를 pendingKeys에 추가
    const cellKey = memoEdit.split(':').slice(0, 2).join(':')
    setPendingKeys((prev) => new Set([...prev, cellKey]))
    setMemoEdit(null)
  }, [memoEdit, memoText])

  const handleCellKeyDown = useCallback((e) => {
    const row = Number(e.currentTarget.dataset.gridRow)
    const col = Number(e.currentTarget.dataset.gridCol)
    if (e.key === 'ArrowUp')                             { e.preventDefault(); navigateCell(row, col, -1,  0) }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); navigateCell(row, col,  1,  0) }
    else if (e.key === 'ArrowLeft')                      { e.preventDefault(); navigateCell(row, col,  0, -1) }
    else if (e.key === 'ArrowRight')                     { e.preventDefault(); navigateCell(row, col,  0,  1) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <style>{`td[data-grid-row]:focus{outline:2px solid rgba(59,130,246,0.75)!important;outline-offset:-2px;} .input-cell:focus-within{outline:2px solid rgba(59,130,246,0.75)!important;outline-offset:-2px;} .ctx-item:hover{background:rgba(245,158,11,0.08)}`}</style>
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
            <table
              style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14 }}
              onFocus={(e) => {
                const el = e.target.closest('[data-grid-row]') ?? (e.target.dataset.gridRow != null ? e.target : null)
                const row = el?.dataset.gridRow
                const col = el?.dataset.gridCol
                if (row != null && col != null) setFocusedCell({ row: Number(row), col: Number(col) })
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setFocusedCell(null)
              }}
            >
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
                  {sourceNames.map((sourceName, si) => {
                    const activeInGroup = focusedCell != null && Math.floor(focusedCell.col / 6) === si
                    return (
                      <th key={`group:${sourceName}`} colSpan={6} style={{ ...th1Base, borderLeft: GROUP_BORDER, color: '#fbbf24', fontWeight: 700, fontSize: 14, background: activeInGroup ? 'rgba(34,211,238,0.15)' : th1Base.background }}>
                        {sourceName}
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  {sourceNames.flatMap((sourceName, si) => {
                    const baseCol = si * 6
                    const hl = (fi) => focusedCell?.col === baseCol + fi ? { background: 'rgba(34,211,238,0.25)', color: '#22d3ee' } : {}
                    return [
                      <th key={`${sourceName}:head-initial`} style={{ ...th2Base, borderLeft: GROUP_BORDER, color: '#38bdf8', ...hl(0) }}>초기량</th>,
                      <th key={`${sourceName}:head-daily`} style={{ ...th2Base, color: '#fbbf24', ...hl(1) }}>일사용량</th>,
                      <th key={`${sourceName}:head-remaining`} style={{ ...th2Base, color: '#86efac', ...hl(2) }}>잔량</th>,
                      <th key={`${sourceName}:head-ratio`} style={{ ...th2Base, color: '#f59e0b', ...hl(3) }}>교체기준(%)</th>,
                      <th key={`${sourceName}:head-threshold`} style={{ ...th2Base, color: '#f97316', ...hl(4) }}>교체 기준량</th>,
                      <th key={`${sourceName}:head-date`} style={{ ...th2Base, color: '#60a5fa', ...hl(5) }}>예상 교체일</th>,
                    ]
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine, rowIndex) => {
                  const grpName = machineGroupMap[machine.machine_no]
                  const rowBg = rowIndex % 2 === 0 ? '#1e2235' : '#191d28'
                  const gc = getGroupColor(grpName)
                  const labelBg = gc ? `linear-gradient(${gc.row}, ${gc.row}), ${rowBg}` : rowBg
                  return (
                  <tr key={`row:${machine.machine_no}`} style={{ background: rowBg }}>
                    <td style={{ ...tdLabelBase, left: 0, background: focusedCell?.row === rowIndex ? '#1a3a42' : labelBg, color: focusedCell?.row === rowIndex ? '#22d3ee' : '#fbbf24', borderRight: BORDER, borderLeft: gc ? `2px solid ${gc.border}` : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>{formatMachineLabel(machine.machine_no)}</span>
                        {grpName && gc && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: gc.text, background: gc.bg, border: `1px solid ${gc.border}`, borderRadius: 3, padding: '0 5px', lineHeight: '15px' }}>
                            {grpName}
                          </span>
                        )}
                      </div>
                    </td>
                    {sourceNames.flatMap((sourceName, sourceIndex) => {
                      const key = `${machine.machine_no}:${sourceName}`
                      const cell = cellData[key] ?? {}
                      const derived = buildDerivedCell(cell)
                      const disabled = Boolean(cell.is_disabled)
                      const col = sourceIndex * 6
                      const mk = (field) => `${key}:${field}`
                      const dot = (field) => cellMemos[mk(field)]
                        ? <span style={{ position: 'absolute', top: 2, right: 3, color: '#fbbf24', fontSize: 8, lineHeight: 1, pointerEvents: 'none' }}>●</span>
                        : null
                      return [
                        <td key={`${key}:initial`} className={disabled ? undefined : 'input-cell'} onContextMenu={(e) => handleContextMenu(e, mk('initial'))} title={cellMemos[mk('initial')] || undefined} style={{ ...tdCellBase, borderLeft: GROUP_BORDER, background: disabled ? getHatchBackground('#1a2535') : '#1a2535', outline: 'none', position: 'relative' }}
                          tabIndex={disabled ? 0 : undefined} data-grid-row={disabled ? rowIndex : undefined} data-grid-col={disabled ? col + 0 : undefined} onKeyDown={disabled ? handleCellKeyDown : undefined}>
                          {dot('initial')}
                          {!disabled && <EditField value={cell.initial_amount ?? 0} color="#38bdf8" bg="#1a2535" pending={pendingKeys.has(key)} disabled={false} gridRow={rowIndex} gridCol={col + 0} onChange={(value) => handleChange(machine.machine_no, sourceName, 'initial_amount', value)} />}
                        </td>,
                        <td key={`${key}:daily`} tabIndex={0} data-grid-row={rowIndex} data-grid-col={col + 1} onKeyDown={handleCellKeyDown} onContextMenu={(e) => handleContextMenu(e, mk('daily'))} title={cellMemos[mk('daily')] || undefined} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#201c08') : '#201c08', color: disabled ? 'rgba(196,210,226,0.5)' : '#fbbf24', textAlign: 'right', paddingRight: 6, outline: 'none', position: 'relative' }}>
                          {dot('daily')}{disabled ? '' : fmtOrBlank(cell.daily_usage ?? 0)}
                        </td>,
                        <td key={`${key}:remaining`} tabIndex={0} data-grid-row={rowIndex} data-grid-col={col + 2} onKeyDown={handleCellKeyDown} onContextMenu={(e) => handleContextMenu(e, mk('remaining'))} title={cellMemos[mk('remaining')] || undefined} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#0f200f') : '#0f200f', color: disabled ? 'rgba(196,210,226,0.5)' : '#86efac', textAlign: 'right', paddingRight: 6, outline: 'none', position: 'relative' }}>
                          {dot('remaining')}{disabled ? '' : fmtOrBlank(cell.remaining ?? 0)}
                        </td>,
                        <td key={`${key}:ratio`} className={disabled ? undefined : 'input-cell'} onContextMenu={(e) => handleContextMenu(e, mk('ratio'))} title={cellMemos[mk('ratio')] || undefined} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#201c08') : '#201c08', color: disabled ? 'rgba(196,210,226,0.5)' : undefined, textAlign: disabled ? 'right' : undefined, paddingRight: disabled ? 6 : undefined, outline: 'none', position: 'relative' }}
                          tabIndex={disabled ? 0 : undefined} data-grid-row={disabled ? rowIndex : undefined} data-grid-col={disabled ? col + 3 : undefined} onKeyDown={disabled ? handleCellKeyDown : undefined}>
                          {dot('ratio')}{disabled ? '-' : <EditField value={cell.threshold_ratio ?? DEFAULT_THRESHOLD_RATIO} color="#f59e0b" bg="#201c08" pending={pendingKeys.has(key)} disabled={false} gridRow={rowIndex} gridCol={col + 3} onChange={(value) => handleChange(machine.machine_no, sourceName, 'threshold_ratio', value)} />}
                        </td>,
                        <td key={`${key}:threshold`} tabIndex={0} data-grid-row={rowIndex} data-grid-col={col + 4} onKeyDown={handleCellKeyDown} onContextMenu={(e) => handleContextMenu(e, mk('threshold'))} title={cellMemos[mk('threshold')] || undefined} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#201408') : '#201408', color: disabled ? 'rgba(196,210,226,0.5)' : '#f97316', textAlign: 'right', paddingRight: 6, fontWeight: 700, outline: 'none', position: 'relative' }}>
                          {dot('threshold')}{disabled ? '-' : fmt(derived.thresholdAmount)}
                        </td>,
                        <td key={`${key}:date`} tabIndex={0} data-grid-row={rowIndex} data-grid-col={col + 5} onKeyDown={handleCellKeyDown} onContextMenu={(e) => handleContextMenu(e, mk('date'))} title={cellMemos[mk('date')] || undefined} style={{ ...tdCellBase, background: disabled ? getHatchBackground('#0f1e2e') : '#0f1e2e', color: disabled ? 'rgba(196,210,226,0.5)' : '#60a5fa', textAlign: 'center', fontWeight: 700, outline: 'none', position: 'relative' }}>
                          {dot('date')}{disabled ? '-' : derived.replacementDate}
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

      {contextMenu && (() => {
        const field = contextMenu.key.slice(contextMenu.key.lastIndexOf(':') + 1)
        const isEditable = field === 'initial' || field === 'ratio'
        return (
          <div onMouseDown={(e) => e.stopPropagation()} style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999, background: '#1a2035', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: 200, overflow: 'hidden' }}>
            {isEditable && (
              <div className="ctx-item" onClick={handleApplyToColumn} style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: '#22d3ee', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⬇ 같은 열 전체에 동일 값 적용
              </div>
            )}
            <div className="ctx-item" onClick={() => { setMemoText(cellMemos[contextMenu.key] ?? ''); setMemoEdit(contextMenu.key); setContextMenu(null) }} style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✎ {cellMemos[contextMenu.key] ? '메모 편집' : '메모 삽입'}
            </div>
            {cellMemos[contextMenu.key] && (
              <div className="ctx-item" onClick={() => {
                const cellKey = contextMenu.key.split(':').slice(0, 2).join(':')
                setCellMemos((p) => { const n = { ...p }; delete n[contextMenu.key]; return n })
                setPendingKeys((prev) => new Set([...prev, cellKey]))
                setContextMenu(null)
              }} style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--nowa-text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ✕ 메모 삭제
              </div>
            )}
            {Object.keys(cellMemos).length > 0 && (
              <div className="ctx-item" onClick={() => {
                // 모든 메모 키의 cellKey를 pendingKeys에 추가
                setPendingKeys((prev) => {
                  const next = new Set(prev)
                  Object.keys(cellMemos).forEach((k) => next.add(k.split(':').slice(0, 2).join(':')))
                  return next
                })
                setCellMemos({})
                setContextMenu(null)
              }} style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: '#fda4af', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ✕ 메모 전체 삭제
              </div>
            )}
          </div>
        )
      })()}

      <Modal open={!!memoEdit} title="메모" onOk={handleMemoSave} onCancel={() => setMemoEdit(null)} okText="저장" cancelText="취소">
        <Input.TextArea value={memoText} onChange={(e) => setMemoText(e.target.value)} rows={4} placeholder="메모를 입력하세요" autoFocus />
      </Modal>
    </div>
  )
}

