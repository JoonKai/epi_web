import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Select, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

const GROUP_LEVEL_STYLE = {
  1: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.3)',  left: '#f59e0b' },
  2: { color: '#22d3ee', bg: 'rgba(34,211,238,0.07)',  border: 'rgba(34,211,238,0.28)', left: '#22d3ee' },
  3: { color: '#fb7185', bg: 'rgba(251,113,133,0.07)', border: 'rgba(251,113,133,0.28)', left: '#fb7185' },
}

export default function MachineGroupTab() {
  const [groups, setGroups] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [orderDirty, setOrderDirty] = useState(false)
  const [form] = Form.useForm()

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const moveGroup = (groupId, dir) => {
    const group = groups.find(g => g.id === groupId)
    const siblings = groups
      .filter(g => (g.parent_id ?? null) === (group.parent_id ?? null))
      .sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0))
    const idx = siblings.findIndex(g => g.id === groupId)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const swapId = siblings[swapIdx].id
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) return { ...g, order_idx: siblings[swapIdx].order_idx ?? swapIdx }
      if (g.id === swapId)  return { ...g, order_idx: siblings[idx].order_idx ?? idx }
      return g
    }))
    setOrderDirty(true)
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      const items = groups.map((g, i) => ({ id: g.id, order_idx: g.order_idx ?? i }))
      const res = await authFetch('/api/admin/machine-groups/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) { message.error('순서 저장 실패'); return }
      message.success('순서를 저장했습니다.')
      setOrderDirty(false)
    } finally { setSaving(false) }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [gRes, mRes] = await Promise.all([
        authFetch('/api/admin/machine-groups'),
        authFetch('/api/admin/machines'),
      ])
      if (gRes.ok) setGroups(await gRes.json())
      if (mRes.ok) setMachines(await mRes.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const activeMachines = useMemo(() =>
    machines.filter(m => m.is_active).sort((a, b) => a.machine_no - b.machine_no)
  , [machines])

  const machineOptions = useMemo(() =>
    activeMachines.map(m => ({ label: formatMachineLabel(m.machine_no), value: m.machine_no }))
  , [activeMachines])

  const machineGroupMap = useMemo(() => {
    const map = {}
    groups.forEach(g => g.machine_nos.forEach(no => { map[no] = g.name }))
    return map
  }, [groups])

  const getDescendantIds = (id) => {
    const children = groups.filter(g => g.parent_id === id)
    return children.flatMap(c => [c.id, ...getDescendantIds(c.id)])
  }

  const openCreate = () => {
    setEditingGroup(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (group) => {
    setEditingGroup(group)
    form.resetFields()
    form.setFieldsValue({
      name: group.name,
      description: group.description,
      parent_id: group.parent_id ?? null,
      machine_nos: group.machine_nos,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      const parentId = values.parent_id ?? null
      const parentGroup = parentId ? groups.find(g => g.id === parentId) : null
      const level = parentGroup ? (parentGroup.level ?? 1) + 1 : 1

      const url = editingGroup ? `/api/admin/machine-groups/${editingGroup.id}` : '/api/admin/machine-groups'
      const method = editingGroup ? 'PUT' : 'POST'
      const body = {
        name: values.name,
        description: values.description ?? '',
        machine_nos: values.machine_nos ?? [],
        parent_id: parentId,
        level,
      }
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { message.error(editingGroup ? '그룹 수정 실패' : '그룹 추가 실패'); return }
      message.success(editingGroup ? '수정했습니다.' : '그룹을 추가했습니다.')
      setModalOpen(false)
      fetchAll()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const res = await authFetch(`/api/admin/machine-groups/${id}`, { method: 'DELETE' })
    if (!res.ok) { message.error('삭제 실패했습니다.'); return }
    message.success('삭제했습니다.')
    fetchAll()
  }

  const parentOptions = useMemo(() => {
    const excluded = new Set(editingGroup ? [editingGroup.id, ...getDescendantIds(editingGroup.id)] : [])
    return groups
      .filter(g => !excluded.has(g.id) && (g.level ?? 1) < 3)
      .map(g => {
        const indent = '\u00A0\u00A0'.repeat((g.level ?? 1) - 1)
        return { label: `${indent}${g.name}`, value: g.id }
      })
  }, [groups, editingGroup])

  const renderGroup = (group, depth = 0) => {
    const st = GROUP_LEVEL_STYLE[group.level ?? 1] ?? GROUP_LEVEL_STYLE[1]
    const children = groups.filter(g => g.parent_id === group.id).sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0) || a.name.localeCompare(b.name, 'ko'))
    const isCollapsed = collapsed[group.id]
    const hasChildren = children.length > 0

    return (
      <div key={group.id} style={{ marginLeft: depth * 20, marginBottom: 5 }}>
        <div style={{
          background: st.bg,
          border: `1px solid ${st.border}`,
          borderLeft: `3px solid ${st.left}`,
          borderRadius: 7,
          padding: '9px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              onClick={() => hasChildren && toggleCollapse(group.id)}
              style={{
                fontSize: 10, color: st.color, minWidth: 14, textAlign: 'center',
                cursor: hasChildren ? 'pointer' : 'default',
                opacity: hasChildren ? 0.8 : 0,
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform 0.15s',
                display: 'inline-block',
              }}
            >
              ▶
            </span>
            <span
              onClick={() => hasChildren && toggleCollapse(group.id)}
              style={{ fontSize: 14, fontWeight: 700, color: st.color, flex: 1, cursor: hasChildren ? 'pointer' : 'default' }}
            >
              {group.name}
            </span>
            {group.description && (
              <span style={{ fontSize: 13, color: 'rgba(196,210,226,0.45)' }}>{group.description}</span>
            )}
            {group.machine_nos.length > 0 && (
              <span style={{ fontSize: 13, color: `${st.color}88` }}>{group.machine_nos.length}대</span>
            )}
            {hasChildren && (
              <span style={{ fontSize: 12, color: `${st.color}66`, background: `${st.color}14`, border: `1px solid ${st.border}`, borderRadius: 4, padding: '1px 6px' }}>
                {isCollapsed ? `+${children.length}` : `하위 ${children.length}개`}
              </span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span onClick={() => moveGroup(group.id, -1)} style={{ fontSize: 9, lineHeight: 1, cursor: 'pointer', color: `${st.color}77`, userSelect: 'none' }}>▲</span>
              <span onClick={() => moveGroup(group.id,  1)} style={{ fontSize: 9, lineHeight: 1, cursor: 'pointer', color: `${st.color}77`, userSelect: 'none' }}>▼</span>
            </div>
            <EditOutlined onClick={() => openEdit(group)} style={{ color: `${st.color}88`, fontSize: 14, cursor: 'pointer' }} />
            <Popconfirm title={`"${group.name}" 삭제?`} description={hasChildren ? '하위 그룹도 모두 삭제됩니다.' : undefined} onConfirm={() => handleDelete(group.id)} okText="삭제" cancelText="취소">
              <DeleteOutlined style={{ color: 'rgba(248,113,113,0.7)', fontSize: 14, cursor: 'pointer' }} />
            </Popconfirm>
          </div>
          {!isCollapsed && group.machine_nos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {group.machine_nos.map(no => (
                <span key={no} style={{
                  fontSize: 12, fontWeight: 700,
                  background: `${st.color}18`, border: `1px solid ${st.border}`,
                  borderRadius: 5, padding: '1px 8px', color: st.color,
                }}>
                  {formatMachineLabel(no)}
                </span>
              ))}
            </div>
          )}
        </div>
        {!isCollapsed && children.map(c => renderGroup(c, depth + 1))}
      </div>
    )
  }

  const rootGroups = groups.filter(g => !g.parent_id).sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0) || a.name.localeCompare(b.name, 'ko'))
  const unassigned = activeMachines.filter(m => !machineGroupMap[m.machine_no])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.6)' }}>전체 {groups.length}개 그룹</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {orderDirty && (
            <Button onClick={saveOrder} loading={saving} type="primary" icon={<SaveOutlined />}>
              순서 저장
            </Button>
          )}
          <Button onClick={openCreate} icon={<PlusOutlined />} style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)', color: '#f59e0b', fontWeight: 700 }}>
            그룹 추가
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(196,210,226,0.5)' }}>불러오는 중..</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(196,210,226,0.4)', fontSize: 14 }}>등록된 그룹이 없습니다.</div>
      ) : (
        <div>{rootGroups.map(g => renderGroup(g))}</div>
      )}

      {activeMachines.length > 0 && !loading && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(245,158,11,0.1)' }}>
          <div style={{ fontSize: 13, color: 'rgba(196,210,226,0.4)', marginBottom: 8 }}>
            미배정 설비 ({unassigned.length}대)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {unassigned.length === 0 ? (
              <span style={{ fontSize: 13, color: 'rgba(163,230,53,0.7)' }}>모든 설비가 그룹에 배정되었습니다.</span>
            ) : unassigned.map(m => (
              <span key={m.machine_no} style={{
                fontSize: 12, fontWeight: 600,
                background: 'rgba(196,210,226,0.05)', border: '1px solid rgba(196,210,226,0.14)',
                borderRadius: 5, padding: '2px 8px', color: 'rgba(196,210,226,0.45)',
              }}>
                {formatMachineLabel(m.machine_no)}
              </span>
            ))}
          </div>
        </div>
      )}

      <Modal
        title={editingGroup ? '그룹 수정' : '그룹 추가'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingGroup ? '수정' : '추가'}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="그룹명" rules={[{ required: true, message: '그룹명을 입력하세요.' }]}>
            <Input placeholder="예: C4 1 SET" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="설명 (선택)">
            <Input placeholder="그룹 설명" />
          </Form.Item>
          <Form.Item name="parent_id" label="상위 그룹 (선택)">
            <Select
              options={[{ label: '없음 (최상위)', value: null }, ...parentOptions]}
              placeholder="상위 그룹 선택"
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="machine_nos" label="포함 설비" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              options={machineOptions}
              placeholder="설비 선택"
              showSearch
              allowClear
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
