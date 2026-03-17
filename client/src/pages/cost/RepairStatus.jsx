import { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Input, Select, Space, Spin } from 'antd'
import { BuildOutlined, CheckCircleOutlined, ClockCircleOutlined, ToolOutlined } from '@ant-design/icons'
import { authFetch } from '../../context/AuthContext'

const HEADER_HEIGHT = 42
const ROW_HEIGHT = 36
const BORDER = '1px solid rgba(99,102,241,0.18)'
const GROUP_BORDER = '2px solid rgba(99,102,241,0.28)'
const STICKY_BG = '#0f1629'
const CELL_BG = '#0b1323'
const ALT_BG = '#0d1629'

const columns = [
  { key: 'receiptType', label: '입고구분', width: 110, sticky: true },
  { key: 'repairStatus', label: '수리', width: 110 },
  { key: 'outboundDate', label: '반출일', width: 118 },
  { key: 'inboundDate', label: '입고일', width: 118 },
  { key: 'equipmentName', label: '설비명', width: 150 },
  { key: 'location', label: '위치', width: 90 },
  { key: 'chamber', label: '호기', width: 80 },
  { key: 'materialCode', label: '자재코드', width: 150 },
  { key: 'materialName', label: '자재명', width: 340 },
  { key: 'spec', label: '규격', width: 200 },
  { key: 'vendorName', label: '업체', width: 170 },
  { key: 'vendorCode', label: '업체코드', width: 120 },
  { key: 'repairReason', label: '수리사유', width: 280 },
]

function MetricCard({ icon, label, value, sub, accent, soft }) {
  return (
    <div className="nowa-metric-card" style={{ '--metric-accent': accent, '--metric-accent-soft': soft }}>
      <div className="nowa-metric-icon">{icon}</div>
      <div className="nowa-metric-label">{label}</div>
      <div className="nowa-metric-value">{value}</div>
      <div className="nowa-metric-sub">{sub}</div>
    </div>
  )
}

function getRowAccent(row) {
  if (row.receiptType === '입고예정') return 'rgba(250,204,21,0.18)'
  if (row.repairStatus === '완료') return 'rgba(34,197,94,0.12)'
  if (row.repairStatus === '무상수리') return 'rgba(59,130,246,0.12)'
  return 'transparent'
}

function getStatusColor(value) {
  if (value === '완료') return '#f87171'
  if (value === '진행') return '#f8fafc'
  if (value === '무상수리') return '#60a5fa'
  if (value === '입고예정') return '#facc15'
  return '#e2e8f0'
}

