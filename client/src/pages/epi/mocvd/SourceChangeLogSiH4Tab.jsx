import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Space } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import SiH4GasCabinetLayout from './SiH4GasCabinetLayout'
import SiH4SpreadsheetGrid from './SiH4SpreadsheetGrid'

const EMPTY_ROW = () => ({
  id: null,
  install_date: '',
  removal_date: '',
  cabinet_no: '',
  gas_name: 'SiH4',
  slot: 'A',
  cylinder_no: '',
  worker_name: '',
  note: '',
})

export default function SourceChangeLogSiH4Tab() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([EMPTY_ROW()])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/sih4-change-logs')
      const json = await res.json().catch(() => null)
      setRows(Array.isArray(json) && json.length > 0 ? json : [EMPTY_ROW()])
    } catch {
      setRows([EMPTY_ROW()])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRowsChange = useCallback((newRows) => {
    setRows(newRows)
    newRows.forEach(async (row) => {
      if (!row._dirty) return
      try {
        const url = row.id ? `/api/mocvd/sih4-change-logs/${row.id}` : '/api/mocvd/sih4-change-logs'
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

  const addRow = () => setRows((prev) => [...prev, EMPTY_ROW()])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <Card className="nowa-card" style={{ maxWidth: 1480 }} styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: '1px solid var(--nowa-border)',
          }}
        >
          <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800 }}>SiH4 관리 대장</div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>
              작업 추가
            </Button>
          </Space>
        </div>

        <div style={{ minHeight: 620 }}>
          <div style={{ padding: '8px 0 0' }}>
            <SiH4GasCabinetLayout />
          </div>
          <div style={{ padding: '22px 0 0' }}>
            <SiH4SpreadsheetGrid rows={rows} onRowsChange={handleRowsChange} />
          </div>
        </div>
      </Card>
    </div>
  )
}
