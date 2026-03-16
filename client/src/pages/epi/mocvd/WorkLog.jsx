import { useEffect, useMemo, useState } from 'react'
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, Select, Space, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import { authFetch } from '../../../context/AuthContext'
import { formatMachineLabel } from './machineLabel'

const CATEGORY_OPTIONS = ['긴급', '경고', '일반']

const INITIAL_ROWS = [
  {
    key: 1,
    category: '긴급',
    machine_no: '106',
    start_date: '2026-04-18 09:10',
    end_date: '',
    situation: '15step에서 Inner PID CTRL overtemp alarm 발생',
    action: 'Chamber 내부 확인 중 Water leak 확인. Filament 분리 및 inner filament 단선 확인 후 Chamber open 점검 대기 중.',
  },
  {
    key: 2,
    category: '긴급',
    machine_no: '34',
    start_date: '2026-04-20 14:20',
    end_date: '2026-04-20 18:00',
    situation: '런 27step에서 Temp diff alarm 발생',
    action: 'Carrier 파손 확인되어 Chamber Open 대기. CT 캐리어 노후화로 인한 파손으로 판단.',
  },
  {
    key: 3,
    category: '경고',
    machine_no: '201',
    start_date: '2026-04-20 08:30',
    end_date: '2026-04-20 08:50',
    situation: '148번 스텝 진행 중 Watchdog alarm 발생',
    action: '프로그램 리부팅 진행 완료.',
  },
  {
    key: 4,
    category: '경고',
    machine_no: '202',
    start_date: '2026-04-20 09:15',
    end_date: '2026-04-20 09:40',
    situation: '203번 스텝 진행 중 Watchdog alarm 발생',
    action: '프로그램 리부팅 진행 완료.',
  },
  {
    key: 5,
    category: '일반',
    machine_no: '206',
    start_date: '2026-04-20 10:00',
    end_date: '2026-04-20 15:30',
    situation: '표면 불량으로 인한 설비 점검 요청',
    action: 'FDC 데이터 확인 시 스핀들 RPM 문제 확인되어 페러모터 및 사인드라이브 점검 진행 중.',
  },
]

function getCategoryColor(category) {
  if (category === '긴급') return 'red'
  if (category === '경고') return 'gold'
  return 'blue'
}

