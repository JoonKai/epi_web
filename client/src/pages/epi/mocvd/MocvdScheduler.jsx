import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox, Form, Input, Modal, Popconfirm, Select, message } from 'antd'
import {
  DeleteOutlined, EditOutlined, LeftOutlined, PlusOutlined,
  RightOutlined, RobotOutlined, ToolOutlined, UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

dayjs.locale('ko')

/* ── 상수 ──────────────────────────────────────────────────── */
const EVENT_CONFIG = {
  pm:            { label: 'PM',      color: '#7dd3fc', bg: 'rgba(125,211,252,0.15)', border: 'rgba(125,211,252,0.35)' },
  filter:        { label: '필터',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  bm:            { label: 'BM',      color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)' },
  source_change: { label: '소스',    color: '#a3e635', bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.35)' },
  other:         { label: '기타',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',   border: 'rgba(251,191,36,0.35)' },
}
const evtCfg = (t) => EVENT_CONFIG[t] || EVENT_CONFIG.other
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const navBtnStyle = {
  background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)',
  borderRadius: 8, width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--nowa-text)', fontSize: 14,
}

/* ── 자동 일정 생성 알고리즘 ────────────────────────────────── */
function autoGenerate({ pmCounters, sourceEvents, pmMembers, config, year, month, holidays = {} }) {
  const {
    includePmCritical, includePmUrgent,
    includeFilterCritical, includeFilterUrgent,
    includeSourceOverdue, includeSourceUrgent,
    includeSun, includeSat, includeHoliday = false,
    maxPerDay,
    pmPersonCount = 2, filterPersonCount = 2, sourcePersonCount = 1,
  } = config

  let thresholds = { critical: 5, urgent: 20 }
  try { thresholds = { ...thresholds, ...JSON.parse(localStorage.getItem('pm_thresholds') || '{}') } } catch {}

  const items = []

  // PM 챔버 항목 수집
  pmCounters.forEach(row => {
    const pmRem = row.pm_base_count - row.chamber_count
    if (includePmCritical && pmRem <= thresholds.critical) {
      items.push({ priority: 0, event_type: 'pm', machine_no: row.machine_no, title: 'PM 정비', badge: '긴급' })
    } else if (includePmUrgent && pmRem <= thresholds.urgent) {
      items.push({ priority: 1, event_type: 'pm', machine_no: row.machine_no, title: 'PM 정비', badge: '임박' })
    }
  })

  // 필터 교체 항목 수집 (PM과 별도)
  pmCounters.forEach(row => {
    const filterRem = row.filter_base_count - row.filter_count
    if (includeFilterCritical && filterRem <= thresholds.critical) {
      items.push({ priority: 0, event_type: 'filter', machine_no: row.machine_no, title: '필터 교체', badge: '긴급' })
    } else if (includeFilterUrgent && filterRem <= thresholds.urgent) {
      items.push({ priority: 1, event_type: 'filter', machine_no: row.machine_no, title: '필터 교체', badge: '임박' })
    }
  })

  // 소스 교체 항목 수집
  sourceEvents.forEach(ev => {
    if (includeSourceOverdue && ev.status === 'overdue') {
      items.push({ priority: 0, event_type: 'source_change', machine_no: ev.machine_no, title: `(${ev.source_label || ev.source_name || ''})`, badge: '긴급' })
    } else if (includeSourceUrgent && ev.status === 'urgent') {
      items.push({ priority: 1, event_type: 'source_change', machine_no: ev.machine_no, title: `(${ev.source_label || ev.source_name || ''})`, badge: '임박' })
    }
  })

  items.sort((a, b) => a.priority - b.priority)
  if (items.length === 0) return []

  // 작업일 목록 수집
  const ms = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const workingDays = []
  for (let d = 1; d <= ms.daysInMonth(); d++) {
    const dd = ms.date(d)
    const dow = dd.day()
    const ds = dd.format('YYYY-MM-DD')
    if (dow === 0 && !includeSun) continue
    if (dow === 6 && !includeSat) continue
    if (!includeHoliday && holidays[ds]) continue  // 공휴일 제외
    workingDays.push(ds)
  }
  if (workingDays.length === 0) return []

  // 날짜에 아이템 배분
  const schedule = []
  let dayIdx = 0, dayCount = 0
  const mx = Math.max(1, maxPerDay)
  let memberCursor = 0

  for (const item of items) {
    if (dayIdx >= workingDays.length) break
    // 유형별 인원 수 배정
    const countMap = { pm: pmPersonCount, filter: filterPersonCount, source_change: sourcePersonCount }
    const count = Math.max(1, Math.min(countMap[item.event_type] ?? 1, pmMembers.length || 1))
    const assigned = []
    for (let i = 0; i < count; i++) {
      if (pmMembers.length > 0) {
        assigned.push(pmMembers[memberCursor % pmMembers.length].name)
        memberCursor++
      }
    }
    const actor = assigned.join(', ')
    schedule.push({ ...item, occurred_at: workingDays[dayIdx] + 'T00:00:00', date: workingDays[dayIdx], actor })
    dayCount++
    if (dayCount >= mx) { dayIdx++; dayCount = 0 }
  }
  return schedule
}

/* ── 자동 생성 모달 ─────────────────────────────────────────── */
function AutoGenModal({ open, onClose, pmCounters, sourceStatus, pmMembers, year, month, holidays, onConfirm }) {
  const [config, setConfig] = useState({
    includePmCritical: true,     includePmUrgent: false,
    includeFilterCritical: true, includeFilterUrgent: false,
    includeSourceOverdue: false, includeSourceUrgent: false,
    includeSat: true, includeSun: false, includeHoliday: false,
    maxPerDay: 2,
    pmPersonCount: 2,
    filterPersonCount: 2,
    sourcePersonCount: 1,
  })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const sourceEvents = useMemo(() =>
    (sourceStatus?.events || []).filter(e => e.status === 'overdue' || e.status === 'urgent')
  , [sourceStatus])

  const srcOverdue = sourceEvents.filter(e => e.status === 'overdue')
  const srcUrgent  = sourceEvents.filter(e => e.status === 'urgent')

  let thresholds = { critical: 5, urgent: 20 }
  try { thresholds = { ...thresholds, ...JSON.parse(localStorage.getItem('pm_thresholds') || '{}') } } catch {}

  const pmCritical     = pmCounters.filter(r => (r.pm_base_count - r.chamber_count) <= thresholds.critical)
  const pmUrgent       = pmCounters.filter(r => { const v = r.pm_base_count - r.chamber_count; return v > thresholds.critical && v <= thresholds.urgent })
  const filterCritical = pmCounters.filter(r => (r.filter_base_count - r.filter_count) <= thresholds.critical)
  const filterUrgent   = pmCounters.filter(r => { const v = r.filter_base_count - r.filter_count; return v > thresholds.critical && v <= thresholds.urgent })

  const handlePreview = () => {
    const result = autoGenerate({ pmCounters, sourceEvents, pmMembers, config, year, month, holidays })
    setPreview(result)
  }

  const handleConfirm = async () => {
    if (!preview || preview.length === 0) return
    setSaving(true)
    try {
      for (const item of preview) {
        await authFetch('/api/mocvd/equipment-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machine_no: item.machine_no,
            event_type: item.event_type,
            title: item.title,
            detail: `자동 생성 (${item.badge})`,
            occurred_at: item.occurred_at,
            actor: item.actor,
          }),
        })
      }
      message.success(`${preview.length}건의 일정을 생성했습니다.`)
      setPreview(null)
      onConfirm()
      onClose()
    } catch { message.error('일정 생성에 실패했습니다.') }
    setSaving(false)
  }

  const toggle = (key) => setConfig(p => ({ ...p, [key]: !p[key] }))

  return (
    <Modal
      title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RobotOutlined style={{ color: '#7dd3fc' }} /> 자동 일정 생성</span>}
      open={open}
      onCancel={onClose}
      width={580}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>

        {/* 대상 선택 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.6)', marginBottom: 10 }}>① 일정 대상 선택</div>
          <div style={{ display: 'flex', gap: 12 }}>

            {/* PM 정비 */}
            <div style={{ flex: 1, background: 'rgba(125,211,252,0.05)', border: '1px solid rgba(125,211,252,0.2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#7dd3fc', marginBottom: 8 }}>PM 정비 (챔버)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includePmCritical} onChange={() => toggle('includePmCritical')} />
                  <span style={{ fontSize: 14 }}>긴급</span>
                  <span style={{ fontSize: 14, color: '#f87171', marginLeft: 2 }}>({pmCritical.length}대)</span>
                </label>
                {pmCritical.length > 0 && config.includePmCritical && (
                  <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', paddingLeft: 24, lineHeight: 1.6 }}>
                    {pmCritical.map(r => formatMachineLabel(r.machine_no)).join(', ')}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includePmUrgent} onChange={() => toggle('includePmUrgent')} />
                  <span style={{ fontSize: 14 }}>임박</span>
                  <span style={{ fontSize: 14, color: '#fbbf24', marginLeft: 2 }}>({pmUrgent.length}대)</span>
                </label>
                {pmUrgent.length > 0 && config.includePmUrgent && (
                  <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', paddingLeft: 24, lineHeight: 1.6 }}>
                    {pmUrgent.map(r => formatMachineLabel(r.machine_no)).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* 필터 교체 */}
            <div style={{ flex: 1, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>필터 교체</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includeFilterCritical} onChange={() => toggle('includeFilterCritical')} />
                  <span style={{ fontSize: 14 }}>긴급</span>
                  <span style={{ fontSize: 14, color: '#f87171', marginLeft: 2 }}>({filterCritical.length}대)</span>
                </label>
                {filterCritical.length > 0 && config.includeFilterCritical && (
                  <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', paddingLeft: 24, lineHeight: 1.6 }}>
                    {filterCritical.map(r => formatMachineLabel(r.machine_no)).join(', ')}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includeFilterUrgent} onChange={() => toggle('includeFilterUrgent')} />
                  <span style={{ fontSize: 14 }}>임박</span>
                  <span style={{ fontSize: 14, color: '#fbbf24', marginLeft: 2 }}>({filterUrgent.length}대)</span>
                </label>
                {filterUrgent.length > 0 && config.includeFilterUrgent && (
                  <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', paddingLeft: 24, lineHeight: 1.6 }}>
                    {filterUrgent.map(r => formatMachineLabel(r.machine_no)).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* 소스 교체 */}
            <div style={{ flex: 1, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a3e635', marginBottom: 8 }}>소스 교체</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includeSourceOverdue} onChange={() => toggle('includeSourceOverdue')} />
                  <span style={{ fontSize: 14 }}>긴급</span>
                  <span style={{ fontSize: 14, color: '#f87171', marginLeft: 2 }}>({srcOverdue.length}건)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Checkbox checked={config.includeSourceUrgent} onChange={() => toggle('includeSourceUrgent')} />
                  <span style={{ fontSize: 14 }}>임박</span>
                  <span style={{ fontSize: 14, color: '#fbbf24', marginLeft: 2 }}>({srcUrgent.length}건)</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* 배분 설정 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.6)', marginBottom: 10 }}>② 배분 설정</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'PM 인원', key: 'pmPersonCount', color: '#7dd3fc' },
              { label: '필터 인원', key: 'filterPersonCount', color: '#a78bfa' },
              { label: '소스교체 인원', key: 'sourcePersonCount', color: '#a3e635' },
            ].map(({ label, key, color }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color, fontWeight: 600 }}>{label}</span>
                <Select
                  value={config[key]}
                  onChange={v => setConfig(p => ({ ...p, [key]: v }))}
                  style={{ width: 68 }}
                  size="small"
                  options={[1, 2, 3, 4, 5, 6].map(n => ({ label: `${n}명`, value: n }))}
                />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.7)' }}>하루 최대</span>
              <Select
                value={config.maxPerDay}
                onChange={v => setConfig(p => ({ ...p, maxPerDay: v }))}
                style={{ width: 72 }}
                size="small"
                options={[1, 2, 3, 4, 5].map(n => ({ label: `${n}건`, value: n }))}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.7)' }}>작업일</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 14 }}>
                <Checkbox checked={config.includeSat} onChange={() => toggle('includeSat')} /> 토요일
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 14 }}>
                <Checkbox checked={config.includeSun} onChange={() => toggle('includeSun')} /> 일요일
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 14 }}>
                <Checkbox checked={config.includeHoliday} onChange={() => toggle('includeHoliday')} /> 공휴일 포함
              </label>
            </div>
          </div>
          {pmMembers.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(196,210,226,0.68)' }}>
              투입 인원 {pmMembers.length}명 중 {Math.min(config.pmPersonCount, pmMembers.length)}명 배정 →&nbsp;
              {pmMembers.slice(0, config.pmPersonCount).map(m => m.name).join(', ')}
              {config.pmPersonCount > pmMembers.length && ' (인원 부족, 순환 배정)'}
            </div>
          )}
        </div>

        {/* 미리보기 생성 버튼 */}
        <button
          onClick={handlePreview}
          style={{
            background: 'rgba(125,211,252,0.1)', border: '1px solid rgba(125,211,252,0.35)',
            borderRadius: 8, padding: '8px 0', cursor: 'pointer',
            color: '#7dd3fc', fontSize: 14, fontWeight: 700, width: '100%',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(125,211,252,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(125,211,252,0.1)'}
        >미리보기 생성</button>

        {/* 미리보기 */}
        {preview !== null && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.6)', marginBottom: 8 }}>
              ③ 생성 미리보기 <span style={{ color: preview.length > 0 ? '#7dd3fc' : '#f87171', fontWeight: 800 }}>{preview.length}건</span>
            </div>
            {preview.length === 0 ? (
              <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.62)', textAlign: 'center', padding: '16px 0' }}>
                조건에 해당하는 항목이 없습니다.
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 5,
                maxHeight: 260, overflowY: 'auto',
                background: 'var(--nowa-bg)', borderRadius: 10, padding: '8px 10px',
                border: '1px solid var(--nowa-border)',
              }}>
                {preview.map((item, i) => {
                  const cfg = evtCfg(item.event_type)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '4px 2px', borderBottom: i < preview.length - 1 ? '1px solid var(--nowa-border)' : 'none' }}>
                      <span style={{ color: 'rgba(196,210,226,0.75)', minWidth: 80 }}>{dayjs(item.date).format('M/D (ddd)')}</span>
                      <span style={{
                        fontSize: 14, fontWeight: 700, borderRadius: 3, padding: '1px 5px', flexShrink: 0,
                        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                      }}>{cfg.label}</span>
                      <span style={{ color: 'var(--nowa-text)', flex: 1 }}>
                        {item.machine_no ? `${formatMachineLabel(item.machine_no)} ` : ''}{item.title}
                      </span>
                      {item.actor && (
                        <span style={{ color: '#7dd3fc', fontSize: 14, flexShrink: 0 }}>{item.actor}</span>
                      )}
                      <span style={{
                        fontSize: 14, borderRadius: 3, padding: '1px 4px', flexShrink: 0,
                        color: item.badge === '긴급' ? '#f87171' : '#fbbf24',
                        background: item.badge === '긴급' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                        border: `1px solid ${item.badge === '긴급' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
                      }}>{item.badge}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {preview.length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  marginTop: 12,
                  background: saving ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.15)',
                  border: '1px solid rgba(74,222,128,0.4)',
                  borderRadius: 8, padding: '8px 0', cursor: saving ? 'default' : 'pointer',
                  color: '#4ade80', fontSize: 14, fontWeight: 700, width: '100%',
                }}
              >{saving ? '저장 중...' : `${preview.length}건 일정 저장`}</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ── 메인 스케줄러 ──────────────────────────────────────────── */
export default function MocvdScheduler() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'))

  const [machines, setMachines] = useState([])
  const [members, setMembers] = useState([])
  const [pmAssign, setPmAssign] = useState({})
  const [pmCounters, setPmCounters] = useState([])
  const [sourceStatus, setSourceStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [holidays, setHolidays] = useState({}) // { 'YYYY-MM-DD': '공휴일명' }

  const [manualOpen, setManualOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form] = Form.useForm()

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, mbRes, paRes, evRes, pcRes, ssRes, hdRes] = await Promise.all([
        authFetch('/api/admin/machines'),
        authFetch('/api/admin/personnel/members'),
        authFetch('/api/admin/personnel/pm-assign'),
        authFetch('/api/mocvd/equipment-history'),
        authFetch('/api/mocvd/pm-counters'),
        authFetch('/api/mocvd/source-status'),
        authFetch(`/api/shift/holidays?year=${today.year()}`),
      ])
      if (mRes.ok) setMachines(await mRes.json())
      if (mbRes.ok) setMembers(await mbRes.json())
      if (paRes.ok) {
        const list = await paRes.json()
        const map = {}
        list.forEach(({ member_id, role }) => { map[member_id] = role })
        setPmAssign(map)
      }
      if (evRes.ok) setEvents(await evRes.json())
      if (pcRes.ok) setPmCounters(await pcRes.json())
      if (ssRes.ok) setSourceStatus(await ssRes.json())
      if (hdRes.ok) {
        const list = await hdRes.json()
        const map = {}
        list.forEach(({ date, name }) => { map[date] = name })
        setHolidays(map)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const calDays = useMemo(() => {
    const ms = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
    const startDow = ms.day()
    const days = []
    for (let i = startDow - 1; i >= 0; i--) days.push(ms.subtract(i + 1, 'day'))
    for (let d = 1; d <= ms.daysInMonth(); d++) days.push(ms.date(d))
    const next = ms.add(1, 'month')
    let nd = 1
    while (days.length < 42) days.push(next.date(nd++))
    return days
  }, [year, month])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(ev => {
      const d = ev.occurred_at?.slice(0, 10)
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(ev)
    })
    return map
  }, [events])

  const pmMembers = useMemo(() =>
    members.filter(m => Object.prototype.hasOwnProperty.call(pmAssign, m.id) && m.is_active)
  , [members, pmAssign])

  const selectedEvents = useMemo(() => {
    const order = { pm: 0, bm: 1, source_change: 2, other: 3 }
    return (eventsByDate[selectedDate] || []).sort((a, b) => (order[a.event_type] ?? 9) - (order[b.event_type] ?? 9))
  }, [eventsByDate, selectedDate])

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const openCreate = (date) => {
    setEditingEvent(null)
    form.resetFields()
    form.setFieldsValue({ occurred_at: date, event_type: 'pm' })
    setManualOpen(true)
  }

  const openEdit = (ev) => {
    setEditingEvent(ev)
    form.setFieldsValue({
      event_type: ev.event_type,
      machine_no: ev.machine_no,
      title: ev.title,
      detail: ev.detail,
      occurred_at: ev.occurred_at?.slice(0, 10),
      actor: ev.actor,
    })
    setManualOpen(true)
  }

  const handleSubmit = async (values) => {
    try {
      const url = editingEvent ? `/api/mocvd/equipment-history/${editingEvent.id}` : '/api/mocvd/equipment-history'
      const res = await authFetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, occurred_at: values.occurred_at + 'T00:00:00' }),
      })
      if (!res.ok) throw new Error()
      message.success(editingEvent ? '수정했습니다.' : '일정을 추가했습니다.')
      setManualOpen(false)
      fetchAll()
    } catch { message.error('저장에 실패했습니다.') }
  }

  const handleDelete = async (id) => {
    try {
      await authFetch(`/api/mocvd/equipment-history/${id}`, { method: 'DELETE' })
      message.success('삭제했습니다.')
      fetchAll()
    } catch { message.error('삭제에 실패했습니다.') }
  }

  const machineOptions = machines.filter(m => m.is_active).map(m => ({ label: formatMachineLabel(m.machine_no), value: m.machine_no }))
  const memberOptions = members.filter(m => m.is_active).map(m => ({ label: m.name, value: m.name }))

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthEvents = events.filter(e => e.occurred_at?.startsWith(monthStr))
  const monthStats = Object.entries(EVENT_CONFIG).map(([key, cfg]) => ({
    key, cfg, count: monthEvents.filter(e => e.event_type === key).length,
  }))

  return (
    <div className="page-shell" style={{ display: 'flex', gap: 14, minHeight: 0, height: '100%' }}>

      {/* ── 왼쪽 사이드바 ── */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 이번 달 통계 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.75)', marginBottom: 12 }}>
            {year}년 {month}월 현황
          </div>
          {monthStats.map(({ key, cfg, count }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 42, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '1px 6px', flexShrink: 0, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                {count > 0 && <div style={{ height: '100%', borderRadius: 2, background: cfg.color, width: `${Math.min(100, count * 10)}%`, opacity: 0.7 }} />}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: count > 0 ? cfg.color : 'rgba(196,210,226,0.62)', minWidth: 20, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.75)', marginBottom: 10 }}>범례</div>
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 42, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '1px 6px', flexShrink: 0, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.78)' }}>
                {key === 'pm' ? 'PM 정비 (챔버)' : key === 'filter' ? '필터 교체' : key === 'bm' ? 'BM 수리' : key === 'source_change' ? '소스 교체' : '기타 일정'}
              </span>
            </div>
          ))}
        </div>

        {/* PM 투입 인원 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12, padding: '14px 16px', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.75)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ToolOutlined style={{ color: '#7dd3fc' }} />
            PM 투입 인원
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7dd3fc', background: 'rgba(125,211,252,0.12)', padding: '0 6px', borderRadius: 8, marginLeft: 2 }}>{pmMembers.length}명</span>
          </div>
          {pmMembers.length === 0 ? (
            <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.62)', textAlign: 'center', padding: '16px 0' }}>배정된 인원이 없습니다</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
              {pmMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(125,211,252,0.1)', border: '1.5px solid rgba(125,211,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#7dd3fc', flexShrink: 0, boxShadow: '0 0 6px rgba(125,211,252,0.2)' }}>{m.name?.[0] || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    {pmAssign[m.id] && <div style={{ fontSize: 14, color: '#7dd3fc', opacity: 0.65 }}>{pmAssign[m.id]}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 메인: 달력 + 상세 ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 14 }}>

        {/* 달력 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => navMonth(-1)} style={navBtnStyle}><LeftOutlined /></button>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--nowa-text)', minWidth: 130, textAlign: 'center' }}>{year}년 {month}월</span>
              <button onClick={() => navMonth(1)} style={navBtnStyle}><RightOutlined /></button>
              <button
                onClick={() => { setYear(today.year()); setMonth(today.month() + 1); setSelectedDate(today.format('YYYY-MM-DD')) }}
                style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)', cursor: 'pointer', background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)', borderRadius: 6, padding: '4px 12px' }}
              >오늘</button>
            </div>

            {/* 수동 / 자동 / 초기화 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => openCreate(selectedDate)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(125,211,252,0.35)', background: 'rgba(125,211,252,0.1)', color: '#7dd3fc' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(125,211,252,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(125,211,252,0.1)'}
              ><PlusOutlined /> 수동 추가</button>
              <button
                onClick={() => setAutoOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.1)'}
              ><RobotOutlined /> 자동 생성</button>
              <Popconfirm
                title={`${year}년 ${month}월 일정 ${monthEvents.length}건을 모두 삭제하시겠습니까?`}
                okText="전체 삭제" cancelText="취소"
                disabled={monthEvents.length === 0}
                onConfirm={async () => {
                  try {
                    await Promise.all(monthEvents.map(ev => authFetch(`/api/mocvd/equipment-history/${ev.id}`, { method: 'DELETE' })))
                    message.success(`${monthEvents.length}건 삭제했습니다.`)
                    fetchAll()
                  } catch { message.error('삭제에 실패했습니다.') }
                }}
              >
                <button
                  disabled={monthEvents.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: monthEvents.length === 0 ? 'default' : 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.08)', color: monthEvents.length === 0 ? 'rgba(248,113,113,0.3)' : '#f87171' }}
                  onMouseEnter={e => { if (monthEvents.length > 0) e.currentTarget.style.background = 'rgba(248,113,113,0.18)' }}
                  onMouseLeave={e => { if (monthEvents.length > 0) e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                >초기화 ({monthEvents.length})</button>
              </Popconfirm>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {WEEK_DAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, padding: '6px 0', color: i === 0 ? '#f87171' : i === 6 ? '#7dd3fc' : 'rgba(196,210,226,0.72)' }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, flex: 1 }}>
            {calDays.map((d, idx) => {
              const dateStr = d.format('YYYY-MM-DD')
              const isCurrentMonth = d.month() + 1 === month && d.year() === year
              const isToday = dateStr === today.format('YYYY-MM-DD')
              const isSelected = dateStr === selectedDate
              const dayEvents = eventsByDate[dateStr] || []
              const dow = idx % 7
              const holidayName = holidays[dateStr]
              const isHoliday = !!holidayName
              const isRed = dow === 0 || isHoliday
              return (
                <div
                  key={dateStr + idx}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    background: isSelected ? 'rgba(125,211,252,0.06)' : isHoliday ? 'rgba(248,113,113,0.04)' : 'var(--nowa-panel)',
                    border: `1px solid ${isSelected ? 'rgba(125,211,252,0.4)' : isToday ? 'rgba(245,158,11,0.35)' : isHoliday ? 'rgba(248,113,113,0.2)' : 'var(--nowa-border)'}`,
                    borderRadius: 8, padding: '6px 7px', cursor: 'pointer',
                    minHeight: 82, display: 'flex', flexDirection: 'column', gap: 2,
                    opacity: isCurrentMonth ? 1 : 0.3, transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(125,211,252,0.2)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = isToday ? 'rgba(245,158,11,0.35)' : isHoliday ? 'rgba(248,113,113,0.2)' : 'rgba(245,158,11,0.15)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={isToday ? {
                      background: '#f59e0b', color: '#171b26', width: 22, height: 22,
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800,
                    } : { fontSize: 14, fontWeight: 600, color: isRed ? '#f87171' : dow === 6 ? '#7dd3fc' : 'rgba(196,210,226,0.65)' }}>{d.date()}</span>
                    {dayEvents.length > 0 && isCurrentMonth && <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.62)' }}>{dayEvents.length}</span>}
                  </div>
                  {holidayName && isCurrentMonth && (
                    <div style={{ fontSize: 14, color: '#f87171', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>{holidayName}</div>
                  )}
                  {dayEvents.slice(0, 3).map(ev => {
                    const cfg = evtCfg(ev.event_type)
                    return (
                      <div key={ev.id} style={{ fontSize: 14, borderRadius: 3, padding: '1px 5px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '15px' }}>
                        <span style={{ fontWeight: 700, marginRight: 2 }}>{cfg.label}</span>
                        {ev.machine_no ? `${formatMachineLabel(ev.machine_no)} ` : ''}{ev.title}
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.62)', paddingLeft: 2 }}>+{dayEvents.length - 3}개 더</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 선택 날 상세 */}
        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 상세 헤더 */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--nowa-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{dayjs(selectedDate).format('M월 D일')}</div>
                <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', marginTop: 1 }}>{dayjs(selectedDate).format('dddd')}</div>
              </div>
              <button
                onClick={() => openCreate(selectedDate)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(125,211,252,0.1)', border: '1px solid rgba(125,211,252,0.3)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: '#7dd3fc', fontSize: 14, fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(125,211,252,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(125,211,252,0.1)'}
              ><PlusOutlined /> 추가</button>
            </div>

            {/* 이벤트 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(196,210,226,0.62)', fontSize: 14, gap: 8 }}>
                  <span style={{ fontSize: 28, opacity: 0.3 }}>📅</span>
                  <span>등록된 일정이 없습니다</span>
                </div>
              ) : selectedEvents.map(ev => {
                const cfg = evtCfg(ev.event_type)
                return (
                  <div key={ev.id} style={{ background: 'var(--nowa-bg)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 3, padding: '1px 5px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                          {ev.machine_no && <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)' }}>{formatMachineLabel(ev.machine_no)}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text)', lineHeight: 1.4 }}>{ev.title || '-'}</div>
                        {ev.detail && <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.72)', marginTop: 4, lineHeight: 1.4 }}>{ev.detail}</div>}
                        {ev.actor && (
                          <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserOutlined style={{ fontSize: 14 }} />{ev.actor}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0, paddingTop: 2 }}>
                        <EditOutlined onClick={() => openEdit(ev)} style={{ color: 'rgba(245,158,11,0.7)', fontSize: 14, cursor: 'pointer' }} />
                        <Popconfirm title="일정을 삭제하시겠습니까?" onConfirm={() => handleDelete(ev.id)} okText="삭제" cancelText="취소">
                          <DeleteOutlined style={{ color: '#f87171', fontSize: 14, cursor: 'pointer', opacity: 0.8 }} />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 수동 추가/수정 모달 */}
      <Modal title={editingEvent ? '일정 수정' : '수동 일정 추가'} open={manualOpen} onCancel={() => setManualOpen(false)} onOk={() => form.submit()} okText={editingEvent ? '저장' : '추가'} cancelText="취소">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="occurred_at" label="날짜" rules={[{ required: true, message: '날짜를 선택하세요.' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="event_type" label="유형" rules={[{ required: true }]}>
            <Select options={Object.entries(EVENT_CONFIG).map(([k, v]) => ({ label: <span style={{ color: v.color, fontWeight: 700 }}>{v.label}</span>, value: k }))} />
          </Form.Item>
          <Form.Item name="machine_no" label="호기">
            <Select allowClear showSearch options={machineOptions} placeholder="호기 선택 (선택사항)" />
          </Form.Item>
          <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력하세요.' }]}>
            <Input placeholder="일정 제목" />
          </Form.Item>
          <Form.Item name="detail" label="상세 내용">
            <Input.TextArea rows={3} placeholder="상세 내용 (선택사항)" />
          </Form.Item>
          <Form.Item name="actor" label="담당자">
            <Select allowClear showSearch options={memberOptions} placeholder="담당자 선택 (선택사항)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 자동 생성 모달 */}
      <AutoGenModal
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        pmCounters={pmCounters}
        sourceStatus={sourceStatus}
        pmMembers={pmMembers}
        year={year}
        month={month}
        holidays={holidays}
        onConfirm={fetchAll}
      />
    </div>
  )
}
