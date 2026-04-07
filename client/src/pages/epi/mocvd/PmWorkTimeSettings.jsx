import { useEffect, useRef, useState } from 'react'
import { Card, Checkbox, InputNumber, Select, Tooltip, message } from 'antd'
import { DeleteOutlined, LeftOutlined, PlusOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import dayjs from 'dayjs'

const STORAGE_KEY = 'pm_work_time_settings'
const DEFAULT_AUTO_SCHEDULE = {
  includeSat: false,
  includeSun: false,
  includeHoliday: false,
  rule1DailyCapacityLimit: false,
  pmPersonCount: 2,
  sourcePersonCount: 1,
}

const DEFAULT_PERIODS = [
  { id: 1, label: '주간 1부', start: '08:00', end: '12:00', type: 'work', pm: true, filter: true, source: true },
  { id: 2, label: '점심', start: '12:00', end: '13:00', type: 'break' },
  { id: 3, label: '주간 2부', start: '13:00', end: '18:00', type: 'work', pm: true, filter: true, source: true },
  { id: 4, label: '저녁', start: '18:00', end: '19:00', type: 'break' },
  { id: 5, label: '야간', start: '19:00', end: '07:00', type: 'work', pm: false, filter: true, source: true },
]
const DEFAULT_DURATIONS = { pm: 4, filter: 2, source: 1 }
const DEFAULT_REQUIRED_PEOPLE = { pm: 2, filter: 2, source: 4 }

const TYPES = [
  { key: 'pm', label: 'PM 정비', color: '#38bdf8', bg: 'rgba(56,189,248,0.22)', border: 'rgba(56,189,248,0.5)' },
  { key: 'filter', label: '필터 교체', color: '#c084fc', bg: 'rgba(192,132,252,0.22)', border: 'rgba(192,132,252,0.5)' },
  { key: 'source', label: '소스 교체', color: '#4ade80', bg: 'rgba(74,222,128,0.18)', border: 'rgba(74,222,128,0.5)' },
]

export function usePmWorkTimeSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      periods: saved.periods ?? DEFAULT_PERIODS,
      durations: saved.durations ?? DEFAULT_DURATIONS,
      requiredPeople: { ...DEFAULT_REQUIRED_PEOPLE, ...(saved.requiredPeople || {}) },
      autoSchedule: { ...DEFAULT_AUTO_SCHEDULE, ...(saved.autoSchedule || {}) },
    }
  } catch {
    return { periods: DEFAULT_PERIODS, durations: DEFAULT_DURATIONS, requiredPeople: DEFAULT_REQUIRED_PEOPLE, autoSchedule: DEFAULT_AUTO_SCHEDULE }
  }
}

export function getWorkTimePerDay() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const periods = saved.periods ?? DEFAULT_PERIODS
    const durations = saved.durations ?? DEFAULT_DURATIONS
    const avail = calcAvailHours(periods, durations)
    return {
      pm:     avail.find(a => a.key === 'pm')?.perDay     ?? 2,
      filter: avail.find(a => a.key === 'filter')?.perDay ?? 2,
      source: avail.find(a => a.key === 'source')?.perDay ?? 2,
    }
  } catch { return { pm: 2, filter: 2, source: 2 } }
}

