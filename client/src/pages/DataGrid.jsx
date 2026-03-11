import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Card, Space, Button, Select, Tag, theme, Spin, Alert, Tooltip } from 'antd'
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { authFetch } from '../context/AuthContext'

// 잔량에 따라 셀 색상 지정 (0이면 회색, 낮으면 빨강, 높으면 초록)
function remainingCellStyle(params) {
  const v = params.value
  if (v == null) return { background: 'rgba(0,0,0,0.04)', color: '#aaa' }
  if (v === 0)  return { background: '#fff1f0', color: '#ff4d4f', fontWeight: 600 }
  if (v < 1)    return { background: '#fff7e6', color: '#fa8c16', fontWeight: 600 }
  if (v < 3)    return { background: '#fffbe6', color: '#faad14' }
  return { color: '#389e0d' }
}

function remainingFormatter(params) {
  if (params.value == null) return '-'
  return params.value.toFixed(2)
}

// updated_at 컬럼 포매터
function dateFormatter(params) {
  if (!params.value) return '-'
  return params.value
}

export default function DataGrid() {
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [sourceNames, setSourceNames] = useState([])
  const [rows, setRows]             = useState([])
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const gridRef                     = useRef(null)
  const { token }                   = theme.useToken()

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/mocvd/sources/all')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setSourceNames(d.source_names ?? [])
        setRows(d.rows ?? [])
      })
      .catch(e => setError(`데이터 로드 실패: ${e}`))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // 컬럼 정의 동적 생성
  const columnDefs = useMemo(() => {
    const fixed = [
      {
        headerName: '호기',
        field: 'machine_no',
        width: 80,
        pinned: 'left',
        cellStyle: { fontWeight: 700, textAlign: 'center' },
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: '설명',
        field: 'description',
        width: 140,
        pinned: 'left',
        filter: 'agTextColumnFilter',
      },
      {
        headerName: '최종 입력',
        field: 'updated_at',
        width: 150,
        valueFormatter: dateFormatter,
        filter: 'agTextColumnFilter',
        cellStyle: { color: token.colorTextSecondary, fontSize: 12 },
      },
    ]

    const sourceCols = sourceNames.map(name => ({
      headerName: name,
      field: name,
      width: 110,
      valueFormatter: remainingFormatter,
      cellStyle: remainingCellStyle,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
      headerTooltip: name,
    }))

    return [...fixed, ...sourceCols]
  }, [sourceNames, token])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    suppressMovable: false,
  }), [])

  // 선택한 소스에 따라 행 필터
  const filteredRows = useMemo(() => {
    if (selectedSource === 'all') return rows
    return rows.filter(r => r[selectedSource] != null)
  }, [rows, selectedSource])

  // CSV 내보내기
  const exportCsv = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `mocvd_source_${new Date().toISOString().slice(0, 10)}.csv`,
      })
    }
  }

  // 소스별 평균 잔량 계산 (요약)
  const summary = useMemo(() => {
    return sourceNames.map(name => {
      const vals = rows.map(r => r[name]).filter(v => v != null && !isNaN(v))
      const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      const low  = vals.filter(v => v < 1).length
      return { name, avg, low, total: vals.length }
    })
  }, [sourceNames, rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>소스 잔량 현황</h2>
        <span style={{ fontSize: 13, opacity: 0.6 }}>전 MOCVD 호기 소스 잔량 조회</span>
      </div>

      {/* 소스별 요약 태그 */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {summary.map(s => (
            <Tooltip key={s.name} title={`평균: ${s.avg.toFixed(2)} kg  |  부족(< 1 kg): ${s.low}대`}>
              <Tag
                color={s.low > 0 ? 'error' : s.avg < 3 ? 'warning' : 'success'}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSelectedSource(prev => prev === s.name ? 'all' : s.name)}
              >
                {s.name}: {s.avg.toFixed(1)} kg {s.low > 0 ? `⚠ ${s.low}대 부족` : ''}
              </Tag>
            </Tooltip>
          ))}
        </div>
      )}

      {/* 데이터 그리드 */}
      <Card
        size="small"
        style={{ flex: 1, borderRadius: 8, minHeight: 0 }}
        styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
        title={
          <Space>
            <span>MOCVD 소스 잔량</span>
            {!loading && <Tag color="blue">{filteredRows.length} 호기</Tag>}
            {!loading && <Tag color="purple">{sourceNames.length} 소스</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedSource}
              onChange={setSelectedSource}
              size="small"
              style={{ width: 160 }}
              options={[
                { value: 'all', label: '전체 호기' },
                ...sourceNames.map(n => ({ value: n, label: n })),
              ]}
            />
            <input
              placeholder="검색..."
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                border: `1px solid ${token.colorBorder}`,
                background: token.colorBgContainer,
                color: token.colorText,
                fontSize: 13,
                width: 160,
                outline: 'none',
              }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>
              CSV 내보내기
            </Button>
          </Space>
        }
      >
        {error && <Alert type="error" message={error} style={{ margin: 8 }} />}

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <Spin tip="로딩 중..." />
          </div>
        ) : (
          <div
            className="ag-theme-quartz"
            style={{
              flex: 1,
              height: 'calc(100vh - 300px)',
              minHeight: 300,
              '--ag-font-family': 'inherit',
              '--ag-font-size': '13px',
            }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={filteredRows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilter}
              animateRows
              pagination
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              rowHeight={36}
              headerHeight={40}
              floatingFiltersHeight={36}
              suppressCellFocus={false}
              enableCellTextSelection
            />
          </div>
        )}
      </Card>
    </div>
  )
}
