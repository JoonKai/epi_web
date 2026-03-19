import { useEffect, useMemo, useRef, useState } from 'react'
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
import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, PlusOutlined, SaveOutlined, UnorderedListOutlined, TableOutlined } from '@ant-design/icons'
import { HexColorPicker, RgbaStringColorPicker } from 'react-colorful'
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
  const [viewMode, setViewMode] = useState('scroll')
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(245,158,11,0.25)' }}>
            {[{ key: 'scroll', icon: <UnorderedListOutlined />, label: '스크롤' }, { key: 'page', icon: <TableOutlined />, label: '페이지' }].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                  background: viewMode === key ? 'rgba(245,158,11,0.18)' : 'transparent',
                  color: viewMode === key ? '#fbbf24' : 'var(--nowa-text-muted)',
                  fontWeight: viewMode === key ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveActive} loading={saving} disabled={!hasPendingChanges}>
            저장
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={viewMode === 'page' ? { pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] } : false}
        scroll={viewMode === 'scroll' ? { y: 520 } : undefined}
        bordered
      />

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

function ColorPickerField({ value, onChange, rgba = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <span style={{
          width: 20, height: 20, borderRadius: 4,
          background: value || 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, color: 'var(--nowa-text)', flex: 1 }}>{value || '선택 안됨'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 1000, top: '110%', left: 0,
          background: '#242834', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 220,
        }}>
          {rgba ? (
            <RgbaStringColorPicker color={value || 'rgba(245,158,11,0.18)'} onChange={onChange} />
          ) : (
            <HexColorPicker color={value || '#f59e0b'} onChange={onChange} />
          )}
          <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '4px 8px', color: '#e2e8f0', fontSize: 12,
            }}
          />
        </div>
      )}
    </div>
  )
}

function ShiftTypeTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchRows = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/shift/shift-types')
      const json = await res.json()
      setRows(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRows() }, [])

  const handleCreate = async (values) => {
    const res = await authFetch('/api/shift/shift-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '추가에 실패했습니다.')
      return
    }
    message.success('근무 유형을 추가했습니다.')
    setCreateOpen(false)
    createForm.resetFields()
    fetchRows()
  }

  const handleEdit = async (values) => {
    const res = await authFetch(`/api/shift/shift-types/${editingRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      message.error(err.detail || '수정에 실패했습니다.')
      return
    }
    message.success('수정했습니다.')
    setEditOpen(false)
    setEditingRow(null)
    editForm.resetFields()
    fetchRows()
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/shift/shift-types/${id}`, { method: 'DELETE' })
    if (!res.ok) { message.error('삭제에 실패했습니다.'); return }
    message.success('삭제했습니다.')
    fetchRows()
  }

  const openEdit = (row) => {
    setEditingRow(row)
    editForm.setFieldsValue({ ...row })
    setEditOpen(true)
  }

  const shiftFormFields = (
    <>
      <Form.Item name="name" label="코드값" rules={[{ required: true, message: '코드값을 입력하세요.' }]}
        tooltip="근무표에 표시될 짧은 코드 (예: 1, 2, 휴무, 반반차A)">
        <Input placeholder="예: 반반차A" />
      </Form.Item>
      <Form.Item name="label" label="표시명" rules={[{ required: true, message: '표시명을 입력하세요.' }]}>
        <Input placeholder="예: 반반차A" />
      </Form.Item>
      <Form.Item name="order_idx" label="순서" initialValue={0}>
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="color" label="텍스트 색상" initialValue="#f59e0b">
        <ColorPickerField />
      </Form.Item>
      <Form.Item name="bg_color" label="배경 색상" initialValue="rgba(245,158,11,0.18)">
        <ColorPickerField rgba />
      </Form.Item>
      <Form.Item name="border_color" label="테두리 색상" initialValue="rgba(245,158,11,0.4)">
        <ColorPickerField rgba />
      </Form.Item>
    </>
  )

  const columns = [
    {
      title: '순서',
      dataIndex: 'order_idx',
      width: 60,
    },
    {
      title: '코드값',
      dataIndex: 'name',
      width: 100,
      render: (name, row) => (
        <Tag style={{
          marginInlineEnd: 0,
          background: row.bg_color,
          color: row.color,
          borderColor: row.border_color,
          fontWeight: 700,
          fontSize: 13,
        }}>
          {name}
        </Tag>
      ),
    },
    {
      title: '표시명',
      dataIndex: 'label',
      width: 120,
    },
    {
      title: '텍스트 색상',
      dataIndex: 'color',
      width: 160,
      render: (color) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: color, display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }} />
          {color}
        </span>
      ),
    },
    {
      title: '배경 색상',
      dataIndex: 'bg_color',
      width: 220,
      render: (bg) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: bg, display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }} />
          {bg}
        </span>
      ),
    },
    {
      title: '사용',
      width: 72,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.is_active}
          onChange={async (checked) => {
            await authFetch(`/api/shift/shift-types/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_active: checked }),
            })
            fetchRows()
          }}
        />
      ),
    },
    {
      title: '관리',
      width: 124,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>수정</Button>
          <Popconfirm title="이 근무 유형을 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          유형 추가
        </Button>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 30, showSizeChanger: false }}
        bordered
      />

      <Modal title="근무 유형 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          {shiftFormFields}
        </Form>
      </Modal>

      <Modal title="근무 유형 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="저장">
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          {shiftFormFields}
          <Form.Item name="is_active" label="사용" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

const tabBarStyle = {
  borderBottom: '1px solid rgba(245,158,11,0.18)',
  marginBottom: 20,
  paddingBottom: 0,
}

export default function MasterData() {
  return (
    <div>
      <Tabs
        defaultActiveKey="machines"
        tabBarStyle={tabBarStyle}
        items={[
          { key: 'machines', label: <span><AppstoreOutlined /> MOCVD 호기 관리</span>, children: <MachineTab /> },
          { key: 'sources', label: <span><ExperimentOutlined /> 소스 종류 관리</span>, children: <SourceTab /> },
          { key: 'shift-types', label: <span><CalendarOutlined /> 근무 유형 관리</span>, children: <ShiftTypeTab /> },
        ]}
      />
    </div>
  )
}
