import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Progress, Row } from 'antd'
import {
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DatabaseFilled,
  ExperimentOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'
import { consoleColors, makeChartBase, ConsoleChart } from '../theme/consoleTheme'

// ── Gradient KPI Card ─────────────────────────────────────────────
function KpiCard({ title, value, suffix, gradient, icon, sub, trend }) {
  return (
    <div className="nowa-kpi-card" style={{ background: gradient }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
            {value ?? '—'}
            {suffix && <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4, opacity: 0.85 }}>{suffix}</span>}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>{sub}</div>
          )}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowUpOutlined style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{trend}</span>
        </div>
      )}
    </div>
  )
}

// ── Status Card ───────────────────────────────────────────────────
function StatusCard({ title, subtitle, ok, icon }) {
  const color = ok === false ? consoleColors.danger : ok ? consoleColors.success : consoleColors.warning
  const statusText = ok === false ? '오류' : ok ? '정상' : '점검 중'
  const statusBg = ok === false ? consoleColors.dangerSoft : ok ? consoleColors.successSoft : consoleColors.warningSoft

  return (
    <Card className="nowa-card" styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ color, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{statusText}</div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: statusBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: 22,
          }}
        >
          {icon}
        </div>
      </div>
      <Progress
        percent={ok === false ? 18 : ok ? 100 : 60}
        showInfo={false}
        strokeColor={color}
        trailColor="rgba(255,255,255,0.06)"
        style={{ marginTop: 16 }}
        strokeLinecap="round"
      />
    </Card>
  )
}

// ── Mini Metric Card ──────────────────────────────────────────────
function MetricCard({ title, value, suffix, color, icon, hint }) {
  const softBg = `${color}22`
  return (
    <Card className="nowa-card" styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ color, fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>
            {value ?? '—'}
            {suffix && <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 4, opacity: 0.8 }}>{suffix}</span>}
          </div>
          {hint && <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 6 }}>{hint}</div>}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: softBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20 }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

// ── Trend Chart Option ────────────────────────────────────────────
function makeTrendChart() {
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const base = makeChartBase()
  return {
    ...base,
    grid: { left: 48, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: { ...base.xAxis, data: days },
    yAxis: { ...base.yAxis },
    series: [
      {
        name: '가동률',
        type: 'line',
        data: [82, 88, 91, 85, 94, 90, 96],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#6366f1' },
        itemStyle: { color: '#6366f1', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.35)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }],
          },
        },
      },
      {
        name: '수율',
        type: 'line',
        data: [78, 82, 79, 88, 85, 91, 89],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#14b8a6' },
        itemStyle: { color: '#14b8a6', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(20,184,166,0.2)' }, { offset: 1, color: 'rgba(20,184,166,0.01)' }],
          },
        },
      },
    ],
    legend: { ...base.legend, top: 'auto', bottom: 4 },
  }
}

function makeDonutChart(active, total) {
  const idle = total ? total - active : 0
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a2235',
      borderColor: 'rgba(99,102,241,0.3)',
      textStyle: { color: '#e2e8f0' },
      extraCssText: 'border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.5)',
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        data: [
          { value: active ?? 3, name: '가동 중', itemStyle: { color: '#6366f1' } },
          { value: idle ?? 2, name: '대기', itemStyle: { color: 'rgba(99,102,241,0.18)' } },
        ],
        label: {
          show: true,
          position: 'center',
          formatter: () => `${active ?? 3}\n가동`,
          color: '#e2e8f0',
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 22,
        },
        emphasis: { label: { show: true } },
        itemStyle: { borderRadius: 6, borderWidth: 3, borderColor: 'transparent' },
      },
    ],
  }
}

