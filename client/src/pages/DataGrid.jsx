import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Select, Space, Spin, Tag, Tooltip } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { authFetch } from '../context/AuthContext'
import { panelStyle, sectionTitleStyle } from '../theme/consoleTheme'
import { formatMachineLabel } from './epi/mocvd/machineLabel'

function remainingCellStyle(params) {
  const value = params.value
  if (value == null) return { color: 'rgba(163,184,217,0.48)' }
  if (value === 0) return { color: '#ff5b6e', fontWeight: 700, background: 'rgba(255,91,110,0.08)' }
  if (value < 1) return { color: '#ffb648', fontWeight: 700, background: 'rgba(255,182,72,0.08)' }
  if (value < 3) return { color: '#ffd166', fontWeight: 600 }
  return { color: '#35d07f' }
}

function remainingFormatter(params) {
  if (params.value == null) return '-'
  return params.value.toFixed(2)
}

export default function DataGrid() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sourceNames, setSourceNames] = useState([])
  const [rows, setRows] = useState([])
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const gridRef = useRef(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/mocvd/sources/all')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setSourceNames(data.source_names ?? [])
        setRows(data.rows ?? [])
      })
      .catch((err) => setError(`데이터 로딩 실패: ${err}`))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const columnDefs = useMemo(() => {
    const fixedColumns = [
      {
        headerName: '호기',
        field: 'machine_no',
        width: 130,
        pinned: 'left',
        cellStyle: { fontWeight: 700, textAlign: 'center' },
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => formatMachineLabel(params.value),
      },
      { headerName: '설명', field: 'description', width: 160, pinned: 'left', filter: 'agTextColumnFilter' },
      { headerName: '최종 입력', field: 'updated_at', width: 160, filter: 'agTextColumnFilter', cellStyle: { color: 'rgba(220,232,255,0.72)', fontSize: 12 } },
    ]

    const sourceColumns = sourceNames.map((name) => ({
      headerName: name,
      field: name,
      width: 110,
      valueFormatter: remainingFormatter,
      cellStyle: remainingCellStyle,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
    }))

    return [...fixedColumns, ...sourceColumns]
  }, [sourceNames])

  const filteredRows = useMemo(() => {
    if (selectedSource === 'all') return rows
    return rows.filter((row) => row[selectedSource] != null)
  }, [rows, selectedSource])

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, filter: true, floatingFilter: true }), [])

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `mocvd_source_${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

  const summary = useMemo(() => sourceNames.map((name) => {
    const values = rows.map((row) => row[name]).filter((value) => value != null && !Number.isNaN(value))
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    const low = values.filter((value) => value < 1).length
    return { name, avg, low, total: values.length }
  }), [sourceNames, rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="console-toolbar">
        <div>
          <div style={sectionTitleStyle}>데이터 조회</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, marginTop: 8 }}>MOCVD 소스 현황</div>
          <div style={{ color: 'rgba(220,232,255,0.72)', marginTop: 6 }}>호기별 소스 잔량을 필터링하고 부족 자재를 빠르게 확인하는 화면</div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">{filteredRows.length}대</div>
          <div className="console-pill">{sourceNames.length}종류</div>
        </div>
      </div>

      {!loading && !error && (
        <div className="console-toolbar-group">
          {summary.map((item) => (
            <Tooltip key={item.name} title={`평균: ${item.avg.toFixed(2)} kg | 부족 장비: ${item.low}대`}>
              <Tag color={item.low > 0 ? 'error' : item.avg < 3 ? 'warning' : 'success'} style={{ cursor: 'pointer' }} onClick={() => setSelectedSource((prev) => (prev === item.name ? 'all' : item.name))}>
                {item.name}: {item.avg.toFixed(1)} kg
              </Tag>
            </Tooltip>
          ))}
        </div>
      )}

      <Card
        className="console-panel"
        style={{ ...panelStyle, minHeight: 0 }}
        styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
        title="소스 재고 표"
        extra={
          <Space wrap>
            <Select value={selectedSource} onChange={setSelectedSource} style={{ width: 180 }} options={[{ value: 'all', label: '전체 설비' }, ...sourceNames.map((name) => ({ value: name, label: name }))]} />
            <input value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} placeholder="검색" style={{ width: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--console-shell-border)', background: 'var(--console-button-bg)', color: 'var(--console-text)', outline: 'none' }} />
            <Button className="console-button" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
            <Button className="console-button" icon={<DownloadOutlined />} onClick={exportCsv}>CSV 내보내기</Button>
          </Space>
        }
      >
        {error && <Alert type="error" message={error} style={{ margin: 10 }} />}
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
            <Spin tip="데이터를 불러오는 중입니다." />
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ flex: 1, height: 'calc(100vh - 340px)', minHeight: 360 }}>
            <AgGridReact ref={gridRef} rowData={filteredRows} columnDefs={columnDefs} defaultColDef={defaultColDef} quickFilterText={quickFilter} animateRows pagination paginationPageSize={50} paginationPageSizeSelector={[25, 50, 100, 200]} rowHeight={38} headerHeight={42} floatingFiltersHeight={36} enableCellTextSelection />
          </div>
        )}
      </Card>
    </div>
  )
}
