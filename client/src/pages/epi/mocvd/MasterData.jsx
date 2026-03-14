import { useEffect, useMemo, useState } from 'react'
import { Tabs, Table, Button, Modal, Form, Input, Switch, Tag, Popconfirm, message, InputNumber, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

function usePendingActiveMap(rows) {
  return useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row.is_active])), [rows])
}

function MachineTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/machines')
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const initialActiveMap = usePendingActiveMap(data)
  const [pendingActiveMap, setPendingActiveMap] = useState({})

  useEffect(() => {
    setPendingActiveMap(initialActiveMap)
  }, [initialActiveMap])

  const hasPendingChanges = data.some((row) => pendingActiveMap[row.id] !== row.is_active)

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('추가 완료')
      setCreateOpen(false)
      createForm.resetFields()
      fetchData()
      return
    }
    const err = await res.json()
    message.error(err.detail)
  }

  const handleEdit = async (values) => {
    const res = await authFetch(`/api/admin/machines/${editingRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('수정 완료')
      setEditOpen(false)
      setEditingRow(null)
      editForm.resetFields()
      fetchData()
      return
    }
    const err = await res.json()
    message.error(err.detail)
  }

  const handleToggle = (row, isActive) => {
    setPendingActiveMap((prev) => ({ ...prev, [row.id]: isActive }))
  }

  const handleSaveActive = async () => {
    const changedRows = data.filter((row) => pendingActiveMap[row.id] !== row.is_active)
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

      message.success('호기 사용 여부 저장 완료')
      fetchData()
    } catch (err) {
      message.error(err.message || '호기 사용 여부 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await authFetch(`/api/admin/machines/${id}`, { method: 'DELETE' })
    message.success('삭제 완료')
    fetchData()
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
    { title: '호기 번호', dataIndex: 'machine_no', width: 170, render: (value) => formatMachineLabel(value) },
    { title: '설명', dataIndex: 'description', render: (value) => value || '-' },
    {
      title: '사용',
      dataIndex: 'is_active',
      width: 110,
      render: (_, row) => (
        <Switch
          checked={pendingActiveMap[row.id] ?? row.is_active}
          size="small"
          onChange={(checked) => handleToggle(row, checked)}
        />
      ),
    },
    {
      title: '관리',
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>수정</Button>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>호기 추가</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveActive} loading={saving} disabled={!hasPendingChanges}>
          저장
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 20 }} size="middle" bordered />

      <Modal title="호기 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="description" label="설명"><Input placeholder="선택 사항" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="호기 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="저장">
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="description" label="설명"><Input /></Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function SourceTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/sources')
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const initialActiveMap = usePendingActiveMap(data)
  const [pendingActiveMap, setPendingActiveMap] = useState({})

  useEffect(() => {
    setPendingActiveMap(initialActiveMap)
  }, [initialActiveMap])

  const hasPendingChanges = data.some((row) => pendingActiveMap[row.id] !== row.is_active)

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('추가 완료')
      setCreateOpen(false)
      createForm.resetFields()
      fetchData()
      return
    }
    const err = await res.json()
    message.error(err.detail)
  }

  const handleEdit = async (values) => {
    const res = await authFetch(`/api/admin/sources/${editingRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('수정 완료')
      setEditOpen(false)
      setEditingRow(null)
      editForm.resetFields()
      fetchData()
      return
    }
    const err = await res.json()
    message.error(err.detail)
  }

  const handleToggle = (row, isActive) => {
    setPendingActiveMap((prev) => ({ ...prev, [row.id]: isActive }))
  }

  const handleSaveActive = async () => {
    const changedRows = data.filter((row) => pendingActiveMap[row.id] !== row.is_active)
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

      message.success('소스 사용 여부 저장 완료')
      fetchData()
    } catch (err) {
      message.error(err.message || '소스 사용 여부 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await authFetch(`/api/admin/sources/${id}`, { method: 'DELETE' })
    message.success('삭제 완료')
    fetchData()
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
    { title: '소스명', dataIndex: 'name', width: 150, render: (value) => <Tag color="blue">{value}</Tag> },
    { title: '순서', dataIndex: 'order_idx', width: 80 },
    {
      title: '사용',
      dataIndex: 'is_active',
      width: 110,
      render: (_, row) => (
        <Switch
          checked={pendingActiveMap[row.id] ?? row.is_active}
          size="small"
          onChange={(checked) => handleToggle(row, checked)}
        />
      ),
    },
    {
      title: '관리',
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>수정</Button>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>소스 추가</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveActive} loading={saving} disabled={!hasPendingChanges}>
          저장
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} size="middle" bordered />

      <Modal title="소스 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="소스명" rules={[{ required: true }]}><Input placeholder="예: TMGa" /></Form.Item>
          <Form.Item name="order_idx" label="순서" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="소스 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="저장">
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="소스명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="order_idx" label="순서"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function MasterData() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>기준정보관리</h2>
      <Tabs
        items={[
          { key: 'machines', label: 'MOCVD 호기 관리', children: <MachineTab /> },
          { key: 'sources', label: '소스 종류 관리', children: <SourceTab /> },
        ]}
      />
    </div>
  )
}

export default MasterData
