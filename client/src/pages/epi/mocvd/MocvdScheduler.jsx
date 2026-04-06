import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox, Form, Input, Modal, Popconfirm, Select, message } from 'antd'
import {
  DeleteOutlined, EditOutlined, LeftOutlined, PlusOutlined,
  RightOutlined, RobotOutlined, UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getWorkTimePerDay } from './PmWorkTimeSettings'

dayjs.locale('ko')

/* ?? ?곸닔 ???????????????????????????????????????????????????? */
const EVENT_CONFIG = {
  pm:            { label: 'PM',      color: '#7dd3fc', bg: 'rgba(125,211,252,0.15)', border: 'rgba(125,211,252,0.35)' },
  filter:        { label: '필터',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  bm:            { label: 'BM',      color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)' },
  source_change: { label: '소스',    color: '#a3e635', bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.35)' },
  other:         { label: '기타',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',   border: 'rgba(251,191,36,0.35)' },
}
const FILTER_HALF_CONFIG = { label: 'Half', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.5)' }
const evtCfg = (eventOrType, maybeTitle = '') => {
  if (typeof eventOrType === 'object' && eventOrType !== null) {
    const t = eventOrType.event_type
    const title = String(eventOrType.title || '')
    if (t === 'filter' && (title.includes('중간') || title.toLowerCase().includes('half'))) return FILTER_HALF_CONFIG
    return EVENT_CONFIG[t] || EVENT_CONFIG.other
  }
  const t = eventOrType
  const title = String(maybeTitle || '')
  if (t === 'filter' && (title.includes('중간') || title.toLowerCase().includes('half'))) return FILTER_HALF_CONFIG
  return EVENT_CONFIG[t] || EVENT_CONFIG.other
}
const EVENT_DURATION = { pm: 5, filter: 1, bm: 1, source_change: 1, other: 1 }
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const navBtnStyle = {
  background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)',
  borderRadius: 8, width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--nowa-text)', fontSize: 14,
}

/* ?? ?먮룞 ?쇱젙 ?앹꽦 ?뚭퀬由ъ쬁 ?????????????????????????????????? */
// ?덉긽 援먯껜?쇱씠 ?대떦 ?붿뿉 ?대떦?섎뒗 ??ぉ??洹??좎쭨??吏곸젒 諛곗튂
function autoGenerate({ pmCounters, sourceStatus, pmMembers, config, holidays = {} }) {
  const { pmPersonCount = 2, sourcePersonCount = 1 } = config
  const today = dayjs()

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

  if (config.includePm) {
    pmCounters.forEach(row => {
      const pmRem = (row.pm_base_count || 0) - (row.chamber_count || 0)
      const runPerDay = Number(row.run_per_day || 0)
      if (runPerDay <= 0) return
      const daysLeft = Math.ceil(pmRem / runPerDay)
      const dateStr = today.add(Math.max(0, daysLeft), 'day').format('YYYY-MM-DD')
      schedule.push({
        event_type: 'pm', machine_no: row.machine_no, title: 'PM 정비',
        occurred_at: dateStr + 'T00:00:00', date: dateStr,
        actor: assignActors(pmPersonCount), badge: '예정',
      })
    })
  }

  if (config.includeFilter) {
    pmCounters.forEach(row => {
      const filterBase = Number(row.filter_base_count || 0)
      const filterCount = Number(row.filter_count || 0)
      const filterHalfBase = Math.floor(filterBase / 2)
      const runPerDay = Number(row.run_per_day || 0)
      if (runPerDay <= 0) return

      const fullRem = filterBase - filterCount
      const fullDaysLeft = Math.ceil(fullRem / runPerDay)
      const fullDateStr = today.add(Math.max(0, fullDaysLeft), 'day').format('YYYY-MM-DD')
      schedule.push({
        event_type: 'filter', machine_no: row.machine_no, title: '필터 교체',
        occurred_at: fullDateStr + 'T00:00:00', date: fullDateStr,
        actor: assignActors(1), badge: '예정',
      })

      if (filterHalfBase > 0 && filterHalfBase !== filterBase) {
        const halfRem = filterHalfBase - filterCount
        const halfDaysLeft = Math.ceil(halfRem / runPerDay)
        const halfDateStr = today.add(Math.max(0, halfDaysLeft), 'day').format('YYYY-MM-DD')
        schedule.push({
          event_type: 'filter', machine_no: row.machine_no, title: 'Half',
          occurred_at: halfDateStr + 'T00:00:00', date: halfDateStr,
          actor: assignActors(1), badge: '예정',
        })
      }
    })
  }

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

  return schedule.sort((a, b) => a.date.localeCompare(b.date))
}

