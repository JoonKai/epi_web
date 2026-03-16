import { Button, Card, Col, Input, Row, Table, Tag } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

const rows = [
  { key: 1, request_no: 'PR-2026-001', item: 'MOCVD 소모품', requester: 'admin', status: '검토중', amount: '3,200,000원' },
  { key: 2, request_no: 'PR-2026-002', item: '측정 장비 부품', requester: '403790', status: '승인대기', amount: '1,180,000원' },
  { key: 3, request_no: 'PR-2026-003', item: 'PM 자재', requester: 'admin', status: '발주완료', amount: '860,000원' },
]

const columns = [
  { title: '요청번호', dataIndex: 'request_no', key: 'request_no' },
  { title: '품목', dataIndex: 'item', key: 'item' },
  { title: '요청자', dataIndex: 'requester', key: 'requester' },
  {
    title: '상태',
    dataIndex: 'status',
    key: 'status',
    render: (value) => <Tag color={value === '발주완료' ? 'green' : value === '검토중' ? 'gold' : 'blue'}>{value}</Tag>,
  },
  { title: '금액', dataIndex: 'amount', key: 'amount', align: 'right' },
]

export default function PurchaseRequest() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div className="nowa-page-kicker">비용 관리</div>
        <div className="nowa-page-title" style={{ fontSize: 24 }}>구매요청</div>
        <div className="nowa-page-desc">구매 요청 현황을 확인하고 승인 전 요청을 관리하는 기본 화면입니다.</div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <div className="nowa-kpi-card" style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)' }}>
            <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>전체 요청</div>
            <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1, fontSize: 42 }}>{rows.length}</div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="nowa-kpi-card" style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)' }}>
            <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>승인 대기</div>
            <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1, fontSize: 42 }}>
              {rows.filter((row) => row.status === '승인대기').length}
            </div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="nowa-kpi-card" style={{ background: 'linear-gradient(135deg,#22c55e 0%,#14b8a6 100%)' }}>
            <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>발주 완료</div>
            <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1, fontSize: 42 }}>
              {rows.filter((row) => row.status === '발주완료').length}
            </div>
          </div>
        </Col>
      </Row>

      <Card
        className="nowa-card"
        title="구매요청 목록"
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Input prefix={<SearchOutlined />} placeholder="요청번호 또는 품목 검색" style={{ width: 220 }} />
            <Button type="primary" icon={<PlusOutlined />}>요청 추가</Button>
          </div>
        }
      >
        <Table columns={columns} dataSource={rows} pagination={false} />
      </Card>
    </div>
  )
}
