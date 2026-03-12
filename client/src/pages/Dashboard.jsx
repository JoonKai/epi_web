import { useEffect, useState } from 'react'
import { Row, Col, Card, Badge, theme, Statistic } from 'antd'
import {
  CheckCircleFilled, DatabaseFilled, CloseCircleFilled,
  ToolOutlined, UserOutlined, ExperimentOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'

function StatusCard({ title, desc, ok, icon }) {
  const { token } = theme.useToken()
  const isOk  = ok === true
  const isErr = ok === false
  const color = isErr ? '#ff4d4f' : isOk ? '#52c41a' : token.colorTextQuaternary

  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${isErr ? 'rgba(255,77,79,0.25)' : isOk ? 'rgba(82,196,26,0.2)' : token.colorBorderSecondary}`,
        background: isErr ? 'rgba(255,77,79,0.06)' : isOk ? 'rgba(82,196,26,0.05)' : token.colorBgContainer,
        overflow: 'hidden',
        transition: 'all 0.3s',
        position: 'relative',
      }}
      styles={{ body: { padding: '20px 22px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: token.colorTextTertiary, marginBottom: 10, textTransform: 'uppercase' }}>
            {title}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>
            {ok === null ? '확인 중' : ok ? '정상' : '오류'}
          </div>
          <div style={{ fontSize: 12, color: token.colorTextQuaternary, marginTop: 6 }}>{desc}</div>
        </div>
        <div style={{ fontSize: 34, opacity: 0.85 }}>{icon}</div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Badge
          status={ok === null ? 'processing' : ok ? 'success' : 'error'}
          text={
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {ok === null ? '연결 확인 중...' : ok ? '정상 가동 중' : '연결 실패'}
            </span>
          }
        />
      </div>
    </Card>
  )
}

function StatCard({ title, value, suffix, icon, color = '#4f7fff' }) {
  const { token } = theme.useToken()
  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${token.colorBorderSecondary}`,
        overflow: 'hidden',
        position: 'relative',
      }}
      styles={{ body: { padding: '20px 22px' } }}
    >
      {/* 상단 액센트 라인 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Statistic
          title={
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: token.colorTextTertiary }}>
              {title}
            </span>
          }
          value={value ?? '-'}
          suffix={<span style={{ fontSize: 14, fontWeight: 400 }}>{suffix}</span>}
          valueStyle={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1.1 }}
        />
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [serverOk, setServerOk] = useState(null)
  const [dbOk, setDbOk]         = useState(null)
  const [stats, setStats]        = useState(null)
  const { token }                = theme.useToken()

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
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: token.colorText }}>대시보드</h2>
        <span style={{ fontSize: 13, color: token.colorTextTertiary }}>EPI Web 시스템 현황 한눈에 보기</span>
      </div>

      {/* 시스템 상태 */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 14, color: token.colorTextQuaternary, textTransform: 'uppercase' }}>
        시스템 상태
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatusCard
            title="서버 상태" desc="FastAPI Server" ok={serverOk}
            icon={serverOk === false
              ? <CloseCircleFilled style={{ color: '#ff4d4f' }} />
              : <CheckCircleFilled style={{ color: serverOk ? '#52c41a' : token.colorTextQuaternary }} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatusCard
            title="DB 연결" desc="MariaDB · epi" ok={dbOk}
            icon={dbOk === false
              ? <CloseCircleFilled style={{ color: '#ff4d4f' }} />
              : <DatabaseFilled style={{ color: dbOk ? '#4f7fff' : token.colorTextQuaternary }} />}
          />
        </Col>
      </Row>

      {/* 현황 통계 */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 14, color: token.colorTextQuaternary, textTransform: 'uppercase' }}>
        현황 통계
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="가동 MOCVD 호기" suffix="대" value={stats?.active_machines} icon={<ToolOutlined />} color="#4f7fff" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="등록 호기 (전체)" suffix="대" value={stats?.total_machines} icon={<ExperimentOutlined />} color="#7b5ea7" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="활성 사용자" suffix="명" value={stats?.active_users} icon={<UserOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="소스 잔량 입력" suffix="건" value={stats?.source_entries} icon={<UnorderedListOutlined />} color="#faad14" />
        </Col>
      </Row>
    </div>
  )
}
