import { useEffect, useState } from 'react'
import { Tabs, Table, Button, Modal, Form, Input, Select, Switch, Tag, Popconfirm, message, InputNumber, Card, Radio, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, KeyOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'

const { Text } = Typography

// ── 사용자 관리 ──────────────────────────────────────────
function UserTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form] = Form.useForm()
  const [pwForm] = Form.useForm()

  const fetch_ = async () => {
    setLoading(true)
    const res = await authFetch('/api/admin/users')
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) { message.success('생성 완료'); setModalOpen(false); form.resetFields(); fetch_() }
    else { const e = await res.json(); message.error(e.detail) }
  }

  const handleUpdate = async (id, values) => {
    const res = await authFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) { message.success('수정 완료'); fetch_() }
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) { message.success('삭제 완료'); fetch_() }
  }

  const handleResetPw = async (values) => {
    const res = await authFetch(`/api/admin/users/${editUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password }),
    })
    if (res.ok) { message.success('비밀번호 변경 완료'); setPwModalOpen(false); pwForm.resetFields() }
  }

  const columns = [
    { title: '아이디', dataIndex: 'username', width: 150 },
    {
      title: '권한', dataIndex: 'role', width: 100,
      render: (v) => <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? '관리자' : '일반'}</Tag>,
    },
    {
      title: '활성', dataIndex: 'is_active', width: 80,
      render: (v, row) => (
        <Switch checked={v} size="small"
          onChange={(checked) => handleUpdate(row.id, { role: row.role, is_active: checked })} />
      ),
    },
    { title: '생성일', dataIndex: 'created_at', width: 120 },
    {
      title: '권한 변경', width: 120,
      render: (_, row) => (
        <Select size="small" value={row.role} style={{ width: 90 }}
          options={[{ value: 'admin', label: '관리자' }, { value: 'user', label: '일반' }]}
          onChange={(v) => handleUpdate(row.id, { role: v, is_active: row.is_active })} />
      ),
    },
    {
      title: '관리', width: 120,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" icon={<KeyOutlined />}
            onClick={() => { setEditUser(row); setPwModalOpen(true) }} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>계정 추가</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} size="middle" bordered />

      <Modal title="계정 추가" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="추가">
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="username" label="아이디" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="권한" initialValue="user">
            <Select options={[{ value: 'admin', label: '관리자' }, { value: 'user', label: '일반' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="비밀번호 변경" open={pwModalOpen} onCancel={() => setPwModalOpen(false)} onOk={() => pwForm.submit()} okText="변경">
        <Form form={pwForm} layout="vertical" onFinish={handleResetPw} style={{ marginTop: 16 }}>
          <Form.Item name="password" label="새 비밀번호" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── MOCVD 호기 관리 ─────────────────────────────────────
function MachineTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetch_ = async () => {
    setLoading(true)
    const res = await authFetch('/api/admin/machines')
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) { message.success('추가 완료'); setModalOpen(false); form.resetFields(); fetch_() }
    else { const e = await res.json(); message.error(e.detail) }
  }

  const handleToggle = async (id, is_active) => {
    await authFetch(`/api/admin/machines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    fetch_()
  }

  const handleDelete = async (id) => {
    await authFetch(`/api/admin/machines/${id}`, { method: 'DELETE' })
    message.success('삭제 완료')
    fetch_()
  }

  const columns = [
    { title: '호기 번호', dataIndex: 'machine_no', width: 100, render: (v) => `${v}호기` },
    { title: '설명', dataIndex: 'description', render: (v) => v || '-' },
    {
      title: '활성', dataIndex: 'is_active', width: 80,
      render: (v, row) => <Switch checked={v} size="small" onChange={(c) => handleToggle(row.id, c)} />,
    },
    {
      title: '관리', width: 80,
      render: (_, row) => (
        <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>호기 추가</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ pageSize: 20 }} size="middle" bordered />

      <Modal title="호기 추가" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="추가">
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input placeholder="선택사항" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── 소스 종류 관리 ───────────────────────────────────────
function SourceTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetch_ = async () => {
    setLoading(true)
    const res = await authFetch('/api/admin/sources')
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) { message.success('추가 완료'); setModalOpen(false); form.resetFields(); fetch_() }
    else { const e = await res.json(); message.error(e.detail) }
  }

  const handleToggle = async (id, is_active) => {
    await authFetch(`/api/admin/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    fetch_()
  }

  const handleDelete = async (id) => {
    await authFetch(`/api/admin/sources/${id}`, { method: 'DELETE' })
    message.success('삭제 완료')
    fetch_()
  }

  const columns = [
    { title: '소스명', dataIndex: 'name', width: 150, render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '순서', dataIndex: 'order_idx', width: 80 },
    {
      title: '활성', dataIndex: 'is_active', width: 80,
      render: (v, row) => <Switch checked={v} size="small" onChange={(c) => handleToggle(row.id, c)} />,
    },
    {
      title: '관리', width: 80,
      render: (_, row) => (
        <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>소스 추가</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} size="middle" bordered />

      <Modal title="소스 추가" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="추가">
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="소스명" rules={[{ required: true }]}>
            <Input placeholder="예: TMGa" />
          </Form.Item>
          <Form.Item name="order_idx" label="순서" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── 시스템 설정 ──────────────────────────────────────────
const SESSION_OPTIONS = [
  { value: 5, label: '5분' },
  { value: 10, label: '10분' },
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 240, label: '4시간' },
  { value: 480, label: '8시간' },
]

function SystemTab() {
  const [expireMin, setExpireMin] = useState(60)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    authFetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.session_expire_minutes) setExpireMin(Number(data.session_expire_minutes))
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_expire_minutes: expireMin }),
    })
    setSaving(false)
    if (res.ok) message.success('설정이 저장되었습니다. 다음 로그인부터 적용됩니다.')
    else message.error('저장 실패')
  }

  return (
    <Card loading={loading} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined /> 세션 만료 시간
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          로그인 후 설정한 시간이 지나면 자동으로 로그아웃됩니다.<br />
          변경 후 다음 로그인부터 적용됩니다.
        </Text>
      </div>
      <Radio.Group value={expireMin} onChange={e => setExpireMin(e.target.value)} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SESSION_OPTIONS.map(opt => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === 60 && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(기본값)</Text>}
            </Radio>
          ))}
        </div>
      </Radio.Group>
      <Button type="primary" loading={saving} onClick={save}>저장</Button>
    </Card>
  )
}

// ── 메인 관리자 페이지 ────────────────────────────────────
function Admin() {
  const tabs = [
    { key: 'users', label: '사용자 관리', children: <UserTab /> },
    { key: 'machines', label: 'MOCVD 호기 관리', children: <MachineTab /> },
    { key: 'sources', label: '소스 종류 관리', children: <SourceTab /> },
    { key: 'system', label: '시스템 설정', children: <SystemTab /> },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>관리자 설정</h2>
      <Tabs items={tabs} />
    </div>
  )
}

export default Admin