function RepairSheet({ rows }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 370px)', position: 'relative' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', minWidth: '100%', fontSize: 12 }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width, minWidth: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key}
                style={{
                  position: 'sticky',
                  top: 0,
                  left: column.sticky ? 0 : undefined,
                  zIndex: column.sticky ? 5 : 4,
                  height: HEADER_HEIGHT,
                  background: STICKY_BG,
                  color: '#e2e8f0',
                  border: BORDER,
                  borderLeft: index === 0 ? GROUP_BORDER : BORDER,
                  padding: '0 10px',
                  textAlign: 'center',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const baseBackground = rowIndex % 2 === 0 ? CELL_BG : ALT_BG
            const accent = getRowAccent(row)

            return (
              <tr key={row.key}>
                {columns.map((column, columnIndex) => {
                  const value = row[column.key] || '-'
                  const isSticky = column.sticky
                  const isStatusColumn = column.key === 'receiptType' || column.key === 'repairStatus'
                  const textColor = isStatusColumn ? getStatusColor(row[column.key]) : 'var(--nowa-text-soft)'

                  return (
                    <td
                      key={`${row.key}-${column.key}`}
                      style={{
                        position: isSticky ? 'sticky' : 'static',
                        left: isSticky ? 0 : undefined,
                        zIndex: isSticky ? 2 : 1,
                        height: ROW_HEIGHT,
                        background: accent !== 'transparent' ? `linear-gradient(90deg, ${accent} 0%, ${baseBackground} 100%)` : baseBackground,
                        color: textColor,
                        border: BORDER,
                        borderLeft: columnIndex === 0 ? GROUP_BORDER : BORDER,
                        padding: '0 10px',
                        whiteSpace: 'nowrap',
                        textAlign: column.key === 'chamber' ? 'center' : 'left',
                        fontWeight: isStatusColumn ? 700 : 500,
                      }}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function RepairStatus() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await authFetch('/api/cost/repair-status')
        if (!res.ok) throw new Error('수리현황 데이터를 불러오지 못했습니다.')
        const json = await res.json()
        setRows(
          json.map((row) => ({
            key: row.id,
            receiptType: row.receipt_type,
            repairStatus: row.repair_status,
            outboundDate: row.outbound_date,
            inboundDate: row.inbound_date,
            equipmentName: row.equipment_name,
            location: row.location,
            chamber: row.chamber,
            materialCode: row.material_code,
            materialName: row.material_name,
            spec: row.spec,
            vendorName: row.vendor_name,
            vendorCode: row.vendor_code,
            repairReason: row.repair_reason,
          })),
        )
      } catch (err) {
        setError(err.message || '수리현황 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadRows()
  }, [])

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [
          row.equipmentName,
          row.location,
          row.chamber,
          row.materialCode,
          row.materialName,
          row.spec,
          row.vendorName,
          row.vendorCode,
          row.repairReason,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword))

      const matchesStatus = statusFilter === '전체' || row.receiptType === statusFilter || row.repairStatus === statusFilter
      return matchesKeyword && matchesStatus
    })
  }, [keyword, rows, statusFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const complete = rows.filter((row) => row.repairStatus === '완료').length
    const progress = rows.filter((row) => row.repairStatus === '진행').length
    const upcoming = rows.filter((row) => row.receiptType === '입고예정').length
    return { total, complete, progress, upcoming }
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div>
          <div className="nowa-page-kicker">비용 관리</div>
          <div className="nowa-page-title" style={{ fontSize: 24 }}>수리현황</div>
          <div className="nowa-page-desc">DB 수리이력을 엑셀 스프레드시트처럼 좌우로 넓게 펼쳐 확인합니다.</div>
        </div>
      </div>

      <div className="nowa-kpi-grid">
        <MetricCard icon={<ToolOutlined />} label="전체 수리건" value={metrics.total} sub="등록된 수리 이력" accent="#f59e0b" soft="rgba(245,158,11,0.14)" />
        <MetricCard icon={<ClockCircleOutlined />} label="수리 진행" value={metrics.progress} sub="현재 외주 수리중" accent="#3b82f6" soft="rgba(59,130,246,0.14)" />
        <MetricCard icon={<CheckCircleOutlined />} label="수리 완료" value={metrics.complete} sub="입고 완료 처리" accent="#22c55e" soft="rgba(34,197,94,0.14)" />
        <MetricCard icon={<BuildOutlined />} label="입고 예정" value={metrics.upcoming} sub="장기 수리 또는 예정" accent="#8b5cf6" soft="rgba(139,92,246,0.14)" />
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      <Alert
        type="info"
        showIcon
        message="스프레드시트형 보기"
        description="헤더 고정, 첫 열 고정, 행별 상태 강조를 적용해서 엑셀 관리표처럼 빠르게 훑어볼 수 있게 구성했습니다."
      />

      <Card
        className="nowa-card"
        title="수리 이력 시트"
        extra={
          <Space wrap>
            <Input allowClear placeholder="자재코드, 자재명, 업체, 사유 검색" style={{ width: 280 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }} options={['전체', '완료', '진행', '수리중', '입고예정', '무상수리'].map((value) => ({ value, label: value }))} />
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--nowa-border)', color: 'var(--nowa-text-muted)', fontSize: 12 }}>
          좌우 스크롤로 전체 컬럼을 확인할 수 있고, 첫 번째 `입고구분` 열은 고정되어 현재 행 상태를 놓치지 않게 했습니다.
        </div>
        {loading ? (
          <div style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}><Spin /></div>
        ) : (
          <RepairSheet rows={filteredRows} />
        )}
      </Card>
    </div>
  )
}
