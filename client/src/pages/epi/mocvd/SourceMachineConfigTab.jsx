import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Space, Spin } from 'antd'
import { CheckOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getSourceColor } from './sourceColors'

const BORDER = '1px solid rgba(45,122,170,0.2)'

export default function SourceMachineConfigTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [machineOrder, setMachineOrder] = useState([])
  const [sourceNames, setSourceNames] = useState([])
  const [cellData, setCellData] = useState({})
  const [pendingKeys, setPendingKeys] = useState(new Set())
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const dragIdx = useRef(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/mocvd/sources/all')
      .then((res) => (res.ok ? res.json() : res.json().then((json) => Promise.reject(json.detail || res.status))))
      .then((json) => {
        const rows = json.rows ?? []
        const names = json.source_names ?? []
        const newMachines = rows.map((row) => ({ machine_no: row.machine_no, description: row.description }))
        setMachines(newMachines)
        setMachineOrder(rows.map((row) => row.machine_no))
        setSourceNames(names)
        const nextCellData = {}
        rows.forEach((row) => {
          names.forEach((name) => {
            const key = `${row.machine_no}:${name}`
            nextCellData[key] = { is_disabled: Boolean(row[`${name}_is_disabled`] ?? false) }
          })
        })
        setCellData(nextCellData)
        setPendingKeys(new Set())
      })
      .catch((err) => setError(typeof err === 'string' ? err : '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggle = (machineNo, sourceName) => {
    const key = `${machineNo}:${sourceName}`
    setCellData((prev) => ({ ...prev, [key]: { ...prev[key], is_disabled: !prev[key]?.is_disabled } }))
    setPendingKeys((prev) => new Set([...prev, key]))
  }

  const handleToggleAll = (sourceName) => {
    const allEnabled = machines.every((m) => !cellData[`${m.machine_no}:${sourceName}`]?.is_disabled)
    setCellData((prev) => {
      const next = { ...prev }
      machines.forEach((m) => {
        const key = `${m.machine_no}:${sourceName}`
        next[key] = { ...next[key], is_disabled: allEnabled }
      })
      return next
    })
    setPendingKeys((prev) => {
      const next = new Set(prev)
      machines.forEach((m) => next.add(`${m.machine_no}:${sourceName}`))
      return next
    })
  }

  const handleToggleAllGlobal = () => {
    const allEnabled = machines.every((m) => sourceNames.every((name) => !cellData[`${m.machine_no}:${name}`]?.is_disabled))
    setCellData((prev) => {
      const next = { ...prev }
      machines.forEach((m) => {
        sourceNames.forEach((name) => {
          const key = `${m.machine_no}:${name}`
          next[key] = { ...next[key], is_disabled: allEnabled }
        })
      })
      return next
    })
    setPendingKeys((prev) => {
      const next = new Set(prev)
      machines.forEach((m) => sourceNames.forEach((name) => next.add(`${m.machine_no}:${name}`)))
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const orderPayload = machineOrder.map((machine_no, order_idx) => ({ machine_no, order_idx }))
      const orderRes = await authFetch('/api/mocvd/machines/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const orderJson = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok) throw new Error(orderJson.detail || '설비 순서 저장에 실패했습니다.')

      const changes = Object.entries(cellData).map(([key, cell]) => {
        const colonIndex = key.indexOf(':')
        const machine_no = Number(key.slice(0, colonIndex))
        const source_name = key.slice(colonIndex + 1)
        return { machine_no, source_name, is_disabled: Boolean(cell.is_disabled), unit: 'kg' }
      })
      const res = await authFetch('/api/mocvd/sources/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '저장에 실패했습니다.')
      fetchData()
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <Spin tip="설비 구성 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {error ? <Alert type="error" message={error} /> : null}

      <Card
        className="nowa-card"
        style={{ maxWidth: 1280 }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(245,158,11,0.14)' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
          <Button icon={<CheckOutlined />} onClick={handleToggleAllGlobal}>
            {machines.every((m) => sourceNames.every((name) => !cellData[`${m.machine_no}:${name}`]?.is_disabled)) ? '전체 해제' : '전체 선택'}
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>저장</Button>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', borderRadius: 12, border: '1px solid rgba(45,122,170,0.18)' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', fontSize: 13 }}>
            <colgroup>
              <col style={{ width: 110 }} />
              {sourceNames.map((name) => <col key={name} style={{ width: 88 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', top: 0, left: 0, zIndex: 4,
                  background: '#171b26', border: BORDER,
                  height: 40, padding: '0 10px',
                  color: 'rgba(196,210,226,0.5)', fontSize: 12, fontWeight: 600, textAlign: 'center',
                }}>
                  설비 / 소스
                </th>
                {sourceNames.map((name, si) => {
                  const sc = getSourceColor(si)
                  const allEnabled = machines.every((m) => !cellData[`${m.machine_no}:${name}`]?.is_disabled)
                  return (
                    <th
                      key={name}
                      onClick={() => handleToggleAll(name)}
                      style={{
                        position: 'sticky', top: 0, zIndex: 3,
                        background: '#171b26', border: BORDER,
                        height: 40, padding: '0 6px',
                        color: sc.main, fontWeight: 700, fontSize: 13, textAlign: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = sc.bg }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#171b26' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>{name}</span>
                        <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 400 }}>{allEnabled ? '전체 ON' : '일부 OFF'}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {machineOrder.map((no) => machines.find((m) => m.machine_no === no)).filter(Boolean).map((machine, rowIdx) => {
                const isOver = dragOverIdx === rowIdx
                return (
                <tr
                  key={machine.machine_no}
                  draggable
                  onDragStart={() => { dragIdx.current = rowIdx }}
                  onDragEnter={() => setDragOverIdx(rowIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null) }}
                  onDrop={() => {
                    const from = dragIdx.current
                    if (from !== null && from !== rowIdx) {
                      setMachineOrder((prev) => {
                        const next = [...prev]
                        next.splice(rowIdx, 0, next.splice(from, 1)[0])
                        return next
                      })
                    }
                    dragIdx.current = null
                    setDragOverIdx(null)
                  }}
                  style={{ background: rowIdx % 2 === 0 ? '#131720' : '#0f1219', outline: isOver ? '2px solid #2d7aaa' : 'none', outlineOffset: -1 }}
                >
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    background: rowIdx % 2 === 0 ? '#171b26' : '#131720',
                    border: BORDER, padding: '0 6px 0 4px',
                    height: 34, color: '#fbbf24', fontWeight: 700, fontSize: 13,
                    whiteSpace: 'nowrap', textAlign: 'center',
                    cursor: 'grab', userSelect: 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ opacity: 0.3, fontSize: 10 }}>#</span>
                      {formatMachineLabel(machine.machine_no)}
                    </div>
                  </td>
                  {sourceNames.map((name, si) => {
                    const key = `${machine.machine_no}:${name}`
                    const enabled = !cellData[key]?.is_disabled
                    const pending = pendingKeys.has(key)
                    const sc = getSourceColor(si)
                    return (
                      <td
                        key={name}
                        onClick={() => handleToggle(machine.machine_no, name)}
                        style={{
                          border: BORDER,
                          height: 34,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          cursor: 'pointer',
                          background: enabled
                            ? pending ? `${sc.bg}` : sc.bg
                            : pending ? 'rgba(30,34,46,0.6)' : 'transparent',
                          transition: 'background 0.1s',
                          outline: pending ? `1px solid ${sc.glow}` : 'none',
                          outlineOffset: -1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = enabled ? sc.bg : 'rgba(45,122,170,0.07)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = enabled ? sc.bg : 'transparent' }}
                      >
                        {enabled ? (
                          <CheckOutlined style={{ color: sc.main, fontSize: 13 }} />
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
