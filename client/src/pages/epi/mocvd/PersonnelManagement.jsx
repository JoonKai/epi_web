import { Card, Col, Progress, Row, Space, Tag } from 'antd'
import {
  ClockCircleOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { ConsoleChart, makeChartBase, panelStyle } from '../../../theme/consoleTheme'

const member = {
  name: '김OO',
  age: 33,
  team: 'EPI 설비 2조',
  role: 'MOCVD 오퍼레이터',
  shift: '야간',
  grade: 'Senior',
  badge: 'M-2041',
  health: 84,
  fatigue: 61,
  attendance: 98,
  training: 92,
  ppe: 100,
  access: 17,
  overtime: 6.5,
}

const metricCards = [
  {
    title: '피로도',
    value: '61',
    suffix: 'pt',
    tone: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    top: '12%',
    right: '5%',
    width: 240,
  },
  {
    title: '교육 이수율',
    value: '92',
    suffix: '%',
    tone: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    top: '36%',
    right: '6%',
    width: 260,
  },
  {
    title: '출입 인증',
    value: '정상',
    suffix: '',
    tone: '#38bdf8',
    glow: 'rgba(56,189,248,0.35)',
    top: '60%',
    right: '5%',
    width: 250,
  },
  {
    title: 'PPE 준수',
    value: '100',
    suffix: '%',
    tone: '#14b8a6',
    glow: 'rgba(20,184,166,0.35)',
    top: '78%',
    right: '8%',
    width: 230,
  },
]

function makeWeeklyOption() {
  return {
    ...makeChartBase('주간 근무 시간'),
    legend: { show: false },
    grid: { left: 32, right: 16, top: 38, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLabel: { color: 'var(--nowa-text-muted)' },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(99,102,241,0.18)' } },
    },
    yAxis: {
      type: 'value',
      max: 14,
      axisLabel: { color: 'var(--nowa-text-muted)' },
      splitLine: { lineStyle: { color: 'rgba(99,102,241,0.1)' } },
    },
    series: [
      {
        type: 'bar',
        data: [8, 9, 10, 8, 11, 6, 0],
        barWidth: 18,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#7dd3fc' },
              { offset: 1, color: '#2563eb' },
            ],
          },
        },
      },
    ],
  }
}

function makeSafetyOption() {
  return {
    ...makeChartBase('안전 체크 추이'),
    legend: { show: true, top: 8, right: 12 },
    grid: { left: 32, right: 16, top: 48, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['1주', '2주', '3주', '4주', '5주', '6주'],
      axisLabel: { color: 'var(--nowa-text-muted)' },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(99,102,241,0.18)' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: 'var(--nowa-text-muted)' },
      splitLine: { lineStyle: { color: 'rgba(99,102,241,0.1)' } },
    },
    series: [
      {
        name: '준수율',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: [86, 88, 84, 91, 95, 93],
        lineStyle: { width: 3, color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
        areaStyle: { color: 'rgba(34,197,94,0.12)' },
      },
      {
        name: '경고건수',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: [5, 4, 6, 3, 1, 2],
        lineStyle: { width: 2, color: '#f43f5e' },
        itemStyle: { color: '#f43f5e' },
      },
    ],
  }
}

function makeGaugeOption() {
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '100%',
        progress: {
          show: true,
          width: 16,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#0ea5e9' },
                { offset: 0.6, color: '#22d3ee' },
                { offset: 1, color: '#fde047' },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [[1, 'rgba(99,102,241,0.14)']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: false,
          offsetCenter: [0, '0%'],
          formatter: '{value}',
          color: '#e2e8f0',
          fontSize: 44,
          fontWeight: 800,
        },
        title: {
          offsetCenter: [0, '50%'],
          color: 'rgba(226,232,240,0.78)',
          fontSize: 16,
        },
        data: [{ value: member.health, name: '건강 지수' }],
      },
    ],
  }
}

function StatChip({ icon, label, value, tone }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 18,
        border: '1px solid var(--nowa-border)',
        background: 'linear-gradient(180deg, rgba(24,33,58,0.95) 0%, rgba(17,24,39,0.95) 100%)',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          color: tone,
          background: `${tone}22`,
          boxShadow: `0 0 24px ${tone}22`,
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>{label}</div>
        <div style={{ color: 'var(--nowa-text)', fontSize: 22, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  )
}

function StatusMeter({ label, value, strokeColor, trailColor = 'rgba(255,255,255,0.08)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nowa-text-soft)' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}%</span>
      </div>
      <Progress percent={value} showInfo={false} strokeColor={strokeColor} trailColor={trailColor} size={['100%', 10]} />
    </div>
  )
}

