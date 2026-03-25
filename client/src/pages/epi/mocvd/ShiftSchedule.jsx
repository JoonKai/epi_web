import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Modal, Popconfirm, Select, Spin, Switch, Tabs, message } from 'antd'
import {
  CalendarOutlined,
  ClearOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  ShopOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import SafeAgChart from '../../../components/SafeAgChart'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import PersonnelManagement, { VendorTab, MemberTab } from './PersonnelManagement'

const apiFetch = (path, options = {}) =>
  authFetch(`/api/shift${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.2)',
  marginBottom: 0,
  paddingLeft: 8,
}

const CELL_W = 46   // 날짜 셀 고정 너비
const NAME_W = 100  // 이름 셀 너비
const SUM_W  = 48   // 집계 셀 너비
const CHART_AXIS_FONT_SIZE = 12
const CHART_LEGEND_FONT_SIZE = 14

// shiftTypes 배열 → 빠른 조회용 맵 생성
function buildShiftMaps(shiftTypes) {
  const cycle = shiftTypes.filter((t) => t.is_active).map((t) => t.name)
  const cellStyle = {}
  const legend = {}
  shiftTypes.forEach((t) => {
    cellStyle[t.name] = { background: t.bg_color, color: t.color }
    legend[t.name]    = { label: t.label, bg: t.bg_color, color: t.color, border: t.border_color }
  })
  return { cycle, cellStyle, legend }
}

function cycleShift(v, cycle) {
  const i = cycle.indexOf(v || cycle[0] || '1')
  return cycle[(i + 1) % cycle.length]
}

function normalizeRows(rows = []) {
  const map = {}
  rows.forEach((r) => { map[`${r.member_id}-${r.work_date}`] = r.shift_type || '1' })
  return map
}

// ── 근무현황판 ──────────────────────────────────────────────────────
function ScheduleTab() {
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [members, setMembers]           = useState([])
  const [scheduleMap, setScheduleMap]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [savingKey, setSavingKey]       = useState(null)
  const [isDirty, setIsDirty]           = useState(false)
  const [isSaving, setIsSaving]         = useState(false)
  const [addOpen, setAddOpen]           = useState(false)
  const [personnelGroups, setPersonnelGroups] = useState({ vendors: [], members: [] })
  const [selectedPids, setSelectedPids] = useState([])
  const [shiftTypes, setShiftTypes]     = useState([])
  const [holidays, setHolidays]         = useState({})   // { 'YYYY-MM-DD': name }
  const [weekendExcluded, setWeekendExcluded] = useState(false)
  const [holidayExcluded, setHolidayExcluded] = useState(false)

  const year  = currentMonth.year()
  const month = currentMonth.month() + 1

  // DB 기준정보에서 근무 유형 로드
  useEffect(() => {
    apiFetch('/shift-types')
      .then((r) => r.json())
      .then((data) => setShiftTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const { cycle: shiftCycle, cellStyle: shiftCellStyle, legend: shiftLegend } = useMemo(
    () => buildShiftMaps(shiftTypes),
    [shiftTypes]
  )

  const dateList = useMemo(() => {
    const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
    return Array.from({ length: start.daysInMonth() }, (_, i) => start.add(i, 'day'))
  }, [year, month])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([
        apiFetch('/members'),
        apiFetch(`/schedules?year=${year}&month=${month}`),
      ])
      if (!mRes.ok || !sRes.ok) throw new Error()
      const [mData, sData] = await Promise.all([mRes.json(), sRes.json()])
      setMembers(Array.isArray(mData) ? mData : [])
      setScheduleMap(normalizeRows(sData))
      setIsDirty(false)
      setWeekendExcluded(false)
      setHolidayExcluded(false)
    } catch {
      message.error('근무표 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  // 공휴일 로드
  useEffect(() => {
    apiFetch(`/holidays?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map = {}
          data.forEach((h) => { map[h.date] = h.name })
          setHolidays(map)
        }
      })
      .catch(() => {})
  }, [year])

  // 셀 클릭 → 로컬만 변경 (저장 버튼으로 DB 일괄 저장)
  const saveCell = useCallback((memberId, workDate, shiftType) => {
    const key = `${memberId}-${workDate}`
    setScheduleMap((m) => ({ ...m, [key]: shiftType }))
    setIsDirty(true)
  }, [])

  // 오버레이 맵: 토글 상태를 scheduleMap 위에 덮어씌워 표시/저장에 사용
  const displayScheduleMap = useMemo(() => {
    if (!weekendExcluded && !holidayExcluded) return scheduleMap
    const result = { ...scheduleMap }
    members.forEach((m) => {
      dateList.forEach((d) => {
        const dk  = d.format('YYYY-MM-DD')
        const dow = d.day()
        const isWeekend = dow === 0 || dow === 6
        if (weekendExcluded && isWeekend) {
          result[`${m.id}-${dk}`] = '휴무'
        } else if (holidayExcluded && holidays[dk] && !isWeekend) {
          result[`${m.id}-${dk}`] = '휴무'
        }
      })
    })
    return result
  }, [scheduleMap, weekendExcluded, holidayExcluded, dateList, members, holidays])

  // DB 일괄 저장 — displayScheduleMap 기준으로 저장
  const saveAll = useCallback(async () => {
    setIsSaving(true)
    try {
      const entries = []
      members.forEach((m) => {
        dateList.forEach((d) => {
          const dk = d.format('YYYY-MM-DD')
          entries.push({
            member_id: m.id,
            work_date: dk,
            shift_type: displayScheduleMap[`${m.id}-${dk}`] || shiftCycle[0] || '1',
          })
        })
      })
      const res = await apiFetch('/schedules/bulk', { method: 'POST', body: JSON.stringify({ entries }) })
      if (!res.ok) throw new Error()
      // 저장된 값으로 scheduleMap 갱신 (토글 off 시 DB값 정확히 반영)
      const newMap = {}
      entries.forEach((e) => { newMap[`${e.member_id}-${e.work_date}`] = e.shift_type })
      setScheduleMap(newMap)
      setIsDirty(false)
      message.success('저장 완료')
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [members, dateList, displayScheduleMap, shiftCycle])

  // 멤버 삭제
  const deleteMember = useCallback(async (id) => {
    try {
      const res = await apiFetch(`/members/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setMembers((prev) => prev.filter((m) => m.id !== id))
      message.success('삭제했습니다.')
    } catch {
      message.error('삭제에 실패했습니다.')
    }
  }, [])

  // 인원 추가 모달 열기
  const openAdd = useCallback(async () => {
    setAddOpen(true)
    setSelectedPids([])
    try {
      const res = await apiFetch('/personnel-groups')
      if (!res.ok) throw new Error()
      setPersonnelGroups(await res.json())
    } catch {
      message.error('인원관리 데이터를 불러오지 못했습니다.')
    }
  }, [])

  // 인원 추가 실행
  const handleAdd = useCallback(async () => {
    if (!selectedPids.length) { message.warning('선택된 인원이 없습니다.'); return }
    try {
      const res = await apiFetch('/import-from-personnel', {
        method: 'POST',
        body: JSON.stringify({ personnel_member_ids: selectedPids }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      message.success(`${data.added}명 추가됐습니다.`)
      setAddOpen(false)
      fetchData()
    } catch {
      message.error('추가에 실패했습니다.')
    }
  }, [selectedPids, fetchData])

  // 주말 제외 토글 — scheduleMap을 직접 변경하지 않고 displayScheduleMap 오버레이로 처리
  const toggleWeekend = useCallback(() => {
    setWeekendExcluded(prev => !prev)
    setIsDirty(true)
  }, [])

  // 공휴일 제외 토글 (주말과 겹치는 공휴일은 주말 제외에 포함)
  const toggleHoliday = useCallback(() => {
    setHolidayExcluded(prev => !prev)
    setIsDirty(true)
  }, [])

  // 초기화 (전원 1로)
  const resetAll = useCallback(async () => {
    const entries = []
    members.forEach((m) => {
      dateList.forEach((d) => {
        entries.push({ member_id: m.id, work_date: d.format('YYYY-MM-DD'), shift_type: shiftCycle[0] || '1' })
      })
    })
    try {
      const res = await apiFetch('/schedules/bulk', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) throw new Error()
      const newMap = {}
      entries.forEach((e) => { newMap[`${e.member_id}-${e.work_date}`] = e.shift_type })
      setScheduleMap(newMap)
      setIsDirty(false)
      message.success('전체 초기화 완료')
    } catch {
      message.error('초기화에 실패했습니다.')
    }
  }, [members, dateList])

  // 일별 집계 (전체) - 모든 활성 근무 유형 대상
  const daySummary = useMemo(() => {
    const s = {}
    shiftCycle.forEach((k) => { s[k] = {} })
    dateList.forEach((d) => {
      const dk = d.format('YYYY-MM-DD')
      shiftCycle.forEach((k) => { s[k][dk] = 0 })
      members.forEach((m) => {
        const v = displayScheduleMap[`${m.id}-${dk}`] || shiftCycle[0] || '1'
        if (s[v] !== undefined) s[v][dk]++
      })
    })
    return s
  }, [dateList, members, displayScheduleMap, shiftCycle])

  // 스케줄에 실제로 존재하는 근무 유형만 자동으로 집계 행에 표시
  const activeSummaryRowKeys = useMemo(
    () => shiftCycle.filter((k) =>
      dateList.some(d => (daySummary[k]?.[d.format('YYYY-MM-DD')] || 0) > 0)
    ),
    [shiftCycle, daySummary, dateList]
  )

  // 개인별 월간 집계
  const memberSummary = useMemo(() => {
    const r = {}
    members.forEach((m) => {
      const c = Object.fromEntries(activeSummaryRowKeys.map((k) => [k, 0]))
      dateList.forEach((d) => {
        const v = displayScheduleMap[`${m.id}-${d.format('YYYY-MM-DD')}`] || shiftCycle[0] || '1'
        if (c[v] !== undefined) c[v]++
      })
      r[m.id] = c
    })
    return r
  }, [members, dateList, displayScheduleMap, shiftCycle, activeSummaryRowKeys])


  // ag-charts — 일별 근무 인원 현황 (날짜별 인원수 스택 막대)
  const chartOption = useMemo(() => {
    const top3 = activeSummaryRowKeys.length > 0 ? activeSummaryRowKeys : shiftCycle

    const data = dateList.map((d) => {
      const dateKey = d.format('YYYY-MM-DD')
      const entry = { date: d.format('M/D') }
      top3.forEach((k) => {
        const value = daySummary[k]?.[dateKey] || 0
        entry[k] = value
      })
      return entry
    })

    return {
      background: { fill: 'transparent' },
      padding: { top: 18, right: 16, bottom: 24, left: 32 },
      legend: {
        enabled: true,
        position: 'top',
        item: {
          marker: {
            size: 16,
            strokeWidth: 1.5,
          },
          label: {
            color: 'rgba(196,210,226,0.78)',
            fontSize: CHART_LEGEND_FONT_SIZE,
            fontWeight: 700,
          },
        },
      },
      axes: {
        x: {
          type: 'category',
          position: 'bottom',
          label: {
            color: 'rgba(196,210,226,0.72)',
            fontSize: CHART_AXIS_FONT_SIZE,
            fontWeight: 600,
          },
          tick: { enabled: false },
        },
        y: {
          type: 'number',
          position: 'left',
          label: {
            color: 'rgba(196,210,226,0.68)',
            fontSize: CHART_AXIS_FONT_SIZE,
            fontWeight: 600,
          },
          min: 0,
          gridLine: { stroke: 'rgba(255,255,255,0.06)', lineDash: [3, 3] },
        },
      },
      data,
      series: top3.map((k) => ({
        type: 'bar',
        xKey: 'date',
        yKey: k,
        yName: shiftLegend[k]?.label ?? k,
        stacked: true,
        fill: shiftLegend[k]?.bg ?? shiftLegend[k]?.color ?? '#b0c0d0',
        stroke: shiftLegend[k]?.border ?? shiftLegend[k]?.color ?? '#b0c0d0',
        strokeWidth: 1,
      })),
    }
  }, [dateList, daySummary, shiftCycle, shiftLegend, activeSummaryRowKeys])

  // 공통 th 스타일
  const TH = ({ children, style = {}, ...rest }) => (
    <th
      style={{
        padding: '7px 4px',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: 'rgba(245,158,11,0.95)',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.1)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </th>
  )

  // 개인 집계 열: 하단 집계 행과 동일한 유형 사용
  const summaryKeys = activeSummaryRowKeys.map((key) => ({
    key,
    label: shiftLegend[key]?.label ?? key,
    color: shiftLegend[key]?.color ?? '#c4cdd8',
  }))

  return (
    <Card
      className="nowa-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#f59e0b', fontSize: 15 }}><CalendarOutlined /></span>
          <span style={{ fontWeight: 800 }}>근무표</span>
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Popconfirm
            title={`${currentMonth.format('YYYY년 M월')} 전체를 주간(1)으로 초기화 하시겠습니까?`}
            onConfirm={resetAll}
            okText="초기화" cancelText="취소" okButtonProps={{ danger: true }}
          >
            <Button icon={<ClearOutlined />} danger size="small" style={{ fontWeight: 700 }}>
              초기화
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            size="small"
            loading={isSaving}
            onClick={saveAll}
            style={{
              background: isDirty ? '#f59e0b' : undefined,
              borderColor: isDirty ? '#f59e0b' : undefined,
              fontWeight: 700,
              minWidth: 64,
            }}
          >
            {isDirty ? '● 저장' : '저장'}
          </Button>
        </div>
      }
      styles={{ body: { padding: 0, overflow: 'hidden' } }}
    >
      {/* 월 네비 + 범례 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(245,158,11,0.12)',
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* 왼쪽: 년월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Button size="small" type="text" style={{ color: 'var(--nowa-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
            onClick={() => setCurrentMonth((p) => p.subtract(1, 'month'))}>‹</Button>
          <span style={{ minWidth: 110, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#f59e0b' }}>
            {currentMonth.format('YYYY년 M월')}
          </span>
          <Button size="small" type="text" style={{ color: 'var(--nowa-text-muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
            onClick={() => setCurrentMonth((p) => p.add(1, 'month'))}>›</Button>
          <Button
            onClick={() => setCurrentMonth(dayjs())}
            style={{ marginLeft: 4, borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', fontWeight: 700, height: 32, padding: '0 14px', fontSize: 14 }}
          >
            이번달
          </Button>
          <Button
            onClick={toggleWeekend}
            style={{
              borderColor: weekendExcluded ? '#7dd3fc' : 'rgba(125,211,252,0.4)',
              color: '#7dd3fc',
              background: weekendExcluded ? 'rgba(125,211,252,0.2)' : 'rgba(125,211,252,0.08)',
              fontWeight: 700, height: 32, padding: '0 14px', fontSize: 14,
            }}
          >
            {weekendExcluded ? '● 주말 제외' : '주말 제외'}
          </Button>
          <Button
            onClick={toggleHoliday}
            style={{
              borderColor: holidayExcluded ? '#f87171' : 'rgba(248,113,113,0.4)',
              color: '#f87171',
              background: holidayExcluded ? 'rgba(248,113,113,0.18)' : 'rgba(248,113,113,0.06)',
              fontWeight: 700, height: 32, padding: '0 14px', fontSize: 14,
            }}
          >
            {holidayExcluded ? '● 공휴일 제외' : '공휴일 제외'}
          </Button>
        </div>

        {/* 오른쪽: 범례 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {shiftCycle.map((k) => {
            const m = shiftLegend[k]
            return (
              <span key={k} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '3px 10px', borderRadius: 20,
                background: m.bg, color: m.color,
                border: `1px solid ${m.border}`,
                fontSize: 14, fontWeight: 700,
              }}>
                {(k === '1' || k === '2') && <span style={{ opacity: 0.55, fontSize: 14}}>{k}</span>}
                {m.label}
              </span>
            )
          })}
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)', marginLeft: 4 }}>
            ※ 셀 클릭으로 근무 유형 변경
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ minHeight: 340, display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              width: NAME_W + dateList.length * CELL_W + summaryKeys.length * SUM_W + 36,
            }}>
              <colgroup>
                <col style={{ width: NAME_W }} />
                {dateList.map((d) => <col key={d.valueOf()} style={{ width: CELL_W }} />)}
                {summaryKeys.map((s) => <col key={s.key} style={{ width: SUM_W }} />)}
                <col style={{ width: 36 }} />
              </colgroup>

              <thead>
                {/* 날짜 행 */}
                <tr>
                  <TH style={{ position: 'sticky', left: 0, zIndex: 5 }}>이름 / 조</TH>
                  {dateList.map((d) => {
                    const dk = d.format('YYYY-MM-DD')
                    const dow = d.day()
                    const isSat = dow === 6
                    const isSun = dow === 0
                    const isHoliday = !!holidays[dk]
                    const isMon = dow === 1
                    const color = isHoliday || isSun ? '#f87171' : isSat ? '#7dd3fc' : 'rgba(245,158,11,0.8)'
                    const bg = isHoliday ? 'rgba(248,113,113,0.12)' : isSat ? 'rgba(125,211,252,0.08)' : undefined
                    return (
                      <TH key={`dh-${d.valueOf()}`}
                        title={holidays[dk] || undefined}
                        style={{ color, background: bg, fontSize: 14, ...(isMon && { borderLeft: '2.5px solid #000' }) }}>
                        {d.format('M/D')}
                        {isHoliday && <div style={{ fontSize: 14, color: '#f87171', lineHeight: 1.1, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{holidays[dk]}</div>}
                      </TH>
                    )
                  })}
                  {summaryKeys.map((s) => (
                    <TH key={`sh-${s.key}`} style={{ color: s.color, background: 'rgba(245,158,11,0.12)' }}>
                      {s.label}
                    </TH>
                  ))}
                  <TH style={{ background: 'rgba(245,158,11,0.12)' }} />
                </tr>
                {/* 요일 행 */}
                <tr>
                  <TH style={{
                    position: 'sticky', left: 0, zIndex: 5,
                    background: 'rgba(245,158,11,0.04)', color: 'rgba(196,210,224,0.75)', fontSize: 14,
                  }}>요일</TH>
                  {dateList.map((d) => {
                    const dk = d.format('YYYY-MM-DD')
                    const dow = d.day()
                    const isSat = dow === 6
                    const isSun = dow === 0
                    const isHoliday = !!holidays[dk]
                    const isMon = dow === 1
                    const color = isHoliday || isSun ? '#f87171' : isSat ? '#7dd3fc' : 'rgba(196,210,224,0.75)'
                    const bg = isHoliday ? 'rgba(248,113,113,0.12)' : isSat ? 'rgba(125,211,252,0.08)' : 'rgba(245,158,11,0.03)'
                    return (
                      <TH key={`wh-${d.valueOf()}`}
                        style={{ background: bg, color, fontSize: 14, fontWeight: 600, ...(isMon && { borderLeft: '2.5px solid #000' }) }}>
                        {weekdayLabels[dow]}
                      </TH>
                    )
                  })}
                  {summaryKeys.map((s) => (
                    <TH key={`sw-${s.key}`}
                      style={{ background: 'rgba(245,158,11,0.04)', color: 'rgba(196,210,224,0.6)', fontSize: 14}}>
                      집계
                    </TH>
                  ))}
                  <TH style={{ background: 'rgba(245,158,11,0.04)' }} />
                </tr>
              </thead>

              <tbody>
                {members.map((member) => {
                  const summary = memberSummary[member.id] || {}
                  return (
                    <tr key={member.id}>
                      {/* 이름 셀 */}
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 3,
                        background: '#212535',
                        border: '1px solid rgba(245,158,11,0.1)',
                        padding: '7px 8px',
                        fontWeight: 700, fontSize: 14,
                        color: 'rgba(245,158,11,0.9)',
                        height: 46,
                        textAlign: 'center',
                      }}>
                        {member.name}
                      </td>

                      {/* 날짜 셀 */}
                      {dateList.map((d) => {
                        const dk  = d.format('YYYY-MM-DD')
                        const dow = d.day()
                        const ck  = `${member.id}-${dk}`
                        const val = displayScheduleMap[ck] || '1'
                        const cs  = shiftCellStyle[val] || shiftCellStyle['1']
                        const saving = savingKey === ck
                        const isMon = dow === 1
                        return (
                          <td
                            key={ck}
                            onClick={() => saveCell(member.id, dk, cycleShift(val, shiftCycle))}
                            title="클릭으로 근무 유형 변경"
                            style={{
                              border: '1px solid rgba(255,255,255,0.1)',
                              ...(isMon && { borderLeft: '2.5px solid #000' }),
                              textAlign: 'center',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'opacity 0.12s',
                              opacity: saving ? 0.4 : 1,
                              height: 46,
                              verticalAlign: 'middle',
                              ...cs,
                            }}
                          >
                            {val}
                          </td>
                        )
                      })}

                      {/* 개인 집계 */}
                      {summaryKeys.map((s) => (
                        <td key={`ms-${member.id}-${s.key}`} style={{
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(245,158,11,0.05)',
                          color: s.color,
                          fontSize: 14, fontWeight: 700,
                        }}>
                          {summary[s.key] || 0}
                        </td>
                      ))}

                      {/* 삭제 버튼 */}
                      <td style={{
                        textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(245,158,11,0.04)',
                      }}>
                        <Popconfirm
                          title={`${member.name}을(를) 근무표에서 제거하시겠습니까?`}
                          onConfirm={() => deleteMember(member.id)}
                          okText="제거" cancelText="취소" okButtonProps={{ danger: true }}
                        >
                          <DeleteOutlined style={{ color: '#f87171', fontSize: 14, cursor: 'pointer' }} />
                        </Popconfirm>
                      </td>
                    </tr>
                  )
                })}

                {/* 인원 추가 행 */}
                <tr>
                  <td
                    onClick={openAdd}
                    colSpan={dateList.length + summaryKeys.length + 2}
                    style={{
                      height: 36, textAlign: 'center', cursor: 'pointer',
                      background: 'rgba(245,158,11,0.04)',
                      border: '1px dashed rgba(245,158,11,0.25)',
                      color: 'rgba(245,158,11,0.55)', fontSize: 14, fontWeight: 700,
                      letterSpacing: 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.09)'; e.currentTarget.style.color = '#f59e0b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.04)'; e.currentTarget.style.color = 'rgba(245,158,11,0.55)' }}
                  >
                    + 인원 추가
                  </td>
                </tr>

                {/* 구분 */}
                <tr>
                  <td colSpan={dateList.length + summaryKeys.length + 2}
                    style={{ height: 6, background: 'rgba(245,158,11,0.06)' }} />
                </tr>

                {/* 일별 집계 행 - 사용자가 선택한 근무 유형만 표시 */}
                {activeSummaryRowKeys.map((key) => {
                  const legend = shiftLegend[key] ?? {}
                  const color  = legend.color ?? '#c4cdd8'
                  const label  = legend.label ?? key
                  const rowBg  = legend.bg ?? 'rgba(245,158,11,0.06)'
                  return (
                    <tr key={key}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 3,
                        background: '#212535',
                        border: '1px solid rgba(245,158,11,0.1)',
                        padding: '7px 10px',
                        textAlign: 'center',
                        fontWeight: 700, fontSize: 14, color,
                        height: 46,
                      }}>
                        {label}
                      </td>
                      {dateList.map((d) => {
                        const dk  = d.format('YYYY-MM-DD')
                        const val = daySummary[key]?.[dk] || 0
                        const isMon = d.day() === 1
                        return (
                          <td key={`ds-${key}-${dk}`} style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            ...(isMon && { borderLeft: '2.5px solid #000' }),
                            textAlign: 'center',
                            fontSize: 14, fontWeight: val > 0 ? 700 : 400,
                            background: val > 0 ? rowBg : 'transparent',
                            color: val > 0 ? color : 'rgba(196,210,224,0.72)',
                            height: 46,
                          }}>
                            {val}
                          </td>
                        )
                      })}
                      {summaryKeys.map((s) => (
                        <td key={`dss-${key}-${s.key}`}
                          style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(255,255,255,0.1)', height: 46 }} />
                      ))}
                      <td style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(245,158,11,0.03)' }} />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 차트 */}
          <div style={{ padding: '16px 14px 4px' }}>
            <div style={{
              borderLeft: '3px solid #f59e0b', paddingLeft: 10,
              color: 'var(--nowa-text)', fontSize: 14, fontWeight: 700, marginBottom: 10,
            }}>
              일별 근무 인원 현황
            </div>
            <SafeAgChart options={chartOption} style={{ height: 260 }} />
          </div>
        </>
      )}

      {/* 인원 추가 모달 - 카드 내부 */}
      <Modal
        title={<span><UserOutlined style={{ color: '#f59e0b', marginRight: 8 }} />인원 추가</span>}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        okText={`추가 (${selectedPids.length}명)`}
        width={520}
      >
        <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.78)', marginBottom: 14 }}>
          인원관리에 등록된 직원을 선택하면 근무표에 추가됩니다.
        </div>
        {personnelGroups.vendors.map((vendor) => {
          const available = personnelGroups.members.filter(
            (m) => m.vendor_id === vendor.id && !m.already_added
          )
          if (!available.length) return null
          return (
            <div key={vendor.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(245,158,11,0.65)', marginBottom: 6 }}>
                {vendor.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {available.map((m) => {
                  const sel = selectedPids.includes(m.id)
                  return (
                    <div key={m.id}
                      onClick={() => setSelectedPids((p) => sel ? p.filter((x) => x !== m.id) : [...p, m.id])}
                      style={{
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${sel ? '#f59e0b' : 'rgba(245,158,11,0.2)'}`,
                        background: sel ? 'rgba(245,158,11,0.15)' : 'transparent',
                        color: sel ? '#f59e0b' : 'var(--nowa-text)',
                        fontSize: 14, fontWeight: sel ? 700 : 400, transition: 'all 0.15s',
                      }}>
                      {m.name}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {personnelGroups.members.every((m) => m.already_added) && (
          <div style={{ textAlign: 'center', color: 'rgba(196,210,226,0.72)', padding: '20px 0' }}>
            추가 가능한 인원이 없습니다.
          </div>
        )}
      </Modal>
    </Card>
  )
}


// ── PM 인원 구성 ────────────────────────────────────────────────────
const PM_ROLES = ['PM 담당', 'Filter 담당', 'PM 보조', '기타']

function PmPersonnelTab({ vendors, members }) {
  // pmAssign: { [memberId]: role_string } — key 존재 = PM팀 포함
  const [savedAssign, setSavedAssign] = useState({})  // 서버 기준
  const [pmAssign, setPmAssign] = useState({})         // 로컬 편집 중
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [poolSearch, setPoolSearch] = useState('')
  const [poolVendor, setPoolVendor] = useState('all')

  // 서버에서 로드
  useEffect(() => {
    authFetch('/api/admin/personnel/pm-assign')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const map = {}
        list.forEach(({ member_id, role }) => { map[member_id] = role || '' })
        setSavedAssign(map)
        setPmAssign(map)
      })
      .catch(() => {})
  }, [])

  const isDirty = JSON.stringify(pmAssign) !== JSON.stringify(savedAssign)

  // 서버에 저장
  const saveToServer = async () => {
    setSaving(true)
    try {
      const body = Object.entries(pmAssign).map(([member_id, role]) => ({ member_id: Number(member_id), role }))
      const res = await authFetch('/api/admin/personnel/pm-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSavedAssign({ ...pmAssign })
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 2000)
      }
    } catch {}
    setSaving(false)
  }

  const addMember = (id) => setPmAssign(prev => ({ ...prev, [id]: '' }))
  const removeMember = (id) => setPmAssign(prev => { const n = { ...prev }; delete n[id]; return n })
  const setRole = (id, role) => setPmAssign(prev => ({ ...prev, [id]: role || '' }))
  const resetAll = () => setPmAssign({})

  const activeMembers = useMemo(() => members.filter(m => m.is_active), [members])
  const vendorOptions = useMemo(() =>
    vendors.filter(v => v.is_active).map(v => ({ label: v.name, value: v.id }))
  , [vendors])

  // PM팀 목록
  const pmList = useMemo(() =>
    activeMembers.filter(m => Object.prototype.hasOwnProperty.call(pmAssign, m.id))
  , [activeMembers, pmAssign])

  // PM팀에 없는 인원 풀 (검색+업체 필터)
  const poolList = useMemo(() => {
    const kw = poolSearch.trim().toLowerCase()
    return activeMembers.filter(m => {
      if (Object.prototype.hasOwnProperty.call(pmAssign, m.id)) return false
      if (poolVendor !== 'all' && m.vendor_id !== poolVendor) return false
      if (!kw) return true
      return [m.name, m.position, m.shift, m.vendor_name].filter(Boolean).some(s => s.toLowerCase().includes(kw))
    })
  }, [activeMembers, pmAssign, poolSearch, poolVendor])

  // 풀 업체별 그룹
  const poolGroups = useMemo(() => {
    const map = new Map()
    vendors.filter(v => v.is_active).forEach(v => map.set(v.id, { vendor: v, members: [] }))
    poolList.forEach(m => { if (map.has(m.vendor_id)) map.get(m.vendor_id).members.push(m) })
    return [...map.values()].filter(g => g.members.length > 0)
  }, [vendors, poolList])

  const avatarStyle = (color, bg) => ({
    width: 38, height: 38, borderRadius: '50%',
    background: bg, border: `1.5px solid ${color}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    fontSize: 16, fontWeight: 800, color,
  })

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* ── 왼쪽: 인원 풀 ────────────────────────────────── */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <Card className="nowa-card" styles={{ body: { padding: 14 } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#94a3b8' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>인원 풀</span>
              <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.72)', marginLeft: 2 }}>{poolList.length}명</span>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <Select value={poolVendor} onChange={setPoolVendor} size="small" style={{ width: '100%' }}
              options={[{ label: '전체 업체', value: 'all' }, ...vendorOptions]} />
            <Input allowClear size="small" value={poolSearch} onChange={e => setPoolSearch(e.target.value)}
              placeholder="이름/직무 검색" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            {poolGroups.length === 0 && (
              <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', textAlign: 'center', padding: '20px 0' }}>
                추가할 인원이 없습니다.
              </div>
            )}
            {poolGroups.map(({ vendor, members: gm }) => (
              <div key={vendor.id}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  {vendor.name}
                  <span style={{ color: 'rgba(196,210,226,0.68)', fontWeight: 400 }}>{gm.length}명</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {gm.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#1e2235', borderRadius: 10,
                      padding: '8px 10px',
                      border: '1px solid var(--nowa-border)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                      onClick={() => addMember(m.id)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(125,211,252,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--nowa-border)'}
                    >
                      <div style={avatarStyle('rgba(196,210,226,0.75)', '#2a2f45')}>
                        {m.name?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nowa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.72)', marginTop: 1 }}>
                          {[m.position, m.shift && `${m.shift}조`].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(125,211,252,0.1)', border: '1px solid rgba(125,211,252,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: '#7dd3fc', fontSize: 14, fontWeight: 700,
                      }}>+</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 오른쪽: PM 투입 인원 ─────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Card className="nowa-card" styles={{ body: { padding: 16 } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ToolOutlined style={{ color: '#7dd3fc' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>PM 투입 인원</span>
              <span style={{
                fontSize: 14, fontWeight: 700,
                background: pmList.length > 0 ? 'rgba(125,211,252,0.15)' : 'rgba(255,255,255,0.06)',
                color: pmList.length > 0 ? '#7dd3fc' : 'rgba(196,210,226,0.68)',
                padding: '1px 8px', borderRadius: 10, marginLeft: 4,
              }}>{pmList.length}명</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saveOk && <span style={{ fontSize: 14, color: '#4ade80' }}>저장 완료</span>}
                {pmList.length > 0 && (
                  <div onClick={resetAll} style={{
                    fontSize: 14, color: '#f87171', cursor: 'pointer',
                    padding: '3px 12px', borderRadius: 6,
                    border: '1px solid rgba(248,113,113,0.3)',
                    background: 'rgba(248,113,113,0.08)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                  >초기화</div>
                )}
                <div onClick={!saving && isDirty ? saveToServer : undefined} style={{
                  fontSize: 14, fontWeight: 700,
                  color: isDirty ? '#fff' : 'rgba(196,210,226,0.65)',
                  cursor: isDirty && !saving ? 'pointer' : 'default',
                  padding: '3px 14px', borderRadius: 6,
                  border: `1px solid ${isDirty ? 'rgba(125,211,252,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: isDirty ? 'rgba(125,211,252,0.15)' : 'rgba(255,255,255,0.04)',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (isDirty) e.currentTarget.style.background = 'rgba(125,211,252,0.28)' }}
                  onMouseLeave={e => { if (isDirty) e.currentTarget.style.background = 'rgba(125,211,252,0.15)' }}
                >{saving ? '저장 중...' : '저장'}</div>
              </div>
            </div>
          }
        >
          {pmList.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '48px 0', gap: 10,
              color: 'rgba(196,210,226,0.62)', fontSize: 14,
              border: '2px dashed rgba(125,211,252,0.12)', borderRadius: 12,
            }}>
              <UserOutlined style={{ fontSize: 32, opacity: 0.4 }} />
              <span>왼쪽 인원 풀에서 추가하세요</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {pmList.map(m => {
                const role = pmAssign[m.id] || ''
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#1e2235',
                    border: '1px solid rgba(125,211,252,0.2)',
                    borderLeft: '3px solid #7dd3fc',
                    borderRadius: 12, padding: '10px 12px',
                    minWidth: 240,
                  }}>
                    <div style={avatarStyle('#7dd3fc', 'rgba(125,211,252,0.1)')}>
                      {m.name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nowa-text)' }}>{m.name}</div>
                      <div style={{ fontSize: 14, color: 'rgba(196,210,226,0.72)', marginTop: 1 }}>
                        {m.vendor_name || ''}
                        {m.position && ` · ${m.position}`}
                        {m.shift && ` · ${m.shift}조`}
                      </div>
                    </div>
                    <Select
                      size="small"
                      value={role || null}
                      placeholder="역할 미지정"
                      allowClear
                      style={{ width: 110, flexShrink: 0 }}
                      options={PM_ROLES.map(r => ({ label: r, value: r }))}
                      onChange={v => setRole(m.id, v)}
                      styles={{ popup: { root: { zIndex: 2000 } } }}
                    />
                    <div
                      onClick={() => removeMember(m.id)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 700, flexShrink: 0,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.22)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                    >×</div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── 인원 현황판 ────────────────────────────────────────────────────
function PersonnelDashboard({ vendors, members }) {
  const activeMembers = members.filter((m) => m.is_active !== false)
  const inactiveMembers = members.filter((m) => m.is_active === false)

  const byVendor = vendors.map((v) => ({
    ...v,
    count: members.filter((m) => m.vendor_id === v.id).length,
    active: members.filter((m) => m.vendor_id === v.id && m.is_active !== false).length,
  }))

  const kpiStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '20px 24px', borderRadius: 14, border: '1px solid var(--nowa-border)', background: 'var(--nowa-panel)', flex: 1, minWidth: 120 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: 1.2, textTransform: 'uppercase' }}>전체 인원</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--nowa-text)', lineHeight: 1 }}>{members.length}</div>
          <div style={{ fontSize: 13, color: 'var(--nowa-text-muted)' }}>명</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: 1.2, textTransform: 'uppercase' }}>재직 중</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{activeMembers.length}</div>
          <div style={{ fontSize: 13, color: 'var(--nowa-text-muted)' }}>명</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.2, textTransform: 'uppercase' }}>퇴직/비활성</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#94a3b8', lineHeight: 1 }}>{inactiveMembers.length}</div>
          <div style={{ fontSize: 13, color: 'var(--nowa-text-muted)' }}>명</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: 1.2, textTransform: 'uppercase' }}>업체 수</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{vendors.length}</div>
          <div style={{ fontSize: 13, color: 'var(--nowa-text-muted)' }}>개사</div>
        </div>
      </div>

      <Card className="nowa-card" title={<span style={{ fontWeight: 700 }}>업체별 인원 현황</span>} styles={{ body: { padding: 0 } }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid var(--nowa-border)' }}>
              {['업체명', '전체', '재직 중', '비활성'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'rgba(251,191,36,0.75)', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byVendor.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--nowa-text-muted)' }}>등록된 업체가 없습니다.</td></tr>
            ) : byVendor.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--nowa-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.016)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--nowa-text)', fontWeight: 600 }}>{v.name}</td>
                <td style={{ padding: '10px 16px', color: 'var(--nowa-text-soft)' }}>{v.count}명</td>
                <td style={{ padding: '10px 16px', color: '#22c55e', fontWeight: 700 }}>{v.active}명</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{v.count - v.active}명</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── 업체/인원 데이터 공유 래퍼 ─────────────────────────────────────
