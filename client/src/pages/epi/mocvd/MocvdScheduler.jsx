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
import { getWorkTimePerDay } from './PmWorkTimeSettings'

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
const EVENT_DURATION = { pm: 5, filter: 1, bm: 1, source_change: 1, other: 1 }
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const navBtnStyle = {
  background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)',
  borderRadius: 8, width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--nowa-text)', fontSize: 14,
}

/* ── 자동 일정 생성 알고리즘 ────────────────────────────────── */
// 예상 교체일이 해당 월에 해당하는 항목을 그 날짜에 직접 배치
function autoGenerate({ pmCounters, sourceStatus, pmMembers, config, holidays = {} }) {
  const { includeSun, includeSat, includeHoliday = false, pmPersonCount = 2, sourcePersonCount = 1 } = config

  const today = dayjs()

  // 주말/공휴일이면 다음 평일로 이동
  const nearestWorkday = (dateStr) => {
    let d = dayjs(dateStr)
    for (let i = 0; i < 7; i++) {
      const ds = d.format('YYYY-MM-DD')
      const dow = d.day()
      const sat = dow === 6, sun = dow === 0
      const holiday = !!holidays[ds]
      if ((!sat || includeSat) && (!sun || includeSun) && (!holiday || includeHoliday)) return ds
      d = d.add(1, 'day')
    }
    return null
  }

  const schedule = []
  let memberCursor = 0

  const assignActors = (count) => {
    const n = Math.max(1, Math.min(count, pmMembers.length || 1))
    const names = []
    for (let i = 0; i < n; i++) {
      if (pmMembers.length > 0) { names.push(pmMembers[memberCursor % pmMembers.length].name); memberCursor++ }
    }
    return names.join(', ')
  }

  // ── PM 정비: pm_base_count - chamber_count 잔여 런 기준 예상일 계산
  if (config.includePm) {
    const sourceMap = {}
    ;(sourceStatus?.events || []).forEach(ev => {
      if (ev.source_label === 'NH3' && ev.daily_usage > 0) sourceMap[ev.machine_no] = ev.daily_usage
    })
    pmCounters.forEach(row => {
      const pmRem = (row.pm_base_count || 0) - (row.chamber_count || 0)
      if (pmRem <= 0) return
      const dailyRate = sourceMap[row.machine_no] || 1
      const daysLeft = Math.ceil(pmRem / dailyRate)
      const dateStr = nearestWorkday(today.add(daysLeft, 'day').format('YYYY-MM-DD'))
      if (!dateStr) return
      schedule.push({
        event_type: 'pm', machine_no: row.machine_no, title: 'PM 정비',
        occurred_at: dateStr + 'T00:00:00', date: dateStr,
        actor: assignActors(pmPersonCount), badge: '예정',
      })
    })
  }

  // ── 필터 교체
  // 1) PM 1일차에 무조건 필터 교체
  // 2) filter_base_count 절반 지점에 추가 필터 교체
  if (config.includeFilter) {
    const sourceMap = {}
    ;(sourceStatus?.events || []).forEach(ev => {
      if (ev.source_label === 'NH3' && ev.daily_usage > 0) sourceMap[ev.machine_no] = ev.daily_usage
    })

    // PM 1일차 날짜 수집
    const pmDateByMachine = {}
    schedule.forEach(ev => {
      if (ev.event_type === 'pm') pmDateByMachine[ev.machine_no] = ev.date
    })

    pmCounters.forEach(row => {
      const dailyRate = sourceMap[row.machine_no] || 1

      // 1) PM 1일차 필터 교체
      const pmDate = pmDateByMachine[row.machine_no]
      if (pmDate) {
        schedule.push({
          event_type: 'filter', machine_no: row.machine_no, title: '필터 교체',
          occurred_at: pmDate + 'T00:00:00', date: pmDate,
          actor: assignActors(1), badge: '예정',
        })
      }

      // 2) Half 지점 추가 필터 교체
      const halfBase = Math.floor((row.filter_base_count || 0) / 2)
      const halfRem = halfBase - (row.filter_count || 0)
      if (halfRem > 0) {
        const daysLeft = Math.ceil(halfRem / dailyRate)
        const dateStr = nearestWorkday(today.add(daysLeft, 'day').format('YYYY-MM-DD'))
        if (dateStr) {
          schedule.push({
            event_type: 'filter', machine_no: row.machine_no, title: '필터 교체 (Half)',
            occurred_at: dateStr + 'T00:00:00', date: dateStr,
            actor: assignActors(1), badge: '예정',
          })
        }
      }
    })
  }

  // ── 소스 교체: projected_replacement_date 기준 (날짜 그대로)
  if (config.includeSource) {
    const seen = new Set()
    ;(sourceStatus?.events || []).forEach(ev => {
      const dateStr = ev.projected_replacement_date
      if (!dateStr) return
      const key = `${ev.machine_no}:${ev.source_label}`
      if (seen.has(key)) return
      seen.add(key)
      schedule.push({
        event_type: 'source_change', machine_no: ev.machine_no,
        title: `소스 교체 (${ev.source_label})`,
        occurred_at: dateStr + 'T00:00:00', date: dateStr,
        actor: assignActors(sourcePersonCount), badge: '예정',
      })
    })
  }

  // ── 소스 교체가 PM 기간(5일) 안에 겹치면 무조건 PM 2일차로 이동
  const pmStartByMachine = {}
  schedule.forEach(ev => {
    if (ev.event_type === 'pm') pmStartByMachine[ev.machine_no] = ev.date
  })
  schedule.forEach(ev => {
    if (ev.event_type !== 'source_change') return
    const pmStart = pmStartByMachine[ev.machine_no]
    if (!pmStart) return
    const pmStartD = dayjs(pmStart)
    const evD = dayjs(ev.date)
    const diff = evD.diff(pmStartD, 'day')
    if (diff >= 0 && diff < (EVENT_DURATION.pm ?? 5)) {
      const newDate = pmStartD.add(1, 'day').format('YYYY-MM-DD')
      ev.date = newDate
      ev.occurred_at = newDate + 'T00:00:00'
    }
  })

  return schedule.sort((a, b) => a.date.localeCompare(b.date))
}

