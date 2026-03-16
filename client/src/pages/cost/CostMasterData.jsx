import { Button, Card, Col, Row, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const rows = [
  { key: 1, category: '소모품', code: 'MAT-001', name: 'MOCVD 소모품', unit: 'EA', active: true },
  { key: 2, category: '부품', code: 'PART-014', name: '측정 장비 부품', unit: 'SET', active: true },
  { key: 3, category: 'PM 자재', code: 'PM-003', name: '정기 점검 자재', unit: 'BOX', active: false },
]

const columns = [
  { title: '분류', dataIndex: 'category', key: 'category' },
  { title: '코드', dataIndex: 'code', key: 'code' },
  { title: '항목명', dataIndex: 'name', key: 'name' },
  { title: '단위', dataIndex: 'unit', key: 'unit' },
  {
    title: '사용',
    dataIndex: 'active',
    key: 'active',
    render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? '사용' : '중지'}</Tag>,
  },
]

export default function CostMasterData() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div className="nowa-page-kicker">비용 관리</div>
        <div className="nowa-page-title" style={{ fontSize: 24 }}>기준정보등록</div>
        <div className="nowa-page-desc">구매요청에 사용할 비용 기준정보를 등록하고 관리하는 기본 화면입니다.</div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div className="nowa-kpi-card" style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)' }}>
            <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>등록 항목</div>
            <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1, fontSize: 42 }}>{rows.length}</div>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className="nowa-kpi-card" style={{ background: 'linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)' }}>
            <div style={{ color: 'var(--nowa-contrast-text-soft)', fontSize: 13, fontWeight: 700 }}>사용 중 항목</div>
            <div style={{ marginTop: 10, color: 'var(--nowa-contrast-text)', fontWeight: 900, lineHeight: 1, fontSize: 42 }}>
              {rows.filter((row) => row.active).length}
            </div>
          </div>
        </Col>
      </Row>

      <Card
        className="nowa-card"
        title="기준정보 목록"
        extra={<Button type="primary" icon={<PlusOutlined />}>기준정보 추가</Button>}
      >
        <Table columns={columns} dataSource={rows} pagination={false} />
      </Card>
    </div>
  )
}
