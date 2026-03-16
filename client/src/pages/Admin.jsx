import { useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import {
  DeleteOutlined,
  HistoryOutlined,
  KeyOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'

const SESSION_OPTIONS = [
  { value: null, label: '기본값(1시간)' },
  { value: 5, label: '5분' },
  { value: 10, label: '10분' },
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 240, label: '4시간' },
  { value: 480, label: '8시간' },
]

const LOG_ROWS = [
  {
    key: 1,
    occurred_at: '2026-03-16 08:42',
    actor: 'admin',
    category: '계정',
    action: '사용자 생성',
    target: '403790',
    detail: '관리자 권한으로 계정을 추가했습니다.',
  },
  {
    key: 2,
    occurred_at: '2026-03-16 09:15',
    actor: 'admin',
    category: '권한',
    action: '세션 만료 변경',
    target: '403790',
    detail: '세션 만료 시간을 30분으로 변경했습니다.',
  },
  {
    key: 3,
    occurred_at: '2026-03-16 10:05',
    actor: 'admin',
    category: '접속',
    action: '로그인',
    target: 'admin',
    detail: '관리자 계정으로 로그인했습니다.',
  },
  {
    key: 4,
    occurred_at: '2026-03-16 11:23',
    actor: 'admin',
    category: '계정',
    action: '비밀번호 변경',
    target: '403790',
    detail: '사용자 비밀번호를 초기화했습니다.',
  },
]

function UserTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form] = Form.useForm()
  const [pwForm] = Form.useForm()

  const isProtectedAdmin = (row) => row.username === 'admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/users')
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (values) => {
    const res = await authFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('계정을 생성했습니다.')
      setModalOpen(false)
      form.resetFields()
      fetchData()
      return
    }
    const err = await res.json().catch(() => ({}))
    message.error(err.detail || '계정을 생성하지 못했습니다.')
  }

  const handleUpdate = async (id, values) => {
    const row = data.find((item) => item.id === id) ?? {}
    const body = {
      role: row.role,
      is_active: row.is_active,
      session_expire_minutes: row.session_expire_minutes ?? null,
      ...values,
    }
    const res = await authFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      message.success('사용자 정보를 수정했습니다.')
      fetchData()
      return
    }
    const err = await res.json().catch(() => ({}))
    message.error(err.detail || '사용자 정보를 수정하지 못했습니다.')
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      message.success('계정을 삭제했습니다.')
      fetchData()
      return
    }
    const err = await res.json().catch(() => ({}))
    message.error(err.detail || '계정을 삭제하지 못했습니다.')
  }

  const handleResetPw = async (values) => {
    const res = await authFetch(`/api/admin/users/${editUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password }),
    })
    if (res.ok) {
      message.success('비밀번호를 변경했습니다.')
      setPwModalOpen(false)
      pwForm.resetFields()
      return
    }
    const err = await res.json().catch(() => ({}))
    message.error(err.detail || '비밀번호를 변경하지 못했습니다.')
  }

  const columns = [
    { title: '아이디', dataIndex: 'username', width: 220 },
    {
      title: '권한',
      dataIndex: 'role',
      width: 140,
      render: (value) => <Tag color={value === 'admin' ? 'red' : 'blue'}>{value === 'admin' ? '관리자' : '일반'}</Tag>,
    },
    {
      title: '활성',
      dataIndex: 'is_active',
      width: 120,
      render: (value, row) => (
        <Switch
          checked={value}
          size="small"
          disabled={isProtectedAdmin(row)}
          onChange={(checked) => handleUpdate(row.id, { role: row.role, is_active: checked })}
        />
      ),
    },
    { title: '생성일', dataIndex: 'created_at', width: 140 },
    {
      title: '권한 변경',
      width: 150,
      render: (_, row) => (
        <Select
          size="small"
          value={row.role}
          style={{ width: 110 }}
          disabled={isProtectedAdmin(row)}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'user', label: '일반' },
          ]}
          onChange={(value) => handleUpdate(row.id, { role: value })}
        />
      ),
    },
    {
      title: '세션 만료',
      width: 150,
      render: (_, row) => (
        <Select
          size="small"
          value={row.session_expire_minutes ?? null}
          style={{ width: 110 }}
          disabled={isProtectedAdmin(row)}
          options={SESSION_OPTIONS}
          onChange={(value) => handleUpdate(row.id, { session_expire_minutes: value })}
        />
      ),
    },
    {
      title: '관리',
      width: 120,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="small"
            icon={<KeyOutlined />}
            disabled={isProtectedAdmin(row)}
            onClick={() => {
              setEditUser(row)
              setPwModalOpen(true)
            }}
          />
          <Popconfirm
            title="계정을 삭제하시겠습니까?"
            onConfirm={() => handleDelete(row.id)}
            disabled={isProtectedAdmin(row)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={isProtectedAdmin(row)} />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          계정 추가
        </Button>
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

      <Modal
        title="비밀번호 변경"
        open={pwModalOpen}
        onCancel={() => setPwModalOpen(false)}
        onOk={() => pwForm.submit()}
        okText="변경"
      >
        <Form form={pwForm} layout="vertical" onFinish={handleResetPw} style={{ marginTop: 16 }}>
          <Form.Item name="password" label="새 비밀번호" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function LogTab() {
  const columns = [
    { title: '발생시각', dataIndex: 'occurred_at', width: 170 },
    { title: '사용자', dataIndex: 'actor', width: 120 },
    {
      title: '분류',
      dataIndex: 'category',
      width: 110,
      render: (value) => <Tag color="processing">{value}</Tag>,
    },
    { title: '동작', dataIndex: 'action', width: 160 },
    { title: '대상', dataIndex: 'target', width: 140 },
    { title: '상세 내용', dataIndex: 'detail' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          border: '1px solid var(--nowa-border)',
          background: 'var(--nowa-hero-bg)',
          boxShadow: 'var(--nowa-shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nowa-text)', fontWeight: 800, fontSize: 16 }}>
          <HistoryOutlined />
          <span>관리자 Log</span>
        </div>
        <div style={{ marginTop: 6, color: 'var(--nowa-text-muted)', fontSize: 13 }}>
          계정 생성, 권한 변경, 세션 설정, 비밀번호 초기화 같은 관리자 작업 이력을 확인합니다.
        </div>
      </div>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={LOG_ROWS}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="middle"
        bordered
      />
    </div>
  )
}

function Admin() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>관리자 설정</h2>
      <Tabs
        items={[
          { key: 'users', label: '사용자 관리', children: <UserTab /> },
          { key: 'log', label: 'Log', children: <LogTab /> },
        ]}
      />
    </div>
  )
}

export default Admin
