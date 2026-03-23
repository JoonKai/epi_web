import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Popconfirm, Row, Select, Skeleton, Switch, Tabs, Tag, Tooltip, message } from 'antd'
import {
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { useThemeMode } from '../../../theme/useThemeMode'
import WorkLog from './WorkLog'

function getMachineRiskStatus(sources, forcedDown) {
  if (forcedDown) return 'forced'

  let critical = 0
  let warning = 0
  sources.forEach(({ remaining, daily_usage }) => {
    if (daily_usage <= 0) return
    const days = remaining / daily_usage
    if (days <= 7) critical += 1
    else if (days <= 20) warning += 1
  })

  if (critical > 0) return 'down'
  if (warning > 0) return 'warning'
  return 'normal'
}

const STATUS_META = {
  forced: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.28)',
    label: '강제 다운',
    icon: <CloseCircleOutlined />,
  },
  down: {
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.28)',
    label: '다운 위험',
    icon: <AlertOutlined />,
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.24)',
    label: '주의',
    icon: <WarningOutlined />,
  },
  normal: {
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.08)',
    border: 'rgba(20,184,166,0.24)',
    label: '정상',
    icon: <CheckCircleOutlined />,
  },
  inactive: {
    color: '#64748b',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.18)',
    label: '비활성',
    icon: <CloseCircleOutlined />,
  },
}

function getRiskSources(sources) {
  return sources
    .map((source) => {
      if (source.daily_usage <= 0) return { ...source, daysLeft: null, risk: 'idle' }
      const daysLeft = source.remaining / source.daily_usage
      if (daysLeft <= 7) return { ...source, daysLeft, risk: 'down' }
      if (daysLeft <= 20) return { ...source, daysLeft, risk: 'warning' }
      return { ...source, daysLeft, risk: 'normal' }
    })
    .sort((a, b) => {
      const rank = { down: 0, warning: 1, normal: 2, idle: 3 }
      if (rank[a.risk] !== rank[b.risk]) return rank[a.risk] - rank[b.risk]
      if (a.daysLeft == null && b.daysLeft == null) return a.source_name.localeCompare(b.source_name)
      if (a.daysLeft == null) return 1
      if (b.daysLeft == null) return -1
      return a.daysLeft - b.daysLeft
    })
}

function RiskBar({ name, remaining, daily_usage }) {
  const daysLeft = daily_usage > 0 ? remaining / daily_usage : null
  const color = daysLeft == null ? '#475569' : daysLeft <= 7 ? '#f43f5e' : daysLeft <= 20 ? '#f59e0b' : '#14b8a6'
  const pct = daysLeft == null ? 12 : Math.min(100, (daysLeft / 45) * 100)

  return (
    <Tooltip title={daysLeft == null ? `${name}: 사용량 미입력` : `${name}: 약 ${Math.max(daysLeft, 0).toFixed(0)}일 잔여`}>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 14,
            color: 'var(--nowa-text-muted)',
            marginBottom: 4,
          }}
        >
          <span>{name}</span>
          <span style={{ color }}>{daysLeft == null ? '-' : `${Math.max(daysLeft, 0).toFixed(0)}일`}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(196,210,226,0.14)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.25s ease' }} />
        </div>
      </div>
    </Tooltip>
  )
}

