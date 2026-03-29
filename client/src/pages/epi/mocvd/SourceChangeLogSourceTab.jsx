import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, DatePicker, Form, Input, InputNumber,
  Modal, Popconfirm, Select, Space, Table, Tag,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'

const { RangePicker } = DatePicker

const WORK_TYPE_OPTIONS = ['투입', '회수', '교체', '보충', '폐기']
const ZONE_OPTIONS = ['A존', 'B존', 'C존', 'D존', 'A동', 'B동', 'C동', 'D동']

const WORK_TYPE_COLOR = {
  교체: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  투입: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  border: 'rgba(56,189,248,0.35)'  },
  회수: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)'  },
  보충: { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.35)'  },
  폐기: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)' },
}

const SOURCE_COLOR = {
  TEGa:  '#38bdf8', Cp2Mg: '#c084fc', TMIn: '#4ade80',
  TMAl:  '#fbbf24', SiH4:  '#f87171', NH3:  '#a3e635',
}

function num(v, d = 0) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? (d > 0 ? n.toFixed(d) : `${n}`) : '-'
}

function WorkTypeTag({ value }) {
  const c = WORK_TYPE_COLOR[value] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' }
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: c.color,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '2px 10px', whiteSpace: 'nowrap',
    }}>{value}</span>
  )
}

function UsedPct({ value }) {
  const n = Number(value ?? 0)
  const color = n >= 100 ? '#f87171' : n >= 80 ? '#fbbf24' : '#4ade80'
  const bg    = n >= 100 ? 'rgba(248,113,113,0.12)' : n >= 80 ? 'rgba(251,191,36,0.12)' : 'rgba(74,222,128,0.1)'
  return (
    <span style={{ fontSize: 12, fontWeight: 800, color, background: bg, borderRadius: 5, padding: '2px 8px' }}>
      {num(value, 1)}%
    </span>
  )
}