export function getAutoScheduleSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const periods = saved.periods ?? DEFAULT_PERIODS
    const durations = saved.durations ?? DEFAULT_DURATIONS
    const avail = calcAvailHours(periods, durations)
    const requiredPeople = { ...DEFAULT_REQUIRED_PEOPLE, ...(saved.requiredPeople || {}) }
    const autoSchedule = { ...DEFAULT_AUTO_SCHEDULE, ...(saved.autoSchedule || {}) }
    const dailyMax = {
      pm: avail.find(a => a.key === 'pm')?.perDay ?? 0,
      filter: avail.find(a => a.key === 'filter')?.perDay ?? 0,
      source_change: avail.find(a => a.key === 'source')?.perDay ?? 0,
    }
    return {
      ...autoSchedule,
      dailyMax,
      pmPersonCount: requiredPeople.pm ?? autoSchedule.pmPersonCount ?? DEFAULT_AUTO_SCHEDULE.pmPersonCount,
      sourcePersonCount: requiredPeople.source ?? autoSchedule.sourcePersonCount ?? DEFAULT_AUTO_SCHEDULE.sourcePersonCount,
    }
  } catch {
    return DEFAULT_AUTO_SCHEDULE
  }
}

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
function periodMinutes(start, end) { let s = toMin(start), e = toMin(end); if (e <= s) e += 1440; return e - s }

function mergedMins(segs) {
  if (!segs.length) return 0
  const iv = segs.map(([s, e]) => e > s ? [s, e] : [s, e + 1440]).sort((a, b) => a[0] - b[0])
  const m = [iv[0]]
  for (let i = 1; i < iv.length; i++) { const l = m[m.length - 1]; if (iv[i][0] <= l[1]) l[1] = Math.max(l[1], iv[i][1]); else m.push(iv[i]) }
  return Math.min(m.reduce((s, [a, b]) => s + b - a, 0), 1440)
}

function findOverlaps(periods) {
  const out = new Set()
  const abs = periods.filter(p => p.type === 'work').map(p => { const s = toMin(p.start), e = toMin(p.end); return { id: p.id, s, e: e > s ? e : e + 1440 } })
  for (let i = 0; i < abs.length; i++)
    for (let j = i + 1; j < abs.length; j++)
      if (abs[i].s < abs[j].e && abs[j].s < abs[i].e) { out.add(abs[i].id); out.add(abs[j].id) }
  return out
}

function calcAvailHours(periods, durations) {
  return TYPES.map(t => {
    const mins = mergedMins(periods.filter(p => p.type === 'work' && p[t.key]).map(p => [toMin(p.start), toMin(p.end)]))
    return { ...t, hours: mins / 60, perDay: Math.floor(mins / 60 / (durations[t.key] || 1)) }
  })
}

function isOffShift(typeName, shiftTypeMap) {
  const meta = shiftTypeMap[typeName] || {}
  const value = `${typeName || ''} ${meta.label || ''}`.toLowerCase()
  const offKeywords = ['휴무', '연차', '반차', '반반차', '교육', 'off', 'leave']
  return offKeywords.some((kw) => value.includes(kw))
}

function classifyShiftBucket(typeName, shiftTypeMap) {
  if (isOffShift(typeName, shiftTypeMap)) return 'off'
  const meta = shiftTypeMap[typeName] || {}
  const value = `${typeName || ''} ${meta.label || ''}`.toLowerCase()
  const nightKeywords = ['야', 'night', '2']
  if (nightKeywords.some((kw) => value.includes(kw))) return 'night'
  return 'day'
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0'), m = i % 2 === 0 ? '00' : '30'
  return { label: `${h}:${m}`, value: `${h}:${m}` }
})

