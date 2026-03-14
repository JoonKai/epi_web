import { useEffect, useState } from 'react'
import { Tabs, Table, Button, Modal, Form, Input, Select, Switch, Tag, Popconfirm, message, Card, Radio, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, KeyOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { authFetch } from '../context/AuthContext'

const { Text } = Typography

function UserTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form] = Form.useForm()
  const [pwForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    const res = await authFetch('/api/admin/users')
    setData(await res.json())
    setLoading(false)
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
      message.success('생성 완료')
      setModalOpen(false)
      form.resetFields()
      fetchData()
      return
    }
    const err = await res.json()
    message.error(err.detail)
  }

  const handleUpdate = async (id, values) => {
    const res = await authFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('수정 완료')
      fetchData()
    }
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      message.success('삭제 완료')
      fetchData()
    }
  }

  const handleResetPw = async (values) => {
    const res = await authFetch(`/api/admin/users/${editUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password }),
    })
    if (res.ok) {
      message.success('비밀번호 변경 완료')
      setPwModalOpen(false)
      pwForm.resetFields()
    }
  }

  const columns = [
    { title: '아이디', dataIndex: 'username', width: 150 },
    {
      title: '권한',
      dataIndex: 'role',
      width: 100,
      render: (value) => <Tag color={value === 'admin' ? 'red' : 'blue'}>{value === 'admin' ? '관리자' : '일반'}</Tag>,
    },
    {
      title: '활성',
      dataIndex: 'is_active',
      width: 80,
      render: (value, row) => <Switch checked={value} size="small" onChange={(checked) => handleUpdate(row.id, { role: row.role, is_active: checked })} />,
    },
    { title: '생성일', dataIndex: 'created_at', width: 120 },
    {
      title: '권한 변경',
      width: 120,
      render: (_, row) => (
        <Select
          size="small"
          value={row.role}
          style={{ width: 90 }}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'user', label: '일반' },
          ]}
          onChange={(value) => handleUpdate(row.id, { role: value, is_active: row.is_active })}
        />
      ),
    },
    {
      title: '관리',
      width: 120,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" icon={<KeyOutlined />} onClick={() => { setEditUser(row); setPwModalOpen(true) }} />
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
          <Form.Item name="username" label="아이디" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="권한" initialValue="user">
            <Select options={[{ value: 'admin', label: '관리자' }, { value: 'user', label: '일반' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="비밀번호 변경" open={pwModalOpen} onCancel={() => setPwModalOpen(false)} onOk={() => pwForm.submit()} okText="변경">
        <Form form={pwForm} layout="vertical" onFinish={handleResetPw} style={{ marginTop: 16 }}>
          <Form.Item name="password" label="새 비밀번호" rules={[{ required: true }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

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
      .then((res) => res.json())
      .then((json) => {
        if (json.session_expire_minutes) setExpireMin(Number(json.session_expire_minutes))
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
    if (res.ok) {
      message.success('설정이 저장되었습니다. 다음 로그인부터 적용됩니다.')
    } else {
      message.error('저장 실패')
    }
  }

  return (
    <Card loading={loading} style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined /> 세션 만료 시간
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          로그인 후 설정된 시간이 지나면 자동으로 로그아웃됩니다.
          <br />
          변경값은 다음 로그인부터 적용됩니다.
        </Text>
      </div>

      <Radio.Group value={expireMin} onChange={(event) => setExpireMin(event.target.value)} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SESSION_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label}
              {option.value === 60 && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(기본값)</Text>}
            </Radio>
          ))}
        </div>
      </Radio.Group>

      <Button type="primary" loading={saving} onClick={save}>저장</Button>
    </Card>
  )
}

function Admin() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>관리자 설정</h2>
      <Tabs
        items={[
          { key: 'users', label: '사용자 관리', children: <UserTab /> },
          { key: 'system', label: '시스템 설정', children: <SystemTab /> },
        ]}
      />
    </div>
  )
}

export default Admin
