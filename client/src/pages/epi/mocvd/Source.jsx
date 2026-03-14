import { useEffect, useState } from 'react'
import { Button, InputNumber, message, Select, Table, Tabs, Tag, theme } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import SourceStatusBoard from './SourceStatusBoard'

const UNITS = ['kg', 'g', 'L', 'mL', '%']
const MACHINES = Array.from({ length: 136 }, (_, index) => 101 + index)

function SourceInputTab() {
  const [machineNo, setMachineNo] = useState(101)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { token } = theme.useToken()

  const fetchData = async (no) => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/mocvd/source/${no}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || '데이터를 불러오지 못했습니다.')
      setData(json.map((row) => ({ ...row, _edited: false })))
    } catch (err) {
      message.error(err.message || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(machineNo)
  }, [machineNo])

  const handleChange = (sourceName, field, value) => {
    setData((prev) => prev.map((row) => (
      row.source_name === sourceName
        ? { ...row, [field]: value, _edited: true }
        : row
    )))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch(`/api/mocvd/source/${machineNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.map(({ source_name, remaining, unit }) => ({
          source_name,
          remaining,
          unit,
        }))),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || '저장에 실패했습니다.')
      message.success('저장되었습니다.')
      fetchData(machineNo)
    } catch (err) {
      message.error(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '소스',
      dataIndex: 'source_name',
      width: 140,
      render: (value) => <Tag color="blue" style={{ fontWeight: 600 }}>{value}</Tag>,
    },
    {
      title: '잔량',
      dataIndex: 'remaining',
      width: 180,
      render: (value, row) => (
        <InputNumber
          value={value}
          min={0}
          step={0.1}
          style={{ width: 130 }}
          onChange={(nextValue) => handleChange(row.source_name, 'remaining', nextValue ?? 0)}
        />
      ),
    },
    {
      title: '단위',
      dataIndex: 'unit',
      width: 140,
      render: (value, row) => (
        <Select
          value={value}
          style={{ width: 100 }}
          options={UNITS.map((unit) => ({ value: unit, label: unit }))}
          onChange={(nextValue) => handleChange(row.source_name, 'unit', nextValue)}
        />
      ),
    },
    {
      title: '최종 수정',
      dataIndex: 'updated_at',
      render: (value, row) => (
        <span style={{ color: row._edited ? token.colorWarning : token.colorTextSecondary }}>
          {row._edited ? '수정됨' : (value ?? '-')}
        </span>
      ),
    },
  ]

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>호기 선택</span>
          <Select
            value={machineNo}
            style={{ width: 140 }}
            showSearch
            options={MACHINES.map((machine) => ({ value: machine, label: `${machine}호기` }))}
            onChange={setMachineNo}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(machineNo)}>
            새로고침
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>

      <Table
        className="console-table"
        rowKey="source_name"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        bordered
        size="middle"
      />
    </div>
  )
}

function Source() {
  return (
    <Tabs
      defaultActiveKey="status-board"
      items={[
        {
          key: 'status-board',
          label: '소스교체 현황판',
          children: <SourceStatusBoard />,
        },
        {
          key: 'input',
          label: '수기 입력',
          children: <SourceInputTab />,
        },
      ]}
    />
  )
}

export default Source
