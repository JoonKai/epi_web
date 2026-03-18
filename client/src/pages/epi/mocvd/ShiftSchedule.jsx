import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Modal, Popconfirm, Spin, Tabs, message } from 'antd'
import {
  CalendarOutlined,
  ClearOutlined,
  DeleteOutlined,
  LinkOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
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
  const [summaryRowKeys, setSummaryRowKeys] = useState(
    () => JSON.parse(localStorage.getItem('shift_summary_rows') || 'null') ?? ['1', '2', '휴무']
  )
  const [summaryRowsLoaded, setSummaryRowsLoaded] = useState(false)

  const year  = currentMonth.year()
  const month = currentMonth.month() + 1

  // DB 기준정보에서 근무 유형 + 집계 행 설정 로드
  useEffect(() => {
    apiFetch('/shift-types')
      .then((r) => r.json())
      .then((data) => setShiftTypes(Array.isArray(data) ? data : []))
      .catch(() => {})

    apiFetch('/settings/summary-rows')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.value)) {
          setSummaryRowKeys(data.value)
          localStorage.setItem('shift_summary_rows', JSON.stringify(data.value))
        }
        setSummaryRowsLoaded(true)
      })
      .catch(() => setSummaryRowsLoaded(true))
  }, [])

  // summaryRowKeys 변경 시 localStorage 동기화
  useEffect(() => {
    localStorage.setItem('shift_summary_rows', JSON.stringify(summaryRowKeys))
  }, [summaryRowKeys])

  const { cycle: shiftCycle, cellStyle: shiftCellStyle, legend: shiftLegend } = useMemo(
    () => buildShiftMaps(shiftTypes),
    [shiftTypes]
  )

  // DB에 실제 존재하는 유형만 (삭제된 유형 자동 제거) - 모든 hooks보다 앞에 선언
  const activeSummaryRowKeys = useMemo(
    () => summaryRowKeys.filter((k) => shiftCycle.includes(k)),
    [summaryRowKeys, shiftCycle]
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
    } catch {
      message.error('근무표 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  // 셀 클릭 → 로컬만 변경 (저장 버튼으로 DB 일괄 저장)
  const saveCell = useCallback((memberId, workDate, shiftType) => {
    const key = `${memberId}-${workDate}`
    setScheduleMap((m) => ({ ...m, [key]: shiftType }))
    setIsDirty(true)
  }, [])

  // DB 일괄 저장
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
            shift_type: scheduleMap[`${m.id}-${dk}`] || shiftCycle[0] || '1',
          })
        })
      })
      const [res] = await Promise.all([
        apiFetch('/schedules/bulk', { method: 'POST', body: JSON.stringify({ entries }) }),
        apiFetch('/settings/summary-rows', { method: 'PUT', body: JSON.stringify({ value: summaryRowKeys }) }),
      ])
      if (!res.ok) throw new Error()
      setIsDirty(false)
      message.success('저장 완료')
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [members, dateList, scheduleMap, shiftCycle, activeSummaryRowKeys])

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
      entries.forEach((e) => { newMap[`${e.member_id}-${e.work_date}`] = '1' })
      setScheduleMap(newMap)
      setIsDirty(false)
      message.success('전체 초기화 완료')
    } catch {
      message.error('초기화에 실패했습니다.')
    }
  }, [members, dateList])

  // 개인별 월간 집계
  const memberSummary = useMemo(() => {
    const top4 = activeSummaryRowKeys
    const r = {}
    members.forEach((m) => {
      const c = Object.fromEntries(top4.map((k) => [k, 0]))
      dateList.forEach((d) => {
        const v = scheduleMap[`${m.id}-${d.format('YYYY-MM-DD')}`] || shiftCycle[0] || '1'
        if (c[v] !== undefined) c[v]++
      })
      r[m.id] = c
    })
    return r
  }, [members, dateList, scheduleMap, shiftCycle, activeSummaryRowKeys])

  // 일별 집계 (전체) - 모든 활성 근무 유형 대상
  const daySummary = useMemo(() => {
    const s = {}
    shiftCycle.forEach((k) => { s[k] = {} })
    dateList.forEach((d) => {
      const dk = d.format('YYYY-MM-DD')
      shiftCycle.forEach((k) => { s[k][dk] = 0 })
      members.forEach((m) => {
        const v = scheduleMap[`${m.id}-${dk}`] || shiftCycle[0] || '1'
        if (s[v] !== undefined) s[v][dk]++
      })
    })
    return s
  }, [dateList, members, scheduleMap, shiftCycle])


  // ECharts - 앞 3개 근무 유형 표시
  const chartOption = useMemo(() => {
    const xData  = dateList.map((d) => d.format('M/D'))
    const top3   = activeSummaryRowKeys.length > 0 ? activeSummaryRowKeys : shiftCycle
    const allVals = top3.flatMap((k) => dateList.map((d) => daySummary[k]?.[d.format('YYYY-MM-DD')] || 0))
    const maxVal  = Math.max(...allVals, 1)

    const gradBar = (color, name, data) => ({
      name, type: 'bar', data,
      barMaxWidth: 16, barGap: '8%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: color }, { offset: 1, color: color + '0d' }] },
      },
    })

    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 32, left: 32, containLabel: true },
      legend: {
        right: 12, top: 2,
        textStyle: { color: 'rgba(196,205,216,0.65)', fontSize: 12 },
        itemWidth: 12, itemHeight: 8,
      },
      xAxis: {
        type: 'category', data: xData,
        axisLine: { lineStyle: { color: 'rgba(245,158,11,0.15)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(196,205,216,0.45)', fontSize: 10, interval: 1 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value', min: 0, max: maxVal + 1, interval: 1,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: 'rgba(196,205,216,0.4)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: top3.map((k) => {
        const color = shiftLegend[k]?.color ?? '#94a3b8'
        const label = shiftLegend[k]?.label ?? k
        const data  = dateList.map((d) => daySummary[k]?.[d.format('YYYY-MM-DD')] || 0)
        return gradBar(color, label, data)
      }),
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#1c1f2a',
        borderColor: 'rgba(245,158,11,0.2)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
    }
  }, [dateList, daySummary, shiftCycle, shiftLegend, summaryRowKeys])

  // 공통 th 스타일
  const TH = ({ children, style = {}, ...rest }) => (
    <th
      style={{
        padding: '7px 4px',
        textAlign: 'center',
        fontSize: 12,
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
    <div style={{
      background: 'var(--nowa-card-bg, #161921)',
      border: '1px solid rgba(245,158,11,0.12)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
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
          <Button size="small" type="text" icon={<ReloadOutlined style={{ fontSize: 12 }} />}
            onClick={fetchData} style={{ color: 'var(--nowa-text-muted)', marginLeft: 4 }} />
          <Button
            onClick={() => setCurrentMonth(dayjs())}
            style={{ marginLeft: 4, borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', fontWeight: 700, height: 32, padding: '0 14px', fontSize: 14 }}
          >
            이번달
          </Button>
          <Popconfirm
            title={`${currentMonth.format('YYYY년 M월')} 전체를 주간(1)으로 초기화 하시겠습니까?`}
            onConfirm={resetAll}
            okText="초기화" cancelText="취소" okButtonProps={{ danger: true }}
          >
            <Button icon={<ClearOutlined />} danger style={{ marginLeft: 4, height: 32, padding: '0 14px', fontSize: 14 }}>
              초기화
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            loading={isSaving}
            onClick={saveAll}
            style={{
              marginLeft: 4,
              background: isDirty ? '#f59e0b' : undefined,
              borderColor: isDirty ? '#f59e0b' : undefined,
              fontWeight: 700,
              height: 32,
              padding: '0 18px',
              fontSize: 14,
            }}
          >
            {isDirty ? '● 저장' : '저장'}
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
                fontSize: 11, fontWeight: 700,
              }}>
                {(k === '1' || k === '2') && <span style={{ opacity: 0.55, fontSize: 10 }}>{k}</span>}
                {m.label}
              </span>
            )
          })}
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', marginLeft: 4 }}>
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
                    const isWe = d.day() === 0 || d.day() === 6
                    const isMon = d.day() === 1
                    return (
                      <TH key={`dh-${d.valueOf()}`}
                        style={{
                          color: isWe ? '#f87171' : 'rgba(245,158,11,0.8)', fontSize: 11,
                          ...(isMon && { borderLeft: '2.5px solid #000' }),
                        }}>
                        {d.format('M/D')}
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
                    background: 'rgba(245,158,11,0.04)', color: 'rgba(196,210,224,0.75)', fontSize: 11,
                  }}>요일</TH>
                  {dateList.map((d) => {
                    const isWe = d.day() === 0 || d.day() === 6
                    const isMon = d.day() === 1
                    return (
                      <TH key={`wh-${d.valueOf()}`}
                        style={{
                          background: 'rgba(245,158,11,0.03)',
                          color: isWe ? '#f87171' : 'rgba(196,210,224,0.75)',
                          fontSize: 11, fontWeight: 600,
                          ...(isMon && { borderLeft: '2.5px solid #000' }),
                        }}>
                        {weekdayLabels[d.day()]}
                      </TH>
                    )
                  })}
                  {summaryKeys.map((s) => (
                    <TH key={`sw-${s.key}`}
                      style={{ background: 'rgba(245,158,11,0.04)', color: 'rgba(196,210,224,0.6)', fontSize: 10 }}>
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
                        background: '#13161e',
                        border: '1px solid rgba(245,158,11,0.1)',
                        padding: '7px 8px',
                        fontWeight: 700, fontSize: 13,
                        color: 'rgba(245,158,11,0.9)',
                        height: 46,
                        textAlign: 'center',
                      }}>
                        {member.name}
                      </td>

                      {/* 날짜 셀 */}
                      {dateList.map((d) => {
                        const dk  = d.format('YYYY-MM-DD')
                        const ck  = `${member.id}-${dk}`
                        const val = scheduleMap[ck] || '1'
                        const cs  = shiftCellStyle[val] || shiftCellStyle['1']
                        const saving = savingKey === ck
                        const isMon = d.day() === 1
                        return (
                          <td
                            key={ck}
                            onClick={() => saveCell(member.id, dk, cycleShift(val, shiftCycle))}
                            title="클릭으로 근무 유형 변경"
                            style={{
                              border: '1px solid rgba(255,255,255,0.1)',
                              ...(isMon && { borderLeft: '2.5px solid #000' }),
                              textAlign: 'center',
                              fontSize: val.length > 1 ? 10 : 12,
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
                          fontSize: 13, fontWeight: 700,
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
                          <DeleteOutlined style={{ color: 'rgba(248,113,113,0.55)', fontSize: 12, cursor: 'pointer' }} />
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
                      color: 'rgba(245,158,11,0.55)', fontSize: 12, fontWeight: 700,
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
                        background: '#13161e',
                        border: '1px solid rgba(245,158,11,0.1)',
                        padding: '7px 10px',
                        textAlign: 'center',
                        fontWeight: 700, fontSize: 12, color,
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
                            fontSize: 12, fontWeight: val > 0 ? 700 : 400,
                            background: val > 0 ? rowBg : 'transparent',
                            color: val > 0 ? color : 'rgba(196,210,224,0.45)',
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
                      {/* 삭제 버튼 */}
                      <td style={{
                        textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(245,158,11,0.03)',
                      }}>
                        <DeleteOutlined
                          onClick={() => setSummaryRowKeys((prev) => prev.filter((k) => k !== key))}
                          style={{ color: 'rgba(248,113,113,0.55)', fontSize: 12, cursor: 'pointer' }}
                        />
                      </td>
                    </tr>
                  )
                })}

                {/* + 항목 추가 행 */}
                {shiftCycle.filter((k) => !activeSummaryRowKeys.includes(k)).length > 0 && (
                  <tr>
                    <td
                      colSpan={dateList.length + summaryKeys.length + 2}
                      style={{
                        height: 34, textAlign: 'center', cursor: 'default',
                        background: 'rgba(245,158,11,0.02)',
                        border: '1px dashed rgba(245,158,11,0.2)',
                        padding: '0 8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.45)', marginRight: 4 }}>+ 항목 추가:</span>
                        {shiftCycle.filter((k) => !activeSummaryRowKeys.includes(k)).map((k) => {
                          const legend = shiftLegend[k] ?? {}
                          return (
                            <span
                              key={k}
                              onClick={() => setSummaryRowKeys((prev) => [...prev, k])}
                              style={{
                                padding: '2px 10px', borderRadius: 20, cursor: 'pointer',
                                background: legend.bg ?? 'rgba(245,158,11,0.1)',
                                color: legend.color ?? '#f59e0b',
                                border: `1px solid ${legend.border ?? 'rgba(245,158,11,0.3)'}`,
                                fontSize: 11, fontWeight: 700,
                              }}
                            >
                              {legend.label ?? k}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 차트 */}
          <div style={{ padding: '16px 14px 4px' }}>
            <div style={{
              borderLeft: '3px solid #f59e0b', paddingLeft: 10,
              color: 'var(--nowa-text)', fontSize: 13, fontWeight: 700, marginBottom: 10,
            }}>
              일별 근무 인원 현황
            </div>
            <ReactECharts option={chartOption} style={{ height: 190 }} theme="dark" />
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
        <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.55)', marginBottom: 14 }}>
          인원관리에 등록된 직원을 선택하면 근무표에 추가됩니다.
        </div>
        {personnelGroups.vendors.map((vendor) => {
          const available = personnelGroups.members.filter(
            (m) => m.vendor_id === vendor.id && !m.already_added
          )
          if (!available.length) return null
          return (
            <div key={vendor.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,158,11,0.65)', marginBottom: 6 }}>
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
                        fontSize: 13, fontWeight: sel ? 700 : 400, transition: 'all 0.15s',
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
          <div style={{ textAlign: 'center', color: 'rgba(148,163,184,0.45)', padding: '20px 0' }}>
            추가 가능한 인원이 없습니다.
          </div>
        )}
      </Modal>
    </div>
  )
}


// ── 근무인원 ────────────────────────────────────────────────────────
function MemberPanel() {
  const [members, setMembers]                 = useState([])
  const [loading, setLoading]                 = useState(true)
  const [importOpen, setImportOpen]           = useState(false)
  const [personnelGroups, setPersonnelGroups] = useState({ vendors: [], members: [] })
  const [importLoading, setImportLoading]     = useState(false)
  const [selectedPids, setSelectedPids]       = useState([])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiFetch('/members')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMembers(Array.isArray(data) ? data : [])
    } catch {
      message.error('멤버 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/members/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      message.success('삭제했습니다.')
      fetchMembers()
    } catch {
      message.error('삭제에 실패했습니다.')
    }
  }

  const openImport = async () => {
    setImportOpen(true)
    setSelectedPids([])
    try {
      const res = await apiFetch('/personnel-groups')
      if (!res.ok) throw new Error()
      setPersonnelGroups(await res.json())
    } catch {
      message.error('인원관리 데이터를 불러오지 못했습니다.')
    }
  }

  const handleImport = async () => {
    if (!selectedPids.length) { message.warning('선택된 인원이 없습니다.'); return }
    setImportLoading(true)
    try {
      const res = await apiFetch('/import-from-personnel', {
        method: 'POST',
        body: JSON.stringify({ personnel_member_ids: selectedPids }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      message.success(`${data.added}명 추가됐습니다.`)
      setImportOpen(false)
      fetchMembers()
    } catch {
      message.error('가져오기에 실패했습니다.')
    } finally {
      setImportLoading(false)
    }
  }

  const personnelByVendor = useMemo(() => {
    const map = {}
    personnelGroups.members.forEach((m) => {
      const vendor = personnelGroups.vendors.find((v) => v.id === m.vendor_id)
      const key    = vendor?.name || '기타'
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [personnelGroups])

  if (loading) return <div style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}><Spin /></div>

  return (
    <div style={{
      background: 'var(--nowa-card-bg, #161921)',
      border: '1px solid rgba(245,158,11,0.12)',
      borderRadius: 16,
      padding: '14px 16px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', fontWeight: 600 }}>
          총 <span style={{ color: '#f59e0b', fontWeight: 800 }}>{members.length}</span>명 등록
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            type="text" size="small"
            icon={<ReloadOutlined style={{ fontSize: 13 }} />}
            onClick={fetchMembers}
            style={{ color: 'rgba(148,163,184,0.5)' }}
          />
          <Button
            type="primary" size="small"
            icon={<span style={{ fontSize: 14, marginRight: 3 }}>+</span>}
            onClick={openImport}
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700, borderRadius: 8 }}
          >
            직원 추가
          </Button>
        </div>
      </div>

      {/* 카드 목록 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {members.map((m) => {
          const initial = m.name?.[0] || '?'
          return (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 0,
                background: '#1a1d28',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                minWidth: 200,
                overflow: 'hidden',
                borderLeft: '3px solid #f59e0b',
              }}
            >
              {/* 아바타 - 원형, 단색 다크 */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#2d3348',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                margin: '12px 12px 12px 10px',
                border: '1.5px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{initial}</span>
              </div>

              {/* 이름 */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--nowa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.45)', marginTop: 3 }}>
                  {m.vendor_name || '미지정'}
                </div>
              </div>

              {/* 액션 */}
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, paddingRight: 12, justifyContent: 'center' }}>
                <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(m.id)} okText="삭제" cancelText="취소">
                  <DeleteOutlined style={{ color: '#f87171', fontSize: 16, cursor: 'pointer', opacity: 0.85 }} />
                </Popconfirm>
              </div>
            </div>
          )
        })}

        {/* + 직원 추가 카드 */}
        <div
          onClick={openImport}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 190, height: 70,
            border: '2px dashed rgba(245,158,11,0.35)',
            borderRadius: 14,
            cursor: 'pointer',
            color: 'rgba(245,158,11,0.55)',
            fontSize: 13, fontWeight: 700,
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.7)'; e.currentTarget.style.color = '#f59e0b' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)'; e.currentTarget.style.color = 'rgba(245,158,11,0.55)' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          직원 추가
        </div>
      </div>

      {/* 연동 모달 */}
      <Modal
        title={<span><LinkOutlined style={{ color: '#f59e0b', marginRight: 8 }} />직원 추가 (인원관리 연동)</span>}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText={`추가 (${selectedPids.length}명)`}
        confirmLoading={importLoading}
        width={520}
      >
        <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.55)', marginBottom: 14 }}>
          인원관리에 등록된 직원을 선택하면 근무표에 추가됩니다.
        </div>
        {Object.entries(personnelByVendor).map(([vendor, list]) => {
          const available = list.filter((m) => !m.already_added)
          if (!available.length) return null
          return (
            <div key={vendor} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,158,11,0.65)', marginBottom: 6 }}>{vendor}</div>
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
                        fontSize: 13, fontWeight: sel ? 700 : 400,
                        transition: 'all 0.15s',
                      }}>
                      {m.name}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {Object.keys(personnelByVendor).length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(148,163,184,0.45)', padding: '20px 0' }}>
            추가 가능한 인원이 없습니다.
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── 업체/인원 데이터 공유 래퍼 ─────────────────────────────────────
function PersonnelDataPanel({ tabKey }) {
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

  const props = { vendors, members, refreshAll: fetchAll }

  return (
    <div style={{
      background: 'var(--nowa-card-bg, #161921)',
      border: '1px solid rgba(245,158,11,0.12)',
      borderRadius: 16,
      padding: '14px 16px',
    }}>
      {tabKey === 'vendors' ? <VendorTab {...props} /> : <MemberTab {...props} />}
    </div>
  )
}

// ── ShiftSchedule (메인) ────────────────────────────────────────────
function ShiftSchedule() {
  const [activeTab, setActiveTab] = useState('schedule')

  const tabWrap = (children) => (
    <div style={{ padding: '12px 0 0' }}>{children}</div>
  )

  const tabs = [
    {
      key: 'schedule',
      label: <span><CalendarOutlined style={{ marginRight: 5 }} />근무현황판</span>,
      children: tabWrap(<ScheduleTab />),
    },
    {
      key: 'members',
      label: <span><TeamOutlined style={{ marginRight: 5 }} />근무인원</span>,
      children: tabWrap(<MemberPanel />),
    },
    {
      key: 'vendors',
      label: <span><ShopOutlined style={{ marginRight: 5 }} />업체 관리</span>,
      children: tabWrap(<PersonnelDataPanel tabKey="vendors" />),
    },
    {
      key: 'personnel',
      label: <span><UserOutlined style={{ marginRight: 5 }} />인원 관리</span>,
      children: tabWrap(<PersonnelDataPanel tabKey="personnel" />),
    },
  ]

  return (
    <div className="page-shell">
      <div className="nowa-card" style={{ overflow: 'hidden' }}>
        <div className="nowa-card__header">
          <div className="nowa-card__title">인원 관리</div>
          <div className="nowa-card__meta">MOCVD 근무표 · 근무인원 · 인원관리</div>
        </div>
        <div className="nowa-card__body" style={{ padding: 0 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabs}
            tabBarStyle={tabBarStyle}
            style={{ padding: '0 4px' }}
            tabPaneMotion={false}
          />
        </div>
      </div>
    </div>
  )
}

export default ShiftSchedule
