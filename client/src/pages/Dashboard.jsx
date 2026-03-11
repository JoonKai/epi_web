import { useEffect, useState } from 'react'
import { Row, Col, Card, Badge, theme } from 'antd'
import {
  CheckCircleFilled,
  DatabaseFilled,
  CloseCircleFilled,
} from '@ant-design/icons'

function Dashboard() {
  const [serverStatus, setServerStatus] = useState(null)
  const [dbStatus, setDbStatus] = useState(null)
  const { token } = theme.useToken()

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setServerStatus(d.status === 'ok'))
      .catch(() => setServerStatus(false))

    fetch('/api/db-check')
      .then(r => r.json())
      .then(d => setDbStatus(d.db === 'connected'))
      .catch(() => setDbStatus(false))
  }, [])

  const cards = [
    {
      title: '서버 상태',
      value: serverStatus === null ? '확인 중' : serverStatus ? '정상 가동' : '오류',
      ok: serverStatus,
      icon: serverStatus === false
        ? <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
        : <CheckCircleFilled style={{ fontSize: 32, color: serverStatus ? '#52c41a' : '#d9d9d9' }} />,
      desc: 'FastAPI Server',
    },
    {
      title: 'DB 연결',
      value: dbStatus === null ? '확인 중' : dbStatus ? '연결됨' : '오류',
      ok: dbStatus,
      icon: dbStatus === false
        ? <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
        : <DatabaseFilled style={{ fontSize: 32, color: dbStatus ? '#4f7fff' : '#d9d9d9' }} />,
      desc: 'MariaDB · epi',
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>대시보드</h2>
        <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          시스템 상태를 실시간으로 확인합니다.
        </span>
      </div>

      <Row gutter={[20, 20]}>
        {cards.map(card => (
          <Col key={card.title} xs={24} sm={12} md={8} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
              styles={{ body: { padding: '20px 24px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 8 }}>
                    {card.title}
                  </div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: card.ok === null ? token.colorTextSecondary
                      : card.ok ? token.colorText : '#ff4d4f',
                  }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
                    {card.desc}
                  </div>
                </div>
                <div>{card.icon}</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Badge
                  status={card.ok === null ? 'processing' : card.ok ? 'success' : 'error'}
                  text={
                    <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                      {card.ok === null ? '확인 중...' : card.ok ? '정상' : '연결 실패'}
                    </span>
                  }
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Dashboard
