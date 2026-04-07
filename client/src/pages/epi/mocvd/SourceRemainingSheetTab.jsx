import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Select, Space, Spin, Switch, message } from 'antd'
import { DownloadOutlined, ReloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getSourceColor, getGroupColor } from './sourceColors'

/* ── 모듈 레벨 상수 (컴포넌트 외부 → 렌더마다 재생성 없음) ── */
const BORDER = '1px solid var(--nowa-border)'
const HEADER_TOP_1 = 0
const HEADER_TOP_2 = 72
const ROW_TOP_DAILY = HEADER_TOP_2 + 50       // 122
const ROW_TOP_REMAINING = ROW_TOP_DAILY + 30  // 152
const STICKY_CONTENT_HEIGHT = ROW_TOP_REMAINING + 30

const BG_DEEP   = '#171b26'
const BG_DEEPER = '#131619'
const BG_ALT    = '#242834'
const TODAY_BG    = '#130a00'
const TODAY_COLOR = '#f97316'

const EDITABLE_ROWS = [
  ['일사용량', 'daily_usage', '#fbbf24', '#100e00', ROW_TOP_DAILY,     false],
  ['잔량',     'remaining',  '#86efac', '#060f06', ROW_TOP_REMAINING, true],
]

const tdLabelBase = {
  position: 'sticky',
  left: 0,
  zIndex: 3,
  border: BORDER,
  padding: '0 8px',
  whiteSpace: 'nowrap',
  height: 30,
  fontWeight: 700,
  fontSize: 14,
  textAlign: 'center',
}

const th1Base = {
  position: 'sticky',
  top: HEADER_TOP_1,
  background: BG_ALT,
  border: BORDER,
  padding: '0 4px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  height: 72,
  zIndex: 6,
}

const th2Base = {
  position: 'sticky',
  top: HEADER_TOP_2,
  background: BG_DEEP,
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 14,
  whiteSpace: 'nowrap',
  height: 50,
  zIndex: 5,
}

/* GroupDivider를 모듈 레벨에 정의 → React가 같은 컴포넌트 타입으로 인식, remount 없음 */
function GroupDivider() {
  return <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'rgba(99,179,237,0.75)', pointerEvents: 'none', zIndex: 10 }} />
}


