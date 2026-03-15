import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
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
  const [form] = Form.useForm()

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
        body: JSON.stringify({
          name: row.name,
          contact_name: row.contact_name,
          contact_phone: row.contact_phone,
          note: row.note,
          is_active: checked,
        }),
      }))
      message.success('업체 사용 여부를 반영했습니다.')
      refreshAll()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: '업체명', dataIndex: 'name', width: 220 },
    { title: '담당자', dataIndex: 'contact_name', width: 120, render: (value) => value || '-' },
    { title: '연락처', dataIndex: 'contact_phone', width: 150, render: (value) => value || '-' },
    {
      title: '인원',
      width: 120,
      render: (_, row) => `${row.active_member_count}/${row.member_count}명`,
    },
    { title: '비고', dataIndex: 'note', render: (value) => value || '-' },
    {
      title: '사용',
      width: 90,
      render: (_, row) => <Switch size="small" checked={row.is_active} onChange={(checked) => handleToggle(row, checked)} />,
    },
    {
      title: '관리',
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>수정</Button>
          <Popconfirm title="업체와 소속 인원을 삭제합니다." onConfirm={() => handleDelete(row)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const vendorlessCount = members.filter((member) => !vendors.some((vendor) => vendor.id === member.vendor_id)).length

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>업체 추가</Button>
        </Space>
        <Space wrap>
          {vendorlessCount > 0 ? <Tag color="red">미매핑 인원 {vendorlessCount}명</Tag> : null}
          <Tag color="blue">총 {vendors.length}개 업체</Tag>
        </Space>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        pagination={{ pageSize: 10 }}
        columns={columns}
        dataSource={vendors}
      />

      <Modal
        title={editingRow ? '업체 수정' : '업체 추가'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="저장"
        confirmLoading={saving}
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

  const openCreate = () => {
    setEditingRow(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, vendor_id: vendors[0]?.id })
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

  const columns = [
    { title: '업체', dataIndex: 'vendor_name', width: 160 },
    { title: '이름', dataIndex: 'name', width: 100 },
    { title: '사번', dataIndex: 'employee_no', width: 110, render: (value) => value || '-' },
    { title: '부서', dataIndex: 'department', width: 120, render: (value) => value || '-' },
    { title: '직무', dataIndex: 'position', width: 120, render: (value) => value || '-' },
    { title: '연락처', dataIndex: 'phone', width: 140, render: (value) => value || '-' },
    { title: '근무조', dataIndex: 'shift', width: 100, render: (value) => value || '-' },
    { title: '교육만료일', dataIndex: 'training_due_date', width: 120, render: (value) => value || '-' },
    {
      title: '상태',
      width: 90,
      render: (_, row) => row.is_active ? <Tag color="green">사용</Tag> : <Tag color="default">비활성</Tag>,
    },
    {
      title: '사용',
      width: 90,
      render: (_, row) => <Switch size="small" checked={row.is_active} onChange={(checked) => handleToggle(row, checked)} />,
    },
    {
      title: '관리',
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>수정</Button>
          <Popconfirm title="인원을 삭제합니다." onConfirm={() => handleDelete(row)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Space wrap>
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
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={vendors.length === 0}>
          인원 추가
        </Button>
      </div>

      <Table
        rowKey="id"
        bordered
        size="middle"
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 12 }}
        columns={columns}
        dataSource={filteredMembers}
      />

      <Modal
        title={editingRow ? '인원 수정' : '인원 추가'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="저장"
        confirmLoading={saving}
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

export default PersonnelManagement
