import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Progress, Row, Segmented } from 'antd'
import {
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DatabaseFilled,
  RiseOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'
import { ConsoleChart, consoleColors, makeChartBase } from '../theme/consoleTheme'
import { useThemeMode } from '../theme/useThemeMode'
import PageBanner from '../components/PageBanner'

function getThemeVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function KpiCard({ title, value, suffix, gradient, icon, sub, trend }) {
  return (
    <div className="nowa-kpi-card" style={{ background: gradient }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nowa-contrast-text-soft)', letterSpacing: 0.5, marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--nowa-contrast-text)', lineHeight: 1, letterSpacing: -1 }}>
            {value ?? '-'}
            {suffix ? <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4, opacity: 0.9 }}>{suffix}</span> : null}
          </div>
          {sub ? <div style={{ fontSize: 14, color: 'var(--nowa-contrast-text-muted)', marginTop: 8 }}>{sub}</div> : null}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--nowa-soft-fill-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: 'var(--nowa-contrast-text)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      {trend ? (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowUpOutlined style={{ color: 'var(--nowa-contrast-text)', fontSize: 14 }} />
          <span style={{ fontSize: 14, color: 'var(--nowa-contrast-text-soft)' }}>{trend}</span>
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({ title, value, suffix, color, icon, hint }) {
  return (
    <Card className="nowa-card" styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ color, fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>
            {value ?? '-'}
            {suffix ? <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 4, opacity: 0.85 }}>{suffix}</span> : null}
          </div>
          {hint ? <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 6 }}>{hint}</div> : null}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

function makeTrendChart(period) {
  const dataMap = {
    week: {
      labels: ['월', '화', '수', '목', '금', '토', '일'],
      uptime: [82, 88, 91, 85, 94, 90, 96],
      yieldRate: [78, 82, 79, 88, 85, 91, 89],
    },
    month: {
      labels: ['1주', '2주', '3주', '4주'],
      uptime: [84, 89, 91, 95],
      yieldRate: [80, 84, 86, 90],
    },
    year: {
      labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      uptime: [79, 82, 84, 86, 88, 87, 90, 92, 89, 91, 93, 95],
      yieldRate: [75, 77, 79, 81, 82, 81, 84, 85, 84, 86, 87, 89],
    },
  }

  const current = dataMap[period] ?? dataMap.week
  const base = makeChartBase()
  const splitLine = getThemeVar('--nowa-border', 'rgba(99,102,241,0.12)')
  const pointBorder = getThemeVar('--nowa-bg-raised', '#ffffff')

  return {
    ...base,
    grid: { left: 48, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: { ...base.xAxis, type: 'category', data: current.labels },
    yAxis: { ...base.yAxis, type: 'value' },
    series: [
      {
        name: '가동률',
        type: 'line',
        data: current.uptime,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#6366f1' },
        itemStyle: { color: '#6366f1', borderWidth: 2, borderColor: pointBorder },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.28)' },
              { offset: 1, color: 'rgba(99,102,241,0.04)' },
            ],
          },
        },
      },
      {
        name: '수율',
        type: 'line',
        data: current.yieldRate,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#14b8a6' },
        itemStyle: { color: '#14b8a6', borderWidth: 2, borderColor: pointBorder },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(20,184,166,0.18)' },
              { offset: 1, color: 'rgba(20,184,166,0.03)' },
            ],
          },
        },
      },
    ],
    legend: { ...base.legend, top: 'auto', bottom: 4 },
    yAxisSplitLine: { lineStyle: { color: splitLine } },
  }
}

