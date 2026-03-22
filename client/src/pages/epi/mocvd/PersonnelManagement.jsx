import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Tabs,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

async function readJson(res) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.detail || '요청 처리 중 오류가 발생했습니다.')
  }
  return json
}

function SummaryCard({ title, value, suffix, tone }) {
  return (
    <Card className="nowa-card" styles={{ body: { padding: 18 } }} style={panelStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: tone, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{value}</span>
        {suffix ? <span style={{ color: 'var(--nowa-text-soft)', fontSize: 15, fontWeight: 700 }}>{suffix}</span> : null}
      </div>
    </Card>
  )
}

function VendorTab({ vendors, members, refreshAll }) {
  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    if (!kw) return vendors
    return vendors.filter(v =>
      [v.name, v.contact_name, v.contact_phone, v.note].filter(Boolean).some(s => s.toLowerCase().includes(kw))
    )
  }, [vendors, search])

  const openCreate = () => {
    setEditingRow(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue(row)
    setOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      const url = editingRow ? `/api/admin/personnel/vendors/${editingRow.id}` : '/api/admin/personnel/vendors'
      const method = editingRow ? 'PUT' : 'POST'
      await readJson(await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }))
      message.success(editingRow ? '업체 정보를 수정했습니다.' : '업체를 등록했습니다.')
      setOpen(false)
      form.resetFields()
      refreshAll()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await readJson(await authFetch(`/api/admin/personnel/vendors/${row.id}`, { method: 'DELETE' }))
      message.success('업체를 삭제했습니다.')
      refreshAll()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleToggle = async (row, checked) => {
    try {
      await readJson(await authFetch(`/api/admin/personnel/vendors/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: row.name, contact_name: row.contact_name, contact_phone: row.contact_phone, note: row.note, is_active: checked }),
      }))
      message.success('업체 사용 여부를 반영했습니다.')
      refreshAll()
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <>
      {/* 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Input allowClear value={search} onChange={e => setSearch(e.target.value)}
            placeholder="업체명/담당자 검색" style={{ width: 220 }} />
          <span style={{ fontSize: 13, color: 'var(--nowa-text-muted)' }}>{filtered.length}개 업체</span>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)',
            borderRadius: 8, padding: '5px 14px', cursor: 'pointer',
            color: 'rgba(245,158,11,0.85)', fontSize: 13, fontWeight: 700,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(245,158,11,0.85)' }}
        >
          <PlusOutlined /> 업체 추가
        </button>
      </div>

      {/* 업체 카드 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {filtered.length === 0 && (
          <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.35)', padding: '8px 4px' }}>등록된 업체가 없습니다.</span>
        )}
        {filtered.map(v => {
          const memberCount = members.filter(m => m.vendor_id === v.id).length
          const activeMemberCount = members.filter(m => m.vendor_id === v.id && m.is_active).length
          return (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center',
              background: '#212535', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, minWidth: 240, overflow: 'hidden',
              borderLeft: `3px solid ${v.is_active ? '#f59e0b' : '#475569'}`,
              opacity: v.is_active ? 1 : 0.55,
            }}>
              {/* 아바타 */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#343850',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, margin: '12px 12px 12px 10px',
                border: '1.5px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{v.name?.[0] || '?'}</span>
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{v.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {v.contact_name && (
                    <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.6)' }}>{v.contact_name}</span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    background: 'rgba(125,211,252,0.12)', color: '#7dd3fc',
                    border: '1px solid rgba(125,211,252,0.2)',
                  }}>
                    {activeMemberCount}/{memberCount}명
                  </span>
                </div>
              </div>

              {/* 액션 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, paddingRight: 12, alignItems: 'center' }}>
                <Switch size="small" checked={v.is_active} onChange={checked => handleToggle(v, checked)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <EditOutlined onClick={() => openEdit(v)} style={{ color: 'rgba(245,158,11,0.7)', fontSize: 13, cursor: 'pointer' }} />
                  <Popconfirm title="업체와 소속 인원을 삭제합니다." onConfirm={() => handleDelete(v)}>
                    <DeleteOutlined style={{ color: '#f87171', fontSize: 13, cursor: 'pointer', opacity: 0.8 }} />
                  </Popconfirm>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        title={editingRow ? '업체 수정' : '업체 추가'}
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)}>취소</Button>,
          <Button key="save" type="primary" loading={saving} onClick={() => form.submit()}>저장</Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true }} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="업체명" rules={[{ required: true, message: '업체명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_name" label="담당자">
            <Input />
          </Form.Item>
          <Form.Item name="contact_phone" label="연락처">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="비고">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function MemberTab({ vendors, members, refreshAll }) {
  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [vendorFilter, setVendorFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  const vendorOptions = vendors.map((vendor) => ({ label: vendor.name, value: vendor.id }))

  const filteredMembers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return members.filter((member) => {
      if (vendorFilter !== 'all' && member.vendor_id !== vendorFilter) return false
      if (!keyword) return true
      return [member.name, member.employee_no, member.position, member.department, member.vendor_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
  }, [members, searchText, vendorFilter])

  const openCreate = (vendorId = null) => {
    setEditingRow(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, vendor_id: vendorId ?? vendors[0]?.id })
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue(row)
    setOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      const url = editingRow ? `/api/admin/personnel/members/${editingRow.id}` : '/api/admin/personnel/members'
      const method = editingRow ? 'PUT' : 'POST'
      await readJson(await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }))
      message.success(editingRow ? '인원 정보를 수정했습니다.' : '인원을 등록했습니다.')
      setOpen(false)
      form.resetFields()
      refreshAll()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await readJson(await authFetch(`/api/admin/personnel/members/${row.id}`, { method: 'DELETE' }))
      message.success('인원을 삭제했습니다.')
      refreshAll()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleToggle = async (row, checked) => {
    try {
      await readJson(await authFetch(`/api/admin/personnel/members/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: row.vendor_id,
          employee_no: row.employee_no,
          name: row.name,
          department: row.department,
          position: row.position,
          phone: row.phone,
          shift: row.shift,
          training_due_date: row.training_due_date,
          note: row.note,
          is_active: checked,
        }),
      }))
      message.success('인원 사용 여부를 반영했습니다.')
      refreshAll()
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          value={vendorFilter}
          onChange={setVendorFilter}
          options={[{ label: '전체 업체', value: 'all' }, ...vendorOptions]}
          style={{ width: 180 }}
        />
        <Input
          allowClear
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="이름/사번/업체 검색"
          style={{ width: 220 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {vendors.filter((v) => {
          if (vendorFilter !== 'all' && v.id !== vendorFilter) return false
          return true
        }).map((vendor) => {
          const groupMembers = filteredMembers.filter((m) => m.vendor_id === vendor.id)
          return (
            <div key={vendor.id}>
              {/* 업체 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10, paddingBottom: 6,
                borderBottom: '1px solid rgba(245,158,11,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: vendor.is_active ? '#f59e0b' : '#475569', flexShrink: 0,
                    display: 'inline-block',
                  }} />
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#f59e0b' }}>{vendor.name}</span>
                  <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.5)' }}>{groupMembers.length}명</span>
                </div>
                <button
                  onClick={() => openCreate(vendor.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)',
                    borderRadius: 8, padding: '3px 12px', cursor: 'pointer',
                    color: 'rgba(245,158,11,0.7)', fontSize: 13, fontWeight: 700,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(245,158,11,0.7)' }}
                >
                  + 인원 추가
                </button>
              </div>

              {/* 멤버 카드 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {groupMembers.length === 0 && (
                  <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.35)', padding: '8px 4px' }}>등록된 인원이 없습니다.</span>
                )}
                {groupMembers.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: '#212535',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16, minWidth: 220, overflow: 'hidden',
                      borderLeft: `3px solid ${m.is_active ? '#f59e0b' : '#475569'}`,
                      opacity: m.is_active ? 1 : 0.55,
                    }}
                  >
                    {/* 아바타 */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: '#343850',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, margin: '12px 12px 12px 10px',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{m.name?.[0] || '?'}</span>
                    </div>

                    {/* 정보 */}
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{m.name}</span>
                      {(m.position || m.shift) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          {m.position && <Tag style={{ margin: 0, fontSize: 11 }}>{m.position}</Tag>}
                          {m.shift && <span style={{ fontSize: 12, color: 'rgba(196,210,226,0.5)' }}>{m.shift}조</span>}
                        </div>
                      )}
                    </div>

                    {/* 액션 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, paddingRight: 12, alignItems: 'center' }}>
                      <Switch size="small" checked={m.is_active} onChange={(checked) => handleToggle(m, checked)} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <EditOutlined onClick={() => openEdit(m)} style={{ color: 'rgba(245,158,11,0.7)', fontSize: 13, cursor: 'pointer' }} />
                        <Popconfirm title="인원을 삭제합니다." onConfirm={() => handleDelete(m)}>
                          <DeleteOutlined style={{ color: '#f87171', fontSize: 13, cursor: 'pointer', opacity: 0.8 }} />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        title={editingRow ? '인원 수정' : '인원 추가'}
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)}>취소</Button>,
          <Button key="save" type="primary" loading={saving} onClick={() => form.submit()}>저장</Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true }} style={{ marginTop: 16 }}>
          <Form.Item name="vendor_id" label="소속 업체" rules={[{ required: true, message: '업체를 선택하세요.' }]}>
            <Select options={vendorOptions} />
          </Form.Item>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="employee_no" label="사번">
            <Input />
          </Form.Item>
          <Form.Item name="department" label="부서">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="직무">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="연락처">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="비고">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_active" label="사용" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function PersonnelManagement() {
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState([])
  const [members, setMembers] = useState([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [vendorJson, memberJson] = await Promise.all([
        readJson(await authFetch('/api/admin/personnel/vendors')),
        readJson(await authFetch('/api/admin/personnel/members')),
      ])
      setVendors(vendorJson)
      setMembers(memberJson)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const stats = useMemo(() => {
    const activeVendors = vendors.filter((vendor) => vendor.is_active).length
    const activeMembers = members.filter((member) => member.is_active).length
    return {
      totalVendors: vendors.length,
      activeVendors,
      totalMembers: members.length,
      activeMembers,
    }
  }, [vendors, members])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card className="nowa-card" loading={loading} styles={{ body: { padding: 22 } }} style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={sectionTitleStyle}>Personnel Control</div>
            <div style={{ marginTop: 8, color: 'var(--nowa-text)', fontSize: 34, fontWeight: 900, lineHeight: 1.1 }}>
              업체별 인원 관리
            </div>
            <div style={{ marginTop: 10, color: 'var(--nowa-text-soft)', fontSize: 15 }}>
              협력업체와 소속 인원을 분리해서 등록하고, 사용 여부와 교육 만료일을 함께 관리합니다.
            </div>
          </div>
          <Button icon={<TeamOutlined />} onClick={fetchAll}>새로고침</Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <SummaryCard title="등록 업체" value={stats.totalVendors} suffix="개" tone="#60a5fa" />
        <SummaryCard title="사용 업체" value={stats.activeVendors} suffix="개" tone="#22c55e" />
        <SummaryCard title="등록 인원" value={stats.totalMembers} suffix="명" tone="#f59e0b" />
        <SummaryCard title="사용 인원" value={stats.activeMembers} suffix="명" tone="#a78bfa" />
      </div>

      <Card className="nowa-card" loading={loading} styles={{ body: { padding: 18 } }} style={panelStyle}>
        <Tabs
          defaultActiveKey="vendors"
          items={[
            {
              key: 'vendors',
              label: '업체 관리',
              children: <VendorTab vendors={vendors} members={members} refreshAll={fetchAll} />,
            },
            {
              key: 'members',
              label: '인원 관리',
              children: <MemberTab vendors={vendors} members={members} refreshAll={fetchAll} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

export { VendorTab, MemberTab }
export default PersonnelManagement