export default function SourceChangeLogSourceTab() {
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [logs, setLogs]             = useState([])
  const [machines, setMachines]     = useState([])
  const [sourceTypes, setSourceTypes] = useState([])
  const [open, setOpen]             = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [form] = Form.useForm()

  // 필터 상태
  const [filterRange, setFilterRange]     = useState(null)
  const [filterMachine, setFilterMachine] = useState(null)
  const [filterSource, setFilterSource]   = useState(null)
  const [filterWorkType, setFilterWorkType] = useState(null)
  const [filterKeyword, setFilterKeyword] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [logsRes, machinesRes, sourceTypesRes] = await Promise.all([
        authFetch('/api/mocvd/source-change-logs'),
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/source-types'),
      ])
      const [logsJson, machinesJson, sourceTypesJson] = await Promise.all([
        logsRes.json(), machinesRes.json(), sourceTypesRes.json(),
      ])
      if (!logsRes.ok) throw new Error(logsJson.detail || '불러오기 실패')
      setLogs(logsJson); setMachines(machinesJson); setSourceTypes(sourceTypesJson)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const machineOptions = useMemo(() => machines.map(m => ({ value: m.machine_no, label: `${m.machine_no}호기` })), [machines])
  const sourceOptions  = useMemo(() => sourceTypes.map(s => ({ value: s.name, label: s.name })), [sourceTypes])

  // 필터 적용
  const filtered = useMemo(() => logs.filter(row => {
    if (filterMachine  && row.machine_no   !== filterMachine)  return false
    if (filterSource   && row.source_name  !== filterSource)   return false
    if (filterWorkType && row.work_type    !== filterWorkType)  return false
    if (filterRange) {
      const d = dayjs(row.install_date)
      if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
    }
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase()
      const haystack = [row.cylinder_no, row.lot_no, row.vendor_name, row.worker_name, row.note].join(' ').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  }), [logs, filterRange, filterMachine, filterSource, filterWorkType, filterKeyword])

  const resetFilters = () => {
    setFilterRange(null); setFilterMachine(null)
    setFilterSource(null); setFilterWorkType(null); setFilterKeyword('')
  }

  const openCreate = () => {
    setEditingRow(null)
    form.setFieldsValue({
      install_date: dayjs(), removal_date: null,
      machine_no: machineOptions[0]?.value, source_name: sourceOptions[0]?.value,
      work_type: '교체', zone: 'B동', line_name: '', production_group: '양산',
      source_slot: '', source_number: '', vendor_name: '', cylinder_no: '', lot_no: '',
      net_weight: 0, reset_weight: 0, before_value: 0, after_value: 0,
      used_amount: 0, used_percent: 0, runtime_hours: 0, sql_value: 0, ctc_value: 0,
      worker_name: '', note: '',
    })
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue({
      ...row,
      install_date: row.install_date ? dayjs(row.install_date) : null,
      removal_date: row.removal_date ? dayjs(row.removal_date) : null,
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        install_date: values.install_date.format('YYYY-MM-DD'),
        removal_date: values.removal_date ? values.removal_date.format('YYYY-MM-DD') : '',
        machine_no: values.machine_no, source_name: values.source_name, work_type: values.work_type,
        zone: values.zone ?? '', line_name: values.line_name ?? '',
        production_group: values.production_group ?? '', source_slot: values.source_slot ?? '',
        source_number: values.source_number ?? '', vendor_name: values.vendor_name ?? '',
        cylinder_no: values.cylinder_no ?? '', lot_no: values.lot_no ?? '',
        net_weight: values.net_weight ?? 0, reset_weight: values.reset_weight ?? 0,
        before_value: values.before_value ?? 0, after_value: values.after_value ?? 0,
        used_amount: values.used_amount ?? 0, used_percent: values.used_percent ?? 0,
        runtime_hours: values.runtime_hours ?? 0, sql_value: values.sql_value ?? 0,
        ctc_value: values.ctc_value ?? 0, worker_name: values.worker_name ?? '', note: values.note ?? '',
      }
      const url = editingRow ? `/api/mocvd/source-change-logs/${editingRow.id}` : '/api/mocvd/source-change-logs'
      const res = await authFetch(url, { method: editingRow ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '저장 실패')
      setOpen(false); form.resetFields(); await fetchData()
    } catch (err) { if (!err?.errorFields) setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      setSaving(true)
      const res = await authFetch(`/api/mocvd/source-change-logs/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '삭제 실패')
      await fetchData()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const columns = [
    {
      title: '투입 날짜', dataIndex: 'install_date', width: 105, fixed: 'left',
      render: v => <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.85)', fontWeight: 500 }}>{v || '-'}</span>,
      sorter: (a, b) => (a.install_date || '').localeCompare(b.install_date || ''),
    },
    {
      title: '회수 날짜', dataIndex: 'removal_date', width: 105,
      render: v => <span style={{ fontSize: 13, color: v ? 'rgba(196,210,226,0.7)' : 'rgba(148,163,184,0.35)' }}>{v || '-'}</span>,
    },
    {
      title: '작업', dataIndex: 'work_type', width: 72,
      render: v => <WorkTypeTag value={v} />,
    },
    {
      title: 'ZONE', dataIndex: 'zone', width: 68,
      render: v => <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{v || '-'}</span>,
    },
    { title: '설비그룹', dataIndex: 'line_name', width: 85, render: v => <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.7)' }}>{v || '-'}</span> },
    {
      title: '생산단계', dataIndex: 'production_group', width: 78,
      render: v => <span style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>{v || '-'}</span>,
    },
    {
      title: '호기', dataIndex: 'machine_no', width: 60,
      render: v => <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>{v}</span>,
      sorter: (a, b) => a.machine_no - b.machine_no,
    },
    {
      title: 'SOURCE', dataIndex: 'source_name', width: 82,
      render: v => <span style={{ fontSize: 13, fontWeight: 800, color: SOURCE_COLOR[v] || '#e2e8f0' }}>{v}</span>,
    },
    { title: '번호', dataIndex: 'source_number', width: 55, render: v => <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.6)' }}>{v || '-'}</span> },
    { title: '업체명', dataIndex: 'vendor_name', width: 100, render: v => <span style={{ fontSize: 13 }}>{v || '-'}</span> },
    { title: 'CYLINDER NO.', dataIndex: 'cylinder_no', width: 165, render: v => <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(196,210,226,0.75)' }}>{v || '-'}</span> },
    { title: 'LOT NO', dataIndex: 'lot_no', width: 148, render: v => <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(196,210,226,0.75)' }}>{v || '-'}</span> },
    {
      title: 'NET WEIGHT', dataIndex: 'net_weight', width: 100, align: 'right',
      render: v => <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{num(v)}</span>,
      sorter: (a, b) => a.net_weight - b.net_weight,
    },
    {
      title: 'RESET', dataIndex: 'reset_weight', width: 72, align: 'right',
      render: v => <span style={{ fontSize: 13, fontWeight: 700, color: Number(v) > 0 ? '#f87171' : 'rgba(148,163,184,0.4)' }}>{num(v)}</span>,
    },
    { title: 'BEFORE', dataIndex: 'before_value', width: 75, align: 'right', render: v => <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.7)' }}>{num(v)}</span> },
    { title: 'AFTER',  dataIndex: 'after_value',  width: 75, align: 'right', render: v => <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.7)' }}>{num(v)}</span> },
    {
      title: 'USED관리', dataIndex: 'used_amount', width: 85, align: 'right',
      render: v => <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{num(v)}</span>,
      sorter: (a, b) => a.used_amount - b.used_amount,
    },
    {
      title: 'USED(%)', dataIndex: 'used_percent', width: 80, align: 'center',
      render: v => <UsedPct value={v} />,
      sorter: (a, b) => a.used_percent - b.used_percent,
    },
    { title: '가동(h)', dataIndex: 'runtime_hours', width: 75, align: 'right', render: v => <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.6)' }}>{v || '-'}</span> },
    { title: 'SQL', dataIndex: 'sql_value', width: 65, align: 'right', render: v => <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.6)' }}>{v || '-'}</span> },
    { title: 'CTC', dataIndex: 'ctc_value', width: 65, align: 'right', render: v => <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.6)' }}>{v || '-'}</span> },
    { title: '작업자', dataIndex: 'worker_name', width: 90, render: v => <span style={{ fontSize: 13 }}>{v || '-'}</span> },
    { title: '특이사항', dataIndex: 'note', width: 180, render: v => <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.55)' }}>{v || '-'}</span> },
    {
      title: '', key: 'actions', width: 72, fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const hasFilter = filterRange || filterMachine || filterSource || filterWorkType || filterKeyword

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError('')} />}

      <Card className="nowa-card" styles={{ body: { padding: '14px 16px' } }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--nowa-text)' }}>소스교체 작업 일지</span>
            <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.45)' }}>
              {hasFilter ? `${filtered.length} / ${logs.length}건` : `총 ${logs.length}건`}
            </span>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>새로고침</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>작업 추가</Button>
          </Space>
        </div>

        {/* 필터 바 */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          padding: '10px 14px', marginBottom: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
        }}>
          <RangePicker
            value={filterRange} onChange={setFilterRange}
            size="small" style={{ width: 230 }} placeholder={['투입 시작', '투입 종료']}
          />
          <Select
            allowClear placeholder="호기" value={filterMachine} onChange={setFilterMachine}
            options={machineOptions} size="small" style={{ width: 100 }}
          />
          <Select
            allowClear placeholder="SOURCE" value={filterSource} onChange={setFilterSource}
            options={sourceOptions} size="small" style={{ width: 110 }}
          />
          <Select
            allowClear placeholder="작업 구분" value={filterWorkType} onChange={setFilterWorkType}
            options={WORK_TYPE_OPTIONS.map(v => ({ value: v, label: v }))} size="small" style={{ width: 110 }}
          />
          <Input
            prefix={<SearchOutlined style={{ color: 'rgba(196,210,226,0.35)' }} />}
            placeholder="LOT NO / Cylinder / 업체 / 작업자"
            value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
            size="small" allowClear style={{ width: 240 }}
          />
          {hasFilter && (
            <Button size="small" onClick={resetFilters} style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' }}>
              초기화
            </Button>
          )}
        </div>

        {/* 테이블 */}
        <Table
          className="console-table"
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={false}
          scroll={{ x: 2500 }}
          rowClassName={(_, i) => i % 2 === 0 ? '' : 'row-alt'}
        />
      </Card>

      <Modal
        open={open}
        title={editingRow ? '소스교체 작업 수정' : '소스교체 작업 등록'}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        width={980}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="console-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <Form.Item name="install_date" label="투입 날짜" rules={[{ required: true, message: '필수' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="removal_date" label="회수 날짜">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="work_type" label="작업 구분" rules={[{ required: true, message: '필수' }]}>
              <Select options={WORK_TYPE_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="zone" label="ZONE">
              <Select allowClear options={ZONE_OPTIONS.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="line_name" label="설비그룹"><Input /></Form.Item>
            <Form.Item name="production_group" label="생산 단계"><Input /></Form.Item>
            <Form.Item name="machine_no" label="호기" rules={[{ required: true, message: '필수' }]}>
              <Select options={machineOptions} />
            </Form.Item>
            <Form.Item name="source_name" label="SOURCE" rules={[{ required: true, message: '필수' }]}>
              <Select options={sourceOptions} />
            </Form.Item>
            <Form.Item name="source_number" label="번호"><Input /></Form.Item>
            <Form.Item name="vendor_name" label="업체명"><Input /></Form.Item>
            <Form.Item name="cylinder_no" label="Cylinder No."><Input /></Form.Item>
            <Form.Item name="lot_no" label="LOT NO"><Input /></Form.Item>
            <Form.Item name="net_weight" label="Net weight"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="reset_weight" label="Reset weight"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="before_value" label="Before"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="after_value" label="After"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="used_amount" label="Used"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="used_percent" label="Used(%)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="runtime_hours" label="가동시간(h)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="sql_value" label="SQL"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="ctc_value" label="CTC"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="worker_name" label="작업자"><Input /></Form.Item>
          </div>
          <Form.Item name="note" label="특이사항">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
