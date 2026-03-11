import { useEffect, useState } from 'react'
import { Row, Col, Card, Badge, theme, Statistic } from 'antd'
import {
  CheckCircleFilled, DatabaseFilled, CloseCircleFilled,
  ToolOutlined, UserOutlined, ExperimentOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'

function StatusCard({ title, desc, ok, icon, loading }) {
  const { token } = theme.useToken()
  return (
    <Card
      style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: ok === null ? token.colorTextSecondary : ok ? token.colorText : '#ff4d4f' }}>
            {loading ? '확인 중' : ok ? '정상' : ok === false ? '오류' : '-'}
          </div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>{desc}</div>
        </div>
        <div>{icon}</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Badge
          status={ok === null ? 'processing' : ok ? 'success' : 'error'}
          text={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{ok === null ? '확인 중...' : ok ? '정상 가동' : '연결 실패'}</span>}
        />
      </div>
    </Card>
  )
}

function StatCard({ title, value, suffix, icon, color = '#4f7fff' }) {
  const { token } = theme.useToken()
  return (
    <Card
      style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Statistic
          title={<span style={{ fontSize: 12 }}>{title}</span>}
          value={value ?? '-'}
          suffix={suffix}
          valueStyle={{ fontSize: 28, fontWeight: 700, color }}
        />
        <div style={{ fontSize: 32, color, opacity: 0.7 }}>{icon}</div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [serverOk, setServerOk] = useState(null)
  const [dbOk, setDbOk]         = useState(null)
  const [stats, setStats]        = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json()).then(d => setServerOk(d.status === 'ok'))
      .catch(() => setServerOk(false))

    fetch('/api/db-check')
      .then(r => r.json()).then(d => setDbOk(d.db === 'connected'))
      .catch(() => setDbOk(false))

    authFetch('/api/dashboard/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>대시보드</h2>
        <span style={{ fontSize: 13, opacity: 0.6 }}>EPI Web 시스템 현황</span>
      </div>

      {/* 시스템 상태 */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>시스템 상태</div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatusCard
            title="서버 상태" desc="FastAPI Server" ok={serverOk}
            icon={serverOk === false
              ? <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
              : <CheckCircleFilled style={{ fontSize: 32, color: serverOk ? '#52c41a' : '#d9d9d9' }} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatusCard
            title="DB 연결" desc="MariaDB · epi" ok={dbOk}
            icon={dbOk === false
              ? <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
              : <DatabaseFilled style={{ fontSize: 32, color: dbOk ? '#4f7fff' : '#d9d9d9' }} />}
          />
        </Col>
      </Row>

      {/* 통계 */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>현황 통계</div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="가동 MOCVD 호기" suffix="대"
            value={stats?.active_machines}
            icon={<ToolOutlined />}
            color="#4f7fff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="등록 호기 (전체)" suffix="대"
            value={stats?.total_machines}
            icon={<ExperimentOutlined />}
            color="#7b5ea7"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="활성 사용자" suffix="명"
            value={stats?.active_users}
            icon={<UserOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="소스 잔량 입력 건수" suffix="건"
            value={stats?.source_entries}
            icon={<UnorderedListOutlined />}
            color="#faad14"
          />
        </Col>
      </Row>
    </div>
  )
}
