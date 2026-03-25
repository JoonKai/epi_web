import { Card, Col, Row, Tag, Typography } from 'antd'
import { ToolOutlined } from '@ant-design/icons'

const panelStyle = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
  border: '1px solid rgba(245,158,11,0.18)',
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
}

const scrubberCards = [
  { name: 'SCR#01', status: '정상', note: '배기 압력 정상', color: '#22c55e' },
  { name: 'SCR#02', status: '점검 예정', note: '약품 교체 예정', color: '#f59e0b' },
  { name: 'SCR#03', status: '정상', note: '유량 안정', color: '#22c55e' },
  { name: 'SCR#04', status: '경고', note: '차압 상승 감지', color: '#ef4444' },
]

export default function ScrubberManagement() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="nowa-page-banner">
        <div className="nowa-page-banner-left">
          <span className="nowa-page-banner-kicker">설비 관리</span>
          <div className="nowa-page-banner-title">스크러버 관리</div>
          <div className="nowa-page-banner-desc">스크러버 설비 상태, 점검 계획, 교체 이력 화면을 이 메뉴에서 관리하도록 확장할 수 있습니다.</div>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        {scrubberCards.map((card) => (
          <Col xs={24} md={12} xl={6} key={card.name}>
            <Card style={panelStyle} styles={{ body: { padding: 22 } }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography.Text style={{ fontSize: 24, fontWeight: 800, color: '#e5e7eb' }}>
                    {card.name}
                  </Typography.Text>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      paddingInline: 12,
                      paddingBlock: 4,
                      borderColor: `${card.color}55`,
                      color: card.color,
                      background: `${card.color}14`,
                      fontWeight: 700,
                    }}
                  >
                    {card.status}
                  </Tag>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: card.status === '정상' ? '100%' : card.status === '점검 예정' ? '62%' : '38%',
                      height: '100%',
                      background: card.color,
                    }}
                  />
                </div>
                <Typography.Text style={{ color: 'rgba(196,210,226,0.7)', fontSize: 15 }}>
                  {card.note}
                </Typography.Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