/* ?? ?먮룞 ?앹꽦 移대뱶 ??????????????????????????????????????????? */
function AutoGenCard({ pmCounters, sourceStatus, pmMembers, year, month, holidays, onConfirm }) {
  const [config, setConfig] = useState({
    includePm: true, includeFilter: true, includeSource: true,
    includeSat: false, includeSun: false, includeHoliday: false,
    pmPersonCount: 2, sourcePersonCount: 1,
  })
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    const result = autoGenerate({ pmCounters, sourceStatus, pmMembers, config, holidays })
    setPreview(result)
  }, [config, year, month, pmCounters, pmMembers, sourceStatus, holidays])

  const handleConfirm = () => {
    if (!preview || preview.length === 0) return
    onConfirm?.(preview)
    message.success(`${preview.length}건 일정이 화면에 적용되었습니다.`)
  }

  const toggle = (key) => setConfig(p => ({ ...p, [key]: !p[key] }))
  const pmCount  = preview?.filter(i => i.event_type === 'pm').length ?? 0
  const filCount = preview?.filter(i => i.event_type === 'filter').length ?? 0
  const srcCount = preview?.filter(i => i.event_type === 'source_change').length ?? 0

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
      {/* ?ㅻ뜑 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <RobotOutlined style={{ color: '#4ade80', fontSize: 14 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>자동 일정 생성</span>
        <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.4)', marginLeft: 2 }}>예상 교체일 기준으로 해당 월 일정을 생성합니다</span>
        {preview !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: preview.length > 0 ? '#7dd3fc' : 'rgba(196,210,226,0.4)' }}>
            {preview.length}건 예정
          </span>
        )}
      </div>

      {/* ?ㅼ젙 ??*/}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 6, fontSize: 14 }}>
        {/* ?ы븿 ?좏삎 */}
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

        {/* 援щ텇??*/}
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

        {/* 援щ텇??*/}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

        {/* ?몄썝 */}
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
            투입 {pmMembers.length}명: {pmMembers.slice(0, config.pmPersonCount).map(m => m.name).join(', ')}
          </span>
        )}
      </div>

      {/* 誘몃━蹂닿린 */}
      {preview !== null && (
        <div>
          {preview.length === 0 ? (
            <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.5)', textAlign: 'center', padding: '8px 0' }}>
              해당 월에 예정된 항목이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto', background: 'var(--nowa-bg)', borderRadius: 8, padding: '5px 8px', border: '1px solid var(--nowa-border)' }}>
              {preview.map((item, i) => {
                const cfg = evtCfg(item)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '2px 2px', borderBottom: i < preview.length - 1 ? '1px solid var(--nowa-border)' : 'none' }}>
                    <span style={{ color: 'rgba(196,210,226,0.7)', minWidth: 72 }}>{dayjs(item.date).format('M/D (ddd)')}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 3, padding: '1px 4px', flexShrink: 0, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                    <span style={{ color: 'var(--nowa-text)', flex: 1 }}>
                      {item.machine_no ? `${formatMachineLabel(item.machine_no)} ` : ''}{item.title}
                    </span>
                    {item.actor && <span style={{ color: '#7dd3fc', fontSize: 14, flexShrink: 0 }}>{item.actor}</span>}
                  </div>
                )
              })}
            </div>
          )}
          {preview.length > 0 && (
            <button onClick={handleConfirm} style={{ marginTop: 6, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 6, padding: '6px 0', cursor: 'pointer', color: '#4ade80', fontSize: 14, fontWeight: 700, width: '100%' }}>
              {`${preview.length}건 적용`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ?? 硫붿씤 ?ㅼ?以꾨윭 ???????????????????????????????????????????? */
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
  const [generatedEvents, setGeneratedEvents] = useState([])
  const [savingGenerated, setSavingGenerated] = useState(false)
  const [holidays, setHolidays] = useState({}) // { 'YYYY-MM-DD': '怨듯쑕?쇰챸' }
  const [groups, setGroups] = useState([])     // [{ id, name, machine_nos }]

  const [manualOpen, setManualOpen] = useState(false)
  const [autoGenOpen, setAutoGenOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [applyGroup, setApplyGroup] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [dragOverCell, setDragOverCell] = useState(null) // 'machineNo:dateStr'

  // ?꾪꽣 議곌굔
  const [filterTypes, setFilterTypes] = useState(Object.keys(EVENT_CONFIG).reduce((acc, k) => ({ ...acc, [k]: true }), {}))
  const [filterGroupIds, setFilterGroupIds] = useState(null) // null = ?꾩껜, Set = ?좏깮??洹몃９ id
  const [showUnassigned, setShowUnassigned] = useState(true)
  const toggleType = (k) => setFilterTypes(p => ({ ...p, [k]: !p[k] }))
  const [form] = Form.useForm()
  const watchedMachineNo = Form.useWatch('machine_no', form)

  // ?좏깮 ?멸린媛 ?랁븳 洹몃９ (?놁쑝硫?null)
  const selectedGroup = useMemo(() =>
    groups.find(g => watchedMachineNo && g.machine_nos.includes(watchedMachineNo)) ?? null
  , [groups, watchedMachineNo])

  // machine_no -> group 매핑
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
        authFetch('/api/shift/holidays?year=' + today.year()),
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

  const displayEvents = useMemo(() => {
    if (!generatedEvents.length) return events
    const nonAuto = events.filter((ev) => ev.detail !== '자동 생성 (예상일 기준)')
    const drafts = generatedEvents.map((ev, idx) => ({
      id: `draft-${idx}-${ev.machine_no}-${ev.event_type}-${ev.date}`,
      machine_no: ev.machine_no,
      event_type: ev.event_type,
      title: ev.title,
      detail: '자동 생성 (예상일 기준)',
      occurred_at: ev.occurred_at,
      actor: ev.actor,
    }))
    return [...nonAuto, ...drafts]
  }, [events, generatedEvents])

  const eventsByDate = useMemo(() => {
    const map = {}
    displayEvents.forEach(ev => {
      const d = ev.occurred_at?.slice(0, 10)
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(ev)
    })
    return map
  }, [displayEvents])

  const eventsByMachineDate = useMemo(() => {
    const map = {}
    displayEvents.forEach(ev => {
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
  }, [displayEvents])

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

  const saveGeneratedEvents = async () => {
    if (generatedEvents.length === 0) {
      message.info('자동 생성 일정이 없습니다. 먼저 자동 생성을 실행해주세요.')
      return
    }
    setSavingGenerated(true)
    try {
      const autoEvents = events.filter((e) => e.detail === '자동 생성 (예상일 기준)')
      for (const ev of autoEvents) {
        await authFetch(`/api/mocvd/equipment-history/${ev.id}`, { method: 'DELETE' })
      }
      for (const item of generatedEvents) {
        await authFetch('/api/mocvd/equipment-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machine_no: item.machine_no,
            event_type: item.event_type,
            title: item.title,
            detail: '자동 생성 (예상일 기준)',
            occurred_at: item.occurred_at,
            actor: item.actor,
          }),
        })
      }
      message.success(`기존 ${autoEvents.length}건 삭제 후 ${generatedEvents.length}건 저장했습니다.`)
      setGeneratedEvents([])
      fetchAll()
      setAutoGenOpen(false)
    } catch {
      message.error('전체 저장에 실패했습니다.')
    } finally {
      setSavingGenerated(false)
    }
  }

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
        // 그룹 일괄 적용: 선택한 그룹의 모든 호기에 일정 생성
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

  const handleDrop = async (machineNo, dateStr) => {
    setDragOverCell(null)
    if (!draggedEvent) return
    const ev = draggedEvent
    setDraggedEvent(null)
    const newDate = dateStr
    const oldDate = ev.occurred_at?.slice(0, 10)
    if (newDate === oldDate && machineNo === ev.machine_no) return
    try {
      const res = await authFetch(`/api/mocvd/equipment-history/${ev.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ev, machine_no: machineNo, occurred_at: newDate + 'T00:00:00' }),
      })
      if (!res.ok) throw new Error()
      fetchAll()
    } catch { message.error('이동에 실패했습니다.') }
  }

  const machineOptions = machines.filter(m => m.is_active).map(m => ({ label: formatMachineLabel(m.machine_no), value: m.machine_no }))
  const memberOptions = members.filter(m => m.is_active).map(m => ({ label: m.name, value: m.name }))

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const persistedMonthEvents = events.filter(e => e.occurred_at?.startsWith(monthStr))
  const displayMonthEvents = displayEvents.filter(e => e.occurred_at?.startsWith(monthStr))
  const monthStats = Object.entries(EVENT_CONFIG).map(([key, cfg]) => ({
    key, cfg, count: displayMonthEvents.filter(e => e.event_type === key).length,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, height: '100%' }}>

      {/* ?? ?곷떒 ?뺣낫 諛??? */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* ?대쾲 ???꾪솴 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.55)', marginRight: 4, whiteSpace: 'nowrap' }}>{year}년 {month}월 현황</span>
          {monthStats.map(({ key, cfg, count }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '1px 6px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: count > 0 ? cfg.color : 'rgba(196,210,226,0.35)', minWidth: 14 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* 踰붾? */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.55)', marginRight: 4 }}>범례</span>
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '1px 6px', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', whiteSpace: 'nowrap' }}>
                {key === 'pm' ? 'PM 정비' : key === 'filter' ? '필터 교체' : key === 'bm' ? 'BM 수리' : key === 'source_change' ? '소스 교체' : '기타'}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* ?? 硫붿씤: 媛꾪듃 李⑦듃 ?? */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ?꾪꽣 議곌굔 移대뱶 */}
        <div style={{ background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.5)', whiteSpace: 'nowrap' }}>표시 유형</span>
            {Object.entries(EVENT_CONFIG).map(([k, cfg]) => (
              <label key={k} onClick={() => toggleType(k)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: filterTypes[k] ? 1 : 0.35 }}>
                <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '2px 8px', color: cfg.color, background: filterTypes[k] ? cfg.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${filterTypes[k] ? cfg.border : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s', userSelect: 'none' }}>{cfg.label}</span>
              </label>
            ))}
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.5)', whiteSpace: 'nowrap' }}>그룹</span>
            <label onClick={() => setFilterGroupIds(null)} style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s', color: filterGroupIds === null ? '#f59e0b' : 'rgba(196,210,226,0.45)', background: filterGroupIds === null ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filterGroupIds === null ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}` }}>전체</label>
            {groups.filter(g => g.level >= 1).map(g => {
              const active = filterGroupIds?.has(g.id)
              return (
                <label key={g.id} onClick={() => setFilterGroupIds(prev => { const next = new Set(prev ?? []); if (next.has(g.id)) { next.delete(g.id); return next.size === 0 ? null : next } next.add(g.id); return next })}
                  style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s', color: active ? '#f59e0b' : 'rgba(196,210,226,0.45)', background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}` }}>{g.name}</label>
              )
            })}
            <label onClick={() => setShowUnassigned(p => !p)} style={{ fontSize: 14, fontWeight: 700, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s', color: showUnassigned ? '#94a3b8' : 'rgba(196,210,226,0.3)', background: showUnassigned ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showUnassigned ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.08)'}` }}>K465I</label>
          </div>

        </div>

        {/* ?ㅻ뜑 */}
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
            <button
              onClick={saveGeneratedEvents}
              disabled={savingGenerated}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: savingGenerated ? 'default' : 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: 'rgba(74,222,128,0.12)', color: savingGenerated ? 'rgba(74,222,128,0.35)' : '#4ade80' }}
            >
              {savingGenerated ? '저장 중...' : `전체 저장${generatedEvents.length > 0 ? `(${generatedEvents.length})` : ''}`}
            </button>
            <Popconfirm
              title={`${year}년 ${month}월 일정 ${displayMonthEvents.length}건을 모두 삭제하시겠습니까?`}
              okText="전체 삭제" cancelText="취소"
              disabled={displayMonthEvents.length === 0}
              onConfirm={async () => {
                try {
                  await Promise.all(persistedMonthEvents.map(ev => authFetch(`/api/mocvd/equipment-history/${ev.id}`, { method: 'DELETE' })))
                  setGeneratedEvents([])
                  message.success(`${displayMonthEvents.length}건 삭제했습니다.`)
                  fetchAll()
                } catch { message.error('삭제에 실패했습니다.') }
              }}
            >
              <button
                disabled={displayMonthEvents.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, cursor: displayMonthEvents.length === 0 ? 'default' : 'pointer', padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.08)', color: displayMonthEvents.length === 0 ? 'rgba(248,113,113,0.3)' : '#f87171' }}
                onMouseEnter={e => { if (displayMonthEvents.length > 0) e.currentTarget.style.background = 'rgba(248,113,113,0.18)' }}
                onMouseLeave={e => { if (displayMonthEvents.length > 0) e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
              >초기화({displayMonthEvents.length})</button>
            </Popconfirm>
          </div>
        </div>

        {/* ?먮룞 ?앹꽦 移대뱶 (?좉?) */}
        {autoGenOpen && (
          <AutoGenCard
            pmCounters={pmCounters}
            sourceStatus={sourceStatus}
            pmMembers={pmMembers}
            year={year}
            month={month}
            holidays={holidays}
            groups={groups}
            onConfirm={(preview) => { setGeneratedEvents(preview); setAutoGenOpen(false) }}
          />
        )}

        {/* 媛꾪듃 李⑦듃 蹂몄껜 */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: 'var(--nowa-panel)', border: '1px solid var(--nowa-border)', borderRadius: 12 }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 104 }} />
              {monthDays.map(d => <col key={d.date()} style={{ minWidth: 36 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, top: 0, zIndex: 11,
                  background: '#171b26', padding: '8px 10px',
                  textAlign: 'left', fontSize: 14, color: 'rgba(196,210,226,0.5)',
                  borderBottom: '2px solid rgba(245,158,11,0.45)',
                  borderRight: '2px solid rgba(245,158,11,0.4)',
                }}>호기</th>
                {monthDays.map(d => {
                  const dateStr = d.format('YYYY-MM-DD')
                  const dow = d.day()
                  const isToday = dateStr === today.format('YYYY-MM-DD')
                  const isHoliday = !!holidays[dateStr]
                  const isSun = dow === 0
                  const isSat = dow === 6
                  const isDragCol = dragOverCell?.endsWith(`:${dateStr}`)
                  return (
                    <th key={dateStr} style={{
                      position: 'sticky', top: 0, zIndex: 10,
                      background: isDragCol ? 'rgba(74,222,128,0.2)' : isToday ? 'rgba(245,158,11,0.22)' : isHoliday ? 'rgba(248,113,113,0.13)' : isSun ? 'rgba(248,113,113,0.08)' : isSat ? 'rgba(125,211,252,0.08)' : '#1a1f2c',
                      padding: '5px 2px', textAlign: 'center',
                      borderBottom: isDragCol ? '2px solid rgba(74,222,128,0.8)' : '2px solid rgba(245,158,11,0.45)',
                      borderLeft: '1px solid rgba(245,158,11,0.26)',
                      color: isDragCol ? '#4ade80' : isToday ? '#f59e0b' : isSun || isHoliday ? '#f87171' : isSat ? '#7dd3fc' : 'rgba(196,210,226,0.6)',
                      transition: 'background 0.1s',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{d.date()}</div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>{WEEK_DAYS[dow]}</div>
                      {isHoliday && <div style={{ fontSize: 14, color: '#f87171', lineHeight: 1, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 42, textOverflow: 'ellipsis' }}>{holidays[dateStr]}</div>}
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

                const midGroupMap = {}
                groups.filter(g => g.level >= 1).forEach(g => {
                  g.machine_nos.forEach(no => { midGroupMap[no] = g })
                })

                const applyTypeFilter = (evList) => evList.filter(e => filterTypes[e.event_type] !== false)

                const rows = []
                const processedNos = new Set()
                let rowIdx = 0

                const seenGroupIds = []
                const orderedGroups = []
                activeMachines.forEach(m => {
                  const grp = midGroupMap[m.machine_no]
                  if (grp && !seenGroupIds.includes(grp.id)) {
                    seenGroupIds.push(grp.id)
                    orderedGroups.push(grp)
                  }
                })

                const renderGroupRow = (grp) => {
                  grp.machine_nos.forEach(no => processedNos.add(no))
                  rows.push(
                    <tr key={`grp-header-${grp.id}`}>
                      <td colSpan={monthDays.length + 1} style={{
                        background: 'rgba(245,158,11,0.12)',
                        padding: '3px 10px', fontSize: 14, fontWeight: 800,
                        color: '#f59e0b', letterSpacing: 1,
                        borderBottom: '1px solid rgba(245,158,11,0.34)',
                        borderTop: '2px solid rgba(245,158,11,0.32)',
                      }}>
                        {grp.name}
                      </td>
                    </tr>
                  )
                  grp.machine_nos.forEach(machineNo => {
                    const rIdx = rowIdx++
                    const rowBg = rIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'
                    const stickyBg = rIdx % 2 === 0 ? '#171b26' : '#1b1f2c'
                    rows.push(
                      <tr key={`grp-${grp.id}-${machineNo}`}>
                        <td style={{
                          position: 'sticky', left: 0, zIndex: 2,
                          background: dragOverCell?.startsWith(`${machineNo}:`) ? 'rgba(74,222,128,0.15)' : stickyBg,
                          padding: '4px 10px', fontSize: 14, fontWeight: 700,
                          color: dragOverCell?.startsWith(`${machineNo}:`) ? '#4ade80' : '#fbbf24',
                          borderBottom: '1px solid rgba(245,158,11,0.42)',
                          borderRight: '2px solid rgba(245,158,11,0.4)',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.1s, color 0.1s',
                        }}>
                          {formatMachineLabel(machineNo)}
                        </td>
                        {monthDays.map(d => {
                          const dateStr = d.format('YYYY-MM-DD')
                          const dow = d.day()
                          const isToday = dateStr === today.format('YYYY-MM-DD')
                          const isHoliday = !!holidays[dateStr]
                          const isSun = dow === 0, isSat = dow === 6
                          const cellEvents = applyTypeFilter(eventsByMachineDate[`${machineNo}:${dateStr}`] || [])
                          const spanEvents = cellEvents.filter(e => e.spanTotal > 1)
                          const singleEvents = cellEvents.filter(e => !e.spanTotal || e.spanTotal === 1)
                          const hasFromLeft = spanEvents.some(e => e.spanRole === 'mid' || e.spanRole === 'end')
                          const hasToRight = spanEvents.some(e => e.spanRole === 'start' || e.spanRole === 'mid')
                          const cellKey = `${machineNo}:${dateStr}`
                          const isDragOver = dragOverCell === cellKey
                          const cellBg = isDragOver ? 'rgba(74,222,128,0.15)' : isToday ? 'rgba(245,158,11,0.11)' : isHoliday || isSun ? 'rgba(248,113,113,0.06)' : isSat ? 'rgba(125,211,252,0.05)' : rowBg
                          return (
                            <td key={dateStr}
                              style={{
                                padding: 0, background: cellBg,
                                borderBottom: '1px solid rgba(245,158,11,0.42)',
                                borderLeft: '1px solid rgba(245,158,11,0.22)',
                                outline: isDragOver ? '2px solid rgba(74,222,128,0.7)' : 'none',
                                cursor: 'default',
                                verticalAlign: 'top', height: 30,
                                overflow: 'visible', position: 'relative',
                                transition: 'background 0.1s',
                              }}
                              onDragOver={e => { e.preventDefault(); setDragOverCell(cellKey) }}
                              onDragLeave={() => setDragOverCell(null)}
                              onDrop={() => handleDrop(machineNo, dateStr)}
                              onMouseLeave={e => { e.currentTarget.style.background = cellBg }}
                            >
                              {spanEvents.map(ev => {
                                const cfg = evtCfg(ev)
                                const role = ev.spanRole
                                const isStart = role === 'start', isEnd = role === 'end'
                                const ml = hasFromLeft ? -1 : 2, mr = hasToRight ? -1 : 2
                                return (
                                  <div key={ev.id + ':' + role}
                                    draggable={isStart && !!ev.id && !String(ev.id).startsWith('draft')}
                                    onDragStart={e => { e.stopPropagation(); setDraggedEvent(ev) }}
                                    onDragEnd={() => setDragOverCell(null)}
                                    onClick={e => { e.stopPropagation(); isStart && openEdit(ev) }}
                                    title={isStart ? `${formatMachineLabel(ev.machine_no)} ${ev.title || cfg.label} / ${ev.original_date ?? ev.occurred_at?.slice(0, 10)}${ev.actor ? ` / 담당: ${ev.actor}` : ''}` : undefined}
                                    style={{
                                      fontSize: 14, fontWeight: 700,
                                      borderRadius: isStart && isEnd ? 2 : isStart ? '2px 0 0 2px' : isEnd ? '0 2px 2px 0' : 0,
                                      padding: '1px 3px',
                                      marginLeft: ml, marginRight: mr, marginBottom: 1, marginTop: 2,
                                      color: cfg.color, background: cfg.bg,
                                      borderTop: `1px solid ${cfg.border}`,
                                      borderBottom: `1px solid ${cfg.border}`,
                                      borderLeft: isStart ? `1px solid ${cfg.border}` : 'none',
                                      borderRight: isEnd ? `1px solid ${cfg.border}` : 'none',
                                      cursor: isStart ? 'grab' : 'default',
                                      whiteSpace: 'nowrap', overflow: 'hidden', display: 'block',
                                    }}
                                  >{`${cfg.label} ${ev.spanDay}`}</div>
                                )
                              })}
                              {singleEvents.map(ev => {
                                const cfg = evtCfg(ev)
                                const isDraft = String(ev.id).startsWith('draft')
                                return (
                                  <div key={ev.id}
                                    draggable={!isDraft}
                                    onDragStart={e => { e.stopPropagation(); setDraggedEvent(ev) }}
                                    onDragEnd={() => setDragOverCell(null)}
                                    onClick={e => { e.stopPropagation(); openEdit(ev) }}
                                    title={`${formatMachineLabel(ev.machine_no)} ${ev.title || cfg.label} / ${ev.original_date ?? ev.occurred_at?.slice(0, 10)}${ev.actor ? ` / 담당: ${ev.actor}` : ''}`}
                                    style={{
                                      fontSize: 14, fontWeight: 700, borderRadius: 2,
                                      padding: '1px 3px', margin: '2px 2px 1px',
                                      color: cfg.color, background: cfg.bg,
                                      border: `1px solid ${cfg.border}`,
                                      cursor: isDraft ? 'pointer' : 'grab', whiteSpace: 'nowrap',
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
                }

                const ungrouped = activeMachines.filter(m => !midGroupMap[m.machine_no])
                if (showUnassigned && ungrouped.length > 0 && filterGroupIds === null) {
                  rows.push(
                    <tr key="grp-unassigned">
                      <td colSpan={monthDays.length + 1} style={{
                        background: 'rgba(245,158,11,0.12)',
                        padding: '3px 10px', fontSize: 14, fontWeight: 800,
                        color: '#f59e0b', letterSpacing: 1,
                        borderBottom: '1px solid rgba(245,158,11,0.34)',
                        borderTop: '2px solid rgba(245,158,11,0.32)',
                      }}>K465I</td>
                    </tr>
                  )
                  ungrouped.forEach(m => {
                    const rIdx2 = rowIdx++
                    const rowBg = rIdx2 % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'
                    const stickyBg = rIdx2 % 2 === 0 ? '#171b26' : '#1b1f2c'
                    rows.push(
                      <tr key={m.machine_no}>
                        <td style={{
                          position: 'sticky', left: 0, zIndex: 2,
                          background: dragOverCell?.startsWith(`${m.machine_no}:`) ? 'rgba(74,222,128,0.15)' : stickyBg,
                          padding: '4px 10px', fontSize: 14, fontWeight: 700,
                          color: dragOverCell?.startsWith(`${m.machine_no}:`) ? '#4ade80' : '#fbbf24',
                          borderBottom: '1px solid rgba(245,158,11,0.42)',
                          borderRight: '2px solid rgba(245,158,11,0.4)',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.1s, color 0.1s',
                        }}>
                          {formatMachineLabel(m.machine_no)}
                        </td>
                        {monthDays.map(d => {
                          const dateStr = d.format('YYYY-MM-DD')
                          const dow = d.day()
                          const isToday = dateStr === today.format('YYYY-MM-DD')
                          const isHoliday = !!holidays[dateStr]
                          const isSun = dow === 0, isSat = dow === 6
                          const cellEvents = applyTypeFilter(eventsByMachineDate[`${m.machine_no}:${dateStr}`] || [])
                          const spanEvents = cellEvents.filter(e => e.spanTotal > 1)
                          const singleEvents = cellEvents.filter(e => !e.spanTotal || e.spanTotal === 1)
                          const hasFromLeft = spanEvents.some(e => e.spanRole === 'mid' || e.spanRole === 'end')
                          const hasToRight = spanEvents.some(e => e.spanRole === 'start' || e.spanRole === 'mid')
                          const machineNo = m.machine_no
                          const cellKey = `${machineNo}:${dateStr}`
                          const isDragOver = dragOverCell === cellKey
                          const cellBg = isDragOver ? 'rgba(74,222,128,0.15)' : isToday ? 'rgba(245,158,11,0.11)' : isHoliday || isSun ? 'rgba(248,113,113,0.06)' : isSat ? 'rgba(125,211,252,0.05)' : rowBg
                          return (
                            <td key={dateStr}
                              style={{
                                padding: 0, background: cellBg,
                                borderBottom: '1px solid rgba(245,158,11,0.42)',
                                borderLeft: '1px solid rgba(245,158,11,0.22)',
                                outline: isDragOver ? '2px solid rgba(74,222,128,0.7)' : 'none',
                                cursor: 'default',
                                verticalAlign: 'top', height: 30,
                                overflow: 'visible', position: 'relative',
                                transition: 'background 0.1s',
                              }}
                              onDragOver={e => { e.preventDefault(); setDragOverCell(cellKey) }}
                              onDragLeave={() => setDragOverCell(null)}
                              onDrop={() => handleDrop(machineNo, dateStr)}
                              onMouseLeave={e => { e.currentTarget.style.background = cellBg }}
                            >
                              {spanEvents.map(ev => {
                                const cfg = evtCfg(ev)
                                const role = ev.spanRole
                                const isStart = role === 'start', isEnd = role === 'end'
                                const ml = hasFromLeft ? -1 : 2, mr = hasToRight ? -1 : 2
                                return (
                                  <div key={ev.id + ':' + role}
                                    draggable={isStart && !!ev.id && !String(ev.id).startsWith('draft')}
                                    onDragStart={e => { e.stopPropagation(); setDraggedEvent(ev) }}
                                    onDragEnd={() => setDragOverCell(null)}
                                    onClick={e => { e.stopPropagation(); isStart && openEdit(ev) }}
                                    title={isStart ? `${formatMachineLabel(ev.machine_no)} ${ev.title || cfg.label} / ${ev.original_date ?? ev.occurred_at?.slice(0, 10)}${ev.actor ? ` / 담당: ${ev.actor}` : ''}` : undefined}
                                    style={{
                                      fontSize: 14, fontWeight: 700,
                                      borderRadius: isStart && isEnd ? 2 : isStart ? '2px 0 0 2px' : isEnd ? '0 2px 2px 0' : 0,
                                      padding: '1px 3px',
                                      marginLeft: ml, marginRight: mr, marginBottom: 1, marginTop: 2,
                                      color: cfg.color, background: cfg.bg,
                                      borderTop: `1px solid ${cfg.border}`,
                                      borderBottom: `1px solid ${cfg.border}`,
                                      borderLeft: isStart ? `1px solid ${cfg.border}` : 'none',
                                      borderRight: isEnd ? `1px solid ${cfg.border}` : 'none',
                                      cursor: isStart ? 'grab' : 'default',
                                      whiteSpace: 'nowrap', overflow: 'hidden', display: 'block',
                                    }}
                                  >{`${cfg.label} ${ev.spanDay}`}</div>
                                )
                              })}
                              {singleEvents.map(ev => {
                                const cfg = evtCfg(ev)
                                const isDraft = String(ev.id).startsWith('draft')
                                return (
                                  <div key={ev.id}
                                    draggable={!isDraft}
                                    onDragStart={e => { e.stopPropagation(); setDraggedEvent(ev) }}
                                    onDragEnd={() => setDragOverCell(null)}
                                    onClick={e => { e.stopPropagation(); openEdit(ev) }}
                                    title={`${formatMachineLabel(ev.machine_no)} ${ev.title || cfg.label} / ${ev.original_date ?? ev.occurred_at?.slice(0, 10)}${ev.actor ? ` / 담당: ${ev.actor}` : ''}`}
                                    style={{
                                      fontSize: 14, fontWeight: 700, borderRadius: 2,
                                      padding: '1px 3px', margin: '2px 2px 1px',
                                      color: cfg.color, background: cfg.bg,
                                      border: `1px solid ${cfg.border}`,
                                      cursor: isDraft ? 'pointer' : 'grab', whiteSpace: 'nowrap',
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
                }

                const visibleGroups = filterGroupIds === null ? orderedGroups : orderedGroups.filter(g => filterGroupIds.has(g.id))
                visibleGroups.forEach(grp => rows.push(renderGroupRow(grp)))

                return rows
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ?섎룞 異붽?/?섏젙 紐⑤떖 */}
      <Modal
        title={editingEvent ? '일정 수정' : '수동 일정 추가'}
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={() => form.submit()}
        okText={editingEvent ? '저장' : '추가'}
        cancelText="취소"
        footer={(_, { OkBtn, CancelBtn }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {editingEvent && (
                <button onClick={() => { handleDelete(editingEvent.id); setManualOpen(false) }} style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, padding: '5px 16px', cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 700 }}>삭제</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}><CancelBtn /><OkBtn /></div>
          </div>
        )}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="occurred_at" label="날짜" rules={[{ required: true, message: '날짜를 선택해주세요.' }]}>
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
                  <span key={no} style={{ fontSize: 14, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '1px 7px', color: '#fbbf24' }}>
                    {formatMachineLabel(no)}
                  </span>
                ))}
              </div>
              <Checkbox checked={applyGroup} onChange={e => setApplyGroup(e.target.checked)} style={{ color: 'rgba(196,210,226,0.85)', fontSize: 14 }}>
                그룹 전체 {selectedGroup.machine_nos.length}대에 적용
              </Checkbox>
            </div>
          )}
          <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력해주세요.' }]}>
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