/* ?? 24h ??꾨씪???? */
function DayTimeline({ periods }) {
  const TOTAL = 1440
  const off = t => (toMin(t) / TOTAL) * 100
  const wid = (s, e) => (Math.min(periodMinutes(s, e), TOTAL) / TOTAL) * 100

  return (
    <div>
      <div style={{ position: 'relative', height: 36, background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[0,3,6,9,12,15,18,21].map(h => (
          <div key={h} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(h/24)*100}%`, width: 1, background: 'rgba(255,255,255,0.06)' }} />
        ))}
        {periods.map((p, i) => {
          const isWork = p.type === 'work'
          const ts = TYPES.filter(t => p[t.key])
          return (
            <div key={i} style={{
              position: 'absolute', left: `${off(p.start)}%`, width: `${wid(p.start, p.end)}%`, top: 0, bottom: 0,
              background: isWork
                ? ts.length === 0 ? 'rgba(100,116,139,0.3)'
                : ts.length === 1 ? ts[0].bg
                : `linear-gradient(90deg,${ts.map(t => t.bg).join(',')})`
                : 'rgba(255,255,255,0.03)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: isWork ? 'rgba(255,255,255,0.85)' : 'rgba(196,210,226,0.25)', whiteSpace: 'nowrap' }}>{p.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'relative', height: 20, marginTop: 3 }}>
        {[0,6,12,18,24].map(h => (
          <div key={h} style={{ position: 'absolute', left: `${(h/24)*100}%`, transform: 'translateX(-50%)', fontSize: 14, color: 'rgba(196,210,226,0.4)', fontWeight: 500 }}>
            {String(h % 24).padStart(2,'0')}:00
          </div>
        ))}
      </div>
    </div>
  )
}

/* ?? Gantt ?? */
function GanttChart({ periods, durations }) {
  const TOTAL = 1440
  return (
    <div>
      {TYPES.map(t => {
        const raw = periods.filter(p => p.type === 'work' && p[t.key])
          .map(p => { const s = toMin(p.start), e = toMin(p.end); return e > s ? [s, e] : [s, e + TOTAL] })
        raw.sort((a, b) => a[0] - b[0])
        const mg = raw.length ? [raw[0]] : []
        for (let i = 1; i < raw.length; i++) { const l = mg[mg.length-1]; if (raw[i][0] <= l[1]) l[1] = Math.max(l[1], raw[i][1]); else mg.push(raw[i]) }
        const dur = (durations[t.key] || 1) * 60
        const blocks = []
        mg.forEach(([s, e]) => { let c = s; while (c + dur <= e) { blocks.push({ s: c % TOTAL, e: (c + dur) % TOTAL || TOTAL }); c += dur } })
        const perDay = blocks.length

        return (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <div style={{ width: 68, flexShrink: 0, fontSize: 14, fontWeight: 700, color: t.color, textAlign: 'right', letterSpacing: '-0.3px' }}>{t.label}</div>
            <div style={{ flex: 1, position: 'relative', height: 38, background: 'rgba(255,255,255,0.04)', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              {periods.map((p, i) => {
                if (p.type === 'work' && p[t.key]) return null
                return <div key={i} style={{
                  position: 'absolute', left: `${(toMin(p.start)/TOTAL)*100}%`,
                  width: `${(periodMinutes(p.start,p.end)/TOTAL)*100}%`, top: 0, bottom: 0,
                  background: p.type === 'break'
                    ? 'repeating-linear-gradient(45deg,rgba(255,255,255,0.025),rgba(255,255,255,0.025) 3px,transparent 3px,transparent 8px)'
                    : 'rgba(248,113,113,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                }} />
              })}
              {[6,12,18].map(h => <div key={h} style={{ position: 'absolute', top:0, bottom:0, left:`${(h/24)*100}%`, width:1, background:'rgba(255,255,255,0.07)' }} />)}
              {blocks.map((b, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${(b.s/TOTAL)*100}%`,
                  width: `calc(${((b.e-b.s)/TOTAL)*100}% - 3px)`,
                  top: 5, bottom: 5,
                  background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 5,
                  boxShadow: `0 0 6px ${t.border}`,
                }} />
              ))}
            </div>
            <div style={{ width: 58, flexShrink: 0, textAlign: 'right' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{perDay}</span>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.5)', marginLeft: 2 }}>건/일</span>
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', paddingLeft: 80, paddingRight: 70 }}>
        {[0,6,12,18,24].map(h => (
          <div key={h} style={{ flex: h===24?0:6, fontSize: 14, color: 'rgba(196,210,226,0.35)', fontWeight: 500 }}>
            {String(h%24).padStart(2,'0')}:00
          </div>
        ))}
      </div>
    </div>
  )
}