function BodySilhouette() {
  return (
    <svg viewBox="0 0 260 620" style={{ width: '100%', maxWidth: 260, height: 'auto', filter: 'drop-shadow(0 0 36px rgba(34,211,238,0.18))' }}>
      <defs>
        <linearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="60" r="40" fill="url(#personGrad)" opacity="0.95" />
      <path
        d="M92 110
           C88 145, 72 160, 62 190
           C48 228, 42 274, 46 322
           C50 370, 63 425, 73 486
           L89 600
           L113 600
           L118 508
           L108 386
           L118 292
           L142 292
           L152 386
           L142 508
           L147 600
           L171 600
           L187 486
           C197 425, 210 370, 214 322
           C218 274, 212 228, 198 190
           C188 160, 172 145, 168 110
           C162 94, 146 86, 130 86
           C114 86, 98 94, 92 110 Z"
        fill="url(#personGrad)"
        opacity="0.9"
      />
      <path d="M72 214 C44 260, 28 328, 40 360 C50 385, 66 372, 73 348 L88 272 Z" fill="url(#personGrad)" opacity="0.88" />
      <path d="M188 214 C216 260, 232 328, 220 360 C210 385, 194 372, 187 348 L172 272 Z" fill="url(#personGrad)" opacity="0.88" />
      <circle cx="126" cy="218" r="8" fill="#fde2e4" />
      <circle cx="150" cy="226" r="8" fill="#fde2e4" />
      <circle cx="122" cy="322" r="8" fill="#fde2e4" />
      <circle cx="116" cy="392" r="8" fill="#fde2e4" />
    </svg>
  )
}

function CalloutCard({ item }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: item.top,
        right: item.right,
        width: item.width,
        padding: '18px 20px',
        borderRadius: 22,
        border: `1px solid ${item.glow}`,
        background: 'linear-gradient(180deg, rgba(31,41,75,0.92) 0%, rgba(17,24,39,0.92) 100%)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 28px ${item.glow}`,
      }}
    >
      <div style={{ color: 'var(--nowa-text-soft)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: item.tone, fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{item.value}</span>
        {item.suffix && <span style={{ color: item.tone, fontSize: 20, fontWeight: 700 }}>{item.suffix}</span>}
      </div>
    </div>
  )
}

