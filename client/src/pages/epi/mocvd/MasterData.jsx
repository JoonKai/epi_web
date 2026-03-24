import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Tabs,
  message,
} from 'antd'
import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, PlusOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons'
import { HexColorPicker, RgbaStringColorPicker } from 'react-colorful'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getSourceColor } from './sourceColors'
import MachineGroupManager from './MachineGroupManager'

function usePendingActiveMap(rows) {
  return useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row.is_active])), [rows])
}

function formatScrubberLabel(machineNo) {
  if (machineNo == null || machineNo === '') return '-'
  return `SCR#${machineNo}호기`
}

function MachineTab({ labelFormatter = formatMachineLabel }) {
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
          throw new Error(err.detail || `${labelFormatter(row.machine_no)} 저장에 실패했습니다.`)
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

  return (
    <>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)' }}>전체 {rows.length}대</span>
          {hasPendingChanges && (
            <span style={{ fontSize: 14, color: '#fbbf24' }}>변경사항 있음</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveActive}
            loading={saving}
            disabled={!hasPendingChanges}
            style={{
              background: hasPendingChanges ? 'rgba(125,211,252,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hasPendingChanges ? 'rgba(125,211,252,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: hasPendingChanges ? '#7dd3fc' : 'rgba(196,210,226,0.65)',
            }}
          >
            저장
          </Button>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)',
              borderRadius: 8, padding: '4px 14px', cursor: 'pointer',
              color: 'rgba(245,158,11,0.8)', fontSize: 14, fontWeight: 700,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(245,158,11,0.8)' }}
          >
            + 호기 추가
          </button>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {rows.length === 0 && !loading && (
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', padding: '24px 4px' }}>등록된 호기가 없습니다.</span>
        )}
        {rows.map((row) => {
          const isActive = pendingActiveMap[row.id] ?? row.is_active
          const changed = pendingActiveMap[row.id] !== row.is_active
          return (
            <div
              key={row.id}
              style={{
                display: 'flex', alignItems: 'center',
                background: '#212535',
                border: `1px solid ${changed ? 'rgba(251,191,36,0.3)' : 'var(--nowa-border)'}`,
                borderRadius: 16, minWidth: 200, overflow: 'hidden',
                borderLeft: `3px solid ${isActive ? '#f59e0b' : '#475569'}`,
                opacity: isActive ? 1 : 0.55,
              }}
            >
              {/* 아바타(호기 번호) */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isActive ? 'rgba(245,158,11,0.12)' : '#2a2f45',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, margin: '12px 10px 12px 10px',
                border: `2px solid ${isActive ? '#f59e0b' : '#475569'}`,
                boxShadow: isActive ? '0 0 8px rgba(245,158,11,0.35)' : 'none',
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? '#fbbf24' : '#64748b', lineHeight: 1 }}>{row.machine_no}</span>
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingRight: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>
                  {labelFormatter(row.machine_no)}
                </span>
                {row.description && (
                  <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)', marginTop: 2, whiteSpace: 'nowrap' }}>
                    {row.description}
                  </span>
                )}
              </div>

              {/* 액션 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, paddingRight: 12, alignItems: 'center' }}>
                <Switch
                  size="small"
                  checked={isActive}
                  onChange={(checked) => setPendingActiveMap((prev) => ({ ...prev, [row.id]: checked }))}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <EditOutlined
                    onClick={() => openEdit(row)}
                    style={{ color: 'rgba(245,158,11,0.7)', fontSize: 14, cursor: 'pointer' }}
                  />
                  <Popconfirm title="이 호기를 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
                    <DeleteOutlined style={{ color: '#f87171', fontSize: 14, cursor: 'pointer', opacity: 0.8 }} />
                  </Popconfirm>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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

      <Modal title="호기 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="수정">
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

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)' }}>전체 {rows.length}종</span>
          {hasPendingChanges && <span style={{ fontSize: 14, color: '#fbbf24' }}>변경사항 있음</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveActive}
            loading={saving}
            disabled={!hasPendingChanges}
            style={{
              background: hasPendingChanges ? 'rgba(125,211,252,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hasPendingChanges ? 'rgba(125,211,252,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: hasPendingChanges ? '#7dd3fc' : 'rgba(196,210,226,0.65)',
            }}
          >
            저장
          </Button>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)',
              borderRadius: 8, padding: '4px 14px', cursor: 'pointer',
              color: 'rgba(245,158,11,0.8)', fontSize: 14, fontWeight: 700,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(245,158,11,0.8)' }}
          >
            + 소스 추가
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {rows.length === 0 && !loading && (
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', padding: '24px 4px' }}>등록된 소스가 없습니다.</span>
        )}
        {rows.map((row, idx) => {
          const isActive = pendingActiveMap[row.id] ?? row.is_active
          const changed = pendingActiveMap[row.id] !== row.is_active
          const c = getSourceColor(idx)
          return (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center',
              background: '#212535',
              border: `1px solid ${changed ? 'rgba(251,191,36,0.3)' : 'var(--nowa-border)'}`,
              borderRadius: 16, minWidth: 180, overflow: 'hidden',
              borderLeft: `3px solid ${isActive ? c.main : '#475569'}`,
              opacity: isActive ? 1 : 0.55,
            }}>
              {/* 아바타 */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isActive ? c.bg : '#2a2f45',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, margin: '12px 10px 12px 10px',
                border: `2px solid ${isActive ? c.main : '#475569'}`,
                boxShadow: isActive ? `0 0 8px ${c.glow}` : 'none',
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? c.main : '#64748b', lineHeight: 1 }}>{row.name?.[0] || '?'}</span>
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingRight: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? c.main : 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{row.name}</span>
                <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.72)', marginTop: 2 }}>순서 {row.order_idx}</span>
              </div>

              {/* 액션 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, paddingRight: 12, alignItems: 'center' }}>
                <Switch
                  size="small"
                  checked={isActive}
                  onChange={(checked) => setPendingActiveMap((prev) => ({ ...prev, [row.id]: checked }))}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <EditOutlined onClick={() => openEdit(row)} style={{ color: 'rgba(245,158,11,0.7)', fontSize: 14, cursor: 'pointer' }} />
                  <Popconfirm title="이 소스를 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
                    <DeleteOutlined style={{ color: '#f87171', fontSize: 14, cursor: 'pointer', opacity: 0.8 }} />
                  </Popconfirm>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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

      <Modal title="소스 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="수정">
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
          border: '1px solid var(--nowa-border)', borderRadius: 6,
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
        <span style={{ fontSize: 14, color: 'var(--nowa-text)', flex: 1 }}>{value || '선택 안 됨'}</span>
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
              border: '1px solid var(--nowa-border)', borderRadius: 6,
              padding: '4px 8px', color: '#e2e8f0', fontSize: 14,
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
      <Form.Item
        name="name"
        label="코드값"
        rules={[{ required: true, message: '코드값을 입력하세요.' }]}
        tooltip="근무표에 표시될 코드값입니다."
      >
        <Input placeholder="예: 1, 2, 휴, 반차" />
      </Form.Item>
      <Form.Item name="label" label="표시명" rules={[{ required: true, message: '표시명을 입력하세요.' }]}>
        <Input placeholder="예: 반차, 교육" />
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

  const handleToggleActive = async (row, checked) => {
    await authFetch(`/api/shift/shift-types/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: checked }),
    })
    fetchRows()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.75)' }}>전체 {rows.length}종</span>
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)',
            borderRadius: 8, padding: '4px 14px', cursor: 'pointer',
            color: 'rgba(245,158,11,0.8)', fontSize: 14, fontWeight: 700,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(245,158,11,0.8)' }}
        >
          + 근무 유형 추가
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {rows.length === 0 && !loading && (
          <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.65)', padding: '24px 4px' }}>등록된 근무 유형이 없습니다.</span>
        )}
        {rows.map((row) => (
          <div key={row.id} style={{
            display: 'flex', alignItems: 'center',
            background: '#212535',
            border: '1px solid var(--nowa-border)',
            borderRadius: 16, minWidth: 200, overflow: 'hidden',
            borderLeft: `3px solid ${row.is_active ? (row.color || '#f59e0b') : '#475569'}`,
            opacity: row.is_active ? 1 : 0.55,
          }}>
            {/* 아바타(근무 유형 태그) */}
            <div style={{
              width: 48, height: 44, borderRadius: 10,
              background: row.bg_color || 'rgba(245,158,11,0.12)',
              border: `2px solid ${row.border_color || 'rgba(245,158,11,0.4)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, margin: '10px 10px 10px 10px',
              boxShadow: row.is_active ? `0 0 8px ${row.border_color || 'rgba(245,158,11,0.4)'}` : 'none',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: row.color || '#f59e0b', lineHeight: 1 }}>{row.name}</span>
            </div>

            {/* 정보 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingRight: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--nowa-text)', whiteSpace: 'nowrap' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: row.color, border: '1px solid var(--nowa-border)', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: 3, background: row.bg_color, border: '1px solid var(--nowa-border)', display: 'inline-block' }} />
                <span style={{ fontSize: 14, color: 'rgba(196,210,226,0.68)' }}>순서 {row.order_idx}</span>
              </div>
            </div>

            {/* 액션 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, paddingRight: 12, alignItems: 'center' }}>
              <Switch size="small" checked={row.is_active} onChange={(checked) => handleToggleActive(row, checked)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <EditOutlined onClick={() => openEdit(row)} style={{ color: 'rgba(245,158,11,0.7)', fontSize: 14, cursor: 'pointer' }} />
                <Popconfirm title="이 근무 유형을 삭제하시겠습니까?" onConfirm={() => handleDelete(row.id)}>
                  <DeleteOutlined style={{ color: '#f87171', fontSize: 14, cursor: 'pointer', opacity: 0.8 }} />
                </Popconfirm>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal title="근무 유형 추가" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="추가">
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          {shiftFormFields}
        </Form>
      </Modal>

      <Modal title="근무 유형 수정" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} okText="수정">
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
          {
            key: 'machines',
            label: <span><AppstoreOutlined /> MOCVD 호기 관리</span>,
            children: <MachineGroupManager />,
          },
          { key: 'scr-machines', label: <span><AppstoreOutlined /> SCR 호기 관리</span>, children: <MachineGroupManager labelFormatter={formatScrubberLabel} /> },
          { key: 'sources', label: <span><ExperimentOutlined /> 소스 종류 관리</span>, children: <SourceTab /> },
          { key: 'shift-types', label: <span><CalendarOutlined /> 근무 유형 관리</span>, children: <ShiftTypeTab /> },
        ]}
      />
    </div>
  )
}