/* ?? 硫붿씤 ?? */
export default function PmWorkTimeSettings() {
  const [viewMonth, setViewMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [periods, setPeriods] = useState(() => usePmWorkTimeSettings().periods)
  const [durations, setDurations] = useState(() => usePmWorkTimeSettings().durations)
  const [requiredPeople, setRequiredPeople] = useState(() => usePmWorkTimeSettings().requiredPeople)
  const [autoSchedule, setAutoSchedule] = useState(() => usePmWorkTimeSettings().autoSchedule)
  const [pmMembers, setPmMembers] = useState([])
  const [pmShiftMembers, setPmShiftMembers] = useState([])
  const [shiftRows, setShiftRows] = useState([])
  const [shiftTypeMap, setShiftTypeMap] = useState({})
  const [holidays, setHolidays] = useState({})

  useEffect(() => {
    authFetch('/api/mocvd/pm-members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPmMembers(data.filter((m) => m.is_active))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const y = viewMonth.year()
    const m = viewMonth.month() + 1
    Promise.all([
      authFetch('/api/shift/members?schedule_type=pm'),
      authFetch(`/api/shift/schedules?year=${y}&month=${m}`),
      authFetch('/api/shift/shift-types'),
      authFetch(`/api/shift/holidays?year=${y}`),
    ])
      .then(async ([membersRes, schedulesRes, typesRes, holidaysRes]) => {
        const membersData = membersRes.ok ? await membersRes.json() : []
        const schedulesData = schedulesRes.ok ? await schedulesRes.json() : []
        const typesData = typesRes.ok ? await typesRes.json() : []
        const holidaysData = holidaysRes.ok ? await holidaysRes.json() : []
        setPmShiftMembers(Array.isArray(membersData) ? membersData : [])
        setShiftRows(Array.isArray(schedulesData) ? schedulesData : [])
        const map = {}
        ;(Array.isArray(typesData) ? typesData : []).forEach((t) => { map[t.name] = t })
        setShiftTypeMap(map)
        const hmap = {}
        ;(Array.isArray(holidaysData) ? holidaysData : []).forEach((h) => {
          if (h?.date) hmap[h.date] = h.name || '공휴일'
        })
        setHolidays(hmap)
      })
      .catch(() => {
        setPmShiftMembers([])
        setShiftRows([])
        setShiftTypeMap({})
        setHolidays({})
      })
  }, [viewMonth])

  const setDur = (key, val) => setDurations(p => ({ ...p, [key]: val ?? 1 }))
  const setReq = (key, val) => setRequiredPeople(p => ({ ...p, [key]: val ?? 1 }))
  const setPeriod = (id, field, val) => setPeriods(ps => ps.map(p => p.id === id ? { ...p, [field]: val } : p))
  const removePeriod = (id) => setPeriods(ps => ps.filter(p => p.id !== id))
  const addPeriod = () => setPeriods(ps => [...ps, { id: Date.now(), label: '새 시간대', start: '08:00', end: '09:00', type: 'work', pm: false, filter: true, source: true }])

  const avail = calcAvailHours(periods, durations)
  const overlapIds = findOverlaps(periods)
  const monthDates = Array.from(
    { length: viewMonth.daysInMonth() },
    (_, i) => viewMonth.date(i + 1).format('YYYY-MM-DD')
  )
  const scheduleMap = shiftRows.reduce((acc, row) => {
    acc[`${row.member_id}-${row.work_date}`] = row.shift_type
    return acc
  }, {})
  const firstShiftType = Object.keys(shiftTypeMap)[0] || '1'
  const todayDate = dayjs().format('YYYY-MM-DD')
  const dailyBucketCounts = monthDates.map((date) => {
    const counts = { day: 0, night: 0, off: 0, dayMembers: [], nightMembers: [], offMembers: [] }
    pmShiftMembers.forEach((member) => {
      const shiftType = scheduleMap[`${member.id}-${date}`] || firstShiftType
      const bucket = classifyShiftBucket(shiftType, shiftTypeMap)
      const memberName = member.name || member.member_name || member.emp_name || `ID ${member.id}`
      counts[bucket] += 1
      if (bucket === 'day') counts.dayMembers.push(memberName)
      if (bucket === 'night') counts.nightMembers.push(memberName)
      if (bucket === 'off') counts.offMembers.push(memberName)
    })
    return { date, label: dayjs(date).format('M/D'), ...counts }
  })
  const maxDay = Math.max(1, ...dailyBucketCounts.map((row) => row.day))
  const maxNight = Math.max(1, ...dailyBucketCounts.map((row) => row.night))
  const maxOff = Math.max(1, ...dailyBucketCounts.map((row) => row.off))
  const firstWeekday = (viewMonth.startOf('month').day() + 6) % 7
  const leadingBlanks = Array.from({ length: firstWeekday }, () => null)
  const trailingCount = (7 - ((leadingBlanks.length + dailyBucketCounts.length) % 7)) % 7
  const trailingBlanks = Array.from({ length: trailingCount }, () => null)
  const calendarCells = [...leadingBlanks, ...dailyBucketCounts, ...trailingBlanks]
  const totalPmCount = pmShiftMembers.length || pmMembers.length

  const dragIdx = useRef(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const onDragStart = i => { dragIdx.current = i }
  const onDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const onDrop = i => {
    if (dragIdx.current === null || dragIdx.current === i) { setDragOverIdx(null); return }
    setPeriods(ps => { const n = [...ps]; const [m] = n.splice(dragIdx.current, 1); n.splice(i, 0, m); return n })
    dragIdx.current = null; setDragOverIdx(null)
  }
  const onDragEnd = () => { dragIdx.current = null; setDragOverIdx(null) }

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ periods, durations, requiredPeople, autoSchedule }))
    message.success('저장했습니다.')
  }

  const divider = <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--nowa-border-strong), transparent)' }} />
  const cardTone = { background: 'var(--nowa-panel-alt)', borderColor: 'var(--nowa-border-strong)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>
        <Card style={{ ...cardTone, width: 'fit-content' }} styles={{ body: { padding: '12px 14px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--nowa-text-soft)' }}>PM 투입 인원 총 {totalPmCount}명</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setViewMonth((prev) => prev.subtract(1, 'month').startOf('month'))}
                style={{ border: '1px solid var(--nowa-border)', background: 'var(--nowa-button-bg)', color: 'var(--nowa-text)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 18 }}
              ><LeftOutlined /></button>
              <button
                onClick={() => {
                  setViewMonth(dayjs().startOf('month'))
                  setSelectedDate(todayDate)
                }}
                style={{
                  border: '1px solid var(--nowa-border)',
                  background: 'var(--nowa-primary-soft)',
                  color: 'var(--nowa-primary)',
                  borderRadius: 8,
                  height: 34,
                  padding: '0 10px',
                  cursor: 'pointer',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                오늘
              </button>
              <span style={{ minWidth: 110, textAlign: 'center', color: 'var(--nowa-text-soft)', fontSize: 18, fontWeight: 800 }}>{viewMonth.format('YYYY년 M월')}</span>
              <button
                onClick={() => setViewMonth((prev) => prev.add(1, 'month').startOf('month'))}
                style={{ border: '1px solid var(--nowa-border)', background: 'var(--nowa-button-bg)', color: 'var(--nowa-text)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 18 }}
              ><RightOutlined /></button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ width: 'fit-content' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 128px)', gap: 6, marginBottom: 4 }}>
                {['월', '화', '수', '목', '금', '토', '일'].map((w, idx) => (
                  <div
                    key={w}
                    style={{
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 800,
                      color: idx === 5 ? '#60a5fa' : idx === 6 ? '#f87171' : 'var(--nowa-text-muted)',
                      padding: '2px 0',
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 128px)',
                  gap: 6,
                }}
              >
                {calendarCells.map((row, cellIdx) => {
            if (!row) {
              return (
                <div
                  key={`blank-${cellIdx}`}
                  style={{
                    border: '1px dashed color-mix(in srgb, var(--nowa-border) 55%, transparent)',
                    borderRadius: 10,
                    minHeight: 108,
                    background: 'color-mix(in srgb, var(--nowa-soft-fill) 55%, transparent)',
                  }}
                />
              )
            }
            const dayObj = dayjs(row.date)
            const dayNo = dayObj.date()
            const weekDay = dayObj.day()
            const weekKor = ['일', '월', '화', '수', '목', '금', '토'][weekDay]
            const isSat = weekDay === 6
            const isSun = weekDay === 0
            const holidayName = holidays[row.date]
            const isHoliday = !!holidayName
            const isWeekend = isSat || isSun || isHoliday
            const isSelected = selectedDate === row.date
            const weekendAccent = isHoliday || isSun ? '#f87171' : isSat ? '#60a5fa' : 'var(--nowa-text-muted)'
            const metrics = [
              { key: 'day', label: '주간', color: 'var(--nowa-teal)', soft: 'var(--nowa-teal-soft)', max: maxDay, value: row.day },
              { key: 'night', label: '야간', color: 'var(--nowa-primary)', soft: 'var(--nowa-primary-soft)', max: maxNight, value: row.night },
              { key: 'off', label: '휴무', color: 'var(--nowa-warning)', soft: 'var(--nowa-warning-soft)', max: maxOff, value: row.off },
            ]
            const tooltipContent = (
              <div style={{ minWidth: 180, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{dayObj.format('YYYY-MM-DD (dd)')}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-teal)' }}>
                  주간 {row.day}명: {row.dayMembers.length ? row.dayMembers.join(', ') : '-'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-primary)' }}>
                  야간 {row.night}명: {row.nightMembers.length ? row.nightMembers.join(', ') : '-'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-warning)' }}>
                  휴무 {row.off}명: {row.offMembers.length ? row.offMembers.join(', ') : '-'}
                </div>
                {holidayName && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>
                    공휴일: {holidayName}
                  </div>
                )}
              </div>
            )
            return (
              <Tooltip key={row.date} title={tooltipContent} mouseEnterDelay={0.2}>
                <div
                  onClick={() => setSelectedDate(row.date)}
                  style={{
                    border: isSelected ? '1px solid var(--nowa-border-strong)' : '1px solid var(--nowa-border)',
                    boxShadow: isSelected ? '0 0 0 1px color-mix(in srgb, var(--nowa-primary) 25%, transparent) inset' : 'none',
                    borderRadius: 10,
                    padding: '6px 7px 7px',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--nowa-soft-fill-strong) 82%, var(--nowa-primary-soft) 18%)'
                      : isWeekend
                        ? (isHoliday || isSun
                          ? 'color-mix(in srgb, var(--nowa-soft-fill) 82%, var(--nowa-danger-soft) 18%)'
                          : isSat
                          ? 'color-mix(in srgb, var(--nowa-soft-fill) 82%, var(--nowa-info-soft) 18%)'
                          : 'color-mix(in srgb, var(--nowa-soft-fill) 82%, var(--nowa-danger-soft) 18%)')
                        : 'var(--nowa-soft-fill)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--nowa-border)', paddingBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? 'var(--nowa-primary)' : (isWeekend ? weekendAccent : 'var(--nowa-text)') }}>{dayNo}일</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isWeekend ? weekendAccent : 'var(--nowa-text-muted)' }}>{weekKor}</span>
                  </div>
                  {metrics.map((m) => (
                    <div key={`${row.date}-${m.key}`} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 18px', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.label}</span>
                      <div style={{ height: 7, borderRadius: 999, background: m.soft, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--nowa-border) 70%, transparent)' }}>
                        <div style={{ width: `${(m.value / m.max) * 100}%`, height: '100%', background: m.color }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: m.color, textAlign: 'right' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </Tooltip>
            )
          })}
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ ...cardTone, flex: 1, minWidth: 280 }} styles={{ body: { padding: '12px 14px', height: '100%' } }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nowa-text-soft)', marginBottom: 12 }}>스케쥴러 자동 생성 규칙</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'var(--nowa-text-soft)', fontSize: 14, fontWeight: 700 }}>작업일 포함 기준</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Checkbox
                    checked={autoSchedule.includeSat}
                    onChange={(e) => setAutoSchedule((prev) => ({ ...prev, includeSat: e.target.checked }))}
                  />
                  토요일 포함
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Checkbox
                    checked={autoSchedule.includeSun}
                    onChange={(e) => setAutoSchedule((prev) => ({ ...prev, includeSun: e.target.checked }))}
                  />
                  일요일 포함
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Checkbox
                    checked={autoSchedule.includeHoliday}
                    onChange={(e) => setAutoSchedule((prev) => ({ ...prev, includeHoliday: e.target.checked }))}
                  />
                  공휴일 포함
                </label>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--nowa-border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'var(--nowa-text-soft)', fontSize: 14, fontWeight: 700 }}>추가 규칙 (1번부터)</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Checkbox
                  checked={autoSchedule.rule1DailyCapacityLimit}
                  onChange={(e) => setAutoSchedule((prev) => ({ ...prev, rule1DailyCapacityLimit: e.target.checked }))}
                />
                1. 하루 스케쥴링 건수는 작업 시간 설정의 최대 작업 건수를 넘지 않는다.
              </label>
            </div>
          </div>
        </Card>
      </div>

      <Card style={cardTone} styles={{ body: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 } }}>

        {/* ?? ?뚯슂 ?쒓컙 ?? */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                작업 유형별 소요 시간 (1건 당)
              </span>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))',
              border: '1px solid rgba(245,158,11,0.5)', borderRadius: 10,
              padding: '7px 22px', cursor: 'pointer', color: '#fbbf24',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
              boxShadow: '0 0 12px rgba(245,158,11,0.15)', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(245,158,11,0.32),rgba(245,158,11,0.18))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(245,158,11,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.1))'; e.currentTarget.style.boxShadow = '0 0 12px rgba(245,158,11,0.15)' }}
            ><SaveOutlined /> 저장</button>
          </div>
          <div style={{
            background: 'var(--nowa-soft-fill-strong)',
            border: '1px solid var(--nowa-border)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nowa-text)' }}>작업 시간 설정</div>
            <div className="pm-work-settings-cards" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {TYPES.map(t => {
                const perDay = avail.find(a => a.key === t.key)?.perDay ?? 0
                const needPeople = requiredPeople[t.key] ?? 1
                return (
                  <div key={t.key} className="pm-work-settings-card" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: t.bg, border: `1px solid ${t.border}`,
                    borderRadius: 10, padding: '8px 12px',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.color, minWidth: 64 }}>{t.label}</span>
                    <InputNumber value={durations[t.key]} min={0.5} max={24} step={0.5}
                      onChange={v => setDur(t.key, v)} addonAfter="시간" style={{ width: 100 }} size="small" />
                    <InputNumber
                      value={needPeople}
                      min={1}
                      max={20}
                      step={1}
                      onChange={v => setReq(t.key, v)}
                      addonAfter="명"
                      style={{ width: 90 }}
                      size="small"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 34 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: t.color, lineHeight: 1 }}>{perDay}</span>
                      <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.5)' }}>건/일</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {divider}

        {/* ?? ?쒓컙? 援ъ꽦 ?? */}
        <div>
          {overlapIds.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              background: 'var(--nowa-danger-soft)', border: '1px solid color-mix(in srgb, var(--nowa-danger) 45%, transparent)',
              borderRadius: 10, padding: '8px 14px', fontSize: 14, color: '#fca5a5',
            }}>겹치는 시간대가 있습니다. 강조된 행을 확인하세요. (중복 구간은 자동 제외)</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>시간대 구성</span>
            <button onClick={addPeriod} style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600,
              background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)',
              borderRadius: 8, padding: '5px 14px', cursor: 'pointer', color: 'var(--nowa-text-soft)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--nowa-soft-fill-strong)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--nowa-button-bg)'}
            ><PlusOutlined /> 추가</button>
          </div>

          {/* ?ㅻ뜑 */}
          <div style={{ display: 'grid', gridTemplateColumns: '20px 90px 80px 80px 64px 50px 50px 50px 28px', gap: 8, marginBottom: 8, padding: '0 8px' }}>
            {['', '이름', '시작', '종료', '구분', 'PM', '필터', '소스', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: i >= 5 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>

          {periods.map((p, idx) => {
            const isOverlap = overlapIds.has(p.id)
            const isDragOver = dragOverIdx === idx
            return (
              <div key={p.id} draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                style={{
                  display: 'grid', gridTemplateColumns: '20px 90px 80px 80px 64px 50px 50px 50px 28px',
                  gap: 8, alignItems: 'center',
                  padding: '6px 8px', marginBottom: 4, borderRadius: 10,
                  background: isDragOver ? 'rgba(56,189,248,0.08)'
                    : isOverlap ? 'rgba(248,113,113,0.07)'
                    : p.type === 'break' ? 'var(--nowa-soft-fill)'
                    : 'var(--nowa-soft-fill-strong)',
                  border: `1px solid ${isDragOver ? 'color-mix(in srgb, var(--nowa-info) 55%, transparent)' : isOverlap ? 'color-mix(in srgb, var(--nowa-danger) 55%, transparent)' : 'var(--nowa-border)'}`,
                  transition: 'background 0.15s, border 0.15s',
                }}>
                <div style={{ cursor: 'grab', color: 'rgba(196,210,226,0.25)', fontSize: 15, textAlign: 'center', userSelect: 'none' }}>⋮⋮</div>
                <input value={p.label} onChange={e => setPeriod(p.id, 'label', e.target.value)} style={{
                  background: 'var(--nowa-button-bg)', border: '1px solid var(--nowa-border)',
                  borderRadius: 7, padding: '4px 8px', color: '#e2e8f0', fontSize: 14, fontWeight: 500, width: '100%',
                }} />
                <Select value={p.start} onChange={v => setPeriod(p.id, 'start', v)} options={TIME_OPTIONS} size="small" style={{ width: '100%' }} />
                <Select value={p.end}   onChange={v => setPeriod(p.id, 'end',   v)} options={TIME_OPTIONS} size="small" style={{ width: '100%' }} />
                <Select value={p.type} onChange={v => setPeriod(p.id, 'type', v)} size="small" style={{ width: '100%' }}
                  options={[{ label: '작업', value: 'work' }, { label: '휴식', value: 'break' }]} />
                {TYPES.map(t => (
                  <div key={t.key} style={{ display: 'flex', justifyContent: 'center' }}>
                    <Checkbox disabled={p.type === 'break'} checked={p.type === 'work' && !!p[t.key]}
                      onChange={e => setPeriod(p.id, t.key, e.target.checked)} />
                  </div>
                ))}
                <button onClick={() => removePeriod(p.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(248,113,113,0.5)', padding: '2px', fontSize: 14,
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,113,113,0.5)'}
                ><DeleteOutlined /></button>
              </div>
            )
          })}

          <div style={{ marginTop: 14 }}>
            <DayTimeline periods={periods} />
          </div>
        </div>

        {divider}

        {/* ?? Gantt ?? */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>하루 작업 시간표</div>
          <GanttChart periods={periods} durations={durations} />
        </div>


      </Card>
    </div>
  )
}

