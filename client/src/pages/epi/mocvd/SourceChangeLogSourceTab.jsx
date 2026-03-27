import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'

const WORK_TYPE_OPTIONS = ['투입', '회수', '교체', '보충', '폐기']
const ZONE_OPTIONS = ['A존', 'B존', 'C존', 'D존']

function num(value, digits = 0) {
  const next = Number(value ?? 0)
  if (!Number.isFinite(next)) return '-'
  return digits > 0 ? next.toFixed(digits) : `${next}`
}

export default function SourceChangeLogSourceTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [machines, setMachines] = useState([])
  const [sourceTypes, setSourceTypes] = useState([])
  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [logsRes, machinesRes, sourceTypesRes] = await Promise.all([
        authFetch('/api/mocvd/source-change-logs'),
        authFetch('/api/mocvd/machines'),
        authFetch('/api/mocvd/source-types'),
      ])

      const [logsJson, machinesJson, sourceTypesJson] = await Promise.all([
        logsRes.json(),
        machinesRes.json(),
        sourceTypesRes.json(),
      ])

      if (!logsRes.ok) throw new Error(logsJson.detail || '작업 일지를 불러오지 못했습니다.')
      if (!machinesRes.ok) throw new Error(machinesJson.detail || '설비 목록을 불러오지 못했습니다.')
      if (!sourceTypesRes.ok) throw new Error(sourceTypesJson.detail || '소스 목록을 불러오지 못했습니다.')

      setLogs(logsJson)
      setMachines(machinesJson)
      setSourceTypes(sourceTypesJson)
    } catch (err) {
      setError(err.message || '작업 일지를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const machineOptions = useMemo(
    () => machines.map((machine) => ({ value: machine.machine_no, label: `${machine.machine_no}호기` })),
    [machines],
  )

  const sourceOptions = useMemo(
    () => sourceTypes.map((source) => ({ value: source.name, label: source.name })),
    [sourceTypes],
  )

  const openCreate = () => {
    setEditingRow(null)
    form.setFieldsValue({
      install_date: dayjs(),
      removal_date: null,
      machine_no: machineOptions[0]?.value,
      source_name: sourceOptions[0]?.value,
      work_type: '교체',
      zone: 'B존',
      line_name: '',
      production_group: '양산',
      source_slot: '',
      source_number: '',
      vendor_name: '',
      cylinder_no: '',
      lot_no: '',
      net_weight: 0,
      reset_weight: 0,
      before_value: 0,
      after_value: 0,
      used_amount: 0,
      used_percent: 0,
      runtime_hours: 0,
      sql_value: 0,
      ctc_value: 0,
      worker_name: '',
      note: '',
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
        machine_no: values.machine_no,
        source_name: values.source_name,
        work_type: values.work_type,
        zone: values.zone ?? '',
        line_name: values.line_name ?? '',
        production_group: values.production_group ?? '',
        source_slot: values.source_slot ?? '',
        source_number: values.source_number ?? '',
        vendor_name: values.vendor_name ?? '',
        cylinder_no: values.cylinder_no ?? '',
        lot_no: values.lot_no ?? '',
        net_weight: values.net_weight ?? 0,
        reset_weight: values.reset_weight ?? 0,
        before_value: values.before_value ?? 0,
        after_value: values.after_value ?? 0,
        used_amount: values.used_amount ?? 0,
        used_percent: values.used_percent ?? 0,
        runtime_hours: values.runtime_hours ?? 0,
        sql_value: values.sql_value ?? 0,
        ctc_value: values.ctc_value ?? 0,
        worker_name: values.worker_name ?? '',
        note: values.note ?? '',
      }

      const url = editingRow ? `/api/mocvd/source-change-logs/${editingRow.id}` : '/api/mocvd/source-change-logs'
      const method = editingRow ? 'PUT' : 'POST'
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '작업 일지 저장에 실패했습니다.')

      setOpen(false)
      form.resetFields()
      await fetchData()
    } catch (err) {
      if (err?.errorFields) return
      setError(err.message || '작업 일지 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      setSaving(true)
      const res = await authFetch(`/api/mocvd/source-change-logs/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '작업 일지 삭제에 실패했습니다.')
      await fetchData()
    } catch (err) {
      setError(err.message || '작업 일지 삭제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: '투입 날짜', dataIndex: 'install_date', width: 110, fixed: 'left' },
    { title: '회수 날짜', dataIndex: 'removal_date', width: 110, render: (value) => value || '-' },
    {
      title: '작업 구분',
      dataIndex: 'work_type',
      width: 90,
      render: (value) => <Tag color="purple">{value}</Tag>,
    },
    {
      title: 'zone',
      dataIndex: 'zone',
      width: 80,
      render: (value) => <span style={{ color: '#16a34a', fontWeight: 700 }}>{value || '-'}</span>,
    },
    { title: '설비그룹', dataIndex: 'line_name', width: 90, render: (value) => value || '-' },
    {
      title: '생산 단계',
      dataIndex: 'production_group',
      width: 90,
      render: (value) => <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{value || '-'}</span>,
    },
    {
      title: '호기',
      dataIndex: 'machine_no',
      width: 70,
      render: (value) => <span style={{ color: '#b45309', fontWeight: 800 }}>{value}</span>,
    },
    {
      title: 'Source',
      dataIndex: 'source_name',
      width: 90,
      render: (value) => <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{value}</span>,
    },
    { title: '번호', dataIndex: 'source_number', width: 70, render: (value) => value || '-' },
    { title: '업체명', dataIndex: 'vendor_name', width: 90, render: (value) => value || '-' },
    { title: 'Cylinder No.', dataIndex: 'cylinder_no', width: 170, render: (value) => value || '-' },
    { title: 'LOT NO', dataIndex: 'lot_no', width: 150, render: (value) => value || '-' },
    { title: 'Net weight', dataIndex: 'net_weight', width: 90, render: (value) => <span style={{ color: '#2563eb', fontWeight: 700 }}>{num(value)}</span> },
    { title: 'Reset weigh', dataIndex: 'reset_weight', width: 90, render: (value) => <span style={{ color: '#dc2626', fontWeight: 700 }}>{num(value)}</span> },
    { title: 'Before', dataIndex: 'before_value', width: 80, render: (value) => num(value) },
    { title: 'After', dataIndex: 'after_value', width: 80, render: (value) => num(value) },
    { title: 'Used', dataIndex: 'used_amount', width: 80, render: (value) => <span style={{ background: '#dcfce7', color: '#14532d', padding: '1px 6px', borderRadius: 4 }}>{num(value)}</span> },
    { title: 'Used(%)', dataIndex: 'used_percent', width: 80, render: (value) => <span style={{ color: '#dc2626', fontWeight: 800 }}>{num(value)}%</span> },
    { title: '가동시간', dataIndex: 'runtime_hours', width: 80, render: (value) => value || '-' },
    { title: 'SQL', dataIndex: 'sql_value', width: 70, render: (value) => value || '-' },
    { title: 'CTC', dataIndex: 'ctc_value', width: 70, render: (value) => value || '-' },
    { title: 'worker', dataIndex: 'worker_name', width: 130, render: (value) => value || '-' },
    { title: '특이사항', dataIndex: 'note', width: 220, render: (value) => value || '-' },
    {
      title: '관리',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="???묒뾽 ?쇱?瑜???젣?좉퉴??" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {error ? <Alert type="error" message={error} showIcon /> : null}

      <Card
        className="nowa-card"
        styles={{ body: { padding: 16 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: '1px solid var(--nowa-border)',
          }}
        >
          <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800 }}>소스교체 작업 일지</div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              작업 추가
            </Button>
          </Space>
        </div>

        <div style={{ border: '1px solid var(--nowa-border)', overflow: 'hidden' }}>
          <Table
            className="console-table"
            rowKey="id"
            size="small"
            bordered
            loading={loading}
            columns={columns}
            dataSource={logs}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            scroll={{ x: 2550 }}
          />
        </div>
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
            <Form.Item name="install_date" label="투입 날짜" rules={[{ required: true, message: '투입 날짜를 선택하세요.' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="removal_date" label="회수 날짜">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="work_type" label="작업 구분" rules={[{ required: true, message: '작업 구분을 선택하세요.' }]}>
              <Select options={WORK_TYPE_OPTIONS.map((value) => ({ value, label: value }))} />
            </Form.Item>
            <Form.Item name="zone" label="zone">
              <Select allowClear options={ZONE_OPTIONS.map((value) => ({ value, label: value }))} />
            </Form.Item>

            <Form.Item name="line_name" label="설비그룹">
              <Input />
            </Form.Item>
            <Form.Item name="production_group" label="생산 단계">
              <Input />
            </Form.Item>
            <Form.Item name="machine_no" label="호기" rules={[{ required: true, message: '호기를 선택하세요.' }]}>
              <Select options={machineOptions} />
            </Form.Item>
            <Form.Item name="source_name" label="Source" rules={[{ required: true, message: '소스를 선택하세요.' }]}>
              <Select options={sourceOptions} />
            </Form.Item>

            <Form.Item name="source_number" label="번호">
              <Input />
            </Form.Item>
            <Form.Item name="vendor_name" label="업체명">
              <Input />
            </Form.Item>
            <Form.Item name="cylinder_no" label="Cylinder No.">
              <Input />
            </Form.Item>
            <Form.Item name="lot_no" label="LOT NO">
              <Input />
            </Form.Item>

            <Form.Item name="net_weight" label="Net weight">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="reset_weight" label="Reset weigh">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="before_value" label="Before">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="after_value" label="After">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="used_amount" label="Used">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="used_percent" label="Used(%)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="runtime_hours" label="가동시간">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sql_value" label="SQL">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="ctc_value" label="CTC">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="worker_name" label="worker">
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="note" label="특이사항">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
