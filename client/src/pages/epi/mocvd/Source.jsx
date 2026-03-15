import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Input, Space, Spin, Tabs } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import SourceStatusBoard from './SourceStatusBoard'
import SourceMachineBoard from './SourceMachineBoard'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

// ─── 스타일 상수 ───────────────────────────────────────────────
const LABEL_W = 72
const CELL_W  = 78
const ROW_H   = 30
const HEAD1_H = 36
const HEAD2_H = 26
const BASE_BG = '#0d1420'
const BORDER  = '1px solid #1e2a3c'
const GROUP_BORDER = '2px solid #2d4060'

const th1Base = {
  position: 'sticky',
  top: 0,
  background: '#111827',
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
  background: '#0f172a',
  border: BORDER,
  padding: '0 3px',
  textAlign: 'center',
  fontSize: 10,
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
  fontSize: 12,
  textAlign: 'center',
}
const tdCellBase = {
  border: BORDER,
  padding: 0,
  height: ROW_H,
  verticalAlign: 'middle',
}

// ─── 숫자 포맷 ─────────────────────────────────────────────────
function fmt(v) {
  if (v == null || Number.isNaN(v)) return '-'
  if (v >= 10000) return (v / 1000).toFixed(1) + 'k'
  if (v >= 1000)  return v.toFixed(0)
  if (v >= 100)   return v.toFixed(1)
  return v.toFixed(2)
}

