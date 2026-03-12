import { useState } from 'react'
import { Button, Input, InputNumber, Popconfirm, Select, Space, Table } from 'antd'
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import { krw } from './calculations'
import { consoleColors } from '../../../theme/consoleTheme'

const CATEGORIES = ['MO 소스', '질소', '도펀트', '캐리어 가스', '기판', '소모품', '기타']
const INITIAL_ROW = { category: 'MO 소스', name: '', spec: '', unit: 'g', usagePerRun: 0, unitPrice: 0, supplier: '' }

export default function BOMTable() {
  const { bom, addBomItem, updateBomItem, removeBomItem } = useCostStore()
  const [editId, setEditId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState(INITIAL_ROW)

  const totalPerRun = bom.reduce((sum, item) => sum + item.usagePerRun * item.unitPrice, 0)
  const setField = (mode, field) => (value) => {
    if (mode === 'edit') setEditValues((prev) => ({ ...prev, [field]: value }))
    else setNewRow((prev) => ({ ...prev, [field]: value }))
  }

  const startEdit = (record) => { setEditId(record.id); setEditValues({ ...record }) }
  const saveEdit = () => { updateBomItem(editId, editValues); setEditId(null) }
  const saveNew = () => {
    if (!newRow.name.trim()) return
    addBomItem({ ...newRow, id: `bom_${Date.now()}` })
    setAdding(false)
    setNewRow(INITIAL_ROW)
  }

  const renderInput = (record, field, width = 120) => (editId === record.id ? <Input className="console-form" size="small" value={editValues[field]} onChange={(e) => setField('edit', field)(e.target.value)} style={{ width }} /> : record[field])

  const columns = [
    { title: '분류', dataIndex: 'category', width: 120, render: (value, record) => (editId === record.id ? <Select className="console-form" size="small" value={editValues.category} style={{ width: 110 }} options={CATEGORIES.map((item) => ({ value: item, label: item }))} onChange={setField('edit', 'category')} /> : value) },
    { title: '자재명', dataIndex: 'name', render: (_, record) => renderInput(record, 'name', 120) },
    { title: '규격', dataIndex: 'spec', render: (_, record) => renderInput(record, 'spec', 150) },
    { title: '단위', dataIndex: 'unit', width: 80, render: (_, record) => renderInput(record, 'unit', 70) },
    { title: '런당 사용량', dataIndex: 'usagePerRun', width: 120, render: (value, record) => (editId === record.id ? <InputNumber className="console-form" size="small" value={editValues.usagePerRun} style={{ width: 100 }} onChange={setField('edit', 'usagePerRun')} /> : value) },
    { title: '단가', dataIndex: 'unitPrice', width: 120, render: (value, record) => (editId === record.id ? <InputNumber className="console-form" size="small" value={editValues.unitPrice} style={{ width: 100 }} onChange={setField('edit', 'unitPrice')} /> : `${krw(value)}원`) },
    { title: '런당 비용', width: 120, render: (_, record) => `${krw(Math.round(record.usagePerRun * record.unitPrice))}원` },
    { title: '공급처', dataIndex: 'supplier', render: (_, record) => renderInput(record, 'supplier', 130) },
    {
      title: '',
      width: 84,
      render: (_, record) => editId === record.id ? (
        <Space size={2}>
          <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: consoleColors.success }} onClick={saveEdit} />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setEditId(null)} />
        </Space>
      ) : (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => startEdit(record)}>수정</Button>
          <Popconfirm title="이 항목을 삭제할까요?" onConfirm={() => removeBomItem(record.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const newRowElement = adding ? (
    <tr style={{ background: 'rgba(255,106,61,0.08)' }}>
      <td style={{ padding: '8px' }}><Select className="console-form" size="small" value={newRow.category} style={{ width: 110 }} options={CATEGORIES.map((item) => ({ value: item, label: item }))} onChange={setField('new', 'category')} /></td>
      <td style={{ padding: '8px' }}><Input className="console-form" size="small" value={newRow.name} onChange={(e) => setField('new', 'name')(e.target.value)} /></td>
      <td style={{ padding: '8px' }}><Input className="console-form" size="small" value={newRow.spec} onChange={(e) => setField('new', 'spec')(e.target.value)} /></td>
      <td style={{ padding: '8px' }}><Input className="console-form" size="small" value={newRow.unit} onChange={(e) => setField('new', 'unit')(e.target.value)} /></td>
      <td style={{ padding: '8px' }}><InputNumber className="console-form" size="small" value={newRow.usagePerRun} style={{ width: 100 }} onChange={setField('new', 'usagePerRun')} /></td>
      <td style={{ padding: '8px' }}><InputNumber className="console-form" size="small" value={newRow.unitPrice} style={{ width: 100 }} onChange={setField('new', 'unitPrice')} /></td>
      <td style={{ padding: '8px', color: 'var(--console-text)' }}>{krw(Math.round(newRow.usagePerRun * newRow.unitPrice))}원</td>
      <td style={{ padding: '8px' }}><Input className="console-form" size="small" value={newRow.supplier} onChange={(e) => setField('new', 'supplier')(e.target.value)} /></td>
      <td style={{ padding: '8px' }}>
        <Space size={2}>
          <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: consoleColors.success }} onClick={saveNew} />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setAdding(false); setNewRow(INITIAL_ROW) }} />
        </Space>
      </td>
    </tr>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="console-toolbar">
        <div className="console-pill">런당 자재비 {krw(Math.round(totalPerRun))}원</div>
        <Button className="console-button" icon={<PlusOutlined />} onClick={() => setAdding(true)} disabled={adding}>자재 추가</Button>
      </div>
      <Table className="console-table" dataSource={bom} rowKey="id" columns={columns} size="small" pagination={false} scroll={{ y: 360 }} components={{ body: { wrapper: ({ children, ...props }) => <tbody {...props}>{children}{newRowElement}</tbody> } }} />
    </div>
  )
}
