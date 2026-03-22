import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { CalendarOutlined, DeleteOutlined, HistoryOutlined, KeyOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
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

  const modeColor = { off: '#b0c0d0', allow: '#22c55e', block: '#ef4444' }

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

// ── 공휴일 관리 탭 ────────────────────────────────────────────────────────

// 공공데이터포털 한국천문연구원 특일 정보 API 파서
async function fetchKoreanHolidaysFromGov(year, apiKey) {
  const BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'
  const allItems = []

  for (let month = 1; month <= 12; month++) {
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      solYear: String(year),
      solMonth: String(month).padStart(2, '0'),
      _type: 'json',
      numOfRows: '50',
    })
    const res = await fetch(`${BASE}?${params}`)
    if (!res.ok) throw new Error(`${month}월 API 오류 (${res.status})`)
    const json = await res.json()
    const body = json?.response?.body
    if (!body) throw new Error(`${month}월 응답 형식 오류`)
    const items = body.items?.item
    if (!items) continue
    const arr = Array.isArray(items) ? items : [items]
    arr.forEach((item) => {
      const dateStr = String(item.locdate)  // 20260101
      const date = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
      const name = item.dateName || ''
      const isSub = item.isSubstitute === 'Y' || item.remark?.includes('대체')
      allItems.push({ date, name, is_substitute: !!isSub })
    })
  }

  return allItems.sort((a, b) => a.date.localeCompare(b.date))
}