function PersonnelDataPanel({ tabKey, vendors, members, refreshAll }) {
  const props = { vendors, members, refreshAll }
  const isVendors = tabKey === 'vendors'
  return (
    <Card
      className="nowa-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#f59e0b', fontSize: 15 }}>
            {isVendors ? <ShopOutlined /> : <UserOutlined />}
          </span>
          <span style={{ fontWeight: 800 }}>{isVendors ? '업체 관리' : '인원 관리'}</span>
        </div>
      }
      styles={{ body: { padding: '16px' } }}
    >
      {isVendors ? <VendorTab {...props} /> : <MemberTab {...props} />}
    </Card>
  )
}

// ── ShiftSchedule (메인) ────────────────────────────────────────────
function ShiftSchedule() {
  const [activeTab, setActiveTab] = useState('schedule')
  const [vendors, setVendors] = useState([])
  const [members, setMembers] = useState([])

  const fetchAll = useCallback(async () => {
    try {
      const [vRes, mRes] = await Promise.all([
        authFetch('/api/admin/personnel/vendors'),
        authFetch('/api/admin/personnel/members'),
      ])
      if (vRes.ok) setVendors(await vRes.json())
      if (mRes.ok) setMembers(await mRes.json())
    } catch {}
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const tabWrap = (children) => (
    <div style={{ padding: '12px 0 0' }}>{children}</div>
  )

  const tabs = [
    {
      key: 'dashboard',
      label: <span><UserOutlined style={{ marginRight: 5 }} />인원 현황판</span>,
      children: tabWrap(<PersonnelDashboard vendors={vendors} members={members} />),
    },
    {
      key: 'schedule',
      label: <span><CalendarOutlined style={{ marginRight: 5 }} />근무표</span>,
      children: tabWrap(<ScheduleTab />),
    },
    {
      key: 'vendors',
      label: <span><ShopOutlined style={{ marginRight: 5 }} />업체 관리</span>,
      children: tabWrap(<PersonnelDataPanel tabKey="vendors" vendors={vendors} members={members} refreshAll={fetchAll} />),
    },
    {
      key: 'personnel',
      label: <span><UserOutlined style={{ marginRight: 5 }} />인원 관리</span>,
      children: tabWrap(<PersonnelDataPanel tabKey="personnel" vendors={vendors} members={members} refreshAll={fetchAll} />),
    },
    {
      key: 'pm-personnel',
      label: <span><ToolOutlined style={{ marginRight: 5 }} />PM 인원 구성</span>,
      children: tabWrap(<PmPersonnelTab vendors={vendors} members={members} />),
    },
  ]

  return (
    <div className="page-shell">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
        tabBarStyle={tabBarStyle}
        style={{ padding: '0 4px' }}
        tabPaneMotion={false}
      />
    </div>
  )
}

export default ShiftSchedule
