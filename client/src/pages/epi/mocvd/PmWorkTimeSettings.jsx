import { useEffect, useRef, useState } from 'react'
import { Card, Checkbox, InputNumber, Select, message } from 'antd'
import { DeleteOutlined, PlusOutlined, SaveOutlined, ToolOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'

const STORAGE_KEY = 'pm_work_time_settings'

const DEFAULT_PERIODS = [
  { id: 1, label: '주간 1부', start: '08:00', end: '12:00', type: 'work', pm: true,  filter: true,  source: true  },
  { id: 2, label: '점심',    start: '12:00', end: '13:00', type: 'break' },
  { id: 3, label: '주간 2부', start: '13:00', end: '18:00', type: 'work', pm: true,  filter: true,  source: true  },
  { id: 4, label: '저녁',    start: '18:00', end: '19:00', type: 'break' },
  { id: 5, label: '야간',    start: '19:00', end: '07:00', type: 'work', pm: false,  filter: true,  source: true  },
]
const DEFAULT_DURATIONS = { pm: 4, filter: 2, source: 1 }

const TYPES = [
  { key: 'pm',     label: 'PM 정비',  color: '#38bdf8', bg: 'rgba(56,189,248,0.22)',  border: 'rgba(56,189,248,0.5)'  },
  { key: 'filter', label: '필터 교체', color: '#c084fc', bg: 'rgba(192,132,252,0.22)', border: 'rgba(192,132,252,0.5)' },
  { key: 'source', label: '소스 교체', color: '#4ade80', bg: 'rgba(74,222,128,0.18)',  border: 'rgba(74,222,128,0.5)'  },
]

export function usePmWorkTimeSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { periods: saved.periods ?? DEFAULT_PERIODS, durations: saved.durations ?? DEFAULT_DURATIONS }
  } catch { return { periods: DEFAULT_PERIODS, durations: DEFAULT_DURATIONS } }
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

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0'), m = i % 2 === 0 ? '00' : '30'
  return { label: `${h}:${m}`, value: `${h}:${m}` }
})

/* ── 24h 타임라인 ── */
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
              <span style={{ fontSize: 12, fontWeight: 600, color: isWork ? 'rgba(255,255,255,0.85)' : 'rgba(196,210,226,0.25)', whiteSpace: 'nowrap' }}>{p.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'relative', height: 20, marginTop: 3 }}>
        {[0,6,12,18,24].map(h => (
          <div key={h} style={{ position: 'absolute', left: `${(h/24)*100}%`, transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(196,210,226,0.4)', fontWeight: 500 }}>
            {String(h % 24).padStart(2,'0')}:00
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Gantt ── */
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
              <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.5)', marginLeft: 2 }}>건/일</span>
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', paddingLeft: 80, paddingRight: 70 }}>
        {[0,6,12,18,24].map(h => (
          <div key={h} style={{ flex: h===24?0:6, fontSize: 12, color: 'rgba(196,210,226,0.35)', fontWeight: 500 }}>
            {String(h%24).padStart(2,'0')}:00
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 메인 ── */
export default function PmWorkTimeSettings() {
  const [periods, setPeriods] = useState(() => usePmWorkTimeSettings().periods)
  const [durations, setDurations] = useState(() => usePmWorkTimeSettings().durations)
  const [pmMembers, setPmMembers] = useState([])

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

  const setDur = (key, val) => setDurations(p => ({ ...p, [key]: val ?? 1 }))
  const setPeriod = (id, field, val) => setPeriods(ps => ps.map(p => p.id === id ? { ...p, [field]: val } : p))
  const removePeriod = (id) => setPeriods(ps => ps.filter(p => p.id !== id))
  const addPeriod = () => setPeriods(ps => [...ps, { id: Date.now(), label: '새 시간대', start: '08:00', end: '09:00', type: 'work', pm: false, filter: true, source: true }])

  const avail = calcAvailHours(periods, durations)
  const overlapIds = findOverlaps(periods)

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

  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ periods, durations })); message.success('저장했습니다.') }

  const divider = <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
      <Card styles={{ body: { padding: '10px 14px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
          <ToolOutlined style={{ color: '#7dd3fc', fontSize: 14, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(196,210,226,0.55)', whiteSpace: 'nowrap' }}>PM 투입 인원</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#7dd3fc', background: 'rgba(125,211,252,0.12)', padding: '1px 7px', borderRadius: 8 }}>
            {pmMembers.length}명
          </span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center' }}>
            {pmMembers.length === 0 ? (
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.4)' }}>배정된 인원이 없습니다</span>
            ) : pmMembers.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(125,211,252,0.07)',
                  border: '1px solid rgba(125,211,252,0.2)',
                  borderRadius: 20,
                  padding: '2px 8px 2px 4px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(125,211,252,0.15)',
                    border: '1.5px solid rgba(125,211,252,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#7dd3fc',
                  }}
                >
                  {m.name?.[0] || '?'}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card styles={{ body: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 } }}>

        {/* ── 소요 시간 ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(196,210,226,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {TYPES.map(t => {
              const perDay = avail.find(a => a.key === t.key)?.perDay ?? 0
              return (
                <div key={t.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: t.bg, border: `1px solid ${t.border}`,
                  borderRadius: 12, padding: '10px 16px',
                  boxShadow: `0 0 12px ${t.border}`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.color }}>{t.label}</span>
                  <InputNumber value={durations[t.key]} min={0.5} max={24} step={0.5}
                    onChange={v => setDur(t.key, v)} addonAfter="시간" style={{ width: 100 }} size="small" />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: t.color, lineHeight: 1 }}>{perDay}</span>
                    <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.5)' }}>건/일</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {divider}

        {/* ── 시간대 구성 ── */}
        <div>
          {overlapIds.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 10, padding: '8px 14px', fontSize: 14, color: '#fca5a5',
            }}>⚠ 겹치는 시간대가 있습니다 — 강조된 행을 확인하세요 (중복 구간은 자동 제외)</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(196,210,226,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>시간대 구성</span>
            <button onClick={addPeriod} style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, padding: '5px 14px', cursor: 'pointer', color: 'rgba(196,210,226,0.8)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            ><PlusOutlined /> 추가</button>
          </div>

          {/* 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: '20px 90px 80px 80px 64px 50px 50px 50px 28px', gap: 8, marginBottom: 8, padding: '0 8px' }}>
            {['', '이름', '시작', '종료', '구분', 'PM', '필터', '소스', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(196,210,226,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: i >= 5 ? 'center' : 'left' }}>{h}</span>
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
                    : p.type === 'break' ? 'rgba(255,255,255,0.02)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDragOver ? 'rgba(56,189,248,0.4)' : isOverlap ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'background 0.15s, border 0.15s',
                }}>
                <div style={{ cursor: 'grab', color: 'rgba(196,210,226,0.25)', fontSize: 15, textAlign: 'center', userSelect: 'none' }}>⠿</div>
                <input value={p.label} onChange={e => setPeriod(p.id, 'label', e.target.value)} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
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

        {/* ── Gantt ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(196,210,226,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>하루 작업 시간표</div>
          <GanttChart periods={periods} durations={durations} />
        </div>


      </Card>
    </div>
  )
}
