import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

const LEVEL_COLOR = { 1: '#f59e0b', 2: '#38bdf8', 3: '#a78bfa' }

// ── 머신 칩 (외부 컴포넌트) ──────────────────────────────
function MachineChip({ machine, labelFormatter, onEdit, onDelete }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: machine.is_active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${machine.is_active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 6, padding: '3px 8px 3px 5px',
      opacity: machine.is_active ? 1 : 0.45,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        background: machine.is_active ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: machine.is_active ? '#fbbf24' : '#64748b',
      }}>
        {machine.machine_no}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: machine.is_active ? 'rgba(226,232,240,0.85)' : '#475569', whiteSpace: 'nowrap' }}>
        {labelFormatter(machine.machine_no)}
      </span>
      <EditOutlined onClick={() => onEdit(machine)} style={{ fontSize: 14, color: 'rgba(196,210,226,0.3)', cursor: 'pointer', marginLeft: 2 }} />
      <Popconfirm title={`${labelFormatter(machine.machine_no)} 삭제?`} onConfirm={() => onDelete(machine)} okText="삭제" cancelText="취소">
        <DeleteOutlined style={{ fontSize: 14, color: 'rgba(248,113,113,0.3)', cursor: 'pointer' }} />
      </Popconfirm>
    </div>
  )
}