// ─── 인라인 수정 가능한 셀 ─────────────────────────────────────
function EditCell({ value, onChange, color, bg, pending }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState(String(value ?? 0))
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) setLocal(String(value ?? 0))
  }, [value, editing])

  const commit = () => {
    const num = parseFloat(local)
    if (!Number.isNaN(num)) onChange(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
        style={{
          width: '100%',
          height: ROW_H - 2,
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid #6366f1',
          color: color ?? '#e2e8f0',
          fontSize: 11,
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
      onClick={() => setEditing(true)}
      style={{
        width: '100%',
        height: ROW_H - 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 5,
        cursor: 'text',
        color: color ?? '#e2e8f0',
        fontSize: 11,
        background: pending ? 'rgba(99,102,241,0.10)' : (bg ?? 'transparent'),
        userSelect: 'none',
      }}
    >
      {fmt(Number(value ?? 0))}
    </div>
  )
}

// ─── 엑셀 테이블 ───────────────────────────────────────────────
function ExcelTable({ machines, sourceNames, cellData, dateRows, pendingKeys, onChange }) {
  const colCount = machines.length * sourceNames.length

  if (colCount === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>데이터가 없습니다.</div>
  )

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)', position: 'relative' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 12 }}>
        <colgroup>
          <col style={{ width: LABEL_W, minWidth: LABEL_W }} />
          {machines.map(m => sourceNames.map(s => (
            <col key={`${m.machine_no}:${s}`} style={{ width: CELL_W, minWidth: CELL_W }} />
          )))}
        </colgroup>

        <thead>
          {/* ── 호기 번호 행 ── */}
          <tr>
            <th
              style={{
                ...th1Base,
                left: 0,
                zIndex: 12,
                background: '#0d1420',
                width: LABEL_W,
                rowSpan: 2,
                fontSize: 11,
                color: '#64748b',
              }}
              rowSpan={2}
            >
              구분
            </th>
            {machines.map(m => (
              <th
                key={m.machine_no}
                colSpan={sourceNames.length}
                style={{
                  ...th1Base,
                  borderLeft: GROUP_BORDER,
                  color: '#a5b4fc',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: 1,
                }}
              >
                {m.machine_no}
              </th>
            ))}
          </tr>

          {/* ── 소스명 행 ── */}
          <tr>
            {machines.map(m => sourceNames.map((s, si) => (
              <th
                key={`${m.machine_no}:${s}`}
                style={{
                  ...th2Base,
                  borderLeft: si === 0 ? GROUP_BORDER : BORDER,
                  color: '#94a3b8',
                }}
              >
                {s}
              </th>
            )))}
          </tr>
        </thead>

        <tbody>
          {/* ── 일사용량 행 ── */}
          <tr>
            <td style={{ ...tdLabelBase, background: '#1c1400', color: '#fbbf24', borderRight: GROUP_BORDER }}>
              일사용량
            </td>
            {machines.map(m => sourceNames.map((s, si) => {
              const key = `${m.machine_no}:${s}`
              return (
                <td key={key} style={{ ...tdCellBase, borderLeft: si === 0 ? GROUP_BORDER : BORDER, background: '#110d00' }}>
                  <EditCell
                    value={cellData[key]?.daily_usage ?? 0}
                    color="#fbbf24"
                    bg="#110d00"
                    pending={pendingKeys.has(key)}
                    onChange={v => onChange(m.machine_no, s, 'daily_usage', v)}
                  />
                </td>
              )
            }))}
          </tr>

          {/* ── 잔량 행 ── */}
          <tr>
            <td style={{ ...tdLabelBase, background: '#0c1a0c', color: '#86efac', borderRight: GROUP_BORDER }}>
              잔량
            </td>
            {machines.map(m => sourceNames.map((s, si) => {
              const key = `${m.machine_no}:${s}`
              return (
                <td key={key} style={{ ...tdCellBase, borderLeft: si === 0 ? GROUP_BORDER : BORDER, background: '#070f07' }}>
                  <EditCell
                    value={cellData[key]?.remaining ?? 0}
                    color="#86efac"
                    bg="#070f07"
                    pending={pendingKeys.has(key)}
                    onChange={v => onChange(m.machine_no, s, 'remaining', v)}
                  />
                </td>
              )
            }))}
          </tr>

          {/* ── 날짜별 예측 행 ── */}
          {dateRows.map(({ label, daysAhead }, ri) => (
            <tr key={label} style={{ background: ri % 2 === 0 ? BASE_BG : '#0a1120' }}>
              <td style={{ ...tdLabelBase, background: ri % 2 === 0 ? BASE_BG : '#0a1120', color: '#64748b', borderRight: GROUP_BORDER }}>
                {label}
              </td>
              {machines.map(m => sourceNames.map((s, si) => {
                const key = `${m.machine_no}:${s}`
                const remaining = cellData[key]?.remaining ?? 0
                const daily     = cellData[key]?.daily_usage ?? 0
                const projected = daily === 0 ? null : Math.max(0, remaining - daysAhead * daily)
                const isCritical = projected !== null && projected <= 0
                const isLow      = projected !== null && projected > 0 && remaining > 0 && projected < remaining * 0.15

                return (
                  <td
                    key={key}
                    style={{
                      ...tdCellBase,
                      borderLeft: si === 0 ? GROUP_BORDER : BORDER,
                      background: isCritical ? 'rgba(239,68,68,0.12)' : isLow ? 'rgba(251,191,36,0.07)' : undefined,
                      color: isCritical ? '#f87171' : isLow ? '#fbbf24' : '#475569',
                      textAlign: 'right',
                      paddingRight: 5,
                      fontSize: 11,
                    }}
                  >
                    {projected === null ? '-' : fmt(projected)}
                  </td>
                )
              }))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 수기 입력 탭 ──────────────────────────────────────────────
function SourceInputTab() {
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState(null)
  const [machines,       setMachines]       = useState([])
  const [sourceNames,    setSourceNames]    = useState([])
  const [cellData,       setCellData]       = useState({})
  const [pendingKeys,    setPendingKeys]    = useState(new Set())
  const [quickFilter,    setQuickFilter]    = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/mocvd/sources/all')
      .then(res => res.ok ? res.json() : res.json().then(j => Promise.reject(j.detail || res.status)))
      .then(json => {
        const rows  = json.rows ?? []
        const names = json.source_names ?? []
        setMachines(rows.map(r => ({ machine_no: r.machine_no, description: r.description })))
        setSourceNames(names)
        const data = {}
        rows.forEach(row => {
          names.forEach(name => {
            const key = `${row.machine_no}:${name}`
            data[key] = {
              remaining:   row[name] ?? 0,
              daily_usage: row[`${name}_daily_usage`] ?? 0,
            }
          })
        })
        setCellData(data)
        setPendingKeys(new Set())
      })
      .catch(err => setError(typeof err === 'string' ? err : '전체 소스 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChange = useCallback((machineNo, sourceName, field, value) => {
    const key = `${machineNo}:${sourceName}`
    setCellData(prev => ({ ...prev, [key]: { ...prev[key], [field]: Number(value ?? 0) } }))
    setPendingKeys(prev => new Set([...prev, key]))
  }, [])

  const handleSave = async () => {
    if (pendingKeys.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const changes = [...pendingKeys].map(key => {
        const colonIdx   = key.indexOf(':')
        const machine_no = Number(key.slice(0, colonIdx))
        const source_name = key.slice(colonIdx + 1)
        const cell = cellData[key] ?? {}
        return { machine_no, source_name, remaining: cell.remaining ?? 0, daily_usage: cell.daily_usage ?? 0, unit: 'kg' }
      })
      const res  = await authFetch('/api/mocvd/sources/all', {
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

  const filteredMachines = useMemo(() => {
    const kw = quickFilter.trim().toLowerCase()
    if (!kw) return machines
    return machines.filter(m =>
      String(m.machine_no).includes(kw) || `mo#${m.machine_no}호기`.includes(kw)
    )
  }, [machines, quickFilter])

  // 오늘부터 14일치 예측 날짜
  const dateRows = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i + 1)
      return { label: `${d.getMonth() + 1}/${d.getDate()}`, daysAhead: i + 1 }
    })
  }, [])

  const pendingCount = pendingKeys.size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <div className="console-toolbar">
        <div>
          <div style={sectionTitleStyle}>수기 입력</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            MOCVD 전체 소스 입력
          </div>
          <div style={{ color: 'rgba(220,232,255,0.72)', marginTop: 6 }}>
            일사용량과 잔량을 입력하면 아래에 일별 예상 잔량이 자동 계산됩니다.
          </div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">{machines.length}대</div>
          <div className="console-pill">{sourceNames.length}종류</div>
          <div className="console-pill" style={{ color: pendingCount > 0 ? '#c4b5fd' : undefined }}>
            변경 {pendingCount}건
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <Card
        className="console-panel"
        style={{ ...panelStyle, minHeight: 0, overflow: 'hidden' }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        title="전체 설비 소스 입력"
        extra={(
          <Space wrap>
            <Input
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
              placeholder="호기 검색"
              style={{ width: 150 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={pendingCount === 0}
            >
              전체 저장
            </Button>
          </Space>
        )}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 12 }}>
          셀을 클릭하면 바로 수정됩니다. 가로 스크롤로 전체 설비를 볼 수 있습니다.
          날짜 행은 일사용량 기준 잔량 예측입니다.
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
    </div>
  )
}

// ─── 탭 루트 ──────────────────────────────────────────────────
function Source() {
  return (
    <Tabs
      defaultActiveKey="status-board"
      items={[
        { key: 'status-board', label: '소스교체 현황판', children: <SourceStatusBoard /> },
        { key: 'machine-board', label: '설비별 소스현황', children: <SourceMachineBoard /> },
        { key: 'input', label: '소스 입력', children: <SourceInputTab /> },
      ]}
    />
  )
}

export default Source