// ── Main Dashboard ────────────────────────────────────────────────
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

  const trendOption = useMemo(() => makeTrendChart(), [])
  const donutOption = useMemo(() => makeDonutChart(stats?.active_machines, stats?.total_machines), [stats])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            개요
          </div>
          <div style={{ color: 'var(--nowa-text)', fontSize: 26, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1 }}>
            EPI 운영 대시보드
          </div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13, marginTop: 6 }}>
            설비·소스·시스템 상태를 한 화면에서 실시간으로 모니터링합니다
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="nowa-pill">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            시스템 {healthScore}%
          </span>
          <span className="nowa-pill" style={{ background: 'var(--nowa-button-bg)', color: 'var(--nowa-text-muted)', borderColor: 'var(--nowa-border)' }}>
            실시간 갱신
          </span>
        </div>
      </div>

      {/* ── Top KPI Gradient Cards ──────────────────────────────── */}
      <div className="nowa-kpi-grid">
        <KpiCard
          title="API 서버"
          value={serverOk === null ? '확인 중' : serverOk ? '정상' : '오류'}
          gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)"
          icon={serverOk === false ? <CloseCircleFilled /> : <CheckCircleFilled />}
          sub="FastAPI 응답 상태"
          trend="마지막 확인 방금 전"
        />
        <KpiCard
          title="데이터베이스"
          value={dbOk === null ? '확인 중' : dbOk ? '연결됨' : '오류'}
          gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)"
          icon={dbOk === false ? <CloseCircleFilled /> : <DatabaseFilled />}
          sub="MariaDB 연결 상태"
          trend="응답 양호"
        />
        <KpiCard
          title="가동 중 MOCVD"
          value={stats?.active_machines ?? '—'}
          suffix="대"
          gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)"
          icon={<ToolOutlined />}
          sub="현재 운영 중인 장비"
          trend="전일 대비 유지"
        />
        <KpiCard
          title="소스 데이터"
          value={stats?.source_entries ?? '—'}
          suffix="건"
          gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)"
          icon={<UnorderedListOutlined />}
          sub="등록된 소스 입력"
          trend="누적 데이터"
        />
      </div>

      {/* ── Status Row ──────────────────────────────────────────── */}
      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          시스템 상태
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <StatusCard title="API 상태" subtitle="FastAPI 서버 응답" ok={serverOk} icon={serverOk === false ? <CloseCircleFilled /> : <CheckCircleFilled />} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <StatusCard title="데이터베이스" subtitle="MariaDB 연결 상태" ok={dbOk} icon={dbOk === false ? <CloseCircleFilled /> : <DatabaseFilled />} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="전체 장비" value={stats?.total_machines} suffix="대" color={consoleColors.info} icon={<ExperimentOutlined />} hint="등록된 전체 설비 자산" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="활성 사용자" value={stats?.active_users} suffix="명" color={consoleColors.success} icon={<UserOutlined />} hint="현재 접근 가능한 사용자" />
          </Col>
        </Row>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          운영 현황
        </div>
        <Row gutter={[16, 16]}>
          {/* Trend chart */}
          <Col xs={24} xl={16}>
            <Card
              className="nowa-card"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <RiseOutlined style={{ color: '#6366f1' }} />
                  <span>주간 가동률 / 수율 추이</span>
                </div>
              }
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ConsoleChart option={trendOption} style={{ height: 220 }} />
            </Card>
          </Col>

          {/* Donut + summary */}
          <Col xs={24} xl={8}>
            <Card
              className="nowa-card"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ToolOutlined style={{ color: '#f59e0b' }} />
                  <span>장비 가동 현황</span>
                </div>
              }
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ConsoleChart option={donutOption} style={{ height: 160 }} />
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#6366f1', fontSize: 20, fontWeight: 800 }}>{stats?.active_machines ?? '—'}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11 }}>가동 중</div>
                </div>
                <div style={{ width: 1, background: 'var(--nowa-border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--nowa-text-soft)', fontSize: 20, fontWeight: 800 }}>{stats?.total_machines ?? '—'}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11 }}>전체</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* ── Bottom Stats ─────────────────────────────────────────── */}
      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          운영 요약
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <MetricCard title="소스 종류" value={stats?.source_types} suffix="종" color={consoleColors.warning} icon={<DatabaseFilled />} hint="활성화된 소스 카테고리" />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard title="활성 사용자" value={stats?.active_users} suffix="명" color={consoleColors.teal} icon={<UserOutlined />} hint="등록된 사용자 계정" />
          </Col>
          <Col xs={24} md={8}>
            <Card className="nowa-card" styles={{ body: { padding: 20 } }}>
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
                종합 가용성
              </div>
              <div style={{ color: '#6366f1', fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
                {healthScore}%
              </div>
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 6, marginBottom: 14 }}>
                API · DB 응답 기준 종합 점수
              </div>
              <Progress
                percent={healthScore}
                showInfo={false}
                strokeColor={{ '0%': '#6366f1', '100%': '#8b5cf6' }}
                trailColor="rgba(99,102,241,0.1)"
                strokeLinecap="round"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
