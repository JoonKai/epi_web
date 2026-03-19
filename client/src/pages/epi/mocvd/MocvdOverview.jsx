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
  Modal,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Tag,
  message,
} from 'antd'
import {
  ApiOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  SwapOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { authFetch, useAuth } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

function SummaryTile({ title, value, suffix, icon, accent, gradient, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="nowa-kpi-card"
        style={{
          minHeight: 124,
          padding: '16px 18px',
          borderRadius: 18,
          background: `linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(10,15,27,0.98) 100%), ${gradient}`,
          border: `1px solid ${accent}30`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.22)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${accent}22 0%, transparent 38%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}66 100%)`,
            opacity: 0.9,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#aeb8c9', fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em', paddingTop: 2 }}>
            {title}
          </div>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: `${accent}18`,
              border: `1px solid ${accent}30`,
              color: accent,
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
          {suffix ? <span style={{ fontSize: 14, marginLeft: 4, color: '#d6dcea', fontWeight: 700 }}>{suffix}</span> : null}
        </div>
        <div style={{ marginTop: 10, color: accent, fontSize: 12, fontWeight: 700, position: 'relative', zIndex: 1 }}>관련 화면으로 이동</div>
      </div>
    </button>
  )
}

function SectionCard({ title, icon, extra, children }) {
  return (
    <Card
      className="nowa-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ color: '#f59e0b', fontSize: 15 }}>{icon}</span>}
          <span style={{ fontWeight: 800 }}>{title}</span>
        </div>
      }
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
  const PRESET_COLORS = [
    '#c4cdd8', '#fbbf24', '#f97316', '#f43f5e',
    '#22c55e', '#3b82f6', '#a78bfa', '#ec4899',
    '#14b8a6', '#ffffff',
  ]

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notices, setNotices] = useState([])
  const [noticeColor, setNoticeColor] = useState('#c4cdd8')

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
    return notices.map((notice) => ({
      text: (notice.title || '').trim() ? `[${notice.title.trim()}] ${notice.content}` : notice.content,
      color: notice.color || '#c4cdd8',
    }))
  }, [notices])

  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
    form.resetFields()
    form.setFieldsValue({ title: '', content: '' })
    setNoticeColor('#c4cdd8')
  }

  const startEdit = (notice) => {
    setEditingId(notice.id)
    setShowForm(true)
    form.setFieldsValue({
      title: notice.title || '',
      content: notice.content || '',
    })
    setNoticeColor(notice.color || '#c4cdd8')
  }

  const submitNotice = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        title: values.title?.trim() || '',
        content: values.content.trim(),
        color: noticeColor,
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
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 16px',
          border: '1px solid rgba(245,158,11,0.2)',
          borderLeft: '3px solid #f59e0b',
          borderRadius: 12,
          background: 'rgba(245,158,11,0.05)',
          overflow: 'hidden',
        }}
      >
        <span style={{ color: '#e8c98a', fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '-0.02em' }}>
          공지사항
        </span>
        <div style={{ width: 1, height: 16, background: 'rgba(245,158,11,0.3)', flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div className="notice-marquee">
            <div className="notice-marquee-track">
              {marqueeItems.map((item, index) => (
                <span
                  key={`${index}-${typeof item === 'string' ? item : item.text}`}
                  className="notice-marquee-item"
                  style={{ color: typeof item === 'string' ? undefined : item.color }}
                >
                  {typeof item === 'string' ? item : item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isAdmin ? (
            <Button type="primary" size="small" onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? '폼 닫기' : '공지 등록'}
            </Button>
          ) : null}
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {notices.length}건
          </Tag>
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
                    <Input placeholder="예: PM 점검 일정 변경 안내" spellCheck={false} autoComplete="off" />
                  </Form.Item>
                  <Form.Item
                    name="content"
                    label="내용"
                    rules={[{ required: true, message: '공지 내용을 입력하세요.' }]}
                  >
                    <Input.TextArea rows={4} placeholder="상단에 흐를 공지 문구를 입력하세요." spellCheck={false} />
                  </Form.Item>
                  <Form.Item label="글자 색상">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {PRESET_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => setNoticeColor(c)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            border: noticeColor === c ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.15)',
                            boxShadow: noticeColor === c ? '0 0 0 2px rgba(245,158,11,0.4)' : 'none',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={noticeColor}
                        onChange={(e) => setNoticeColor(e.target.value)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.15)',
                          padding: 0,
                          cursor: 'pointer',
                          background: 'none',
                        }}
                        title="직접 색상 선택"
                      />
                      <span style={{
                        color: noticeColor,
                        fontWeight: 700,
                        fontSize: 14,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '2px 10px',
                        borderRadius: 8,
                      }}>
                        미리보기
                      </span>
                    </div>
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
  )
}

function AttendanceCard() {
  const [items, setItems] = useState([])
  const [allItems, setAllItems] = useState([]) // 해당월 전체 (휴가류 포함)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(dayjs())
  const [dayCounts, setDayCounts] = useState({})   // { dateStr: { typeName: count } }
  const [typeMap, setTypeMap] = useState({})        // { typeName: { label, color } }
  const [holidays, setHolidays] = useState({})      // { dateStr: holidayName }
  const today = dayjs()
  const isToday = selectedDay.isSame(today, 'day')

  // 공휴일 (연도 변경 시 재로드)
  useEffect(() => {
    authFetch(`/api/shift/holidays?year=${selectedDay.year()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map = {}
          data.forEach((h) => { map[h.date] = h.name })
          setHolidays(map)
        }
      })
      .catch(() => {})
  }, [selectedDay.year()])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [schedRes, typeRes, memberRes] = await Promise.all([
          authFetch(`/api/shift/schedules?year=${selectedDay.year()}&month=${selectedDay.month() + 1}`),
          authFetch('/api/shift/shift-types'),
          authFetch('/api/shift/members'),
        ])
        const [schedJson, typeJson, memberJson] = await Promise.all([schedRes.json(), typeRes.json(), memberRes.json()])
        const members = Array.isArray(memberJson) ? memberJson : []
        const activeMemberIds = new Set(members.map((m) => m.id))
        const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]))
        const tm = Object.fromEntries(typeJson.map((t) => [t.name, { label: t.label, color: t.color, order: t.order_idx }]))
        setTypeMap(tm)

        // 캘린더용 일별 시프트타입별 카운트
        const dc = {}
        schedJson.filter((s) => activeMemberIds.has(s.member_id)).forEach((s) => {
          if (!dc[s.work_date]) dc[s.work_date] = {}
          dc[s.work_date][s.shift_type] = (dc[s.work_date][s.shift_type] || 0) + 1
        })
        setDayCounts(dc)

        const dayStr = selectedDay.format('YYYY-MM-DD')
        const counts = {}
        const namesByType = {}
        schedJson
          .filter((s) => s.work_date === dayStr && activeMemberIds.has(s.member_id))
          .forEach((s) => {
            counts[s.shift_type] = (counts[s.shift_type] || 0) + 1
            if (!namesByType[s.shift_type]) namesByType[s.shift_type] = []
            namesByType[s.shift_type].push(memberMap[s.member_id] || '?')
          })

        // 출근 타입 vs 휴가 타입 분리 (근무 타입: 숫자 코드, 휴가류: 한글)
        const WORK_CODES = typeJson.filter((t) => /^\d+$/.test(t.name)).map((t) => t.name)
        const result = typeJson
          .filter((t) => t.is_active && counts[t.name])
          .map((t) => ({
            name: t.label, code: t.name, value: counts[t.name],
            color: t.color, bg: t.bg_color, names: namesByType[t.name] || [],
            isWork: WORK_CODES.includes(t.name),
          }))
          .sort((a, b) => (b.isWork - a.isWork) || (b.value - a.value))

        setItems(result)
        setAllItems(result)
        const workTotal = result.filter((r) => r.isWork).reduce((s, d) => s + d.value, 0)
        setTotal(workTotal)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [selectedDay])

  // 미니 캘린더 계산
  const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
  const calStart = selectedDay.startOf('month')
  const firstDow = calStart.day()
  const daysInMonth = selectedDay.daysInMonth()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const navBtn = (label, onClick, active) => (
    <button onClick={onClick} style={{
      background: active ? '#f59e0b' : 'rgba(245,158,11,0.1)',
      border: `1px solid ${active ? '#f59e0b' : 'rgba(245,158,11,0.35)'}`,
      color: active ? '#000' : '#f0c060',
      borderRadius: 8, padding: '4px 14px', fontSize: 13, fontWeight: active ? 700 : 600,
      cursor: 'pointer', lineHeight: '22px',
    }}>{label}</button>
  )

  const miniCal = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* 월 네비게이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => setSelectedDay((d) => d.subtract(1, 'month'))}
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '3px 10px', borderRadius: 6 }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', letterSpacing: 1 }}>{selectedDay.format('YYYY년 M월')}</span>
        <button onClick={() => setSelectedDay((d) => d.add(1, 'month'))}
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '3px 10px', borderRadius: 6 }}>›</button>
      </div>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(245,158,11,0.08)', borderRadius: '8px 8px 0 0', border: '1px solid rgba(245,158,11,0.15)', borderBottom: 'none' }}>
        {DOW_LABELS.map((lbl, i) => (
          <div key={lbl} style={{
            textAlign: 'center', fontSize: 12, fontWeight: 800, padding: '6px 0',
            color: i === 0 ? '#f87171' : i === 6 ? '#7dd3fc' : 'rgba(214,222,232,0.7)',
          }}>{lbl}</div>
        ))}
      </div>
      {/* 날짜 셀 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {cells.map((day, idx) => {
          if (!day) return (
            <div key={`e${idx}`} style={{ borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 60, background: 'rgba(0,0,0,0.15)' }} />
          )
          const dow = (firstDow + day - 1) % 7
          const dateStr = calStart.date(day).format('YYYY-MM-DD')
          const isSel = selectedDay.date() === day
          const isT = today.format('YYYY-MM-DD') === dateStr
          const dayData = dayCounts[dateStr] || {}
          const totalCnt = Object.values(dayData).reduce((s, v) => s + v, 0)
          const isSat = dow === 6
          const isSun = dow === 0
          const holiday = holidays[dateStr]
          const isHoliday = !!holiday || isSun
          const dateColor = isSel ? '#1a1a00' : (isHoliday ? '#f87171' : isSat ? '#7dd3fc' : '#e2e8f0')
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(calStart.date(day))}
              style={{
                padding: '5px 6px 4px',
                cursor: 'pointer',
                minHeight: 60,
                borderRight: '1px solid rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: isSel
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : isT
                  ? 'rgba(245,158,11,0.15)'
                  : isSat
                  ? 'rgba(125,211,252,0.07)'
                  : isHoliday
                  ? 'rgba(248,113,113,0.09)'
                  : 'rgba(255,255,255,0.02)',
                boxShadow: isT && !isSel ? 'inset 0 0 0 1.5px rgba(245,158,11,0.55)' : 'none',
                transition: 'background 0.12s',
              }}
            >
              {/* 날짜 숫자 */}
              <div style={{ fontSize: 13, fontWeight: isSel ? 900 : 700, color: dateColor, lineHeight: 1.2 }}>{day}</div>
              {/* 공휴일 이름 */}
              {holiday && (
                <div style={{
                  fontSize: 9, fontWeight: 700, lineHeight: 1.1, marginTop: 1,
                  color: isSel ? '#00000080' : '#f87171',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>{holiday}</div>
              )}
              {/* 시프트별 인원 */}
              {totalCnt > 0 && (
                <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(dayData)
                    .sort((a, b) => (typeMap[a[0]]?.order ?? 99) - (typeMap[b[0]]?.order ?? 99))
                    .map(([typeName, cnt]) => {
                      const ti = typeMap[typeName]
                      const label = ti?.label || typeName
                      const color = isSel ? '#1a1a0099' : (ti?.color || '#f59e0b')
                      return (
                        <div key={typeName} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: isSel ? 'rgba(0,0,0,0.12)' : `${ti?.color || '#f59e0b'}18`,
                          border: `1px solid ${isSel ? 'rgba(0,0,0,0.15)' : `${ti?.color || '#f59e0b'}35`}`,
                          borderRadius: 4, padding: '1px 4px',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color, lineHeight: 1.4 }}>{label}</span>
                          <span style={{ fontSize: 9, fontWeight: 900, color, lineHeight: 1.4 }}>{cnt}</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // 근무 / 휴가 분리
  const workItems = items.filter((d) => d.isWork)
  const leaveItems = items.filter((d) => !d.isWork)
  const selectedHoliday = holidays[selectedDay.format('YYYY-MM-DD')]

  return (
    <SectionCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          출근 인원
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,158,11,0.7)' }}>
            {selectedDay.format('M월 D일 (ddd)')}
            {selectedHoliday && <span style={{ marginLeft: 6, fontSize: 11, color: '#f87171', fontWeight: 700 }}>({selectedHoliday})</span>}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
            출근 {total}<span style={{ fontSize: 12, color: 'rgba(245,158,11,0.6)', marginLeft: 2 }}>명</span>
          </span>
          {leaveItems.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(148,163,184,0.8)' }}>
              · 부재 {leaveItems.reduce((s, d) => s + d.value, 0)}<span style={{ fontSize: 12, marginLeft: 2 }}>명</span>
            </span>
          )}
        </span>
      }
      icon={<TeamOutlined />}
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {navBtn('전날', () => setSelectedDay((d) => d.subtract(1, 'day')), false)}
          {navBtn('오늘', () => setSelectedDay(dayjs()), isToday)}
          {navBtn('다음날', () => setSelectedDay((d) => d.add(1, 'day')), false)}
        </div>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* 좌측: 미니 캘린더 */}
          {miniCal}
          {/* 구분선 */}
          <div style={{ width: 1, background: 'rgba(245,158,11,0.12)', alignSelf: 'stretch', flexShrink: 0 }} />
          {/* 우측: 출근 상세 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.length === 0 ? (
              <Empty description="등록된 근무 데이터가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                {/* 근무 그룹 */}
                {workItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(214,222,232,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>근무</div>
                    {workItems.map((d) => (
                      <div key={d.name} style={{
                        borderRadius: 10, background: d.bg,
                        border: `1px solid ${d.color}22`,
                        borderLeft: `4px solid ${d.color}`,
                        overflow: 'hidden',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px' }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: d.color, lineHeight: 1, minWidth: 28 }}>{d.value}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d.color, opacity: 0.8, minWidth: 40 }}>{d.name}</span>
                          <div style={{ width: 1, height: 18, background: `${d.color}30`, flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px' }}>
                            {d.names.map((n) => (
                              <span key={n} style={{
                                fontSize: 13, fontWeight: 600, color: d.color,
                                padding: '1px 9px', borderRadius: 20,
                                background: `${d.color}15`, border: `1px solid ${d.color}28`,
                              }}>{n}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 부재/휴가 그룹 */}
                {leaveItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(214,222,232,0.4)', letterSpacing: 1 }}>부재 / 휴가</div>
                    <div style={{
                      borderRadius: 10, background: 'rgba(100,116,139,0.08)',
                      border: '1px solid rgba(100,116,139,0.18)',
                      padding: '8px 12px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      {leaveItems.map((d) => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: d.color,
                            padding: '1px 7px', borderRadius: 20, background: `${d.color}18`,
                            border: `1px solid ${d.color}30`, minWidth: 36, textAlign: 'center',
                          }}>{d.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}명</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}>
                            {d.names.map((n) => (
                              <span key={n} style={{ fontSize: 12, color: 'rgba(148,163,184,0.85)', fontWeight: 500 }}>{n}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
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
  const [previewNote, setPreviewNote] = useState(null)
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

  const timelineNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => {
          const aTime = dayjs(a.updated_at || a.created_at || a.handover_date || '').valueOf()
          const bTime = dayjs(b.updated_at || b.created_at || b.handover_date || '').valueOf()
          return bTime - aTime
        })
        .slice(0, 8),
    [notes],
  )

  return (
    <SectionCard
      title="인수인계일지"
      icon={<SwapOutlined />}
      extra={
        <Button type="primary" size="small" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? '폼 닫기' : '인수인계 등록'}
        </Button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showForm
            ? 'minmax(320px, 380px) minmax(0, 1.1fr) minmax(280px, 0.9fr)'
            : 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
          gap: 12,
          alignItems: 'start',
        }}
      >
        {showForm ? (
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
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--nowa-border)',
              }}
            >
              <span style={{ color: 'var(--nowa-text)', fontWeight: 800 }}>
                {editingId ? '인수인계 수정' : '인수인계 작성'}
              </span>
              <Space>
                {editingId ? <Button onClick={resetForm}>취소</Button> : null}
                <Button type="primary" onClick={submitNote} loading={saving}>
                  {editingId ? '수정 저장' : '등록'}
                </Button>
              </Space>
            </div>

            <div style={{ padding: 16 }}>
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
            </div>
          </div>
        ) : null}

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
              padding: '14px 16px',
              borderBottom: '1px solid var(--nowa-border)',
              color: 'var(--nowa-text)',
              fontWeight: 800,
            }}
          >
            인수인계 목록
          </div>
          <div style={{ padding: 10 }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : notes.length === 0 ? (
            <Empty description="등록된 인수인계가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setPreviewNote(note)}
                  style={{
                    border: '1px solid var(--nowa-border)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: 'var(--nowa-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'var(--nowa-text)', fontWeight: 800, fontSize: 14 }}>{note.title || '인수인계'}</div>
                      <div style={{ color: 'rgba(245,158,11,0.85)', fontSize: 11, marginTop: 3 }}>
                        {note.author || '-'} / {note.handover_date}{note.updated_at || note.created_at ? ` ${dayjs(note.updated_at || note.created_at).format('HH:mm')}` : ''}
                      </div>
                    </div>
                    {canManageNote(note) ? (
                      <Space size={6}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(event) => {
                            event.stopPropagation()
                            beginEdit(note)
                          }}
                        >
                          수정
                        </Button>
                        <Popconfirm title="이 인수인계를 삭제하시겠습니까?" onConfirm={() => removeNote(note.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} onClick={(event) => event.stopPropagation()} />
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
          </div>
        </div>

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
              padding: '14px 16px',
              borderBottom: '1px solid var(--nowa-border)',
              color: 'var(--nowa-text)',
              fontWeight: 800,
            }}
          >
            인수인계 타임라인
          </div>
          <div style={{ padding: '12px 14px' }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : timelineNotes.length === 0 ? (
              <Empty description="표시할 인수인계가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {timelineNotes.map((note, index) => {
                  const dt = dayjs(note.updated_at || note.created_at || note.handover_date)
                  const dateLabel = dt.isValid() ? dt.format('YYYY-MM-DD') : '-'
                  const timeLabel = dt.isValid() ? dt.format('HH:mm') : '-'
                  const prevDt = index > 0 ? dayjs(timelineNotes[index - 1].updated_at || timelineNotes[index - 1].created_at || timelineNotes[index - 1].handover_date) : null
                  const prevDateLabel = prevDt?.isValid() ? prevDt.format('YYYY-MM-DD') : null
                  const showDateSplit = dateLabel !== prevDateLabel

                  return (
                    <div key={`timeline:${note.id}`}>
                      {showDateSplit && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 6px' }}>
                          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{dateLabel}</span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.25)' }} />
                        </div>
                      )}
                    <button
                      type="button"
                      onClick={() => setPreviewNote(note)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '72px 18px minmax(0, 1fr)',
                        gap: 10,
                        padding: '8px 0',
                        border: 'none',
                        borderBottom: index === timelineNotes.length - 1 ? 'none' : '1px solid rgba(196,210,226,0.06)',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 1 }}>
                        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, fontWeight: 700 }}>{timeLabel}</div>
                        {note.author && (
                          <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <UserOutlined style={{ color: 'rgba(214,222,232,0.85)', fontSize: 11 }} />
                            <span style={{ color: 'rgba(245,158,11,0.85)' }}>{note.author}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: 'var(--ant-primary-color)',
                            marginTop: 4,
                            position: 'relative',
                            zIndex: 1,
                            boxShadow: '0 0 0 4px rgba(99,102,241,0.12)',
                          }}
                        />
                        {index !== timelineNotes.length - 1 ? (
                          <span
                            style={{
                              position: 'absolute',
                              top: 14,
                              bottom: -10,
                              width: 2,
                              borderRadius: 999,
                              background: 'rgba(196,210,226,0.22)',
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: 'var(--nowa-text)',
                            fontWeight: 800,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {note.title || '인수인계'}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: 'var(--nowa-text-muted)',
                            fontSize: 12,
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {note.content}
                        </div>
                      </div>
                    </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        title={previewNote?.title || '인수인계'}
        open={Boolean(previewNote)}
        onCancel={() => setPreviewNote(null)}
        footer={null}
      >
        {previewNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>
              {previewNote.handover_date} / {previewNote.author || '-'} / {previewNote.updated_at || previewNote.created_at || '-'}
            </div>
            <div style={{ color: 'var(--nowa-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {previewNote.content}
            </div>
          </div>
        ) : null}
      </Modal>
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
          <SummaryTile title="활성 설비" value={machines.filter((row) => row.is_active).length} suffix="대" icon={<ControlOutlined />} accent="#6366f1" gradient="linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" onClick={() => navigate('/epi/mocvd/management')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="소스 항목" value={sourceSummary.sourceCount ?? 0} suffix="건" icon={<NodeIndexOutlined />} accent="#14b8a6" gradient="linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)" onClick={() => navigate('/epi/mocvd/source?tab=input')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="교체 임박/부족" value={sourceSummary.criticalCount ?? 0} suffix="건" icon={<WarningOutlined />} accent="#f59e0b" gradient="linear-gradient(135deg,#f59e0b 0%,#f97316 100%)" onClick={() => navigate('/epi/mocvd/source?tab=status-board')} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SummaryTile title="잔량 부족" value={sourceSummary.lowInventoryCount ?? 0} suffix="건" icon={<ClockCircleOutlined />} accent="#ef4444" gradient="linear-gradient(135deg,#f43f5e 0%,#ec4899 100%)" onClick={() => navigate('/epi/mocvd/source?tab=machine-board')} />
        </Col>
      </Row>

      <HandoverBoard />

      <AttendanceCard />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <SectionCard
            title="오늘 교체 일정"
            icon={<CalendarOutlined />}
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
          <SectionCard title="설비별 위험도 Top" icon={<WarningOutlined />} extra={<Button size="small" onClick={() => navigate('/epi/mocvd/source?tab=machine-board')}>설비별 소스현황</Button>}>
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
          <SectionCard title="소스관리 연결" icon={<NodeIndexOutlined />} extra={<Tag color="cyan">소스</Tag>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <LinkButton label="소스교체 현황판" icon={<CheckCircleOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=status-board')} />
              <LinkButton label="설비별 소스현황" icon={<WarningOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=machine-board')} />
              <LinkButton label="소스 입력" icon={<NodeIndexOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=input')} />
              <LinkButton label="소스교체 작업 일지" icon={<FileTextOutlined />} onClick={() => navigate('/epi/mocvd/source?tab=change-log')} />
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="PM주기 계획 연결" icon={<ToolOutlined />} extra={<Tag color="gold">PM</Tag>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <LinkButton label="PM주기 현황판" icon={<CalendarOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=status')} />
              <LinkButton label="설비별 PM현황" icon={<ControlOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=machine')} />
              <LinkButton label="PM주기 입력" icon={<CheckCircleOutlined />} onClick={() => navigate('/epi/mocvd/pm-plan?tab=input')} />
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="기타 운영 연결" icon={<ApiOutlined />} extra={<Tag color="green">운영</Tag>}>
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
