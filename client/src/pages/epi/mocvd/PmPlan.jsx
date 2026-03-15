import { useMemo, useState } from 'react'
import { Button, Card, Col, Input, Row, Segmented, Space, Table, Tabs, Tag } from 'antd'
import { CalendarOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

const PM_RUN_ROWS = [
  {
    key: '78',
    location: 'B1F',
    machine_no: 78,
    status: '양산',
    equipment_name: 'K465i',
    code: 'B1GMOC78',
    chamber_counter: 254,
    filter_counter: 129,
    pm_cycle: 300,
    filter_cycle: 150,
    daily_run: 4.5,
    pm_expected_count: 10.2,
    filter_expected_count: 4.7,
    pm_expected_date: '2026-03-25',
    filter_expected_date: '2026-03-19',
    item: 'VINA 이설',
    pm_week: '13W',
    filter_week: '12W',
  },
  {
    key: '79',
    location: 'B1F',
    machine_no: 79,
    status: '양산',
    equipment_name: 'K465i',
    code: 'B1GMOC79',
    chamber_counter: 59,
    filter_counter: 59,
    pm_cycle: 300,
    filter_cycle: 150,
    daily_run: 4.5,
    pm_expected_count: 53.6,
    filter_expected_count: 20.2,
    pm_expected_date: '2026-05-07',
    filter_expected_date: '2026-04-04',
    item: '',
    pm_week: '19W',
    filter_week: '14W',
  },
  {
    key: '80',
    location: 'B1F',
    machine_no: 80,
    status: '양산',
    equipment_name: 'K465i',
    code: 'B1GMOC80',
    chamber_counter: 203,
    filter_counter: 52,
    pm_cycle: 300,
    filter_cycle: 150,
    daily_run: 4.5,
    pm_expected_count: 21.6,
    filter_expected_count: 21.8,
    pm_expected_date: '2026-04-05',
    filter_expected_date: '2026-04-05',
    item: 'VINA 이설 준비',
    pm_week: '15W',
    filter_week: '15W',
  },
  {
    key: '81',
    location: 'B1F',
    machine_no: 81,
    status: '양산',
    equipment_name: 'K465i',
    code: 'B1GMOC81',
    chamber_counter: 32,
    filter_counter: 32,
    pm_cycle: 300,
    filter_cycle: 150,
    daily_run: 4.5,
    pm_expected_count: 59.6,
    filter_expected_count: 26.2,
    pm_expected_date: '2026-05-13',
    filter_expected_date: '2026-04-10',
    item: 'VINA 이설 준비',
    pm_week: '20W',
    filter_week: '15W',
  },
  {
    key: '82',
    location: 'B1F',
    machine_no: 82,
    status: '양산',
    equipment_name: 'K465i',
    code: 'B1GMOC82',
    chamber_counter: 1,
    filter_counter: 1,
    pm_cycle: 300,
    filter_cycle: 150,
    daily_run: 4.5,
    pm_expected_count: 66.4,
    filter_expected_count: 33.1,
    pm_expected_date: '2026-05-20',
    filter_expected_date: '2026-04-17',
    item: 'VINA 이설',
    pm_week: '21W',
    filter_week: '16W',
  },
]

const PM_DAY_ROWS = [
  { key: 'bake1', location: 'B4F', machine: 'Bake1', status: '양산', equipment_name: 'Bake', code: 'B4GBKF01', pm_done: '2022-05-03', pm_cycle: 180, pm_expected_date: '2022-10-30', sn: '1W', item: '단열재 수리중(챔버 내부 Leak 업체 수리 중)' },
  { key: 'bake2', location: 'B4F', machine: 'Bake2', status: '양산', equipment_name: 'Bake', code: 'B4GBKF02', pm_done: '2023-06-01', pm_cycle: 180, pm_expected_date: '2023-11-28', sn: '1W', item: '수리 입고 5/31' },
  { key: 'bake3', location: 'B4F', machine: 'Bake3', status: '양산', equipment_name: 'Bake', code: 'B4GBKF03', pm_done: '2025-03-15', pm_cycle: 180, pm_expected_date: '2025-09-11', sn: '1W', item: '30호기 교체' },
  { key: 'bake4', location: 'B4F', machine: 'Bake4', status: '양산', equipment_name: 'Bake', code: 'B4GBKF04', pm_done: '2025-08-03', pm_cycle: 180, pm_expected_date: '2026-01-30', sn: '52W', item: '' },
]

function daysDiff(dateText) {
  return dayjs(dateText).diff(dayjs(), 'day')
}

function statusTag(daysLeft) {
  if (daysLeft <= 7) return <Tag color="red">임박</Tag>
  if (daysLeft <= 30) return <Tag color="gold">예정</Tag>
  return <Tag color="green">정상</Tag>
}

function SummaryCard({ label, value, suffix, sub }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: '22px 24px',
        background: 'var(--nowa-hero-bg)',
        border: '1px solid var(--nowa-border)',
        boxShadow: 'var(--nowa-shadow-card)',
        minHeight: 140,
      }}
    >
      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ color: 'var(--nowa-text)', fontWeight: 900, lineHeight: 1, marginTop: 10 }}>
        <span style={{ fontSize: 44 }}>{value}</span>
        {suffix ? <span style={{ fontSize: 18, marginLeft: 6 }}>{suffix}</span> : null}
      </div>
      <div style={{ color: 'var(--nowa-text-soft)', fontSize: 12, marginTop: 10 }}>{sub}</div>
    </div>
  )
}