function PersonnelManagement() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 28,
          border: '1px solid rgba(56,189,248,0.22)',
          background: `
            radial-gradient(circle at 50% 12%, rgba(56,189,248,0.16), transparent 28%),
            radial-gradient(circle at 85% 18%, rgba(14,165,233,0.1), transparent 22%),
            linear-gradient(180deg, rgba(19,36,63,0.98) 0%, rgba(11,15,26,0.98) 100%)
          `,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          padding: 24,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 18,
            border: '1px solid rgba(103,232,249,0.12)',
            borderRadius: 24,
            pointerEvents: 'none',
            clipPath: 'polygon(0 8%, 4% 0, 20% 0, 22% 5%, 78% 5%, 80% 0, 96% 0, 100% 8%, 100% 92%, 96% 100%, 80% 100%, 78% 95%, 22% 95%, 20% 100%, 4% 100%, 0 92%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' }}>Personnel Control</div>
            <div style={{ color: 'var(--nowa-text)', fontSize: 42, fontWeight: 900, letterSpacing: -1.2 }}>인원 관리</div>
          </div>
          <Space size={[8, 8]} wrap>
            <Tag color="blue">실시간 상태</Tag>
            <Tag color="cyan">{member.team}</Tag>
            <Tag color="gold">{member.shift} 근무</Tag>
          </Space>
        </div>

        <Row gutter={[18, 18]}>
          <Col xs={24} xl={7}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Card className="nowa-card" styles={{ body: { padding: 20 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ color: 'var(--nowa-text)', fontSize: 22, fontWeight: 800 }}>
                      {member.name} <span style={{ color: 'var(--nowa-text-muted)', fontSize: 16 }}>{member.age}세</span>
                    </div>
                    <div style={{ color: 'var(--nowa-text-soft)', marginTop: 14, lineHeight: 1.8, fontSize: 16 }}>
                      직무 : {member.role}<br />
                      직급 : {member.grade}<br />
                      배지 : {member.badge}<br />
                      출입 횟수 : {member.access}회
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>건강 지수</div>
                    <div style={{ color: '#38bdf8', fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{member.health}</div>
                  </div>
                </div>
              </Card>

              <Card className="nowa-card" styles={{ body: { padding: 18 } }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <StatusMeter label="출근 안정성" value={member.attendance} strokeColor={{ '0%': '#22d3ee', '100%': '#38bdf8' }} />
                  <StatusMeter label="교육 이수율" value={member.training} strokeColor={{ '0%': '#22c55e', '100%': '#14b8a6' }} />
                  <StatusMeter label="PPE 준수율" value={member.ppe} strokeColor={{ '0%': '#60a5fa', '100%': '#6366f1' }} />
                  <StatusMeter label="피로도 경고치" value={member.fatigue} strokeColor={{ '0%': '#f59e0b', '100%': '#ef4444' }} />
                </div>
              </Card>

              <Row gutter={[12, 12]}>
                <Col span={12}><StatChip icon={<ClockCircleOutlined />} label="주간 초과근무" value={`${member.overtime}h`} tone="#38bdf8" /></Col>
                <Col span={12}><StatChip icon={<SafetyCertificateOutlined />} label="안전 인증" value="A" tone="#22c55e" /></Col>
                <Col span={12}><StatChip icon={<FireOutlined />} label="고온 작업" value="3건" tone="#f59e0b" /></Col>
                <Col span={12}><StatChip icon={<ThunderboltOutlined />} label="알림 상태" value="정상" tone="#14b8a6" /></Col>
              </Row>
            </div>
          </Col>

          <Col xs={24} xl={9}>
            <div
              style={{
                position: 'relative',
                minHeight: 860,
                borderRadius: 26,
                border: '1px solid rgba(56,189,248,0.16)',
                background: 'linear-gradient(180deg, rgba(17,24,39,0.62) 0%, rgba(17,24,39,0.3) 100%)',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', left: '12%', top: 18, width: 220, height: 20, background: 'linear-gradient(90deg, rgba(14,165,233,0.95), rgba(103,232,249,0.2))', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }} />
              <div style={{ position: 'absolute', right: '8%', bottom: 18, width: 220, height: 20, background: 'linear-gradient(90deg, rgba(14,165,233,0.2), rgba(103,232,249,0.95))', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }} />

              <div style={{ position: 'absolute', left: '13%', top: 62 }}>
                <BodySilhouette />
              </div>

              <svg viewBox="0 0 700 860" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <path d="M250 220 L385 220 L450 135" stroke="rgba(255,230,230,0.9)" strokeWidth="3" fill="none" />
                <path d="M248 305 L390 390 L450 390" stroke="rgba(255,230,230,0.9)" strokeWidth="3" fill="none" />
                <path d="M238 405 L405 560 L450 560" stroke="rgba(255,230,230,0.9)" strokeWidth="3" fill="none" />
                <path d="M232 480 L450 735 L450 735" stroke="rgba(255,230,230,0.9)" strokeWidth="3" fill="none" />
              </svg>

              {metricCards.map((item) => <CalloutCard key={item.title} item={item} />)}
            </div>
          </Col>

          <Col xs={24} xl={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Row gutter={[12, 12]}>
                <Col span={12}><StatChip icon={<TeamOutlined />} label="라인 투입" value="A-03" tone="#22d3ee" /></Col>
                <Col span={12}><StatChip icon={<ThunderboltOutlined />} label="상태 등급" value="Good" tone="#fde047" /></Col>
              </Row>

              <Card className="nowa-card" styles={{ body: { padding: 12 } }}>
                <ConsoleChart option={makeWeeklyOption()} style={{ height: 260 }} />
              </Card>

              <Card className="nowa-card" styles={{ body: { padding: 8 } }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 8, alignItems: 'center' }}>
                  <div style={{ padding: 16 }}>
                    <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800 }}>건강 상태 게이지</div>
                    <div style={{ color: 'var(--nowa-text-soft)', marginTop: 8, lineHeight: 1.8 }}>
                      현재 컨디션 : 84
                      <br />
                      피로 경고선 : 70
                      <br />
                      권장 휴식 : 15분
                    </div>
                  </div>
                  <ConsoleChart option={makeGaugeOption()} style={{ height: 220 }} />
                </div>
              </Card>

              <Card className="nowa-card" styles={{ body: { padding: 12 } }}>
                <ConsoleChart option={makeSafetyOption()} style={{ height: 260 }} />
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default PersonnelManagement