function MachineCard({ machine_no, description, is_active, forcedDown, sources }) {
  const { isLight } = useThemeMode()
  const status = is_active ? getMachineRiskStatus(sources, forcedDown) : 'inactive'
  const meta = STATUS_META[status]
  const riskySources = getRiskSources(sources)
  const aggregateSource = forcedDown ? null : riskySources.find((item) => item.daysLeft != null) ?? null

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${meta.border}`,
        background: isLight ? 'var(--nowa-bg-raised)' : meta.bg,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 248,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: meta.color }}>{formatMachineLabel(machine_no)}</div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 2 }}>{description || '설비 설명 없음'}</div>
        </div>
        <Tag style={{ margin: 0, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 999, fontWeight: 700 }}>
          {meta.icon} {meta.label}
        </Tag>
      </div>

      <div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>다운 리스크 요인</div>
        {forcedDown ? (
          <div style={{ color: meta.color, fontSize: 14, fontWeight: 700 }}>강제 다운으로 지정된 설비입니다.</div>
        ) : aggregateSource == null ? (
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>등록된 리스크 데이터가 없습니다.</div>
        ) : (
          <RiskBar key={`${machine_no}:aggregate-source`} name="소스" remaining={aggregateSource.daysLeft} daily_usage={1} />
        )}
      </div>

      <div style={{ marginTop: 'auto', color: 'var(--nowa-text-muted)', fontSize: 14 }}>
        {forcedDown ? '현황판에서 강제 다운 상태로 표시됩니다.' : '현재 소스 상태를 기준으로 리스크를 표시합니다.'}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, suffix, gradient, accent, icon, sub }) {
  const resolvedAccent = accent || gradient.match(/#[0-9a-fA-F]{6}/)?.[0] || '#aeb8c9'
  return (
    <div
      className="nowa-kpi-card"
      style={{
        minHeight: 124,
        padding: '16px 18px',
        borderRadius: 18,
        background: `linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(10,15,27,0.98) 100%), ${gradient}`,
        border: '1px solid var(--nowa-border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: gradient, opacity: 0.14, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient, opacity: 0.95 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ color: resolvedAccent, fontSize: 14, fontWeight: 700, paddingTop: 2 }}>{label}</div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: `${resolvedAccent}18`,
            border: `1px solid ${resolvedAccent}30`,
            color: resolvedAccent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 10, color: 'var(--nowa-text)', fontSize: 30, fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 1 }}>
        {value}
        {suffix ? <span style={{ fontSize: 14, marginLeft: 4, color: `${resolvedAccent}cc`, fontWeight: 700 }}>{suffix}</span> : null}
      </div>
      {sub ? <div style={{ color: `${resolvedAccent}cc`, fontSize: 14, marginTop: 10, position: 'relative', zIndex: 1 }}>{sub}</div> : null}
    </div>
  )
}

// ── 장비 이력 ──────────────────────────────────────────────────────────

const EVENT_META = {
  failure: { label: '고장', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', icon: '⚠' },
  repair:  { label: '수리/교체', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', icon: '🔧' },
  pm:      { label: '정기점검', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', icon: '📋' },
  issue:   { label: '이슈', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', icon: '❗' },
  action:  { label: '조치', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', icon: '✅' },
  other:   { label: '기타', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)', icon: '📌' },
}

const SEVERITY_META = {
  high:   { label: '심각', color: '#f43f5e' },
  medium: { label: '보통', color: '#f59e0b' },
  low:    { label: '경미', color: '#34d399' },
}

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_META).map(([value, { label }]) => ({ value, label }))
const SEVERITY_OPTIONS = Object.entries(SEVERITY_META).map(([value, { label }]) => ({ value, label }))

function EquipmentHistoryTab({ machineList }) {
  const [selectedMachineNo, setSelectedMachineNo] = useState(null)
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form] = Form.useForm()

  const activeMachines = useMemo(() => machineList.filter((m) => m.is_active), [machineList])

  useEffect(() => {
    if (!selectedMachineNo && activeMachines.length > 0) {
      setSelectedMachineNo(activeMachines[0].machine_no)
    }
  }, [activeMachines, selectedMachineNo])

  const fetchHistory = useCallback(async (machineNo) => {
    if (!machineNo) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/mocvd/equipment-history?machine_no=${machineNo}`)
      const json = await res.json()
      setHistories(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(selectedMachineNo)
  }, [selectedMachineNo, fetchHistory])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return histories
    return histories.filter((h) => h.event_type === typeFilter)
  }, [histories, typeFilter])

  // 월별 그룹
  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach((h) => {
      const key = dayjs(h.occurred_at).format('YYYY년 MM월')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(h)
    })
    return [...map.entries()]
  }, [filtered])

  const openCreate = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ event_type: 'failure', severity: 'medium', occurred_at: dayjs() })
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue({
      event_type: item.event_type,
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      actor: item.actor,
      occurred_at: item.occurred_at ? dayjs(item.occurred_at) : null,
      resolved_at: item.resolved_at ? dayjs(item.resolved_at) : null,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    const payload = {
      machine_no: selectedMachineNo,
      event_type: values.event_type,
      severity: values.severity,
      title: values.title,
      detail: values.detail || '',
      actor: values.actor || '',
      occurred_at: values.occurred_at ? values.occurred_at.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      resolved_at: values.resolved_at ? values.resolved_at.format('YYYY-MM-DD') : null,
    }
    try {
      if (editingItem) {
        await authFetch(`/api/mocvd/equipment-history/${editingItem.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        message.success('이력을 수정했습니다.')
      } else {
        await authFetch('/api/mocvd/equipment-history', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        message.success('이력을 추가했습니다.')
      }
      setModalOpen(false)
      fetchHistory(selectedMachineNo)
    } catch {
      message.error('저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await authFetch(`/api/mocvd/equipment-history/${id}`, { method: 'DELETE' })
      message.success('이력을 삭제했습니다.')
      fetchHistory(selectedMachineNo)
    } catch {
      message.error('삭제에 실패했습니다.')
    }
  }

  const selectedMachine = activeMachines.find((m) => m.machine_no === selectedMachineNo)

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 600 }}>
      {/* 좌측 설비 선택 패널 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <Card className="nowa-card" styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(245,158,11,0.14)', fontSize: 14, fontWeight: 700, color: 'rgba(245,158,11,0.8)', letterSpacing: 1 }}>
            설비 선택
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {activeMachines.map((m) => {
              const selected = m.machine_no === selectedMachineNo
              return (
                <div
                  key={m.machine_no}
                  onClick={() => setSelectedMachineNo(m.machine_no)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(196,210,226,0.07)',
                    background: selected ? 'rgba(245,158,11,0.12)' : 'transparent',
                    borderLeft: selected ? '3px solid #f59e0b' : '3px solid transparent',
                    transition: 'all 0.12s',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14, color: selected ? '#fbbf24' : 'var(--nowa-text)' }}>
                    {formatMachineLabel(m.machine_no)}
                  </span>
                  {m.description && (
                    <span style={{ fontSize: 14, color: 'var(--nowa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.description}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* 우측 타임라인 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Card
          className="nowa-card"
          styles={{ body: { padding: '16px 20px' } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HistoryOutlined style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>
                {selectedMachine ? formatMachineLabel(selectedMachine.machine_no) : '-'} 장비 이력
              </span>
              <Tag style={{ marginLeft: 4, borderRadius: 99 }}>{filtered.length}건</Tag>
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                size="small"
                style={{ width: 110 }}
                options={[{ value: 'all', label: '전체 유형' }, ...EVENT_TYPE_OPTIONS]}
              />
              <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openCreate} disabled={!selectedMachineNo}>
                이력 추가
              </Button>
              <Button icon={<ReloadOutlined />} size="small" onClick={() => fetchHistory(selectedMachineNo)} />
            </div>
          }
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : filtered.length === 0 ? (
            <Empty description="등록된 이력이 없습니다." style={{ padding: '48px 0' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {grouped.map(([month, items]) => (
                <div key={month}>
                  {/* 월 구분선 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 16px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(245,158,11,0.5)', flexShrink: 0, marginLeft: 3 }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(245,158,11,0.8)' }}>{month}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.15)' }} />
                    <span style={{ fontSize: 14, color: 'var(--nowa-text-muted)' }}>{items.length}건</span>
                  </div>

                  {/* 타임라인 아이템들 */}
                  <div style={{ paddingLeft: 8 }}>
                    {items.map((item, idx) => {
                      const meta = EVENT_META[item.event_type] ?? EVENT_META.other
                      const sev = SEVERITY_META[item.severity] ?? SEVERITY_META.medium
                      const isLast = idx === items.length - 1
                      return (
                        <div key={item.id} style={{ display: 'flex', gap: 0, position: 'relative' }}>
                          {/* 타임라인 세로선 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: meta.bg, border: `2px solid ${meta.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, zIndex: 1,
                            }}>
                              {meta.icon}
                            </div>
                            {!isLast && (
                              <div style={{ flex: 1, width: 2, background: 'rgba(196,210,226,0.12)', minHeight: 20, margin: '4px 0' }} />
                            )}
                          </div>

                          {/* 카드 */}
                          <div style={{
                            flex: 1, marginLeft: 12, marginBottom: isLast ? 4 : 16,
                            background: meta.bg, border: `1px solid ${meta.border}`,
                            borderRadius: 12, padding: '12px 14px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                  <Tag style={{ margin: 0, borderRadius: 99, fontSize: 14, fontWeight: 700, color: meta.color, background: 'transparent', border: `1px solid ${meta.border}`, padding: '0 8px' }}>
                                    {meta.label}
                                  </Tag>
                                  <Tag style={{ margin: 0, borderRadius: 99, fontSize: 14, fontWeight: 700, color: sev.color, background: 'transparent', border: `1px solid ${sev.color}55`, padding: '0 8px' }}>
                                    {sev.label}
                                  </Tag>
                                  {item.resolved_at && (
                                    <Tag style={{ margin: 0, borderRadius: 99, fontSize: 14, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', padding: '0 8px' }}>
                                      해결됨
                                    </Tag>
                                  )}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--nowa-text)', marginBottom: 4 }}>{item.title}</div>
                                {item.detail && (
                                  <div style={{ fontSize: 14, color: 'var(--nowa-text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.detail}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(item)} style={{ borderRadius: 6 }} />
                                <Popconfirm title="이 이력을 삭제하시겠습니까?" onConfirm={() => handleDelete(item.id)} okText="삭제" okButtonProps={{ danger: true }}>
                                  <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                                </Popconfirm>
                              </div>
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 14, color: 'var(--nowa-text-muted)', flexWrap: 'wrap' }}>
                              <span>📅 발생: <b style={{ color: meta.color }}>{dayjs(item.occurred_at).format('YYYY-MM-DD')}</b></span>
                              {item.resolved_at && <span>✅ 해결: <b style={{ color: '#34d399' }}>{dayjs(item.resolved_at).format('YYYY-MM-DD')}</b></span>}
                              {item.actor && <span>👤 {item.actor}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 이력 추가/수정 모달 */}
      <Modal
        title={editingItem ? '이력 수정' : '이력 추가'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingItem ? '수정' : '추가'}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="event_type" label="유형" rules={[{ required: true }]}>
                <Select options={EVENT_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="심각도" rules={[{ required: true }]}>
                <Select options={SEVERITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력하세요.' }]}>
            <Input placeholder="예: TMGa 소스 공급 이상 발생" />
          </Form.Item>
          <Form.Item name="detail" label="상세 내용">
            <Input.TextArea rows={4} placeholder="발생 경위, 조치 내용 등 상세하게 입력하세요." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="occurred_at" label="발생일" rules={[{ required: true, message: '발생일을 선택하세요.' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="resolved_at" label="해결일 (선택)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="actor" label="작성자">
            <Input placeholder="담당자 이름" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function ForceDownTab({ machineList, pendingForcedDownMap, onToggle, onResetAll, onSave, saving }) {
  const rows = machineList.filter((machine) => machine.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card className="nowa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--nowa-text)' }}>장비 강제 다운</div>
            <div style={{ color: 'var(--nowa-text-muted)', marginTop: 4 }}>특정 MO 설비를 수동으로 다운 상태로 고정합니다.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={onResetAll} disabled={saving}>
              전설비 정상화
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
              저장
            </Button>
          </div>
        </div>
      </Card>

      <Row gutter={[12, 12]}>
        {rows.map((machine) => {
          const forced = pendingForcedDownMap[machine.machine_no] ?? false
          return (
            <Col key={machine.machine_no} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card className="nowa-card" styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: forced ? '#ef4444' : 'var(--nowa-text)', fontWeight: 800, fontSize: 16 }}>
                      {formatMachineLabel(machine.machine_no)}
                    </div>
                    <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 4 }}>
                      {machine.description || '설비 설명 없음'}
                    </div>
                  </div>
                  <Switch checked={forced} onChange={(checked) => onToggle(machine.machine_no, checked)} />
                </div>
                <div style={{ marginTop: 14, color: forced ? '#ef4444' : 'var(--nowa-text-muted)', fontSize: 14, fontWeight: forced ? 700 : 500 }}>
                  {forced ? '현황판에서 강제 다운으로 표시됩니다.' : '현재는 강제 다운 미적용 상태입니다.'}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

function OverviewTab({ machineList, filtered, filter, setFilter, search, setSearch, fetchAll }) {
  const statusMap = useMemo(() => {
    const next = {}
    machineList.forEach((machine) => {
      next[machine.machine_no] = machine.is_active ? getMachineRiskStatus(machine.sources, machine.forced_down) : 'inactive'
    })
    return next
  }, [machineList])

  const activeCount = machineList.filter((machine) => machine.is_active).length
  const downCount = machineList.filter((machine) => statusMap[machine.machine_no] === 'down' || statusMap[machine.machine_no] === 'forced').length
  const warningCount = machineList.filter((machine) => statusMap[machine.machine_no] === 'warning').length

  const filterButtons = [
    { key: 'all', label: '전체', color: undefined },
    { key: 'forced', label: '강제 다운', color: '#ef4444' },
    { key: 'down', label: '다운 위험', color: '#f43f5e' },
    { key: 'warning', label: '주의', color: '#f59e0b' },
    { key: 'normal', label: '정상', color: '#14b8a6' },
  ]

  const riskChartRows = machineList
    .map((machine) => {
      const riskSources = getRiskSources(machine.sources)
      return {
        machine_no: machine.machine_no,
        forced: machine.forced_down ? 1 : 0,
        down: machine.forced_down ? 0 : riskSources.filter((item) => item.risk === 'down').length,
        warning: machine.forced_down ? 0 : riskSources.filter((item) => item.risk === 'warning').length,
      }
    })
    .filter((machine) => machine.forced > 0 || machine.down > 0 || machine.warning > 0)
    .sort((a, b) => (b.forced + b.down + b.warning) - (a.forced + a.down + a.warning))
    .slice(0, 20)

  const distributionBuckets = [
    { label: '7일 이내', max: 7, color: '#f43f5e' },
    { label: '14일 이내', max: 14, color: '#fb7185' },
    { label: '30일 이내', max: 30, color: '#f59e0b' },
    { label: '60일 이내', max: 60, color: '#60a5fa' },
    { label: '60일 초과', max: Number.POSITIVE_INFINITY, color: '#14b8a6' },
  ]
  const distributionCounts = distributionBuckets.map(() => 0)
  machineList.forEach((machine) => {
    if (machine.forced_down) {
      distributionCounts[0] += 1
      return
    }
    machine.sources.forEach((source) => {
      if (source.daily_usage <= 0) return
      const daysLeft = source.remaining / source.daily_usage
      for (let i = 0; i < distributionBuckets.length; i += 1) {
        if (daysLeft <= distributionBuckets[i].max) {
          distributionCounts[i] += 1
          break
        }
      }
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div>
            <div className="nowa-page-kicker">설비 관리</div>
            <div className="nowa-page-title" style={{ fontSize: 24 }}>MOCVD 장비 현황판</div>
            <div className="nowa-page-desc">현재 소스 사용 데이터와 강제 다운 지정 상태를 기준으로 장비 상태를 보여줍니다.</div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} className="nowa-btn">
            현황 새로고침
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <SummaryCard label="가동 설비" value={activeCount} suffix="대" accent="#818cf8" gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" icon={<ToolOutlined />} sub="현재 운영 중인 설비" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="다운 위험 설비" value={downCount} suffix="대" accent="#fb7185" gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)" icon={<AlertOutlined />} sub="강제 다운 포함" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard label="주의 설비" value={warningCount} suffix="대" accent="#fbbf24" gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)" icon={<WarningOutlined />} sub="단기 점검 필요 대상" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>설비 다운 위험 현황</span>} styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            {riskChartRows.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Alert message="다운 위험 설비가 없습니다." type="success" showIcon />
              </div>
            ) : (
              <ReactECharts
                theme="dark"
                style={{ height: 220 }}
                option={{
                  backgroundColor: 'transparent',
                  grid: { top: 16, bottom: 44, left: 36, right: 16 },
                  tooltip: { trigger: 'axis' },
                  legend: { bottom: 4, textStyle: { color: '#b0c0d0', fontSize: 14 } },
                  xAxis: {
                    type: 'category',
                    data: riskChartRows.map((row) => `${row.machine_no}`),
                    axisLabel: { color: '#64748b', fontSize: 14, rotate: 30 },
                    axisLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  yAxis: {
                    type: 'value',
                    minInterval: 1,
                    axisLabel: { color: '#64748b', fontSize: 14 },
                    splitLine: { lineStyle: { color: '#1e2a3c' } },
                  },
                  series: [
                    { name: '강제 다운', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.forced), itemStyle: { color: '#ef4444' }, barMaxWidth: 28 },
                    { name: '다운 위험', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.down), itemStyle: { color: '#f43f5e' }, barMaxWidth: 28 },
                    { name: '주의', type: 'bar', stack: 'risk', data: riskChartRows.map((row) => row.warning), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
                  ],
                }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card className="nowa-card" title={<span style={{ fontSize: 15, fontWeight: 800 }}>다운 예상 시기 분포</span>} styles={{ body: { padding: '8px 12px 4px' }, header: { minHeight: 52 } }}>
            <ReactECharts
              theme="dark"
              style={{ height: 220 }}
              option={{
                backgroundColor: 'transparent',
                grid: { top: 16, bottom: 44, left: 48, right: 16 },
                tooltip: { trigger: 'axis' },
                xAxis: {
                  type: 'category',
                  data: distributionBuckets.map((bucket) => bucket.label),
                  axisLabel: { color: '#64748b', fontSize: 14, rotate: 20 },
                  axisLine: { lineStyle: { color: '#1e2a3c' } },
                },
                yAxis: {
                  type: 'value',
                  minInterval: 1,
                  axisLabel: { color: '#64748b', fontSize: 14 },
                  splitLine: { lineStyle: { color: '#1e2a3c' } },
                },
                series: [
                  {
                    type: 'bar',
                    data: distributionCounts.map((value, index) => ({ value, itemStyle: { color: distributionBuckets[index].color, borderRadius: [4, 4, 0, 0] } })),
                    barMaxWidth: 48,
                    label: { show: true, position: 'top', color: '#b0c0d0', fontSize: 14 },
                  },
                ],
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="nowa-card" styles={{ body: { padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder="호기 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => setFilter(button.key)}
              style={{
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 600,
                border: filter === button.key ? `1.5px solid ${button.color ?? '#6366f1'}` : '1.5px solid rgba(100,116,139,0.25)',
                background: filter === button.key ? (button.color ? `${button.color}22` : 'rgba(99,102,241,0.12)') : 'transparent',
                color: filter === button.key ? button.color ?? '#a5b4fc' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 14 }}>{filtered.length}대 표시</span>
      </Card>

      <Row gutter={[12, 12]}>
        {filtered.map((machine) => (
          <Col key={machine.machine_no} xs={24} sm={12} md={8} lg={6} xl={4}>
            <MachineCard {...machine} />
          </Col>
        ))}
      </Row>

      {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>조건에 맞는 설비가 없습니다.</div> : null}
    </div>
  )
}

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.18)',
  marginBottom: 20,
  paddingBottom: 0,
}

export default function MocvdManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [sourceData, setSourceData] = useState({ rows: [], source_names: [] })
  const [forcedDown, setForcedDown] = useState([])
  const [pendingForcedDownMap, setPendingForcedDownMap] = useState({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, sRes, fRes] = await Promise.all([
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/sources/all'),
        authFetch('/api/mocvd/forced-down'),
      ])
      const [mJson, sJson, fJson] = await Promise.all([mRes.json(), sRes.json(), fRes.json()])
      setMachines(Array.isArray(mJson) ? mJson : [])
      setSourceData(sJson)
      const machineNos = Array.isArray(fJson.machine_nos) ? fJson.machine_nos : []
      setForcedDown(machineNos)
      setPendingForcedDownMap(Object.fromEntries(machineNos.map((machineNo) => [machineNo, true])))
    } catch {
      setError('MOCVD 설비 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const machineList = useMemo(() => {
    const rows = sourceData.rows ?? []
    const sourceNames = sourceData.source_names ?? []
    const rowMap = new Map(rows.map((row) => [row.machine_no, row]))
    const forcedDownSet = new Set(forcedDown)

    return machines.map((machine) => {
      const row = rowMap.get(machine.machine_no) ?? {}
      const sources = sourceNames.map((name) => ({
        source_name: name,
        remaining: row[name] ?? 0,
        daily_usage: row[`${name}_daily_usage`] ?? 0,
      }))
      return { ...machine, forced_down: forcedDownSet.has(machine.machine_no), sources }
    })
  }, [machines, sourceData, forcedDown])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return machineList.filter((machine) => {
      if (
        keyword &&
        !`${machine.machine_no}`.includes(keyword) &&
        !formatMachineLabel(machine.machine_no).toLowerCase().includes(keyword) &&
        !(machine.description ?? '').toLowerCase().includes(keyword)
      ) {
        return false
      }
      const status = machine.is_active ? getMachineRiskStatus(machine.sources, machine.forced_down) : 'inactive'
      if (filter !== 'all' && status !== filter) return false
      return true
    })
  }, [machineList, search, filter])

  const handleToggleForcedDown = useCallback((machineNo, checked) => {
    setPendingForcedDownMap((prev) => {
      const next = { ...prev }
      if (checked) next[machineNo] = true
      else delete next[machineNo]
      return next
    })
  }, [])

  const handleResetAllForcedDown = useCallback(() => {
    setPendingForcedDownMap({})
  }, [])

  const handleSaveForcedDown = useCallback(async () => {
    setSaving(true)
    try {
      const machineNos = Object.entries(pendingForcedDownMap)
        .filter(([, checked]) => checked)
        .map(([machineNo]) => Number(machineNo))
        .sort((a, b) => a - b)

      const res = await authFetch('/api/mocvd/forced-down', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_nos: machineNos }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || '강제 다운 저장에 실패했습니다.')
      }

      message.success('장비 강제 다운 상태를 저장했습니다.')
      setForcedDown(machineNos)
    } catch (error) {
      message.error(error.message || '강제 다운 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [pendingForcedDownMap])

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (error) return <Alert type="error" showIcon message={error} />

  return (
    <Tabs
      tabBarStyle={tabBarStyle}
      items={[
        {
          key: 'overview',
          label: <span><DashboardOutlined /> 장비 현황판</span>,
          children: (
            <OverviewTab
              machineList={machineList}
              filtered={filtered}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              fetchAll={fetchAll}
            />
          ),
        },
        {
          key: 'forced-down',
          label: <span><PoweroffOutlined /> 장비 강제 다운</span>,
          children: (
            <ForceDownTab
              machineList={machineList}
              pendingForcedDownMap={pendingForcedDownMap}
              onToggle={handleToggleForcedDown}
              onResetAll={handleResetAllForcedDown}
              onSave={handleSaveForcedDown}
              saving={saving}
            />
          ),
        },
        {
          key: 'work-log',
          label: <span><FileTextOutlined /> 업무 일지</span>,
          children: <div style={{ paddingTop: 12 }}><WorkLog /></div>,
        },
        {
          key: 'equipment-history',
          label: <span><HistoryOutlined /> 장비 이력</span>,
          children: <EquipmentHistoryTab machineList={machineList} />,
        },
      ]}
    />
  )
}