export default function WorkLog() {
  const [rows, setRows] = useState(INITIAL_ROWS)
  const [machineOptions, setMachineOptions] = useState([])
  const [machineLoading, setMachineLoading] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [form] = Form.useForm()

  const nextKey = useMemo(() => (rows.length ? Math.max(...rows.map((row) => row.key)) + 1 : 1), [rows])

  const fetchMachines = async () => {
    setMachineLoading(true)
    try {
      const res = await authFetch('/api/mocvd/machines')
      if (!res.ok) {
        throw new Error('호기 목록을 불러오지 못했습니다.')
      }
      const data = await res.json()
      const options = data
        .filter((row) => row.is_active !== false)
        .map((row) => ({
          value: String(row.machine_no),
          label: formatMachineLabel(row.machine_no),
        }))
      setMachineOptions(options)
    } catch (err) {
      message.error(err.message || '호기 목록을 불러오지 못했습니다.')
    } finally {
      setMachineLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [])

  const setDefaultFormValues = () => {
    form.setFieldsValue({
      category: '일반',
      machine_no: undefined,
      start_date: dayjs(),
      end_date: null,
      situation: '',
      action: '',
    })
  }

  useEffect(() => {
    setDefaultFormValues()
  }, [])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const nextRow = {
        key: editingKey ?? nextKey,
        category: values.category,
        machine_no: values.machine_no,
        start_date: values.start_date.format('YYYY-MM-DD HH:mm'),
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD HH:mm') : '',
        situation: values.situation.trim(),
        action: values.action.trim(),
      }

      if (editingKey != null) {
        setRows((prev) => prev.map((row) => (row.key === editingKey ? nextRow : row)))
        message.success('업무일지를 수정했습니다.')
      } else {
        setRows((prev) => [nextRow, ...prev])
        message.success('업무일지를 추가했습니다.')
      }

      setEditingKey(null)
      form.resetFields()
      setDefaultFormValues()
    } catch {
      return
    }
  }

  const handleReset = () => {
    setRows(INITIAL_ROWS)
    setEditingKey(null)
    form.resetFields()
    setDefaultFormValues()
  }

  const handleDelete = (key) => {
    setRows((prev) => prev.filter((row) => row.key !== key))
    if (editingKey === key) {
      setEditingKey(null)
      form.resetFields()
      setDefaultFormValues()
    }
  }

  const handleEdit = (row) => {
    setEditingKey(row.key)
    form.setFieldsValue({
      category: row.category,
      machine_no: row.machine_no,
      start_date: row.start_date ? dayjs(row.start_date, 'YYYY-MM-DD HH:mm') : dayjs(),
      end_date: row.end_date ? dayjs(row.end_date, 'YYYY-MM-DD HH:mm') : null,
      situation: row.situation,
      action: row.action,
    })
  }

  const columns = [
    {
      title: '중요도',
      dataIndex: 'category',
      width: 90,
      align: 'center',
      render: (value) => <Tag color={getCategoryColor(value)}>{value}</Tag>,
    },
    {
      title: '호기',
      dataIndex: 'machine_no',
      width: 140,
      align: 'center',
      render: (value) => <span style={{ fontWeight: 800, color: 'var(--nowa-primary)' }}>{formatMachineLabel(value)}</span>,
    },
    {
      title: '시작날짜',
      dataIndex: 'start_date',
      width: 170,
      align: 'center',
    },
    {
      title: '종료날짜',
      dataIndex: 'end_date',
      width: 170,
      align: 'center',
      render: (value) => value || '-',
    },
    {
      title: '상황',
      dataIndex: 'situation',
      width: 620,
      render: (value) => <span style={{ color: 'var(--nowa-text)' }}>상황 : {value}</span>,
    },
    {
      title: '조치',
      dataIndex: 'action',
      width: 720,
      render: (value) => <span style={{ color: 'var(--nowa-text)' }}>조치 : {value}</span>,
    },
    {
      title: '관리',
      key: 'actions',
      width: 132,
      fixed: 'right',
      align: 'center',
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(row)}>
            수정
          </Button>
          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(row.key)} />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div>
          <div className="nowa-page-kicker">?? ??</div>
          <div className="nowa-page-title" style={{ fontSize: 24 }}>
          MOCVD 업무 일지
        </div>
          <div className="nowa-page-desc">
          장비별 이상, 점검, 조치 내용을 현재 UI 스타일에 맞춰 바로 기록합니다.
          </div>
        </div>
      </div>

      <Card
        className="nowa-card"
        title={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined />
            <span>업무 일지 작성</span>
          </div>
        )}
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              샘플 복원
            </Button>
            <Button type="primary" icon={editingKey != null ? <EditOutlined /> : <PlusOutlined />} onClick={handleSave}>
              {editingKey != null ? '수정 저장' : '일지 추가'}
            </Button>
          </Space>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          className="console-form"
          initialValues={{
            category: '일반',
            start_date: dayjs(),
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '110px 180px 190px 190px minmax(260px, 1fr) minmax(320px, 1.4fr)', gap: 12 }}>
            <Form.Item name="category" label="중요도" rules={[{ required: true, message: '중요도를 선택하세요.' }]}>
              <Select options={CATEGORY_OPTIONS.map((value) => ({ value, label: value }))} />
            </Form.Item>
            <Form.Item name="machine_no" label="호기" rules={[{ required: true, message: '호기를 선택하세요.' }]}>
              <Select
                showSearch
                loading={machineLoading}
                options={machineOptions}
                placeholder="기준정보 호기 선택"
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="start_date" label="시작날짜" rules={[{ required: true, message: '시작날짜를 선택하세요.' }]}>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                placeholder="날짜 / 시간 선택"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="end_date" label="종료날짜">
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                placeholder="날짜 / 시간 선택"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="situation" label="상황" rules={[{ required: true, message: '상황을 입력하세요.' }]}>
              <Input.TextArea rows={3} placeholder="이상 내용, 알람, 발생 상황" />
            </Form.Item>
            <Form.Item name="action" label="조치" rules={[{ required: true, message: '조치를 입력하세요.' }]}>
              <Input.TextArea rows={3} placeholder="점검 결과, 임시 조치, 후속 계획" />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card className="nowa-card" title="업무 일지 목록" styles={{ body: { padding: 0 } }}>
        <Table
          className="console-table"
          bordered
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 2100 }}
        />
      </Card>
    </div>
  )
}