/* ── 자동 생성 카드 ─────────────────────────────────────────── */
function AutoGenCard({ pmCounters, sourceStatus, pmMembers, year, month, holidays, events = [], onConfirm }) {
  const [config, setConfig] = useState({
    includePm: true, includeFilter: true, includeSource: true,
    includeSat: false, includeSun: false, includeHoliday: false,
    pmPersonCount: 2, sourcePersonCount: 1,
  })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const result = autoGenerate({ pmCounters, sourceStatus, pmMembers, config, holidays })
    setPreview(result)
  }, [config, year, month, pmCounters, pmMembers, sourceStatus, holidays])

  const handleConfirm = async () => {
    if (!preview || preview.length === 0) return
    setSaving(true)
    try {
      // 기존 자동생성 이벤트 전부 삭제
      const autoEvents = events.filter(e => e.detail === '자동 생성 (예상일 기준)')
      for (const ev of autoEvents) {
        await authFetch(`/api/mocvd/equipment-history/${ev.id}`, { method: 'DELETE' })
      }
      // 새 일정 저장
      for (const item of preview) {
        await authFetch('/api/mocvd/equipment-history', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machine_no: item.machine_no, event_type: item.event_type,
            title: item.title, detail: '자동 생성 (예상일 기준)',
            occurred_at: item.occurred_at, actor: item.actor,
          }),
        })
      }
      message.success(`기존 ${autoEvents.length}건 삭제 후 ${preview.length}건 생성했습니다.`)
      setPreview(null)
      onConfirm()
    } catch { message.error('일정 생성에 실패했습니다.') }
    setSaving(false)
  }

  const toggle = (key) => setConfig(p => ({ ...p, [key]: !p[key] }))
  const pmCount  = preview?.filter(i => i.event_type === 'pm').length ?? 0
  const filCount = preview?.filter(i => i.event_type === 'filter').length ?? 0
  const srcCount = preview?.filter(i => i.event_type === 'source_change').length ?? 0

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <RobotOutlined style={{ color: '#4ade80', fontSize: 13 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>자동 일정 생성</span>
        <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.4)', marginLeft: 2 }}>예상 교체일 기준으로 해당 월 일정 생성</span>
        {preview !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: preview.length > 0 ? '#7dd3fc' : 'rgba(196,210,226,0.4)' }}>
            {preview.length}건 예정
          </span>
        )}
      </div>

      {/* 설정 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 6, fontSize: 12 }}>
        {/* 포함 유형 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <Checkbox checked={config.includePm} onChange={() => toggle('includePm')} />
            <span style={{ color: '#7dd3fc', fontWeight: 700 }}>PM 정비</span>
            {preview && <span style={{ color: 'rgba(196,210,226,0.5)', marginLeft: 2 }}>({pmCount}건)</span>}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <Checkbox checked={config.includeFilter} onChange={() => toggle('includeFilter')} />
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>필터 교체</span>
            {preview && <span style={{ color: 'rgba(196,210,226,0.5)', marginLeft: 2 }}>({filCount}건)</span>}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <Checkbox checked={config.includeSource} onChange={() => toggle('includeSource')} />
            <span style={{ color: '#a3e635', fontWeight: 700 }}>소스 교체</span>
            {preview && <span style={{ color: 'rgba(196,210,226,0.5)', marginLeft: 2 }}>({srcCount}건)</span>}
          </label>
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

        {/* 작업일 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'rgba(196,210,226,0.55)' }}>작업일</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <Checkbox checked={config.includeSat} onChange={() => toggle('includeSat')} /> 토
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <Checkbox checked={config.includeSun} onChange={() => toggle('includeSun')} /> 일
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <Checkbox checked={config.includeHoliday} onChange={() => toggle('includeHoliday')} /> 공휴일
          </label>
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

        {/* 인원 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'rgba(196,210,226,0.55)' }}>PM 인원</span>
          <Select value={config.pmPersonCount} onChange={v => setConfig(p => ({ ...p, pmPersonCount: v }))}
            style={{ width: 70 }} size="small" options={[1,2,3,4,5,6].map(n => ({ label: `${n}명`, value: n }))} />
          <span style={{ color: 'rgba(196,210,226,0.55)' }}>소스 인원</span>
          <Select value={config.sourcePersonCount} onChange={v => setConfig(p => ({ ...p, sourcePersonCount: v }))}
            style={{ width: 70 }} size="small" options={[1,2,3,4,5,6].map(n => ({ label: `${n}명`, value: n }))} />
        </div>

        {pmMembers.length > 0 && (
          <span style={{ color: 'rgba(196,210,226,0.45)', marginLeft: 4 }}>
            투입 {pmMembers.length}명 → {pmMembers.slice(0, config.pmPersonCount).map(m => m.name).join(', ')}
          </span>
        )}
      </div>

      {/* 미리보기 */}
      {preview !== null && (
        <div>
          {preview.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(196,210,226,0.5)', textAlign: 'center', padding: '8px 0' }}>
              해당 월에 예정된 항목이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto', background: 'var(--nowa-bg)', borderRadius: 8, padding: '5px 8px', border: '1px solid var(--nowa-border)' }}>
              {preview.map((item, i) => {
                const cfg = evtCfg(item.event_type)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 2px', borderBottom: i < preview.length - 1 ? '1px solid var(--nowa-border)' : 'none' }}>
                    <span style={{ color: 'rgba(196,210,226,0.7)', minWidth: 72 }}>{dayjs(item.date).format('M/D (ddd)')}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 3, padding: '1px 4px', flexShrink: 0, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                    <span style={{ color: 'var(--nowa-text)', flex: 1 }}>
                      {item.machine_no ? `${formatMachineLabel(item.machine_no)} ` : ''}{item.title}
                    </span>
                    {item.actor && <span style={{ color: '#7dd3fc', fontSize: 12, flexShrink: 0 }}>{item.actor}</span>}
                  </div>
                )
              })}
            </div>
          )}
          {preview.length > 0 && (
            <button onClick={handleConfirm} disabled={saving} style={{ marginTop: 6, background: saving ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 6, padding: '6px 0', cursor: saving ? 'default' : 'pointer', color: '#4ade80', fontSize: 13, fontWeight: 700, width: '100%' }}>
              {saving ? '저장 중...' : `${preview.length}건 일정 저장`}
            </button>
          )}
        </div>
      )}
    </div>
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
  const [groups, setGroups] = useState([])     // [{ id, name, machine_nos }]

  const [manualOpen, setManualOpen] = useState(false)
  const [autoGenOpen, setAutoGenOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [applyGroup, setApplyGroup] = useState(false)
  const [form] = Form.useForm()
  const watchedMachineNo = Form.useWatch('machine_no', form)

  // 선택 호기가 속한 그룹 (없으면 null)
  const selectedGroup = useMemo(() =>
    groups.find(g => watchedMachineNo && g.machine_nos.includes(watchedMachineNo)) ?? null
  , [groups, watchedMachineNo])

  // machine_no → group 역방향 맵
  const machineGroupMap = useMemo(() => {
    const map = {}
    groups.forEach(g => g.machine_nos.forEach(no => { map[no] = g }))
    return map
  }, [groups])

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, mbRes, paRes, evRes, pcRes, ssRes, hdRes, grRes] = await Promise.all([
        authFetch('/api/admin/machines'),
        authFetch('/api/admin/personnel/members'),
        authFetch('/api/admin/personnel/pm-assign'),
        authFetch('/api/mocvd/equipment-history'),
        authFetch('/api/mocvd/pm-counters'),
        authFetch('/api/mocvd/source-status'),
        authFetch(`/api/shift/holidays?year=${today.year()}`),
        authFetch('/api/admin/machine-groups'),
      ])
      if (mRes.ok) setMachines(await mRes.json())
      if (mbRes.ok) setMembers(await mbRes.json())
      if (grRes.ok) setGroups(await grRes.json())
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

  const eventsByMachineDate = useMemo(() => {
    const map = {}
    events.forEach(ev => {
      const startD = ev.occurred_at?.slice(0, 10)
      if (!startD || !ev.machine_no) return
      const duration = EVENT_DURATION[ev.event_type] ?? 1
      for (let i = 0; i < duration; i++) {
        const d = dayjs(startD).add(i, 'day').format('YYYY-MM-DD')
        const key = `${ev.machine_no}:${d}`
        if (!map[key]) map[key] = []
        const role = duration === 1 ? 'single' : i === 0 ? 'start' : i === duration - 1 ? 'end' : 'mid'
        map[key].push({ ...ev, spanRole: role, spanDay: i + 1, spanTotal: duration })
      }
    })
    return map
  }, [events])

  const monthDays = useMemo(() => {
    const ms = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
    const days = []
    for (let d = 1; d <= ms.daysInMonth(); d++) days.push(ms.date(d))
    return days
  }, [year, month])

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

  const openCreate = (date, machineNo = null) => {
    setEditingEvent(null)
    setApplyGroup(false)
    form.resetFields()
    form.setFieldsValue({ occurred_at: date, event_type: 'pm', ...(machineNo ? { machine_no: machineNo } : {}) })
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
      const payload = { ...values, occurred_at: values.occurred_at + 'T00:00:00' }
      if (editingEvent) {
        const res = await authFetch(`/api/mocvd/equipment-history/${editingEvent.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        message.success('수정했습니다.')
      } else {
        // 그룹 전체 적용: 같은 그룹의 모든 호기에 동일 이벤트 생성
        const group = applyGroup && values.machine_no ? machineGroupMap[values.machine_no] : null
        const targetMachineNos = group ? group.machine_nos : [values.machine_no]
        for (const no of targetMachineNos) {
          const res = await authFetch('/api/mocvd/equipment-history', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, machine_no: no }),
          })
          if (!res.ok) throw new Error()
        }
        message.success(group ? `그룹 ${group.machine_nos.length}대에 일정을 추가했습니다.` : '일정을 추가했습니다.')
      }
      setManualOpen(false)
      setApplyGroup(false)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, height: '100%' }}>

      {/* ── 상단 정보 바 ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* 이번 달 현황 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(196,210,226,0.55)', marginRight: 4, whiteSpace: 'nowrap' }}>{year}년 {month}월 현황</span>
          {monthStats.map(({ key, cfg, count }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 4, padding: '1px 6px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? cfg.color : 'rgba(196,210,226,0.35)', minWidth: 14 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(196,210,226,0.55)', marginRight: 4 }}>범례</span>
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 4, padding: '1px 6px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.65)', whiteSpace: 'nowrap' }}>
                {key === 'pm' ? 'PM 정비' : key === 'filter' ? '필터 교체' : key === 'bm' ? 'BM 수리' : key === 'source_change' ? '소스 교체' : '기타'}
              </span>
            </div>
          ))}
        </div>

        {/* PM 투입 인원 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <ToolOutlined style={{ color: '#7dd3fc', fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(196,210,226,0.55)', whiteSpace: 'nowrap' }}>PM 투입 인원</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc', background: 'rgba(125,211,252,0.12)', padding: '1px 7px', borderRadius: 8 }}>{pmMembers.length}명</span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center' }}>
            {pmMembers.length === 0 ? (
              <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.4)' }}>배정된 인원이 없습니다</span>
            ) : pmMembers.map(m => (
              <div key={m.id} title={`${m.name}${pmAssign[m.id] ? ' / ' + pmAssign[m.id] : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(125,211,252,0.07)', border: '1px solid rgba(125,211,252,0.2)', borderRadius: 20, padding: '2px 8px 2px 4px', flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(125,211,252,0.15)', border: '1.5px solid rgba(125,211,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#7dd3fc' }}>{m.name?.[0] || '?'}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 메인: 간트 차트 ── */}
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => openCreate(today.format('YYYY-MM-DD'))}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(125,211,252,0.35)', background: 'rgba(125,211,252,0.1)', color: '#7dd3fc' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(125,211,252,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(125,211,252,0.1)'}
            ><PlusOutlined /> 수동 추가</button>
            <button
              onClick={() => setAutoGenOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '5px 14px', borderRadius: 8, border: `1px solid ${autoGenOpen ? 'rgba(74,222,128,0.5)' : 'rgba(74,222,128,0.3)'}`, background: autoGenOpen ? 'rgba(74,222,128,0.18)' : 'rgba(74,222,128,0.08)', color: '#4ade80' }}
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

        {/* 자동 생성 카드 (토글) */}
        {autoGenOpen && (
          <AutoGenCard
            pmCounters={pmCounters}
            sourceStatus={sourceStatus}
            pmMembers={pmMembers}
            year={year}
            month={month}
            holidays={holidays}
            groups={groups}
            events={events}
            onConfirm={() => { fetchAll(); setAutoGenOpen(false) }}
          />
        )}

        {/* 간트 차트 본체 */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12 }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 90 }} />
              {monthDays.map(d => <col key={d.date()} style={{ minWidth: 36 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, top: 0, zIndex: 11,
                  background: '#171b26', padding: '8px 10px',
                  textAlign: 'left', fontSize: 12, color: 'rgba(196,210,226,0.5)',
                  borderBottom: '2px solid rgba(245,158,11,0.25)',
                  borderRight: '2px solid rgba(245,158,11,0.25)',
                }}>호기</th>
                {monthDays.map(d => {
                  const dateStr = d.format('YYYY-MM-DD')
                  const dow = d.day()
                  const isToday = dateStr === today.format('YYYY-MM-DD')
                  const isHoliday = !!holidays[dateStr]
                  const isSun = dow === 0
                  const isSat = dow === 6
                  return (
                    <th key={dateStr} style={{
                      position: 'sticky', top: 0, zIndex: 10,
                      background: isToday ? 'rgba(245,158,11,0.18)' : isHoliday ? 'rgba(248,113,113,0.1)' : isSun ? 'rgba(248,113,113,0.06)' : isSat ? 'rgba(125,211,252,0.06)' : '#171b26',
                      padding: '5px 2px', textAlign: 'center',
                      borderBottom: '2px solid rgba(245,158,11,0.25)',
                      borderLeft: '1px solid rgba(245,158,11,0.15)',
                      color: isToday ? '#f59e0b' : isSun || isHoliday ? '#f87171' : isSat ? '#7dd3fc' : 'rgba(196,210,226,0.6)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>{d.date()}</div>
                      <div style={{ fontSize: 10, opacity: 0.8 }}>{WEEK_DAYS[dow]}</div>
                      {isHoliday && <div style={{ fontSize: 8, color: '#f87171', lineHeight: 1, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 42, textOverflow: 'ellipsis' }}>{holidays[dateStr]}</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const activeMachines = machines
                  .filter(m => m.is_active)
                  .sort((a, b) => String(a.machine_no).localeCompare(String(b.machine_no), undefined, { numeric: true }))

                // 그룹 순서 유지: groups 배열 순서대로, 미배정은 마지막
                // 중그룹 맵 (machine_no → group)
                const midGroupMap = {}
                groups.filter(g => g.level >= 2).forEach(g => {
                  g.machine_nos.forEach(no => { midGroupMap[no] = g })
                })

                const rows = []
                let lastGroupId = undefined
                let rowIdx = 0

                activeMachines.forEach(m => {
                  const grp = midGroupMap[m.machine_no]
                  const grpId = grp?.id ?? null

                  if (grpId !== lastGroupId) {
                    lastGroupId = grpId
                    rows.push(
                      <tr key={`grp-${grpId}-${m.machine_no}`}>
                        <td colSpan={monthDays.length + 1} style={{
                          position: 'sticky', left: 0,
                          background: 'rgba(245,158,11,0.08)',
                          padding: '3px 10px', fontSize: 11, fontWeight: 800,
                          color: '#f59e0b', letterSpacing: 1,
                          borderBottom: '1px solid rgba(245,158,11,0.25)',
                          borderTop: '2px solid rgba(245,158,11,0.2)',
                        }}>
                          {grp?.name ?? '미배정'}
                        </td>
                      </tr>
                    )
                  }

                  const rIdx2 = rowIdx++
                  const rowBg = rIdx2 % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  const stickyBg = rIdx2 % 2 === 0 ? '#171b26' : '#1b1f2c'
                  rows.push(
                    <tr key={m.machine_no}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 2,
                        background: stickyBg,
                        padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#fbbf24',
                        borderBottom: '1px solid rgba(245,158,11,0.1)',
                        borderRight: '2px solid rgba(245,158,11,0.25)',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatMachineLabel(m.machine_no)}
                      </td>
                      {monthDays.map(d => {
                        const dateStr = d.format('YYYY-MM-DD')
                        const dow = d.day()
                        const isToday = dateStr === today.format('YYYY-MM-DD')
                        const isHoliday = !!holidays[dateStr]
                        const isSun = dow === 0, isSat = dow === 6
                        const cellEvents = eventsByMachineDate[`${m.machine_no}:${dateStr}`] || []
                        const spanEvents = cellEvents.filter(e => e.spanTotal > 1)
                        const singleEvents = cellEvents.filter(e => !e.spanTotal || e.spanTotal === 1)
                        const hasFromLeft = spanEvents.some(e => e.spanRole === 'mid' || e.spanRole === 'end')
                        const hasToRight = spanEvents.some(e => e.spanRole === 'start' || e.spanRole === 'mid')
                        const cellBg = isToday ? 'rgba(245,158,11,0.07)' : isHoliday || isSun ? 'rgba(248,113,113,0.03)' : isSat ? 'rgba(125,211,252,0.02)' : rowBg
                        return (
                          <td key={dateStr}
                            onClick={() => cellEvents.length === 0 && openCreate(dateStr, m.machine_no)}
                            style={{
                              padding: 0, background: cellBg,
                              borderBottom: '1px solid rgba(245,158,11,0.1)',
                              borderLeft: '1px solid rgba(245,158,11,0.1)',
                              cursor: cellEvents.length === 0 ? 'pointer' : 'default',
                              verticalAlign: 'top', height: 30,
                              overflow: 'visible', position: 'relative',
                            }}
                            onMouseEnter={e => { if (cellEvents.length === 0) e.currentTarget.style.background = 'rgba(125,211,252,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = cellBg }}
                          >
                            {spanEvents.map(ev => {
                              const cfg = evtCfg(ev.event_type)
                              const role = ev.spanRole
                              const isStart = role === 'start', isEnd = role === 'end'
                              const ml = hasFromLeft ? -1 : 2, mr = hasToRight ? -1 : 2
                              return (
                                <div key={ev.id + ':' + role}
                                  onClick={e => { e.stopPropagation(); isStart && openEdit(ev) }}
                                  title={isStart ? `${ev.title || cfg.label}${ev.actor ? ' / ' + ev.actor : ''}` : undefined}
                                  style={{
                                    fontSize: 10, fontWeight: 700,
                                    borderRadius: isStart && isEnd ? 2 : isStart ? '2px 0 0 2px' : isEnd ? '0 2px 2px 0' : 0,
                                    padding: '1px 3px',
                                    marginLeft: ml, marginRight: mr, marginBottom: 1, marginTop: 2,
                                    color: cfg.color, background: cfg.bg,
                                    borderTop: `1px solid ${cfg.border}`,
                                    borderBottom: `1px solid ${cfg.border}`,
                                    borderLeft: isStart ? `1px solid ${cfg.border}` : 'none',
                                    borderRight: isEnd ? `1px solid ${cfg.border}` : 'none',
                                    cursor: isStart ? 'pointer' : 'default',
                                    whiteSpace: 'nowrap', overflow: 'hidden', display: 'block',
                                  }}
                                >{`${cfg.label} ${ev.spanDay}`}</div>
                              )
                            })}
                            {singleEvents.map(ev => {
                              const cfg = evtCfg(ev.event_type)
                              return (
                                <div key={ev.id}
                                  onClick={e => { e.stopPropagation(); openEdit(ev) }}
                                  title={`${ev.title || cfg.label}${ev.actor ? ' / ' + ev.actor : ''}`}
                                  style={{
                                    fontSize: 10, fontWeight: 700, borderRadius: 2,
                                    padding: '1px 3px', margin: '2px 2px 1px',
                                    color: cfg.color, background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                                  }}
                                >{cfg.label}</div>
                              )
                            })}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
                return rows
              })()}
            </tbody>
          </table>
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
          {!editingEvent && selectedGroup && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>
                그룹: {selectedGroup.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {selectedGroup.machine_nos.map(no => (
                  <span key={no} style={{ fontSize: 13, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '1px 7px', color: '#fbbf24' }}>
                    {formatMachineLabel(no)}
                  </span>
                ))}
              </div>
              <Checkbox checked={applyGroup} onChange={e => setApplyGroup(e.target.checked)} style={{ color: 'rgba(196,210,226,0.85)', fontSize: 14 }}>
                그룹 전체 {selectedGroup.machine_nos.length}대에 적용
              </Checkbox>
            </div>
          )}
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

    </div>
  )
}