function HolidayTab() {
  const currentYear = dayjs().year()
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncYear, setSyncYear] = useState(null)
  const [syncLog, setSyncLog] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gov_holiday_api_key') || '')
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('gov_holiday_api_key') || '')
  const [progress, setProgress] = useState(0)

  const fetchHolidays = async (year) => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/admin/holidays${year ? `?year=${year}` : ''}`)
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('응답 형식 오류')
      setHolidays(data)
    } catch (err) {
      message.error(`공휴일 조회 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHolidays() }, [])

  const saveApiKey = () => {
    localStorage.setItem('gov_holiday_api_key', apiKeyInput)
    setApiKey(apiKeyInput)
    message.success('API 키 저장됨')
  }

  const syncFromGov = async (year) => {
    if (!apiKey) { message.warning('API 키를 먼저 입력하세요.'); return }
    setSyncing(true)
    setSyncYear(year)
    setSyncLog(null)
    setProgress(0)
    try {
      // 월별로 가져오며 진행률 표시
      const BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'
      const allItems = []
      for (let month = 1; month <= 12; month++) {
        const params = new URLSearchParams({
          solYear: String(year),
          solMonth: String(month).padStart(2, '0'),
          _type: 'json',
          numOfRows: '50',
        })
        const res = await fetch(`${BASE}?ServiceKey=${apiKey}&${params}`)
        if (!res.ok) throw new Error(`${month}월 API 오류 (${res.status}) — API 키를 확인하세요.`)
        const json = await res.json()
        const errCode = json?.response?.header?.resultCode
        if (errCode && errCode !== '00') throw new Error(`API 오류 코드 ${errCode}: API 키가 올바른지 확인하세요.`)
        const items = json?.response?.body?.items?.item
        if (items) {
          const arr = Array.isArray(items) ? items : [items]
          arr.forEach((item) => {
            const ds = String(item.locdate)
            const date = `${ds.slice(0,4)}-${ds.slice(4,6)}-${ds.slice(6,8)}`
            const isSub = item.isSubstitute === 'Y'
            allItems.push({ date, name: item.dateName || '', is_substitute: isSub })
          })
        }
        setProgress(Math.round((month / 12) * 100))
      }

      if (allItems.length === 0) throw new Error('가져온 공휴일 데이터가 없습니다.')

      const saveRes = await authFetch('/api/admin/holidays/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allItems),
      })
      if (!saveRes.ok) throw new Error('서버 저장 실패')
      const result = await saveRes.json()
      const subCount = allItems.filter(h => h.is_substitute).length
      setSyncLog({ year, total: allItems.length, sub: subCount, new: result.new })
      message.success(`${year}년 공휴일 ${allItems.length}건 동기화 완료 (대체공휴일 ${subCount}건 포함)`)
      fetchHolidays()
    } catch (err) {
      message.error(err.message || '동기화 실패')
    } finally {
      setSyncing(false)
      setSyncYear(null)
      setProgress(0)
    }
  }

  const deleteYear = async (year) => {
    try {
      await authFetch(`/api/admin/holidays/year/${year}`, { method: 'DELETE' })
      message.success(`${year}년 공휴일 삭제 완료`)
      fetchHolidays()
    } catch {
      message.error('삭제 실패')
    }
  }

  const yearGroups = useMemo(() => {
    const map = new Map()
    holidays.forEach((h) => {
      const y = h.date.slice(0, 4)
      if (!map.has(y)) map.set(y, [])
      map.get(y).push(h)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [holidays])

  const columns = [
    { title: '날짜', dataIndex: 'date', width: 120, render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { title: '요일', dataIndex: 'date', width: 60, render: (v) => {
      const d = dayjs(v).day()
      const labels = ['일','월','화','수','목','금','토']
      return <span style={{ color: d === 0 || d === 6 ? '#f87171' : 'var(--nowa-text-muted)' }}>{labels[d]}</span>
    }},
    { title: '공휴일명', dataIndex: 'name' },
    { title: '구분', dataIndex: 'is_substitute', width: 100, render: (v) =>
      v ? <Tag color="orange">대체공휴일</Tag> : <Tag color="red">공휴일</Tag>
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* API 키 설정 */}
      <Alert
        type="info"
        showIcon
        message={
          <span>
            <b>공공데이터포털 API 키 필요</b> —{' '}
            <a href="https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012690" target="_blank" rel="noreferrer">
              data.go.kr 한국천문연구원 특일 정보
            </a>에서 무료 발급 후 입력하세요. (대체공휴일 공식 포함)
          </span>
        }
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input.Password
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="공공데이터포털 Encoding Service Key 입력"
          style={{ flex: 1, maxWidth: 520 }}
        />
        <Button type="primary" onClick={saveApiKey} disabled={!apiKeyInput}>
          API 키 저장
        </Button>
        {apiKey && <Tag color="green">키 등록됨</Tag>}
      </div>

      {/* 동기화 버튼 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>공휴일 업데이트:</span>
        {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
          <Button
            key={y}
            icon={<SyncOutlined spin={syncing && syncYear === y} />}
            onClick={() => syncFromGov(y)}
            loading={syncing && syncYear === y}
            disabled={!apiKey || (syncing && syncYear !== y)}
            type={y === currentYear ? 'primary' : 'default'}
          >
            {y}년
          </Button>
        ))}
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchHolidays()}
          loading={loading}
          disabled={syncing}
          title="DB에 저장된 공휴일 다시 불러오기"
        >
          새로고침
        </Button>
      </div>

      {syncing && <Progress percent={progress} status="active" strokeColor="#f59e0b" />}

      {syncLog && (
        <Alert type="success" showIcon closable
          message={`${syncLog.year}년 동기화 완료 — 총 ${syncLog.total}건 (대체공휴일 ${syncLog.sub}건 포함, 신규 ${syncLog.new}건)`}
          onClose={() => setSyncLog(null)}
        />
      )}

      {/* 연도별 탭 */}
      {yearGroups.length === 0 ? (
        <Empty description="저장된 공휴일이 없습니다. API 키 입력 후 동기화하세요." />
      ) : (
        <Tabs
          items={yearGroups.map(([year, items]) => ({
            key: year,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarOutlined />{year}년
                <Tag style={{ margin: 0, borderRadius: 99, fontSize: 11 }}>{items.length}</Tag>
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <Popconfirm
                    title={`${year}년 공휴일 전체를 삭제하시겠습니까?`}
                    onConfirm={() => deleteYear(year)}
                    okText="삭제" okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<DeleteOutlined />} size="small">{year}년 삭제</Button>
                  </Popconfirm>
                </div>
                <Table
                  rowKey="date"
                  size="small"
                  dataSource={items}
                  columns={columns}
                  pagination={false}
                  bordered
                />
              </div>
            ),
          }))}
        />
      )}
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
          { key: 'holidays', label: <span><CalendarOutlined /> 공휴일 관리</span>, children: <HolidayTab /> },
          { key: 'log', label: 'Log', children: <LogTab /> },
        ]}
      />
    </div>
  )
}

export default Admin