function fmt(v) {
  if (v == null || Number.isNaN(v)) return '-'
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return String(parseFloat(v.toFixed(1)))
  return String(parseFloat(v.toFixed(2)))
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

function EditField({ value, color, bg, onChange, onPaste, disabled = false, numericOnly = false, gridRow, gridCol }) {
  const [local, setLocal] = useState(value ?? '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  const handlePasteEvent = (e) => {
    if (!onPaste) return
    const text = e.clipboardData.getData('text')
    if (text.includes('\t') || text.includes('\n')) {
      e.preventDefault()
      onPaste(text)
    }
  }

  const handleKeyDown = (e) => {
    const row = gridRow ?? NaN
    const col = gridCol ?? NaN
    const hasCoords = !isNaN(row) && !isNaN(col)
    if (hasCoords) {
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
    if (!numericOnly) return
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (/^[0-9.]$/.test(e.key)) return
    e.preventDefault()
  }

  return (
    <input
      value={local === 0 ? '' : local}
      disabled={disabled}
      data-grid-row={gridRow}
      data-grid-col={gridCol}
      onChange={(event) => {
        const v = event.target.value
        if (numericOnly && v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return
        setLocal(v)
      }}
      onKeyDown={handleKeyDown}
      onFocus={(e) => { setFocused(true); e.target.select() }}
      onBlur={(event) => {
        setFocused(false)
        const next = event.target.value
        onChange(next === '' ? 0 : Number(next))
      }}
      onPaste={handlePasteEvent}
      style={{
        width: '100%',
        height: 30,
        background: disabled ? getHatchBackground(bg) : bg,
        border: 'none',
        outline: focused ? '2px solid rgba(59,130,246,0.85)' : 'none',
        outlineOffset: '-1px',
        caretColor: 'transparent',
        color: disabled ? 'rgba(196,210,226,0.42)' : color,
        textAlign: 'right',
        padding: '0 6px',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
        fontSize: 14,
      }}
    />
  )
}

export default function SourceRemainingSheetTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [machineOrder, setMachineOrder] = useState([])
  const [sourceOrder, setSourceOrder] = useState([])
  const [cellData, setCellData] = useState({})
  const [disabledKeys, setDisabledKeys] = useState(new Set())
  const [pendingKeys, setPendingKeys] = useState(new Set())
  const deferredCellData = useDeferredValue(cellData)
  const [quickFilter, setQuickFilter] = useState('')
  const [forecastDays, setForecastDays] = useState(30)
  const [statusSettings, setStatusSettings] = useState({ overdue_days: 0, urgent_days: 7 })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [machineGroupMap, setMachineGroupMap] = useState({})
  const [todayPinned, setTodayPinned] = useState(false)
  const scrollWrapRef = useRef(null)
  const todayRowRef = useRef(null)
  const csvImportRef = useRef(null)
  const [focusedCell, setFocusedCell] = useState(null)

  useEffect(() => {
    authFetch('/api/admin/machine-groups')
      .then((r) => (r.ok ? r.json() : []))
      .then((groups) => {
        const map = {}
        groups.forEach((g) => g.machine_nos.forEach((no) => { map[no] = g.name }))
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
        setMachines(rows.map((row) => ({ machine_no: row.machine_no, description: row.description })))
        setMachineOrder((prev) => {
          const newNos = rows.map((r) => r.machine_no)
          const preserved = prev.filter((no) => newNos.includes(no))
          const added = newNos.filter((no) => !prev.includes(no))
          return [...preserved, ...added]
        })
        setSourceOrder((prev) => {
          const preserved = prev.filter((n) => names.includes(n))
          const added = names.filter((n) => !prev.includes(n))
          return [...preserved, ...added]
        })

        const nextCellData = {}
        const nextDisabledKeys = new Set()
        rows.forEach((row) => {
          names.forEach((name) => {
            const key = `${row.machine_no}:${name}`
            nextCellData[key] = {
              remaining: row[name] ?? 0,
              daily_usage: row[`${name}_daily_usage`] ?? 0,
            }
            if (row[`${name}_is_disabled`]) nextDisabledKeys.add(key)
          })
        })

        setCellData(nextCellData)
        setDisabledKeys(nextDisabledKeys)
        setPendingKeys(new Set())
        setStatusSettings(json.status_settings ?? { overdue_days: 0, urgent_days: 7 })
      })
      .catch((err) => setError(typeof err === 'string' ? err : '잔량기입 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const orderedMachines = useMemo(
    () => machineOrder.map((no) => machines.find((m) => m.machine_no === no)).filter(Boolean),
    [machineOrder, machines],
  )

  const filteredMachines = useMemo(() => {
    const keyword = quickFilter.trim().toLowerCase()
    if (!keyword) return orderedMachines
    return orderedMachines.filter(
      (machine) =>
        String(machine.machine_no).includes(keyword) ||
        formatMachineLabel(machine.machine_no).toLowerCase().includes(keyword) ||
        String(machine.description ?? '').toLowerCase().includes(keyword),
    )
  }, [orderedMachines, quickFilter])

  // disabledKeys에만 의존 → 셀 편집 시 cellData 변경에도 재계산 안 함
  const machineEnabledSources = useMemo(() => {
    const map = {}
    filteredMachines.forEach((machine) => {
      map[machine.machine_no] = sourceOrder.filter(
        (src) => !disabledKeys.has(`${machine.machine_no}:${src}`),
      )
    })
    return map
  }, [filteredMachines, sourceOrder, disabledKeys])

  /* columns를 memoize → 렌더마다 재생성 방지 */
  const columns = useMemo(() => {
    const result = []
    filteredMachines.forEach((machine) => {
      ;(machineEnabledSources[machine.machine_no] ?? []).forEach((sourceName) => {
        result.push({ machineNo: machine.machine_no, sourceName })
      })
    })
    return result
  }, [filteredMachines, machineEnabledSources])

  /* colIndexMap: O(1) 룩업 → columns.findIndex O(N) 반복 제거 */
  const colIndexMap = useMemo(() => {
    const map = {}
    columns.forEach(({ machineNo, sourceName }, i) => {
      map[`${machineNo}:${sourceName}`] = i
    })
    return map
  }, [columns])

  const dateRows = useMemo(
    () =>
      Array.from({ length: forecastDays + 1 }, (_, index) => {
        const next = dayjs().add(index, 'day')
        return { label: `${next.month() + 1}/${next.date()}`, daysAhead: index }
      }),
    [forecastDays],
  )

  const handleChange = useCallback((machineNo, sourceName, field, value) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: Number(value ?? 0) } }))
    setPendingKeys((prev) => new Set([...prev, key]))
  }, [])

  const handlePaste = useCallback((rowIndex, colIndex, text) => {
    const rows = text.replace(/\r/g, '').split('\n').filter((v) => v !== '')
    rows.forEach((rowText, ri) => {
      const targetRowIndex = rowIndex + ri
      if (targetRowIndex >= EDITABLE_ROWS.length) return
      const field = EDITABLE_ROWS[targetRowIndex][1]
      rowText.split('\t').forEach((val, ci) => {
        const targetColIndex = colIndex + ci
        if (targetColIndex >= columns.length) return
        const { machineNo, sourceName } = columns[targetColIndex]
        if (cellData[`${machineNo}:${sourceName}`]?.is_disabled) return
        const num = parseFloat(val.replace(/,/g, '').trim())
        if (Number.isFinite(num)) {
          handleChange(machineNo, sourceName, field, num)
        }
      })
    })
  }, [columns, cellData, handleChange])

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

  const handleCsvExport = useCallback(() => {
    const header = ['구분', ...columns.map(({ machineNo, sourceName }) => `${formatMachineLabel(machineNo)} ${sourceName}`)]
    const rows = []

    EDITABLE_ROWS.forEach(([label, field]) => {
      rows.push([
        label,
        ...columns.map(({ machineNo, sourceName }) => {
          const key = `${machineNo}:${sourceName}`
          return cellData[key]?.[field] ?? 0
        }),
      ])
    })

    dateRows.forEach(({ label, daysAhead }) => {
      rows.push([
        label,
        ...columns.map(({ machineNo, sourceName }) => {
          const key = `${machineNo}:${sourceName}`
          const cell = cellData[key] ?? {}
          const remaining = Number(cell.remaining ?? 0)
          const dailyUsage = Number(cell.daily_usage ?? 0)
          if (dailyUsage === 0) return '-'
          return Math.max(0, remaining - daysAhead * dailyUsage)
        }),
      ])
    })

    const escapeCsv = (value) => {
      const text = String(value ?? '')
      if (text.includes('"') || text.includes(',') || text.includes('\n')) return `"${text.replace(/"/g, '""')}"`
      return text
    }

    const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `source-remaining-${dayjs().format('YYYYMMDD-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success('CSV 저장 완료')
  }, [cellData, columns, dateRows])

  const handleCsvImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result.replace(/^\uFEFF/, '')
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
        if (lines.length < 2) throw new Error('CSV 데이터가 부족합니다.')

        const parseRow = (line) => {
          const result = []
          let inQuote = false
          let cur = ''
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
              if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
              else inQuote = !inQuote
            } else if (ch === ',' && !inQuote) {
              result.push(cur); cur = ''
            } else {
              cur += ch
            }
          }
          result.push(cur)
          return result
        }

        const header = parseRow(lines[0]).slice(1)
        const columnMap = {}
        header.forEach((label, i) => { columnMap[label.trim()] = i })

        let matched = 0
        const nextCellData = { ...cellData }
        const newPending = new Set(pendingKeys)

        for (let li = 1; li < lines.length; li++) {
          const cols = parseRow(lines[li])
          const rowLabel = cols[0]?.trim()
          const editableRow = EDITABLE_ROWS.find(([label]) => label === rowLabel)
          if (!editableRow) continue
          const field = editableRow[1]

          columns.forEach(({ machineNo, sourceName }) => {
            const colLabel = `${formatMachineLabel(machineNo)} ${sourceName}`
            const headerIdx = columnMap[colLabel]
            if (headerIdx == null) return
            const raw = cols[headerIdx + 1]?.replace(/,/g, '').trim()
            const num = parseFloat(raw)
            if (!Number.isFinite(num)) return
            const key = `${machineNo}:${sourceName}`
            nextCellData[key] = { ...nextCellData[key], [field]: num }
            newPending.add(key)
            matched++
          })
        }

        if (matched === 0) throw new Error('가져올 수 있는 데이터가 없습니다. 헤더가 일치하는지 확인하세요.')
        setCellData(nextCellData)
        setPendingKeys(newPending)
        message.success(`CSV 불러오기 완료 (${matched}개 셀 업데이트)`)
      } catch (err) {
        message.error(err.message || 'CSV 불러오기에 실패했습니다.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }, [cellData, columns, pendingKeys])

  const getTodayMinScrollTop = useCallback(() => {
    const row = todayRowRef.current
    if (!row) return 0
    return Math.max(0, row.offsetTop - STICKY_CONTENT_HEIGHT)
  }, [])

  const scrollToToday = useCallback(() => {
    const wrap = scrollWrapRef.current
    if (!wrap) return
    wrap.scrollTop = getTodayMinScrollTop()
  }, [getTodayMinScrollTop])

  const handleSheetScroll = useCallback(() => {
    if (!todayPinned) return
    const wrap = scrollWrapRef.current
    if (!wrap) return
    const minTop = getTodayMinScrollTop()
    if (wrap.scrollTop < minTop) {
      wrap.scrollTop = minTop
    }
  }, [getTodayMinScrollTop, todayPinned])

  const handleCellKeyDown = useCallback((e) => {
    const row = Number(e.currentTarget.dataset.gridRow)
    const col = Number(e.currentTarget.dataset.gridCol)
    if (e.key === 'ArrowUp')                             { e.preventDefault(); navigateCell(row, col, -1,  0) }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); navigateCell(row, col,  1,  0) }
    else if (e.key === 'ArrowLeft')                      { e.preventDefault(); navigateCell(row, col,  0, -1) }
    else if (e.key === 'ArrowRight')                     { e.preventDefault(); navigateCell(row, col,  0,  1) }
  }, [])

  useEffect(() => {
    if (todayPinned) scrollToToday()
  }, [todayPinned, scrollToToday])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <style>{`[data-grid-row]:focus{outline:2px solid rgba(59,130,246,0.75)!important;outline-offset:-2px;}`}</style>
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

      <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(245,158,11,0.14)' }}>
          <div style={{ color: 'var(--nowa-text-soft)', fontSize: 14, fontWeight: 700 }}>전체 설비 소스 입력</div>
          <Space wrap>
            <Button onClick={scrollToToday}>오늘</Button>
            <Space size={6}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>오늘 고정</span>
              <Switch size="small" checked={todayPinned} onChange={setTodayPinned} />
            </Space>
            <Input value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)} placeholder="호기 검색" style={{ width: 150 }} allowClear />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>예상 교체일 기준</span>
              <Select value={forecastDays} onChange={setForecastDays} style={{ width: 90 }} options={[30, 60, 90, 120, 150, 180].map((value) => ({ value, label: `${value}일` }))} />
            </div>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
            <input ref={csvImportRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
            <Button icon={<UploadOutlined />} onClick={() => csvImportRef.current?.click()} disabled={columns.length === 0}>CSV 불러오기</Button>
            <Button icon={<DownloadOutlined />} onClick={handleCsvExport} disabled={columns.length === 0}>CSV 저장</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={pendingKeys.size === 0}>전체 저장</Button>
          </Space>
        </div>
        <div style={{ padding: '0 2px 12px', color: 'var(--nowa-text-muted)', fontSize: 13 }}>
          비활성 소스는 사선 처리되며 계산과 현황판에서 제외됩니다. 활성화 설정은 설비 구성 탭에서 변경하세요.
        </div>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
            <Spin>
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>잔량기입 데이터를 불러오는 중입니다.</div>
            </Spin>
          </div>
        ) : (
          <div ref={scrollWrapRef} onScroll={handleSheetScroll} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.14)' }}>
            <table
              style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 14, background: BG_DEEPER }}
              onFocus={(e) => {
                const el = e.target.closest('[data-grid-row]') ?? (e.target.dataset?.gridRow != null ? e.target : null)
                const row = el?.dataset.gridRow; const col = el?.dataset.gridCol
                if (row != null && col != null) setFocusedCell({ row: Number(row), col: Number(col) })
              }}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusedCell(null) }}
            >
              <colgroup>
                <col style={{ width: 80 }} />
                {columns.map(({ machineNo, sourceName }) => (
                  <col key={`${machineNo}:${sourceName}`} style={{ width: 96 }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ position: 'sticky', top: HEADER_TOP_1, left: 0, zIndex: 8, background: BG_ALT, color: 'var(--nowa-text-muted)', border: BORDER, height: 72, fontSize: 14, fontWeight: 700 }}>구분</th>
                  {filteredMachines.map((machine, mi) => {
                    const enabled = machineEnabledSources[machine.machine_no] ?? []
                    if (enabled.length === 0) return null
                    const gc = getGroupColor(machineGroupMap[machine.machine_no])
                    const colStart = colIndexMap[`${machine.machine_no}:${enabled[0]}`] ?? -1
                    const colEnd = colStart + enabled.length - 1
                    const activeInMachine = focusedCell != null && focusedCell.col >= colStart && focusedCell.col <= colEnd
                    return (
                      <th key={machine.machine_no} colSpan={enabled.length} style={{ ...th1Base, background: activeInMachine ? `linear-gradient(rgba(34,211,238,0.12),rgba(34,211,238,0.12)),${th1Base.background}` : th1Base.background }}>
                        {mi > 0 && <GroupDivider />}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#fbbf24', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{formatMachineLabel(machine.machine_no)}</span>
                          {gc ? (
                            <span style={{ fontSize: 12, fontWeight: 800, color: gc.text, background: gc.bg, border: `1px solid ${gc.border}`, borderRadius: 6, padding: '0 10px', lineHeight: '22px', minHeight: 22 }}>
                              {machineGroupMap[machine.machine_no]}
                            </span>
                          ) : null}
                        </div>
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  {filteredMachines.map((machine, mi) =>
                    (machineEnabledSources[machine.machine_no] ?? []).map((sourceName, index) => {
                      const palette = getSourceColor(sourceOrder.indexOf(sourceName))
                      const colIndex = colIndexMap[`${machine.machine_no}:${sourceName}`] ?? -1
                      const isColFocused = focusedCell?.col === colIndex
                      return (
                        <th key={`${machine.machine_no}:${sourceName}:head`} style={{ ...th2Base, color: isColFocused ? '#22d3ee' : palette.main, background: isColFocused ? `linear-gradient(rgba(34,211,238,0.18),rgba(34,211,238,0.18)),${th2Base.background}` : th2Base.background, fontWeight: 700 }}>
                          {index === 0 && mi > 0 && <GroupDivider />}
                          {sourceName}
                        </th>
                      )
                    }),
                  )}
                </tr>
              </thead>
              <tbody>
                {/* 일사용량 / 잔량 sticky 행 */}
                {EDITABLE_ROWS.map(([label, field, color, bg, top, readOnly], rowIndex) => {
                  const isRowFocused = focusedCell?.row === rowIndex
                  return (
                  <tr key={field}>
                    <td style={{ ...tdLabelBase, position: 'sticky', top, left: 0, zIndex: 4, background: isRowFocused ? '#1a3a42' : bg, color: isRowFocused ? '#22d3ee' : color, borderRight: BORDER }}>
                      {label}
                    </td>
                    {filteredMachines.map((machine, machineIndex) =>
                      (machineEnabledSources[machine.machine_no] ?? []).map((sourceName, sourceIndex) => {
                        const key = `${machine.machine_no}:${sourceName}`
                        const colIndex = colIndexMap[key] ?? 0
                        return (
                          <td
                            key={`${key}:${field}`}
                            tabIndex={readOnly ? 0 : undefined}
                            data-grid-row={readOnly ? rowIndex : undefined}
                            data-grid-col={readOnly ? colIndex : undefined}
                            onKeyDown={readOnly ? handleCellKeyDown : undefined}
                            style={{
                              position: 'sticky',
                              top,
                              background: disabledKeys.has(key) ? getHatchBackground(bg) : bg,
                              border: BORDER,
                              height: 30,
                              zIndex: 3,
                              padding: readOnly ? '0 6px' : 0,
                              textAlign: readOnly ? 'right' : undefined,
                              color: readOnly ? color : undefined,
                              outline: 'none',
                            }}
                          >
                            {sourceIndex === 0 && machineIndex > 0 && <GroupDivider />}

                            {readOnly ? (
                              fmt(cellData[key]?.[field] ?? 0)
                            ) : (
                              <EditField
                                value={cellData[key]?.[field] ?? 0}
                                color={color}
                                bg={bg}

                                disabled={disabledKeys.has(key)}
                                onChange={(value) => handleChange(machine.machine_no, sourceName, field, value)}
                                onPaste={(text) => handlePaste(rowIndex, colIndex, text)}
                                numericOnly
                                gridRow={rowIndex}
                                gridCol={colIndex}
                              />
                            )}
                          </td>
                        )
                      }),
                    )}
                  </tr>
                )})}

                {/* 날짜 행 */}
                {dateRows.map(({ label, daysAhead }, rowIndex) => {
                  const isToday = daysAhead === 0
                  const rowBg = isToday ? TODAY_BG : (rowIndex % 2 === 0 ? BG_DEEP : BG_DEEPER)
                  const gridRow = EDITABLE_ROWS.length + rowIndex
                  const isRowFocused = focusedCell?.row === gridRow
                  return (
                    <tr key={label} ref={isToday ? todayRowRef : null} style={{ background: rowBg }}>
                      <td
                        style={{
                          ...tdLabelBase,
                          background: isRowFocused ? '#1a3a42' : rowBg,
                          color: isRowFocused ? '#22d3ee' : isToday ? TODAY_COLOR : 'var(--nowa-text-muted)',
                          borderRight: BORDER,
                          fontWeight: isToday ? 700 : 600,
                        }}
                      >
                        {label}
                      </td>
                      {filteredMachines.map((machine, machineIndex) =>
                        (machineEnabledSources[machine.machine_no] ?? []).map((sourceName, sourceIndex) => {
                          const key = `${machine.machine_no}:${sourceName}`
                          const colIndex = colIndexMap[key] ?? 0
                          // 오늘 행은 실시간 cellData, 나머지 projection은 deferredCellData (입력 반응성 우선)
                          const liveCell = cellData[key] ?? {}
                          const cell = isToday ? liveCell : (deferredCellData[key] ?? {})
                          const remaining = cell.remaining ?? 0
                          const dailyUsage = cell.daily_usage ?? 0
                          const projected = dailyUsage === 0 ? null : Math.max(0, remaining - daysAhead * dailyUsage)

                          if (isToday) {
                            return (
                              <td key={`${key}:${label}`} style={{ border: BORDER, position: 'relative', background: rowBg, height: 30, padding: 0 }}>
                                {sourceIndex === 0 && machineIndex > 0 && <GroupDivider />}
    
                                <EditField
                                  value={remaining}
                                  color={TODAY_COLOR}
                                  bg={rowBg}
  
                                  disabled={disabledKeys.has(key)}
                                  onChange={(value) => handleChange(machine.machine_no, sourceName, 'remaining', value)}
                                  onPaste={(text) => handlePaste(1, colIndex, text)}
                                  numericOnly
                                  gridRow={EDITABLE_ROWS.length + rowIndex}
                                  gridCol={colIndex}
                                />
                              </td>
                            )
                          }

                          const daysLeft = dailyUsage > 0 && projected != null ? projected / dailyUsage : Infinity
                          const projectionColor =
                            projected == null ? 'var(--nowa-text-muted)'
                            : projected <= 0 ? '#fda4af'
                            : daysLeft <= statusSettings.overdue_days ? '#fda4af'
                            : daysLeft <= statusSettings.urgent_days ? '#fbbf24'
                            : '#94a3b8'
                          const projectionBg =
                            projected == null || projected > 0 ? rowBg
                            : rowIndex % 2 === 0 ? 'rgba(190,24,93,0.16)' : 'rgba(190,24,93,0.12)'

                          return (
                            <td
                              key={`${key}:${label}`}
                              tabIndex={0}
                              data-grid-row={EDITABLE_ROWS.length + rowIndex}
                              data-grid-col={colIndex}
                              onKeyDown={handleCellKeyDown}
                              style={{ border: BORDER, position: 'relative', background: projectionBg, color: projectionColor, textAlign: 'right', paddingRight: 6, height: 30, outline: 'none' }}
                            >
                              {sourceIndex === 0 && machineIndex > 0 && <GroupDivider />}
  
                              {projected == null ? '-' : fmt(projected)}
                            </td>
                          )
                        }),
                      )}
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