function PmStatusBoard() {
  const [displayMode, setDisplayMode] = useState('list')

  const urgentRows = useMemo(
    () =>
      PM_RUN_ROWS.map((row) => ({ ...row, days_left: daysDiff(row.pm_expected_date) }))
        .sort((a, b) => a.days_left - b.days_left),
    [],
  )

  const columns = [
    { title: '호기', dataIndex: 'machine_no', width: 90 },
    { title: '위치', dataIndex: 'location', width: 80 },
    { title: '장비 명', dataIndex: 'equipment_name', width: 90 },
    { title: 'Chamber', dataIndex: 'chamber_counter', width: 90 },
    { title: 'Filter', dataIndex: 'filter_counter', width: 90 },
    { title: 'PM 예상 일자', dataIndex: 'pm_expected_date', width: 120 },
    { title: 'Filter 예상 일자', dataIndex: 'filter_expected_date', width: 130 },
    { title: '상태', dataIndex: 'days_left', width: 90, render: (value) => statusTag(value) },
    { title: 'Item', dataIndex: 'item' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...panelStyle, padding: 24, borderRadius: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>MOCVD PM주기 현황판</div>
            <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>
              `11111.xlsm`의 `PM 주기 계획(Run)`, `PM 주기 계획(Day)` 구조를 기준으로 화면을 구성했습니다.
            </div>
          </div>
          <Button icon={<ReloadOutlined />}>현황 새로고침</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><SummaryCard label="대상 설비" value={PM_RUN_ROWS.length} suffix="대" sub="Run 기준 PM 설비" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="7일 이내 PM" value={urgentRows.filter((row) => row.days_left <= 7).length} suffix="대" sub="즉시 확인 필요" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="30일 이내 PM" value={urgentRows.filter((row) => row.days_left <= 30).length} suffix="대" sub="당월 예정" /></Col>
        <Col xs={24} md={12} xl={6}><SummaryCard label="Bake 점검 설비" value={PM_DAY_ROWS.length} suffix="대" sub="Day 기준 PM 설비" /></Col>
      </Row>

      <Card
        className="nowa-card"
        title="PM 예정 목록"
        extra={(
          <Segmented
            value={displayMode}
            onChange={setDisplayMode}
            options={[
              { label: '목록', value: 'list', icon: <UnorderedListOutlined /> },
              { label: '캘린더', value: 'calendar', icon: <CalendarOutlined /> },
            ]}
          />
        )}
      >
        {displayMode === 'list' ? (
          <Table rowKey="key" columns={columns} dataSource={urgentRows} pagination={false} scroll={{ x: 980 }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {urgentRows.map((row) => (
              <div key={row.key} style={{ padding: 16, borderRadius: 16, border: '1px solid var(--nowa-border)', background: 'var(--nowa-soft-fill)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--nowa-text)' }}>MO#{row.machine_no}호기</strong>
                  {statusTag(row.days_left)}
                </div>
                <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13 }}>PM 예정 {row.pm_expected_date}</div>
                <div style={{ color: 'var(--nowa-text-soft)', fontSize: 13 }}>Filter 예정 {row.filter_expected_date}</div>
                <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12, marginTop: 8 }}>{row.item || '특이사항 없음'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function PmMachineBoard() {
  const [search, setSearch] = useState('')
  const rows = useMemo(
    () => PM_RUN_ROWS.filter((row) => `${row.machine_no} ${row.equipment_name} ${row.location}`.toLowerCase().includes(search.toLowerCase().trim())),
    [search],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card className="nowa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="호기 검색" style={{ width: 220 }} allowClear />
          <span style={{ color: 'var(--nowa-text-muted)' }}>{rows.length}대 표시</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {rows.map((row) => (
          <Card key={row.key} className="nowa-card" styles={{ body: { padding: 16 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ color: '#14b8a6', fontSize: 18, fontWeight: 800 }}>MO#{row.machine_no}호기</div>
                <div style={{ color: 'var(--nowa-text-muted)', fontSize: 12 }}>{row.location} / {row.equipment_name}</div>
              </div>
              {statusTag(daysDiff(row.pm_expected_date))}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Chamber Counter</span><strong>{row.chamber_counter}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter Counter</span><strong>{row.filter_counter}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PM 주기</span><strong>{row.pm_cycle}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter 주기</span><strong>{row.filter_cycle}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PM 예상 일자</span><strong>{row.pm_expected_date}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Filter 예상 일자</span><strong>{row.filter_expected_date}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>주차</span><strong>{row.pm_week} / {row.filter_week}</strong></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PmInputTab() {
  const columns = [
    { title: '위치', dataIndex: 'location', width: 80, fixed: 'left' },
    { title: '호기', dataIndex: 'machine_no', width: 70, fixed: 'left' },
    { title: '현황', dataIndex: 'status', width: 70 },
    { title: '장비 명', dataIndex: 'equipment_name', width: 90 },
    { title: 'Code', dataIndex: 'code', width: 110 },
    { title: 'Chamber', dataIndex: 'chamber_counter', width: 90 },
    { title: 'Filter', dataIndex: 'filter_counter', width: 90 },
    { title: 'PM 주기', dataIndex: 'pm_cycle', width: 90 },
    { title: 'Filter 주기', dataIndex: 'filter_cycle', width: 100 },
    { title: 'Daily Run 수', dataIndex: 'daily_run', width: 90 },
    { title: 'PM 예정 횟수', dataIndex: 'pm_expected_count', width: 100 },
    { title: 'Filter 예정횟수', dataIndex: 'filter_expected_count', width: 110 },
    { title: 'PM 예상 일자', dataIndex: 'pm_expected_date', width: 120 },
    { title: 'Filter 예상 일자', dataIndex: 'filter_expected_date', width: 130 },
    { title: 'Item', dataIndex: 'item', width: 180 },
    { title: 'PM 주차', dataIndex: 'pm_week', width: 90 },
    { title: 'Filter 주차', dataIndex: 'filter_week', width: 100 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="console-toolbar">
        <div>
          <div style={sectionTitleStyle}>PM 주기 입력</div>
          <div style={{ color: 'var(--console-text)', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            MOCVD PM 주기 입력
          </div>
          <div style={{ color: 'rgba(220,232,255,0.72)', marginTop: 6 }}>
            `PM 주기 계획(Run)` 시트의 주요 항목을 기준으로 입력 표를 구성했습니다.
          </div>
        </div>
      </div>

      <Card className="console-panel" style={{ ...panelStyle }} title="PM 주기 입력 표">
        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={PM_RUN_ROWS}
          pagination={false}
          scroll={{ x: 1600 }}
        />
      </Card>
    </div>
  )
}

export default function PmPlan() {
  return (
    <Tabs
      defaultActiveKey="status"
      items={[
        { key: 'status', label: 'PM주기 현황판', children: <PmStatusBoard /> },
        { key: 'machine', label: '설비별 PM현황', children: <PmMachineBoard /> },
        { key: 'input', label: 'PM주기 입력', children: <PmInputTab /> },
      ]}
    />
  )
}
