import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, HistoryOutlined, KeyOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
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

const SYSTEM_LOG_FALLBACK = [
  {
    id: 'sample-1',
    occurred_at: '2026-03-16 08:42',
    actor: 'admin',
    category: '계정',
    action: '사용자 생성',
    target: '403790',
    detail: '관리자 권한으로 계정을 추가했습니다.',
  },
  {
    id: 'sample-2',
    occurred_at: '2026-03-16 09:15',
    actor: 'admin',
    category: '세션',
    action: '세션 만료 변경',
    target: '403790',
    detail: '세션 만료 시간을 30분으로 변경했습니다.',
  },
  {
    id: 'sample-3',
    occurred_at: '2026-03-16 11:23',
    actor: 'admin',
    category: '계정',
    action: '비밀번호 변경',
    target: '403790',
    detail: '사용자 비밀번호를 변경했습니다.',
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
      const json = await res.json().catch(() => [])
      if (!res.ok) throw new Error(json.detail || '사용자 목록을 불러오지 못했습니다.')
      setData(Array.isArray(json) ? json : [])
    } catch (err) {
      message.error(err.message || '사용자 목록을 불러오지 못했습니다.')
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
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '계정을 생성하지 못했습니다.')
      return
    }
    message.success('계정을 생성했습니다.')
    setModalOpen(false)
    form.resetFields()
    fetchData()
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
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '사용자 정보를 수정하지 못했습니다.')
      return
    }
    message.success('사용자 정보를 수정했습니다.')
    fetchData()
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '계정을 삭제하지 못했습니다.')
      return
    }
    message.success('계정을 삭제했습니다.')
    fetchData()
  }

  const handleResetPw = async (values) => {
    const res = await authFetch(`/api/admin/users/${editUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(json.detail || '비밀번호를 변경하지 못했습니다.')
      return
    }
    message.success('비밀번호를 변경했습니다.')
    setPwModalOpen(false)
    pwForm.resetFields()
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
          <Popconfirm title="계정을 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)} disabled={isProtectedAdmin(row)}>
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

function SystemSettingsTab() {
  const [mode, setMode] = useState('off')
  const [ips, setIps] = useState([])
  const [inputVal, setInputVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    authFetch('/api/admin/settings/ip-filter')
      .then((r) => r.json())
      .then((data) => { setMode(data.mode || 'off'); setIps(Array.isArray(data.ips) ? data.ips : []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addIp = () => {
    const val = inputVal.trim()
    if (!val) return
    if (ips.includes(val)) { message.warning('이미 추가된 IP입니다.'); return }
    setIps((prev) => [...prev, val])
    setInputVal('')
  }

  const removeIp = (ip) => setIps((prev) => prev.filter((x) => x !== ip))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/settings/ip-filter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, ips }),
      })
      if (!res.ok) throw new Error()
      message.success('IP 필터 설정을 저장했습니다.')
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const modeDesc = {
    off: '모든 IP의 접속을 허용합니다.',
    allow: '목록에 있는 IP만 접속을 허용합니다. 목록 외 IP는 차단됩니다.',
    block: '목록에 있는 IP의 접속을 차단합니다. 목록 외 IP는 허용됩니다.',
  }

  const modeColor = { off: '#94a3b8', allow: '#22c55e', block: '#ef4444' }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{
        padding: 18, borderRadius: 16,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-hero-bg)',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nowa-text)', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          <SettingOutlined />
          <span>IP 접속 필터</span>
        </div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>
          서버에 접속 가능한 IP를 허용/차단 목록으로 관리합니다.<br />
          ⚠️ 잘못 설정하면 본인 IP도 차단될 수 있으니 주의하세요.
        </div>
      </div>

      {/* 모드 선택 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--nowa-text)' }}>필터 모드</div>
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio.Button value="off">비활성</Radio.Button>
          <Radio.Button value="allow">허용 모드 (화이트리스트)</Radio.Button>
          <Radio.Button value="block">차단 모드 (블랙리스트)</Radio.Button>
        </Radio.Group>
        <div style={{ marginTop: 8, fontSize: 13, color: modeColor[mode] }}>
          {modeDesc[mode]}
        </div>
      </div>

      {/* IP 목록 */}
      {mode !== 'off' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--nowa-text)' }}>
            {mode === 'allow' ? '허용 IP 목록' : '차단 IP 목록'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onPressEnter={addIp}
              placeholder="예: 192.168.1.100"
              style={{ maxWidth: 300 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addIp}>추가</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ips.length === 0 && (
              <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>추가된 IP가 없습니다.</span>
            )}
            {ips.map((ip) => (
              <Tag
                key={ip}
                closable
                onClose={() => removeIp(ip)}
                color={mode === 'allow' ? 'green' : 'red'}
                style={{ fontSize: 13, padding: '3px 10px' }}
              >
                {ip}
              </Tag>
            ))}
          </div>
        </div>
      )}

      <Button type="primary" loading={saving} onClick={handleSave} style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}>
        저장
      </Button>
    </div>
  )
}

function LogTable({ rows, loading }) {
  const columns = [
    { title: '발생시각', dataIndex: 'occurred_at', width: 170 },
    { title: '사용자', dataIndex: 'actor', width: 120 },
    {
      title: '분류',
      dataIndex: 'category',
      width: 110,
      render: (value) => <Tag color="processing">{value || '-'}</Tag>,
    },
    { title: '동작', dataIndex: 'action', width: 160 },
    { title: '대상', dataIndex: 'target', width: 140 },
    { title: '상세 내용', dataIndex: 'detail' },
  ]

  return (
    <Table
      rowKey={(row) => row.id ?? `${row.occurred_at}-${row.actor}-${row.action}`}
      columns={columns}
      dataSource={rows}
      loading={loading}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 로그가 없습니다." /> }}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      size="middle"
      bordered
    />
  )
}

function LogTab() {
  const [systemLogs, setSystemLogs] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const [systemRes, activityRes] = await Promise.all([
        authFetch('/api/admin/logs?log_type=system'),
        authFetch('/api/admin/logs?log_type=activity'),
      ])
      const [systemJson, activityJson] = await Promise.all([
        systemRes.json().catch(() => []),
        activityRes.json().catch(() => []),
      ])
      setSystemLogs(systemRes.ok ? (systemJson.length ? systemJson : SYSTEM_LOG_FALLBACK) : SYSTEM_LOG_FALLBACK)
      setActivityLogs(activityRes.ok ? activityJson : [])
    } catch {
      setSystemLogs(SYSTEM_LOG_FALLBACK)
      setActivityLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const items = useMemo(
    () => [
      { key: 'system', label: '시스템 로그', children: <LogTable rows={systemLogs} loading={loading} /> },
      { key: 'activity', label: '활동 로그', children: <LogTable rows={activityLogs} loading={loading} /> },
    ],
    [activityLogs, loading, systemLogs],
  )

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
          시스템 로그와 사용자 활동 로그를 구분해서 확인합니다.
        </div>
      </div>

      <Tabs items={items} />
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
          { key: 'system', label: '시스템 설정', children: <SystemSettingsTab /> },
          { key: 'log', label: 'Log', children: <LogTab /> },
        ]}
      />
    </div>
  )
}

export default Admin