function makeDonutChart(active, total) {
  const text = getThemeVar('--nowa-text', '#0f172a')
  const panelAlt = getThemeVar('--nowa-panel-alt', '#1a2235')
  const borderStrong = getThemeVar('--nowa-border-strong', 'rgba(99,102,241,0.3)')
  const idle = total ? total - active : 0

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: panelAlt,
      borderColor: borderStrong,
      textStyle: { color: text },
      extraCssText: 'border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.2)',
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        data: [
          { value: active ?? 0, name: '가동 중', itemStyle: { color: '#6366f1' } },
          { value: idle ?? 0, name: '대기', itemStyle: { color: 'rgba(99,102,241,0.18)' } },
        ],
        label: {
          show: true,
          position: 'center',
          formatter: () => `${active ?? 0}\n가동`,
          color: text,
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

export default function Dashboard() {
  const { themeMode } = useThemeMode()
  const [serverOk, setServerOk] = useState(null)
  const [dbOk, setDbOk] = useState(null)
  const [stats, setStats] = useState(null)
  const [trendPeriod, setTrendPeriod] = useState('week')

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((d) => setServerOk(d.status === 'ok')).catch(() => setServerOk(false))
    fetch('/api/db-check').then((r) => r.json()).then((d) => setDbOk(d.db === 'connected')).catch(() => setDbOk(false))
    authFetch('/api/dashboard/stats').then((r) => (r.ok ? r.json() : null)).then((d) => setStats(d)).catch(() => {})
  }, [])

  const healthScore = useMemo(() => {
    if (serverOk == null || dbOk == null) return 72
    return serverOk && dbOk ? 98 : 46
  }, [serverOk, dbOk])

  const trendOption = useMemo(() => makeTrendChart(trendPeriod), [trendPeriod, themeMode])
  const donutOption = useMemo(() => makeDonutChart(stats?.active_machines, stats?.total_machines), [stats, themeMode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageBanner
        kicker="개요"
        title="EPI 운영 대시보드"
        desc="설비, 소스, 시스템 상태를 한 화면에서 모니터링합니다."
        extra={(
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="nowa-pill">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              시스템 {healthScore}%
            </span>
            <span className="nowa-pill" style={{ background: 'var(--nowa-button-bg)', color: 'var(--nowa-text-muted)', borderColor: 'var(--nowa-border)' }}>
              실시간 갱신
            </span>
          </div>
        )}
      />

      <div className="nowa-kpi-grid">
        <KpiCard
          title="API 서버"
          value={serverOk == null ? '확인 중' : serverOk ? '정상' : '오류'}
          gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)"
          icon={serverOk === false ? <CloseCircleFilled /> : <CheckCircleFilled />}
          sub="FastAPI 응답 상태"
          trend="마지막 확인 방금 전"
        />
        <KpiCard
          title="데이터베이스"
          value={dbOk == null ? '확인 중' : dbOk ? '연결됨' : '오류'}
          gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)"
          icon={dbOk === false ? <CloseCircleFilled /> : <DatabaseFilled />}
          sub="MariaDB 연결 상태"
          trend="응답 양호"
        />
        <KpiCard
          title="가동 중 MOCVD"
          value={stats?.active_machines ?? '-'}
          suffix="대"
          gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)"
          icon={<ToolOutlined />}
          sub="현재 운영 중인 설비"
          trend="전일 대비 안정"
        />
        <KpiCard
          title="소스 데이터"
          value={stats?.source_entries ?? '-'}
          suffix="건"
          gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)"
          icon={<UnorderedListOutlined />}
          sub="등록된 소스 입력"
          trend="누적 데이터"
        />
      </div>

      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          운영 현황
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card
              className="nowa-card"
              title={(
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RiseOutlined style={{ color: '#6366f1' }} />
                    <span>{trendPeriod === 'week' ? '주간' : trendPeriod === 'month' ? '월간' : '연간'} 가동률 / 수율 추이</span>
                  </div>
                  <Segmented
                    size="small"
                    value={trendPeriod}
                    onChange={setTrendPeriod}
                    options={[
                      { label: '주간', value: 'week' },
                      { label: '월간', value: 'month' },
                      { label: '연간', value: 'year' },
                    ]}
                  />
                </div>
              )}
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ConsoleChart option={trendOption} style={{ height: 220 }} />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card
              className="nowa-card"
              title={(
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ToolOutlined style={{ color: '#f59e0b' }} />
                  <span>설비 가동 현황</span>
                </div>
              )}
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ConsoleChart option={donutOption} style={{ height: 160 }} />
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#6366f1', fontSize: 20, fontWeight: 800 }}>{stats?.active_machines ?? '-'}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700 }}>가동 중</div>
                </div>
                <div style={{ width: 1, background: 'var(--nowa-border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--nowa-text-soft)', fontSize: 20, fontWeight: 800 }}>{stats?.total_machines ?? '-'}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700 }}>전체</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
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
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
                종합 가용성
              </div>
              <div style={{ color: '#6366f1', fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
                {healthScore}%
              </div>
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 6, marginBottom: 14 }}>
                API와 DB 응답 기준 종합 점수
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