// ── 그룹 카드 (재귀 외부 컴포넌트) ──────────────────────
function GroupCard({ group, allGroups, allMachines, labelFormatter, collapsed, setCollapsed, onEditGroup, onDeleteGroup, onEditMachine, onDeleteMachine, depth = 0 }) {
  const lc = LEVEL_COLOR[group.level ?? 1] ?? LEVEL_COLOR[1]
  const isCollapsed = collapsed[group.id]

  const children = useMemo(() =>
    allGroups
      .filter(g => g.parent_id === group.id)
      .sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0) || a.name.localeCompare(b.name, 'ko'))
  , [allGroups, group.id])

  const groupMachines = useMemo(() =>
    allMachines.filter(m => group.machine_nos.includes(m.machine_no))
  , [allMachines, group.machine_nos])

  const totalCount = useMemo(() => {
    const countDescendants = (gid) => {
      const subs = allGroups.filter(g => g.parent_id === gid)
      return allGroups.find(g => g.id === gid)?.machine_nos.length ?? 0 + subs.reduce((s, c) => s + countDescendants(c.id), 0)
    }
    return groupMachines.length + children.reduce((s, c) => s + (c.machine_nos.length + allGroups.filter(g => g.parent_id === c.id).reduce((ss, sc) => ss + sc.machine_nos.length, 0)), 0)
  }, [groupMachines, children, allGroups])

  const hasContent = groupMachines.length > 0 || children.length > 0

  const isRoot = depth === 0
  const isMid = depth === 1

  return (
    <div style={{
      background: isRoot ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.015)',
      border: `1px solid ${isRoot ? `${lc}25` : 'rgba(255,255,255,0.06)'}`,
      borderTop: `2px solid ${lc}${isRoot ? '55' : '44'}`,
      borderRadius: isRoot ? 10 : 7,
      overflow: 'hidden',
      ...(isMid ? { flex: '1 1 220px', minWidth: 220 } : {}),
    }}>
      {/* 헤더 */}
      <div
        onClick={() => hasContent && setCollapsed(p => ({ ...p, [group.id]: !p[group.id] }))}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isRoot ? '10px 14px' : '7px 10px',
          background: `${lc}${isRoot ? '09' : '07'}`,
          borderBottom: (!isCollapsed && hasContent) ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: hasContent ? 'pointer' : 'default',
        }}
      >
        {hasContent && (
          <span style={{
            fontSize: 8, color: lc, opacity: 0.65,
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            transition: 'transform 0.15s', display: 'inline-block', flexShrink: 0,
          }}>▶</span>
        )}
        <span style={{ fontSize: isRoot ? 14 : 12, fontWeight: 700, color: lc, flex: 1, letterSpacing: isRoot ? 0.3 : 0 }}>
          {group.name}
        </span>
        {group.description && (
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.3)' }}>{group.description}</span>
        )}
        <span style={{
          fontSize: 14, color: `${lc}99`, background: `${lc}18`,
          border: `1px solid ${lc}28`, borderRadius: 4, padding: '1px 7px', fontWeight: 600,
        }}>
          {totalCount}대
        </span>
        <EditOutlined
          onClick={e => { e.stopPropagation(); onEditGroup(group) }}
          style={{ fontSize: isRoot ? 13 : 11, color: 'rgba(196,210,226,0.3)', cursor: 'pointer' }}
        />
        <Popconfirm
          title={`"${group.name}" 삭제?`}
          description={children.length > 0 ? '하위 그룹도 삭제됩니다.' : undefined}
          onConfirm={() => onDeleteGroup(group.id)}
          okText="삭제" cancelText="취소"
        >
          <DeleteOutlined
            onClick={e => e.stopPropagation()}
            style={{ fontSize: isRoot ? 13 : 11, color: 'rgba(248,113,113,0.3)', cursor: 'pointer' }}
          />
        </Popconfirm>
      </div>

      {/* 내용 */}
      {!isCollapsed && hasContent && (
        <div style={{
          padding: isRoot ? '10px 12px' : '6px 8px',
          display: 'flex',
          flexDirection: isRoot ? 'column' : 'row',
          flexWrap: isRoot ? undefined : 'wrap',
          gap: isRoot ? 6 : 5,
        }}>
          {/* 직접 배정 머신 */}
          {groupMachines.map(m => (
            <MachineChip
              key={m.machine_no}
              machine={m}
              labelFormatter={labelFormatter}
              onEdit={onEditMachine}
              onDelete={onDeleteMachine}
            />
          ))}
          {/* 하위 그룹 */}
          {children.map(c => (
            <GroupCard
              key={c.id}
              group={c}
              allGroups={allGroups}
              allMachines={allMachines}
              labelFormatter={labelFormatter}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              onEditMachine={onEditMachine}
              onDeleteMachine={onDeleteMachine}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────
export default function MachineGroupManager({ labelFormatter = formatMachineLabel }) {
  const [machines, setMachines] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState({})

  const [machineModal, setMachineModal] = useState(false)
  const [editingMachine, setEditingMachine] = useState(null)
  const [machineForm] = Form.useForm()

  const [groupModal, setGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupForm] = Form.useForm()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [mRes, gRes] = await Promise.all([
        authFetch('/api/admin/machines'),
        authFetch('/api/admin/machine-groups'),
      ])
      if (mRes.ok) setMachines(await mRes.json())
      if (gRes.ok) setGroups(await gRes.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const machineGroupMap = useMemo(() => {
    const map = {}
    groups.forEach(g => g.machine_nos.forEach(no => { map[no] = g.id }))
    return map
  }, [groups])

  const allMachines = useMemo(() => [...machines].sort((a, b) => a.machine_no - b.machine_no), [machines])

  // ── 머신 저장 ──────────────────────────────────────────
  const openCreateMachine = () => { setEditingMachine(null); machineForm.resetFields(); setMachineModal(true) }
  const openEditMachine = (m) => {
    setEditingMachine(m)
    machineForm.setFieldsValue({ machine_no: m.machine_no, description: m.description, is_active: m.is_active, group_id: machineGroupMap[m.machine_no] ?? null })
    setMachineModal(true)
  }

  const handleSaveMachine = async (values) => {
    setSaving(true)
    try {
      const { group_id, ...data } = values
      const url = editingMachine ? `/api/admin/machines/${editingMachine.id}` : '/api/admin/machines'
      const res = await authFetch(url, {
        method: editingMachine ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, is_active: data.is_active ?? true }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); message.error(e.detail || '저장 실패'); return }

      const no = editingMachine?.machine_no ?? values.machine_no
      const oldId = machineGroupMap[no] ?? null
      const newId = group_id ?? null
      if (oldId !== newId) {
        if (oldId) {
          const og = groups.find(g => g.id === oldId)
          if (og) await authFetch(`/api/admin/machine-groups/${oldId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...og, machine_nos: og.machine_nos.filter(n => n !== no) }) })
        }
        if (newId) {
          const ng = groups.find(g => g.id === newId)
          if (ng && !ng.machine_nos.includes(no)) await authFetch(`/api/admin/machine-groups/${newId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ng, machine_nos: [...ng.machine_nos, no] }) })
        }
      }
      message.success(editingMachine ? '수정했습니다.' : '호기를 추가했습니다.')
      setMachineModal(false)
      fetchAll()
    } finally { setSaving(false) }
  }

  const handleDeleteMachine = async (m) => {
    if (!(await authFetch(`/api/admin/machines/${m.id}`, { method: 'DELETE' })).ok) { message.error('삭제 실패'); return }
    message.success('삭제했습니다.')
    fetchAll()
  }

  // ── 그룹 저장 ──────────────────────────────────────────
  const openCreateGroup = () => { setEditingGroup(null); groupForm.resetFields(); setGroupModal(true) }
  const openEditGroup = (g) => {
    setEditingGroup(g)
    groupForm.setFieldsValue({ name: g.name, description: g.description, parent_id: g.parent_id ?? null })
    setGroupModal(true)
  }

  const getDescendantIds = (id) => {
    const ch = groups.filter(g => g.parent_id === id)
    return ch.flatMap(c => [c.id, ...getDescendantIds(c.id)])
  }

  const parentOptions = useMemo(() => {
    const ex = new Set(editingGroup ? [editingGroup.id, ...getDescendantIds(editingGroup.id)] : [])
    return groups.filter(g => !ex.has(g.id) && (g.level ?? 1) < 3)
      .map(g => ({ label: '\u00A0\u00A0'.repeat((g.level ?? 1) - 1) + g.name, value: g.id }))
  }, [groups, editingGroup])

  const handleSaveGroup = async (values) => {
    setSaving(true)
    try {
      const parentId = values.parent_id ?? null
      const pg = parentId ? groups.find(g => g.id === parentId) : null
      const level = pg ? (pg.level ?? 1) + 1 : 1
      const url = editingGroup ? `/api/admin/machine-groups/${editingGroup.id}` : '/api/admin/machine-groups'
      const res = await authFetch(url, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, description: values.description ?? '', machine_nos: editingGroup?.machine_nos ?? [], parent_id: parentId, level }),
      })
      if (!res.ok) { message.error('저장 실패'); return }
      message.success(editingGroup ? '수정했습니다.' : '그룹을 추가했습니다.')
      setGroupModal(false)
      fetchAll()
    } finally { setSaving(false) }
  }

  const handleDeleteGroup = async (id) => {
    if (!(await authFetch(`/api/admin/machine-groups/${id}`, { method: 'DELETE' })).ok) { message.error('삭제 실패'); return }
    message.success('삭제했습니다.')
    fetchAll()
  }

  const rootGroups = useMemo(() =>
    groups.filter(g => !g.parent_id)
      .sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0) || a.name.localeCompare(b.name, 'ko'))
  , [groups])

  const unassigned = useMemo(() => allMachines.filter(m => m.is_active && !machineGroupMap[m.machine_no]), [allMachines, machineGroupMap])
  const inactive = useMemo(() => allMachines.filter(m => !m.is_active), [allMachines])

  const groupSelectOptions = useMemo(() =>
    groups.filter(g => !groups.some(c => c.parent_id === g.id))
      .map(g => ({ label: g.name, value: g.id }))
  , [groups])

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(196,210,226,0.4)' }}>불러오는 중..</div>

  return (
    <>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreateMachine}
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px dashed rgba(245,158,11,0.35)', color: '#f59e0b', fontWeight: 600 }}>
          호기 추가
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreateGroup}
          style={{ background: 'rgba(56,189,248,0.07)', border: '1px dashed rgba(56,189,248,0.3)', color: '#38bdf8', fontWeight: 600 }}>
          그룹 추가
        </Button>
        <span style={{ color: 'rgba(196,210,226,0.3)', fontSize: 14 }}>전체 {machines.length}대 · {groups.length}개 그룹</span>
      </div>

      {/* 그룹 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rootGroups.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            allGroups={groups}
            allMachines={allMachines}
            labelFormatter={labelFormatter}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onEditGroup={openEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onEditMachine={openEditMachine}
            onDeleteMachine={handleDeleteMachine}
            depth={0}
          />
        ))}
      </div>

      {/* 미배정 */}
      {unassigned.length > 0 && (
        <div style={{ background: 'rgba(100,116,139,0.04)', border: '1px solid rgba(100,116,139,0.1)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
          <div style={{ fontSize: 14, color: 'rgba(148,163,184,0.5)', marginBottom: 6 }}>미배정 {unassigned.length}대</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {unassigned.map(m => <MachineChip key={m.machine_no} machine={m} labelFormatter={labelFormatter} onEdit={openEditMachine} onDelete={handleDeleteMachine} />)}
          </div>
        </div>
      )}

      {/* 비활성 */}
      {inactive.length > 0 && (
        <div style={{ background: 'rgba(71,85,105,0.03)', border: '1px solid rgba(71,85,105,0.08)', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
          <div style={{ fontSize: 14, color: 'rgba(100,116,139,0.4)', marginBottom: 6 }}>비활성 {inactive.length}대</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {inactive.map(m => <MachineChip key={m.machine_no} machine={m} labelFormatter={labelFormatter} onEdit={openEditMachine} onDelete={handleDeleteMachine} />)}
          </div>
        </div>
      )}

      {/* 호기 모달 */}
      <Modal title={editingMachine ? '호기 수정' : '호기 추가'} open={machineModal}
        onCancel={() => setMachineModal(false)} onOk={() => machineForm.submit()}
        okText={editingMachine ? '수정' : '추가'} confirmLoading={saving} destroyOnHidden>
        <Form form={machineForm} layout="vertical" onFinish={handleSaveMachine} style={{ marginTop: 16 }}>
          <Form.Item name="machine_no" label="호기 번호" rules={[{ required: true, message: '호기 번호를 입력하세요.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} disabled={!!editingMachine} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input placeholder="예: C4 설비" />
          </Form.Item>
          <Form.Item name="group_id" label="그룹">
            <Select options={[{ label: '미배정', value: null }, ...groupSelectOptions]}
              placeholder="그룹 선택" allowClear showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="is_active" label="활성" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 그룹 모달 */}
      <Modal title={editingGroup ? '그룹 수정' : '그룹 추가'} open={groupModal}
        onCancel={() => setGroupModal(false)} onOk={() => groupForm.submit()}
        okText={editingGroup ? '수정' : '추가'} confirmLoading={saving} destroyOnHidden>
        <Form form={groupForm} layout="vertical" onFinish={handleSaveGroup} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="그룹명" rules={[{ required: true, message: '그룹명을 입력하세요.' }]}>
            <Input placeholder="예: C4 1 SET" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="설명 (선택)">
            <Input placeholder="그룹 설명" />
          </Form.Item>
          <Form.Item name="parent_id" label="상위 그룹 (선택)">
            <Select options={[{ label: '없음 (최상위)', value: null }, ...parentOptions]}
              placeholder="상위 그룹 선택" allowClear showSearch optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
