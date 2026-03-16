import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Skeleton, Tag } from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

function SummaryTile({ title, value, suffix, icon, accent }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-hero-bg)',
        boxShadow: 'var(--nowa-shadow-card)',
        minHeight: 126,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -10,
          top: -10,
          width: 82,
          height: 82,
          borderRadius: '50%',
          background: `${accent}18`,
        }}
      />
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${accent}16`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 8, color: 'var(--nowa-text)', fontWeight: 900, lineHeight: 1 }}>
        <span style={{ fontSize: 38 }}>{value}</span>
        {suffix ? <span style={{ marginLeft: 4, fontSize: 15 }}>{suffix}</span> : null}
      </div>
    </div>
  )
}

function SectionCard({ title, extra, children }) {
  return (
    <Card
      className="nowa-card"
      title={<span style={{ fontWeight: 800 }}>{title}</span>}
      extra={extra}
      styles={{ body: { padding: 18 } }}
    >
      {children}
    </Card>
  )
}

export default function MocvdOverview() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [machines, setMachines] = useState([])
  const [sourceStatus, setSourceStatus] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [machineRes, statusRes] = await Promise.all([
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/source-status'),
      ])

      if (!machineRes.ok || !statusRes.ok) {
        throw new Error('종합 현황 데이터를 불러오지 못했습니다.')
      }

      const [machineJson, statusJson] = await Promise.all([machineRes.json(), statusRes.json()])
      setMachines(Array.isArray(machineJson) ? machineJson : [])
      setSourceStatus(statusJson)
    } catch (err) {
      setError(err.message || '종합 현황 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sourceSummary = sourceStatus?.summary ?? {}
  const machineRows = useMemo(() => {
    const rows = sourceStatus?.machine_rows ?? []
    return [...rows].slice(0, 8)
  }, [sourceStatus])

  const todayItems = useMemo(() => {
    const items = sourceStatus?.selected_date_items ?? []
    return [...items].slice(0, 8)
  }, [sourceStatus])

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  if (error) {
    return <Alert type="error" showIcon message={error} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          border: '1px solid var(--nowa-border)',
          background: 'var(--nowa-hero-bg)',
          boxShadow: 'var(--nowa-shadow-card)',
        }}
      >
        <div style={{ color: 'var(--nowa-text)', fontSize: 20, fontWeight: 900, marginBottom: 6 }}>MOCVD 종합 현황판</div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          설비 상태, 소스 교체 일정, 최근 작업 흐름을 한 화면에서 확인합니다.
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="활성 설비" value={machines.filter((row) => row.is_active).length} suffix="대" icon={<ControlOutlined />} accent="#6366f1" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="소스 항목" value={sourceSummary.sourceCount ?? 0} suffix="건" icon={<CheckCircleOutlined />} accent="#14b8a6" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="교체 임박/초과" value={sourceSummary.criticalCount ?? 0} suffix="건" icon={<WarningOutlined />} accent="#f59e0b" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="잔량 부족" value={sourceSummary.lowInventoryCount ?? 0} suffix="건" icon={<ClockCircleOutlined />} accent="#ef4444" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <SectionCard title="오늘 교체 일정" extra={<Tag color="processing">{todayItems.length}건 표시</Tag>}>
            {todayItems.length === 0 ? (
              <Empty description="표시할 일정이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {todayItems.map((item, index) => (
                  <div
                    key={`${item.machine_no}-${item.source_name}-${index}`}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid var(--nowa-border)',
                      background: 'var(--nowa-soft-fill)',
                    }}
                  >
                    <div style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>{formatMachineLabel(item.machine_no)}</div>
                    <div style={{ marginTop: 6, color: 'var(--nowa-text-muted)', fontSize: 13 }}>{item.source_name}</div>
                    <div style={{ marginTop: 10 }}>
                      <Tag color={item.status === 'critical' ? 'red' : item.status === 'warning' ? 'gold' : 'blue'}>
                        {item.status === 'critical' ? '부족' : item.status === 'warning' ? '임박' : '예정'}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={10}>
          <SectionCard title="설비별 위험도 Top" extra={<Tag color="purple">{machineRows.length}대</Tag>}>
            {machineRows.length === 0 ? (
              <Empty description="표시할 설비가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {machineRows.map((row) => (
                  <div
                    key={row.machine_no}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid var(--nowa-border)',
                      background: 'var(--nowa-soft-fill)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>{formatMachineLabel(row.machine_no)}</div>
                      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>
                        다음 교체 {row.nextReplacementDate || '-'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(row.focusSources ?? []).slice(0, 3).map((name) => (
                        <Tag key={name} color="blue" style={{ marginInlineEnd: 0 }}>
                          {name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SectionCard title="소스관리 바로가기" extra={<Tag color="cyan">연동</Tag>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--nowa-text-muted)', fontSize: 14 }}>
              <div>소스 입력: 초기량, 교체기준, 일사용량, 잔량 입력</div>
              <div>설비별 소스현황: 부족/임박 설비 카드형 모니터링</div>
              <div>소스교체 작업 일지: 실린더, LOT, 사용량, 작업자 기록</div>
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="운영 항목 요약" extra={<Tag color="green">확장 가능</Tag>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nowa-text)' }}>
                <span><CalendarOutlined /> PM주기 계획</span>
                <span style={{ color: 'var(--nowa-text-muted)' }}>설비별 주기/예정일 관리</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nowa-text)' }}>
                <span><FileTextOutlined /> 업무 일지</span>
                <span style={{ color: 'var(--nowa-text-muted)' }}>이상/조치/중요도 기록</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nowa-text)' }}>
                <span><CheckCircleOutlined /> 기준정보관리</span>
                <span style={{ color: 'var(--nowa-text-muted)' }}>설비/소스 기준 마스터</span>
              </div>
            </div>
          </SectionCard>
        </Col>
      </Row>
    </div>
  )
}
