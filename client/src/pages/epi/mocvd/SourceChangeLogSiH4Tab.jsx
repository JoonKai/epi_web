import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Space } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { panelStyle } from '../../../theme/consoleTheme'
import SiH4GasCabinetLayout from './SiH4GasCabinetLayout'
import SiH4SpreadsheetGrid  from './SiH4SpreadsheetGrid'

const EMPTY_ROW = () => ({
  id:           null,
  install_date:  '',
  removal_date:  '',
  cabinet_no:    '',
  gas_name:      'SiH4',
  slot:          'A',
  cylinder_no:   '',
  worker_name:   '',
  note:          '',
})

export default function SourceChangeLogSiH4Tab() {
  const [loading, setLoading] = useState(false)
  const [rows,    setRows]    = useState([EMPTY_ROW()])

  // ── 데이터 로드 ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await authFetch('/api/mocvd/sih4-change-logs')
      const json = await res.json().catch(() => null)
      setRows(Array.isArray(json) && json.length > 0 ? json : [EMPTY_ROW()])
    } catch {
      setRows([EMPTY_ROW()])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── 행 변경 (인셀 편집 / 드래그 채우기) ─────────────────────
  const handleRowsChange = useCallback((newRows) => {
    setRows(newRows)
    // 변경된 행 백엔드 저장 (id 있는 행만 PUT, 없으면 POST)
    newRows.forEach(async (row) => {
      if (!row._dirty) return
      try {
        const url    = row.id ? `/api/mocvd/sih4-change-logs/${row.id}` : '/api/mocvd/sih4-change-logs'
        const method = row.id ? 'PUT' : 'POST'
        await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
      } catch {
        // silent
      }
    })
  }, [])

  // ── 행 추가 ──────────────────────────────────────────────────
  const addRow = () => setRows((prev) => [...prev, EMPTY_ROW()])

  // ── 행 삭제 ──────────────────────────────────────────────────
  const deleteRow = useCallback(async (rowIndex) => {
    const row = rows[rowIndex]
    if (row?.id) {
      try {
        await authFetch(`/api/mocvd/sih4-change-logs/${row.id}`, { method: 'DELETE' })
      } catch {
        // silent
      }
    }
    setRows((prev) => prev.length <= 1 ? [EMPTY_ROW()] : prev.filter((_, i) => i !== rowIndex))
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <Card
        className="console-panel"
        style={{ ...panelStyle }}
        styles={{ body: { padding: 0 } }}
        title="SiH4 관리 대장"
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>
              행 추가
            </Button>
          </Space>
        )}
      >
        {/* 가스 캐비닛 배치도 */}
        <div style={{ padding: '14px 16px 0' }}>
          <SiH4GasCabinetLayout />
        </div>

        {/* 스프레드시트 그리드 */}
        <div style={{ padding: '12px 0 0' }}>
          <SiH4SpreadsheetGrid
            rows={rows}
            onRowsChange={handleRowsChange}
            onDelete={deleteRow}
          />
        </div>
      </Card>
    </div>
  )
}
