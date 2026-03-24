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
import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, GroupOutlined, PlusOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons'
import { HexColorPicker, RgbaStringColorPicker } from 'react-colorful'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'
import { getSourceColor } from './sourceColors'

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

const GROUP_LEVEL_STYLE = {
  1: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.3)',  left: '#f59e0b' },
  2: { color: '#22d3ee', bg: 'rgba(34,211,238,0.07)',  border: 'rgba(34,211,238,0.28)', left: '#22d3ee' },
  3: { color: '#fb7185', bg: 'rgba(251,113,133,0.07)', border: 'rgba(251,113,133,0.28)', left: '#fb7185' },
}

function GroupTab() {
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

  // 媛숈? parent ?댁뿉?????꾨옒濡??대룞
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

  // 자식 ID 수집
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

  // ?곸쐞 洹몃９ ?좏깮吏 ???먭린 ?먯떊 諛??먯넀 ?쒖쇅, ?덈꺼 3? ?섏쐞 遺덇?
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
            {/* 접기/펼치기 토글 */}
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
          <Button onClick={openCreate} style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)', color: '#f59e0b', fontWeight: 700 }}>
            + 그룹 추가
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
          { key: 'machines', label: <span><AppstoreOutlined /> MOCVD 호기 관리</span>, children: <MachineTab /> },
          { key: 'scr-machines', label: <span><AppstoreOutlined /> SCR 호기 관리</span>, children: <MachineTab labelFormatter={formatScrubberLabel} /> },
          { key: 'sources', label: <span><ExperimentOutlined /> 소스 종류 관리</span>, children: <SourceTab /> },
          { key: 'shift-types', label: <span><CalendarOutlined /> 근무 유형 관리</span>, children: <ShiftTypeTab /> },
          { key: 'groups', label: <span><GroupOutlined /> 장비 그룹 관리</span>, children: <GroupTab /> },
        ]}
      />
    </div>
  )
}

