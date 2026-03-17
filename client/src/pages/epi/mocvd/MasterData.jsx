import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

function usePendingActiveMap(rows) {
  return useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row.is_active])), [rows])
}

function MachineTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchRows = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/machines')
      const json = await res.json()
      setRows(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const initialActiveMap = usePendingActiveMap(rows)
  const [pendingActiveMap, setPendingActiveMap] = useState({})

  useEffect(() => {
    setPendingActiveMap(initialActiveMap)
  }, [initialActiveMap])

  const hasPendingChanges = rows.some((row) => pendingActiveMap[row.id] !== row.is_active)

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '호기 추가에 실패했습니다.')
      return
    }

    message.success('호기를 추가했습니다.')
    setCreateOpen(false)
    createForm.resetFields()
    fetchRows()
  }

  const handleEdit = async (values) => {
    const res = await authFetch(`/api/admin/machines/${editingRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '호기 수정에 실패했습니다.')
      return
    }

    message.success('호기를 수정했습니다.')
    setEditOpen(false)
    setEditingRow(null)
    editForm.resetFields()
    fetchRows()
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/machines/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '호기 삭제에 실패했습니다.')
      return
    }
    message.success('호기를 삭제했습니다.')
    fetchRows()
  }

  const handleSaveActive = async () => {
    const changedRows = rows.filter((row) => pendingActiveMap[row.id] !== row.is_active)
    if (changedRows.length === 0) {
      message.info('저장할 변경사항이 없습니다.')
      return
    }

    setSaving(true)
    try {
      for (const row of changedRows) {
        const res = await authFetch(`/api/admin/machines/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machine_no: row.machine_no,
            description: row.description,
            is_active: pendingActiveMap[row.id],
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `${formatMachineLabel(row.machine_no)} 저장에 실패했습니다.`)
        }
      }

      message.success('호기 사용 여부를 저장했습니다.')
      fetchRows()
    } catch (err) {
      message.error(err.message || '호기 사용 여부 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row) => {
    setEditingRow(row)
    editForm.setFieldsValue({
      machine_no: row.machine_no,
      description: row.description,
      is_active: pendingActiveMap[row.id] ?? row.is_active,
    })
    setEditOpen(true)
  }

  const columns = [
    {
      title: '호기 번호',
      dataIndex: 'machine_no',
      width: 150,
      render: (value) => formatMachineLabel(value),
    },
    {
      title: '설명',
      dataIndex: 'description',
      width: 280,
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '사용',
      width: 84,
      render: (_, row) => (
        <Switch
          size="small"
          checked={pendingActiveMap[row.id] ?? row.is_active}
          onChange={(checked) => setPendingActiveMap((prev) => ({ ...prev, [row.id]: checked }))}
        />
      ),
    },
    {
      title: '관리',
      width: 124,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            수정
          </Button>
          <Popconfirm title="이 호기를 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          호기 추가
        </Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveActive} loading={saving} disabled={!hasPendingChanges}>
          저장
        </Button>
      </div>

      <Table rowKey="id" size="small" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 30, showSizeChanger: false }} bordered />

      <Modal title="호기 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true, message: '호기 번호를 입력하세요.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="호기 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="저장">
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true, message: '호기 번호를 입력하세요.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function SourceTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchRows = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/sources')
      const json = await res.json()
      setRows(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const initialActiveMap = usePendingActiveMap(rows)
  const [pendingActiveMap, setPendingActiveMap] = useState({})

  useEffect(() => {
    setPendingActiveMap(initialActiveMap)
  }, [initialActiveMap])

  const hasPendingChanges = rows.some((row) => pendingActiveMap[row.id] !== row.is_active)

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '소스 추가에 실패했습니다.')
      return
    }

    message.success('소스를 추가했습니다.')
    setCreateOpen(false)
    createForm.resetFields()
    fetchRows()
  }

  const handleEdit = async (values) => {
    const res = await authFetch(`/api/admin/sources/${editingRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '소스 수정에 실패했습니다.')
      return
    }

    message.success('소스를 수정했습니다.')
    setEditOpen(false)
    setEditingRow(null)
    editForm.resetFields()
    fetchRows()
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/sources/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '소스 삭제에 실패했습니다.')
      return
    }
    message.success('소스를 삭제했습니다.')
    fetchRows()
  }

  const handleSaveActive = async () => {
    const changedRows = rows.filter((row) => pendingActiveMap[row.id] !== row.is_active)
    if (changedRows.length === 0) {
      message.info('저장할 변경사항이 없습니다.')
      return
    }

    setSaving(true)
    try {
      for (const row of changedRows) {
        const res = await authFetch(`/api/admin/sources/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.name,
            order_idx: row.order_idx,
            is_active: pendingActiveMap[row.id],
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `${row.name} 저장에 실패했습니다.`)
        }
      }

      message.success('소스 사용 여부를 저장했습니다.')
      fetchRows()
    } catch (err) {
      message.error(err.message || '소스 사용 여부 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row) => {
    setEditingRow(row)
    editForm.setFieldsValue({
      name: row.name,
      order_idx: row.order_idx,
      is_active: pendingActiveMap[row.id] ?? row.is_active,
    })
    setEditOpen(true)
  }

  const columns = [
    {
      title: '소스명',
      dataIndex: 'name',
      width: 150,
      render: (value) => (
        <Tag
          style={{
            marginInlineEnd: 0,
            borderColor: 'rgba(245,158,11,0.18)',
            background: 'rgba(245,158,11,0.08)',
            color: '#d7dde7',
          }}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: '순서',
      dataIndex: 'order_idx',
      width: 84,
    },
    {
      title: '사용',
      width: 84,
      render: (_, row) => (
        <Switch
          size="small"
          checked={pendingActiveMap[row.id] ?? row.is_active}
          onChange={(checked) => setPendingActiveMap((prev) => ({ ...prev, [row.id]: checked }))}
        />
      ),
    },
    {
      title: '관리',
      width: 124,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            수정
          </Button>
          <Popconfirm title="이 소스를 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          소스 추가
        </Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveActive} loading={saving} disabled={!hasPendingChanges}>
          저장
        </Button>
      </div>

      <Table rowKey="id" size="small" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 30, showSizeChanger: false }} bordered />

      <Modal title="소스 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="소스명" rules={[{ required: true, message: '소스명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="order_idx" label="순서" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="소스 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="저장">
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="소스명" rules={[{ required: true, message: '소스명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="order_idx" label="순서">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function MasterData() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>기준정보관리</h2>
      <Tabs
        defaultActiveKey="machines"
        items={[
          { key: 'machines', label: 'MOCVD 호기 관리', children: <MachineTab /> },
          { key: 'sources', label: '소스 종류 관리', children: <SourceTab /> },
        ]}
      />
    </div>
  )
}
