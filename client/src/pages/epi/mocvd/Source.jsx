import { useEffect, useState } from 'react'
import { Select, InputNumber, Button, Table, message, Tag, theme } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'

const UNITS = ['kg', 'g', 'L', 'mL', '%']
const MACHINES = Array.from({ length: 136 }, (_, i) => 101 + i)

function Source() {
  const [machineNo, setMachineNo] = useState(101)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { token } = theme.useToken()

  const fetchData = async (no) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mocvd/source/${no}`)
      const json = await res.json()
      setData(json.map(row => ({ ...row, _edited: false })))
    } catch {
      message.error('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(machineNo) }, [machineNo])

  const handleChange = (sourceName, field, value) => {
    setData(prev => prev.map(row =>
      row.source_name === sourceName
        ? { ...row, [field]: value, _edited: true }
        : row
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/mocvd/source/${machineNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.map(({ source_name, remaining, unit }) => ({
          source_name, remaining, unit,
        }))),
      })
      if (res.ok) {
        message.success('저장 완료')
        fetchData(machineNo)
      } else {
        message.error('저장 실패')
      }
    } catch {
      message.error('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '소스',
      dataIndex: 'source_name',
      width: 120,
      render: (val) => <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{val}</Tag>,
    },
    {
      title: '잔량',
      dataIndex: 'remaining',
      width: 160,
      render: (val, row) => (
        <InputNumber
          value={val}
          min={0}
          step={0.1}
          style={{ width: 120 }}
          onChange={(v) => handleChange(row.source_name, 'remaining', v ?? 0)}
        />
      ),
    },
    {
      title: '단위',
      dataIndex: 'unit',
      width: 120,
      render: (val, row) => (
        <Select
          value={val}
          style={{ width: 90 }}
          options={UNITS.map(u => ({ value: u, label: u }))}
          onChange={(v) => handleChange(row.source_name, 'unit', v)}
        />
      ),
    },
    {
      title: '최종 수정',
      dataIndex: 'updated_at',
      render: (val, row) => (
        <span style={{ color: row._edited ? token.colorWarning : token.colorTextSecondary, fontSize: 13 }}>
          {row._edited ? '● 수정됨' : (val ?? '-')}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>호기 선택</span>
          <Select
            value={machineNo}
            style={{ width: 120 }}
            showSearch
            options={MACHINES.map(n => ({ value: n, label: `${n}호기` }))}
            onChange={setMachineNo}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(machineNo)}>
            새로고침
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            저장
          </Button>
        </div>
      </div>

      <Table
        rowKey="source_name"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        bordered
        size="middle"
        rowClassName={(row) => row._edited ? 'row-edited' : ''}
      />
    </div>
  )
}

export default Source
