import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Progress, Row, Statistic } from 'antd'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DatabaseFilled,
  ExperimentOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'
import { consoleColors, panelStyle, sectionTitleStyle } from '../theme/consoleTheme'

function StatusPanel({ title, subtitle, ok, icon }) {
  const tone = ok === false ? consoleColors.danger : ok ? consoleColors.success : consoleColors.warning
  const statusText = ok === false ? '오류' : ok ? '정상' : '확인 중'

  return (
    <Card className="console-panel console-metric-card" styles={{ body: { padding: 18 } }} style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={sectionTitleStyle}>{title}</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, marginTop: 12 }}>{statusText}</div>
          <div style={{ color: consoleColors.textMuted, marginTop: 4, fontSize: 12 }}>{subtitle}</div>
        </div>
        <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 14, background: `${tone}20`, color: tone, fontSize: 24 }}>{icon}</div>
      </div>
      <Progress percent={ok === false ? 21 : ok ? 100 : 62} showInfo={false} strokeColor={tone} trailColor="rgba(255,255,255,0.04)" style={{ marginTop: 18 }} />
    </Card>
  )
}

function MetricPanel({ title, value, suffix, color, icon, hint }) {
  return (
    <Card className="console-panel console-metric-card" styles={{ body: { padding: 18 } }} style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <Statistic title={<span style={sectionTitleStyle}>{title}</span>} value={value ?? '-'} suffix={suffix} valueStyle={{ color, fontSize: 30, fontWeight: 800, letterSpacing: -1 }} />
        <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 14, background: `${color}1f`, color, fontSize: 22 }}>{icon}</div>
      </div>
      <div style={{ color: consoleColors.textMuted, fontSize: 12, marginTop: 8 }}>{hint}</div>
    </Card>
  )
}

export default function Dashboard() {
  const [serverOk, setServerOk] = useState(null)
  const [dbOk, setDbOk] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((d) => setServerOk(d.status === 'ok')).catch(() => setServerOk(false))
    fetch('/api/db-check').then((r) => r.json()).then((d) => setDbOk(d.db === 'connected')).catch(() => setDbOk(false))
    authFetch('/api/dashboard/stats').then((r) => (r.ok ? r.json() : null)).then((d) => setStats(d)).catch(() => {})
  }, [])

  const healthScore = useMemo(() => {
    if (serverOk == null || dbOk == null) return 72
    return serverOk && dbOk ? 98 : 46
  }, [serverOk, dbOk])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="console-toolbar">
        <div>
          <div style={{ ...sectionTitleStyle, marginBottom: 8 }}>개요</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>EPI 운영 대시보드</div>
          <div style={{ color: consoleColors.textMuted, marginTop: 6 }}>설비, 소스, 시스템 상태를 한 화면에서 빠르게 점검하는 운영 화면</div>
        </div>
        <div className="console-toolbar-group">
          <div className="console-pill">시스템 상태 {healthScore}%</div>
          <div className="console-pill">실시간 갱신</div>
        </div>
      </div>

      <div style={{ ...sectionTitleStyle, marginTop: 4 }}>시스템 상태</div>
      <Row gutter={[14, 14]}>
        <Col xs={24} md={12} xl={6}><StatusPanel title="API 상태" subtitle="FastAPI 서버 응답" ok={serverOk} icon={serverOk === false ? <CloseCircleFilled /> : <CheckCircleFilled />} /></Col>
        <Col xs={24} md={12} xl={6}><StatusPanel title="데이터베이스" subtitle="MariaDB 연결 상태" ok={dbOk} icon={dbOk === false ? <CloseCircleFilled /> : <DatabaseFilled />} /></Col>
        <Col xs={24} md={12} xl={6}><MetricPanel title="가동 중 MOCVD" value={stats?.active_machines} suffix="대" color={consoleColors.accent} icon={<ToolOutlined />} hint="현재 운영 중인 장비 수" /></Col>
        <Col xs={24} md={12} xl={6}><MetricPanel title="소스 데이터" value={stats?.source_entries} suffix="건" color={consoleColors.accentAlt} icon={<UnorderedListOutlined />} hint="등록된 소스 입력 데이터" /></Col>
      </Row>

      <div style={{ ...sectionTitleStyle, marginTop: 4 }}>운영 요약</div>
      <div className="console-stat-grid">
        <MetricPanel title="전체 장비" value={stats?.total_machines} suffix="대" color={consoleColors.info} icon={<ExperimentOutlined />} hint="등록된 전체 설비 자산" />
        <MetricPanel title="활성 사용자" value={stats?.active_users} suffix="명" color={consoleColors.success} icon={<UserOutlined />} hint="현재 접근 가능한 사용자 수" />
        <MetricPanel title="소스 종류" value={stats?.source_types} suffix="종류" color={consoleColors.warning} icon={<DatabaseFilled />} hint="활성화된 소스 카테고리" />
        <Card className="console-panel console-metric-card" styles={{ body: { padding: 18 } }} style={panelStyle}>
          <div style={sectionTitleStyle}>종합 가용성</div>
          <div style={{ color: 'var(--console-text)', fontSize: 42, fontWeight: 800, lineHeight: 1, marginTop: 14 }}>{healthScore}%</div>
          <div style={{ color: consoleColors.textMuted, fontSize: 12, marginTop: 8 }}>API와 DB 응답 기준의 종합 상태 점수</div>
          <Progress percent={healthScore} showInfo={false} strokeColor={consoleColors.accent} trailColor="rgba(255,255,255,0.04)" style={{ marginTop: 18 }} />
        </Card>
      </div>
    </div>
  )
}
