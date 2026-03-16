import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Tag,
  message,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch, useAuth } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

function SummaryTile({ title, value, suffix, icon, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 18,
        borderRadius: 18,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-hero-bg)',
        boxShadow: 'var(--nowa-shadow-card)',
        minHeight: 118,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
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
    </button>
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

function LinkButton({ label, onClick, icon }) {
  return (
    <Button onClick={onClick} icon={icon} style={{ justifyContent: 'flex-start' }}>
      {label}
    </Button>
  )
}

function NoticeBoard() {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notices, setNotices] = useState([])

  const isAdmin = user?.role === 'admin'

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/notices')
      if (!res.ok) throw new Error('공지사항을 불러오지 못했습니다.')
      setNotices(await res.json())
    } catch (err) {
      message.error(err.message || '공지사항을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

  useEffect(() => {
    form.setFieldsValue({ title: '', content: '' })
  }, [form])

  const marqueeItems = useMemo(() => {
    if (notices.length === 0) {
      return ['공지사항이 없습니다. 관리자 계정으로 공지를 등록할 수 있습니다.']
    }
    return notices.map((notice) => {
      const title = (notice.title || '').trim()
      return title ? `[${title}] ${notice.content}` : notice.content
    })
  }, [notices])

  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
    form.resetFields()
    form.setFieldsValue({ title: '', content: '' })
  }

  const startEdit = (notice) => {
    setEditingId(notice.id)
    setShowForm(true)
    form.setFieldsValue({
      title: notice.title || '',
      content: notice.content || '',
    })
  }

  const submitNotice = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        title: values.title?.trim() || '',
        content: values.content.trim(),
        is_active: true,
      }
      const path = editingId ? `/api/mocvd/notices/${editingId}` : '/api/mocvd/notices'
      const method = editingId ? 'PUT' : 'POST'
      const res = await authFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '공지사항 저장에 실패했습니다.')
      message.success(editingId ? '공지사항을 수정했습니다.' : '공지사항을 등록했습니다.')
      resetForm()
      fetchNotices()
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || '공지사항 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeNotice = async (noticeId) => {
    const res = await authFetch(`/api/mocvd/notices/${noticeId}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '공지사항 삭제에 실패했습니다.')
      return
    }
    message.success('공지사항을 삭제했습니다.')
    if (editingId === noticeId) resetForm()
    fetchNotices()
  }

  return (
    <SectionCard
      title="공지사항"
      extra={
        <Space>
          {isAdmin ? (
            <Button type="primary" size="small" onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? '폼 닫기' : '공지 등록'}
            </Button>
          ) : null}
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {notices.length}건
          </Tag>
        </Space>
      }
    >
      <div
        style={{
          border: '1px solid var(--nowa-border)',
          borderRadius: 16,
          background: 'var(--nowa-soft-fill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
          }}
        >
          <Tag color="processing" style={{ marginInlineEnd: 0 }}>
            공지
          </Tag>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div className="notice-marquee">
              <div className="notice-marquee-track">
                {[...marqueeItems, ...marqueeItems].map((text, index) => (
                  <span key={`${index}-${text}`} className="notice-marquee-item">
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showForm && isAdmin ? (
          <div style={{ padding: 12, borderTop: '1px solid var(--nowa-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)', gap: 12 }}>
              <Card
                className="nowa-card"
                styles={{ body: { padding: 16 } }}
                title={<span style={{ fontWeight: 800 }}>{editingId ? '공지 수정' : '공지 작성'}</span>}
                extra={
                  <Space>
                    {editingId ? <Button onClick={resetForm}>취소</Button> : null}
                    <Button type="primary" onClick={submitNotice} loading={saving}>
                      {editingId ? '수정 저장' : '공지 등록'}
                    </Button>
                  </Space>
                }
              >
                <Form form={form} layout="vertical">
                  <Form.Item name="title" label="제목">
                    <Input placeholder="예: PM 점검 일정 변경 안내" />
                  </Form.Item>
                  <Form.Item
                    name="content"
                    label="내용"
                    rules={[{ required: true, message: '공지 내용을 입력하세요.' }]}
                  >
                    <Input.TextArea rows={5} placeholder="상단에 흐를 공지 문구를 입력하세요." />
                  </Form.Item>
                </Form>
              </Card>

              <Card className="nowa-card" styles={{ body: { padding: 16 } }} title="공지 목록">
                {loading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : notices.length === 0 ? (
                  <Empty description="등록된 공지사항이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                    {notices.map((notice) => (
                      <div
                        key={notice.id}
                        style={{
                          border: '1px solid var(--nowa-border)',
                          borderRadius: 14,
                          padding: 14,
                          background: 'var(--nowa-soft-fill)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>{notice.title || '공지사항'}</div>
                            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 4 }}>
                              {notice.author || '-'} / {notice.updated_at || notice.created_at || '-'}
                            </div>
                          </div>
                          <Space size={6}>
                            <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(notice)}>
                              수정
                            </Button>
                            <Popconfirm title="이 공지사항을 삭제하시겠습니까?" onConfirm={() => removeNotice(notice.id)}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                        <div style={{ marginTop: 10, color: 'var(--nowa-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {notice.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

function HandoverBoard() {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notes, setNotes] = useState([])

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/handover-notes')
      if (!res.ok) throw new Error('인수인계일지를 불러오지 못했습니다.')
      setNotes(await res.json())
    } catch (err) {
      message.error(err.message || '인수인계일지를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    form.setFieldsValue({
      handover_date: dayjs(),
      title: '',
      content: '',
    })
  }, [form])

  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
    form.resetFields()
    form.setFieldsValue({ handover_date: dayjs(), title: '', content: '' })
  }

  const submitNote = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        handover_date: values.handover_date.format('YYYY-MM-DD'),
        shift_type: 'day',
        title: values.title?.trim() || '',
        content: values.content.trim(),
      }
      const path = editingId ? `/api/mocvd/handover-notes/${editingId}` : '/api/mocvd/handover-notes'
      const method = editingId ? 'PUT' : 'POST'
      const res = await authFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '인수인계 저장에 실패했습니다.')
      message.success(editingId ? '인수인계 내용을 수정했습니다.' : '인수인계 내용을 등록했습니다.')
      resetForm()
      fetchNotes()
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || '인수인계 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeNote = async (id) => {
    const res = await authFetch(`/api/mocvd/handover-notes/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '인수인계 삭제에 실패했습니다.')
      return
    }
    message.success('인수인계 내용을 삭제했습니다.')
    if (editingId === id) resetForm()
    fetchNotes()
  }

  const beginEdit = (note) => {
    setEditingId(note.id)
    setShowForm(true)
    form.setFieldsValue({
      handover_date: note.handover_date ? dayjs(note.handover_date, 'YYYY-MM-DD') : dayjs(),
      title: note.title,
      content: note.content,
    })
  }

  const canManageNote = useCallback(
    (note) => user?.role === 'admin' || note.author === user?.username,
    [user],
  )

  return (
    <SectionCard
      title="인수인계일지"
      extra={
        <Button type="primary" size="small" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? '폼 닫기' : '인수인계 등록'}
        </Button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: showForm ? 'minmax(320px, 400px) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 12 }}>
        {showForm ? (
          <Card
            className="nowa-card"
            styles={{ body: { padding: 14 } }}
            title={<span style={{ fontWeight: 800 }}>{editingId ? '인수인계 수정' : '인수인계 작성'}</span>}
            extra={
              <Space>
                {editingId ? <Button onClick={resetForm}>취소</Button> : null}
                <Button type="primary" onClick={submitNote} loading={saving}>
                  {editingId ? '수정 저장' : '등록'}
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item name="handover_date" label="기준일" rules={[{ required: true, message: '기준일을 선택하세요.' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="title" label="제목">
                <Input placeholder="예: 106호기 Water leak 점검 인수" />
              </Form.Item>
              <Form.Item name="content" label="내용" rules={[{ required: true, message: '인수인계 내용을 입력하세요.' }]}>
                <Input.TextArea rows={6} placeholder="다음 조가 꼭 알아야 할 설비 상태, 조치 결과, 후속 계획을 입력하세요." />
              </Form.Item>
            </Form>
          </Card>
        ) : null}

        <Card className="nowa-card" styles={{ body: { padding: 10 } }} title="인수인계 목록">
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : notes.length === 0 ? (
            <Empty description="등록된 인수인계가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 210, overflowY: 'auto', paddingRight: 4 }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: '1px solid var(--nowa-border)',
                    borderRadius: 12,
                    padding: 10,
                    background: 'var(--nowa-soft-fill)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'var(--nowa-text)', fontWeight: 800, fontSize: 14 }}>{note.title || '인수인계'}</div>
                      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, marginTop: 3 }}>
                        {note.handover_date} / {note.author || '-'} / {note.updated_at || note.created_at || '-'}
                      </div>
                    </div>
                    {canManageNote(note) ? (
                      <Space size={6}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => beginEdit(note)}>
                          수정
                        </Button>
                        <Popconfirm title="이 인수인계를 삭제하시겠습니까?" onConfirm={() => removeNote(note.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: 'var(--nowa-text)',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 13,
                    }}
                  >
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SectionCard>
  )
}

export default function MocvdOverview() {
  const navigate = useNavigate()
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
  const machineRows = useMemo(() => (sourceStatus?.machine_rows ?? []).slice(0, 8), [sourceStatus])
  const todayItems = useMemo(() => (sourceStatus?.selected_date_items ?? []).slice(0, 8), [sourceStatus])

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (error) return <Alert type="error" showIcon message={error} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <NoticeBoard />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="활성 설비" value={machines.filter((row) => row.is_active).length} suffix="대" icon={<ControlOutlined />} accent="#6366f1" onClick={() => navigate('/epi/mocvd/management')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="소스 항목" value={sourceSummary.sourceCount ?? 0} suffix="건" icon={<NodeIndexOutlined />} accent="#14b8a6" onClick={() => navigate('/epi/mocvd/source?tab=input')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="교체 임박/부족" value={sourceSummary.criticalCount ?? 0} suffix="건" icon={<WarningOutlined />} accent="#f59e0b" onClick={() => navigate('/epi/mocvd/source?tab=status-board')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="잔량 부족" value={sourceSummary.lowInventoryCount ?? 0} suffix="건" icon={<ClockCircleOutlined />} accent="#ef4444" onClick={() => navigate('/epi/mocvd/source?tab=machine-board')} />
        </Col>
      </Row>

      <HandoverBoard />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <SectionCard
            title="오늘 교체 일정"
            extra={
              <Space>
                <Tag color="processing">{todayItems.length}건 표시</Tag>
                <Button size="small" onClick={() => navigate('/epi/mocvd/source?tab=status-board')}>
                  현황 보기
                </Button>
              </Space>
            }
          >
            {todayItems.length === 0 ? (
              <Empty description="표시할 일정이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {todayItems.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.machine_no}-${item.source_name}-${index}`}
                    onClick={() => navigate('/epi/mocvd/source?tab=change-log')}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid var(--nowa-border)',
                      background: 'var(--nowa-soft-fill)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>{formatMachineLabel(item.machine_no)}</div>
                    <div style={{ marginTop: 6, color: 'var(--nowa-text-muted)', fontSize: 13 }}>{item.source_name}</div>
                    <div style={{ marginTop: 10 }}>
                      <Tag color={item.status === 'overdue' ? 'red' : item.status === 'urgent' ? 'gold' : 'green'}>
                        {item.status === 'overdue' ? '부족' : item.status === 'urgent' ? '임박' : '정상'}
                      </Tag>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={10}>
          <SectionCard title="설비별 위험도 Top" extra={<Button size="small" onClick={() => navigate('/epi/mocvd/source?tab=machine-board')}>설비별 소스현황</Button>}>
            {machineRows.length === 0 ? (
              <Empty description="표시할 설비가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {machineRows.map((row) => (
                  <button
                    type="button"
                    key={row.machine_no}
                    onClick={() => navigate('/epi/mocvd/source?tab=machine-board')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid var(--nowa-border)',
                      background: 'var(--nowa-soft-fill)',
                      textAlign: 'left',
                      cursor: 'pointer',
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
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="소스관리 연결" extra={<Tag color="cyan">소스</Tag>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <LinkButton label="소스교체 현황판" icon={<CheckCircleOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=status-board')} />
              <LinkButton label="설비별 소스현황" icon={<WarningOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=machine-board')} />
              <LinkButton label="소스 입력" icon={<NodeIndexOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=input')} />
              <LinkButton label="소스교체 작업 일지" icon={<FileTextOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=change-log')} />
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="PM주기 계획 연결" extra={<Tag color="gold">PM</Tag>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <LinkButton label="PM주기 현황판" icon={<CalendarOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=status')} />
              <LinkButton label="설비별 PM현황" icon={<ControlOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=machine')} />
              <LinkButton label="PM주기 입력" icon={<CheckCircleOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=input')} />
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="기타 운영 연결" extra={<Tag color="green">운영</Tag>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <LinkButton label="MOCVD 관리" icon={<ControlOutlined />} onClick={() => navigate('/epi/mocvd/management')} />
              <LinkButton label="업무 일지" icon={<FileTextOutlined />} onClick={() => navigate('/epi/mocvd/work-log')} />
              <LinkButton label="기준정보관리" icon={<CheckCircleOutlined />} onClick={() => navigate('/epi/mocvd/master-data')} />
            </Space>
          </SectionCard>
        </Col>
      </Row>
    </div>
  )
}
