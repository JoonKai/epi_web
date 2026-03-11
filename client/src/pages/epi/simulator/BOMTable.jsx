import { useState } from 'react'
import { Table, Button, Input, InputNumber, Select, Space, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import { krw } from './calculations'

const CATEGORIES = ['MO소스', '질소', '도펀트', '캐리어', '기판', '소모품', '기타']

const INIT_NEW = { category: 'MO소스', name: '', spec: '', unit: 'g', usagePerRun: 0, unitPrice: 0, supplier: '' }

export default function BOMTable() {
  const { bom, addBomItem, updateBomItem, removeBomItem } = useCostStore()
  const [editId, setEditId] = useState(null)
  const [editVals, setEditVals] = useState({})
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState(INIT_NEW)

  const totalPerRun = bom.reduce((s, b) => s + b.usagePerRun * b.unitPrice, 0)

  const startEdit = (r) => { setEditId(r.id); setEditVals({ ...r }) }
  const saveEdit = () => { updateBomItem(editId, editVals); setEditId(null) }
  const cancelEdit = () => setEditId(null)

  const saveNew = () => {
    if (!newRow.name.trim()) return
    addBomItem({ ...newRow, id: `bom_${Date.now()}` })
    setAdding(false)
    setNewRow(INIT_NEW)
  }
  const cancelNew = () => { setAdding(false); setNewRow(INIT_NEW) }

  const set = (obj, field) => (v) => obj === 'edit'
    ? setEditVals(p => ({ ...p, [field]: v }))
    : setNewRow(p => ({ ...p, [field]: v }))

  const columns = [
    {
      title: '카테고리', dataIndex: 'category', width: 100,
      render: (v, r) => editId === r.id
        ? <Select size="small" value={editVals.category} style={{ width: 90 }} options={CATEGORIES.map(c => ({ value: c, label: c }))} onChange={set('edit', 'category')} />
        : v,
    },
    {
      title: '자재명', dataIndex: 'name',
      render: (v, r) => editId === r.id
        ? <Input size="small" value={editVals.name} onChange={e => set('edit', 'name')(e.target.value)} style={{ width: 110 }} />
        : v,
    },
    {
      title: '규격', dataIndex: 'spec',
      render: (v, r) => editId === r.id
        ? <Input size="small" value={editVals.spec} onChange={e => set('edit', 'spec')(e.target.value)} style={{ width: 130 }} />
        : v,
    },
    {
      title: '단위', dataIndex: 'unit', width: 70,
      render: (v, r) => editId === r.id
        ? <Input size="small" value={editVals.unit} onChange={e => set('edit', 'unit')(e.target.value)} style={{ width: 55 }} />
        : v,
    },
    {
      title: '런당 사용량', dataIndex: 'usagePerRun', width: 110,
      render: (v, r) => editId === r.id
        ? <InputNumber size="small" value={editVals.usagePerRun} style={{ width: 90 }} onChange={set('edit', 'usagePerRun')} />
        : v,
    },
    {
      title: '단가(원)', dataIndex: 'unitPrice', width: 110,
      render: (v, r) => editId === r.id
        ? <InputNumber size="small" value={editVals.unitPrice} style={{ width: 90 }} onChange={set('edit', 'unitPrice')} />
        : krw(v),
    },
    {
      title: '런당 비용(원)', width: 120,
      render: (_, r) => krw(Math.round(r.usagePerRun * r.unitPrice)),
    },
    {
      title: '공급사', dataIndex: 'supplier',
      render: (v, r) => editId === r.id
        ? <Input size="small" value={editVals.supplier} onChange={e => set('edit', 'supplier')(e.target.value)} style={{ width: 100 }} />
        : v,
    },
    {
      title: '', width: 80,
      render: (_, r) => editId === r.id ? (
        <Space size={2}>
          <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={saveEdit} />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
        </Space>
      ) : (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => startEdit(r)}>편집</Button>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => removeBomItem(r.id)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const newRowEl = adding ? (
    <tr style={{ background: '#fffbe6' }}>
      <td style={{ padding: '4px 8px' }}>
        <Select size="small" value={newRow.category} style={{ width: 90 }} options={CATEGORIES.map(c => ({ value: c, label: c }))} onChange={set('new', 'category')} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <Input size="small" value={newRow.name} placeholder="자재명" onChange={e => set('new', 'name')(e.target.value)} style={{ width: 110 }} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <Input size="small" value={newRow.spec} placeholder="규격" onChange={e => set('new', 'spec')(e.target.value)} style={{ width: 130 }} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <Input size="small" value={newRow.unit} onChange={e => set('new', 'unit')(e.target.value)} style={{ width: 55 }} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <InputNumber size="small" value={newRow.usagePerRun} style={{ width: 90 }} onChange={set('new', 'usagePerRun')} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <InputNumber size="small" value={newRow.unitPrice} style={{ width: 90 }} onChange={set('new', 'unitPrice')} />
      </td>
      <td style={{ padding: '4px 8px' }}>{krw(Math.round(newRow.usagePerRun * newRow.unitPrice))}</td>
      <td style={{ padding: '4px 8px' }}>
        <Input size="small" value={newRow.supplier} placeholder="공급사" onChange={e => set('new', 'supplier')(e.target.value)} style={{ width: 100 }} />
      </td>
      <td style={{ padding: '4px 8px' }}>
        <Space size={2}>
          <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={saveNew} />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={cancelNew} />
        </Space>
      </td>
    </tr>
  ) : null

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>
          런당 총 자재비: <span style={{ color: '#4f7fff' }}>{krw(Math.round(totalPerRun))}원</span>
        </span>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setAdding(true)} disabled={adding}>자재 추가</Button>
      </div>
      <Table
        dataSource={bom}
        rowKey="id"
        columns={columns}
        size="small"
        pagination={false}
        scroll={{ y: 320 }}
        components={{
          body: {
            wrapper: ({ children, ...props }) => (
              <tbody {...props}>
                {children}
                {newRowEl}
              </tbody>
            ),
          },
        }}
      />
    </div>
  )
}
