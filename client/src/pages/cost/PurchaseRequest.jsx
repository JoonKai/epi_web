import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { authFetch } from '../../context/AuthContext'

const { Text } = Typography

const reasonOptions = ['재고 부족으로 인한 구매', '정전대비 PUMP 오링 구매', '신규 장비 셋업 자재', '샘플 대응 긴급 구매']
const approvalOptions = ['기안 전', '작성 중', '기안 완료']
const receiptOptions = ['입고 전', '입고 예정', '입고 완료']

const defaultForm = {
  requestDate: dayjs(),
  materialCode: '',
  itemName: '',
  quantity: 1,
  vendorName: '',
  requester: '',
  actualDraftCount: 0,
  purchaseReason: reasonOptions[0],
  approvalStatus: approvalOptions[0],
  draftDate: null,
  receiptDate: null,
  note: '',
}

const statusColorMap = {
  '기안 전': 'default',
  '작성 중': 'processing',
  '기안 완료': 'success',
  '입고 전': 'warning',
  '입고 예정': 'processing',
  '입고 완료': 'success',
}

function buildReceiptStatus(row) {
  if (row.receiptDate) return '입고 완료'
  if (row.approvalStatus === '기안 완료') return '입고 예정'
  return '입고 전'
}

function formatDate(value) {
  return value || '-'
}

function MetricCard({ icon, label, value, sub, accent, soft }) {
  return (
    <div className="nowa-metric-card" style={{ '--metric-accent': accent, '--metric-accent-soft': soft }}>
      <div className="nowa-metric-icon">{icon}</div>
      <div className="nowa-metric-label">{label}</div>
      <div className="nowa-metric-value">{value}</div>
      <div className="nowa-metric-sub">{sub}</div>
    </div>
  )
}

export default function PurchaseRequest() {
  const [rows, setRows] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('전체')
  const [vendorFilter, setVendorFilter] = useState('전체')
  const [form, setForm] = useState(defaultForm)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [requestRes, vendorRes] = await Promise.all([
        authFetch('/api/cost/purchase-requests'),
        authFetch('/api/cost/vendors'),
      ])
      if (!requestRes.ok) throw new Error('구매요청 데이터를 불러오지 못했습니다.')
      if (!vendorRes.ok) throw new Error('업체 데이터를 불러오지 못했습니다.')

      const requestJson = await requestRes.json()
      const vendorJson = await vendorRes.json()

      setRows(
        requestJson.map((row) => ({
          key: row.id,
          requestDate: row.request_date,
          materialCode: row.material_code,
          itemName: row.item_name,
          quantity: row.quantity,
          vendorName: row.vendor_name,
          requester: row.requester,
          actualDraftCount: row.actual_draft_count,
          purchaseReason: row.purchase_reason,
          approvalStatus: row.approval_status,
          draftDate: row.draft_date,
          receiptDate: row.receipt_date,
          note: row.note,
        })),
      )
      setVendors(vendorJson)
    } catch (err) {
      setError(err.message || '구매요청 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const vendorOptions = useMemo(
    () => ['전체', ...new Set(vendors.map((vendor) => vendor.vendor_name))],
    [vendors],
  )

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [row.materialCode, row.itemName, row.requester, row.vendorName, row.purchaseReason, row.note]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword))

      const matchesApproval = approvalFilter === '전체' || row.approvalStatus === approvalFilter
      const matchesVendor = vendorFilter === '전체' || row.vendorName === vendorFilter

      return matchesKeyword && matchesApproval && matchesVendor
    })
  }, [approvalFilter, keyword, rows, vendorFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const completedDrafts = rows.filter((row) => row.approvalStatus === '기안 완료').length
    const pendingDrafts = rows.filter((row) => row.approvalStatus !== '기안 완료').length
    const completedReceipt = rows.filter((row) => row.receiptDate).length
    return { total, completedDrafts, pendingDrafts, completedReceipt }
  }, [rows])

  const columns = useMemo(
    () => [
      { title: '신청일', dataIndex: 'requestDate', key: 'requestDate', width: 108, render: formatDate, fixed: 'left' },
      {
        title: '자재코드 및 단발성',
        dataIndex: 'materialCode',
        key: 'materialCode',
        width: 150,
        fixed: 'left',
        render: (value) => <Text strong style={{ color: 'var(--nowa-text)' }}>{value || '-'}</Text>,
      },
      { title: '자재 내역', dataIndex: 'itemName', key: 'itemName', width: 370, ellipsis: true },
      { title: '수량', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'right', render: (value) => Number(value || 0).toLocaleString('ko-KR') },
      { title: '업체명', dataIndex: 'vendorName', key: 'vendorName', width: 130 },
      { title: '신청자', dataIndex: 'requester', key: 'requester', width: 100 },
      { title: '실제기안수', dataIndex: 'actualDraftCount', key: 'actualDraftCount', width: 105, align: 'center' },
      { title: '구매사유', dataIndex: 'purchaseReason', key: 'purchaseReason', width: 210, ellipsis: true },
      {
        title: '기안 완료 여부',
        dataIndex: 'approvalStatus',
        key: 'approvalStatus',
        width: 120,
        render: (value) => <Tag color={statusColorMap[value]}>{value}</Tag>,
      },
      { title: '기안작성일', dataIndex: 'draftDate', key: 'draftDate', width: 120, render: formatDate },
      {
        title: '입고일',
        dataIndex: 'receiptDate',
        key: 'receiptDate',
        width: 120,
        render: (value, row) => (value ? <Tag color="success">{value}</Tag> : <Text type={buildReceiptStatus(row) === '입고 예정' ? 'warning' : 'secondary'}>{buildReceiptStatus(row)}</Text>),
      },
      { title: '기타(참고사항)', dataIndex: 'note', key: 'note', width: 220, render: (value) => value || '-' },
    ],
    [],
  )

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddRow = async () => {
    if (!form.materialCode || !form.itemName || !form.vendorName) {
      message.warning('자재코드, 자재 내역, 업체명은 필수입니다.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch('/api/cost/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_date: form.requestDate ? form.requestDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          material_code: form.materialCode.trim(),
          item_name: form.itemName.trim(),
          quantity: Number(form.quantity) || 1,
          vendor_name: form.vendorName.trim(),
          requester: form.requester.trim(),
          actual_draft_count: Number(form.actualDraftCount) || 0,
          purchase_reason: form.purchaseReason,
          approval_status: form.approvalStatus,
          draft_date: form.draftDate ? form.draftDate.format('YYYY-MM-DD') : '',
          receipt_date: form.receiptDate ? form.receiptDate.format('YYYY-MM-DD') : '',
          note: form.note.trim(),
        }),
      })
      if (!res.ok) throw new Error('구매요청 저장에 실패했습니다.')

      setForm(defaultForm)
      message.success('구매요청 항목을 추가했습니다.')
      await loadData()
    } catch (err) {
      message.error(err.message || '구매요청 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nowa-page-intro">
        <div>
          <div className="nowa-page-kicker">비용 관리</div>
          <div className="nowa-page-title" style={{ fontSize: 24 }}>구매요청</div>
          <div className="nowa-page-desc">DB에 저장된 구매 요청, 기안 진행, 입고 상태를 한 화면에서 관리합니다.</div>
        </div>
      </div>

      <div className="nowa-kpi-grid">
        <MetricCard icon={<ShoppingCartOutlined />} label="전체 요청" value={metrics.total.toLocaleString('ko-KR')} sub="등록된 구매요청 건수" accent="#f59e0b" soft="rgba(245,158,11,0.16)" />
        <MetricCard icon={<CheckCircleOutlined />} label="기안 완료" value={metrics.completedDrafts.toLocaleString('ko-KR')} sub="발주 진행 가능한 건" accent="#22c55e" soft="rgba(34,197,94,0.16)" />
        <MetricCard icon={<ClockCircleOutlined />} label="기안 대기" value={metrics.pendingDrafts.toLocaleString('ko-KR')} sub="작성 또는 검토 필요" accent="#3b82f6" soft="rgba(59,130,246,0.16)" />
        <MetricCard icon={<InboxOutlined />} label="입고 완료" value={metrics.completedReceipt.toLocaleString('ko-KR')} sub="실입고 처리 완료" accent="#8b5cf6" soft="rgba(139,92,246,0.16)" />
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={17}>
          <Card
            className="nowa-card"
            title="구매요청 현황"
            extra={
              <Space wrap>
                <Input allowClear prefix={<SearchOutlined />} placeholder="자재코드, 자재명, 업체명 검색" style={{ width: 260 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                <Select value={approvalFilter} onChange={setApprovalFilter} style={{ width: 140 }} options={['전체', ...approvalOptions].map((value) => ({ value, label: value }))} />
                <Select value={vendorFilter} onChange={setVendorFilter} style={{ width: 160 }} options={vendorOptions.map((value) => ({ value, label: value }))} />
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            {loading ? (
              <div style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}>
                <Spin />
              </div>
            ) : (
              <Table
                className="console-table"
                columns={columns}
                dataSource={filteredRows}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                size="small"
                scroll={{ x: 1820 }}
                rowClassName={(record) => (record.approvalStatus === '기안 전' ? 'purchase-request-row-pending' : '')}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card className="nowa-card" title="구매요청 등록">
              <div className="console-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <DatePicker value={form.requestDate} onChange={(value) => handleFormChange('requestDate', value)} style={{ width: '100%' }} placeholder="신청일" />
                <Input value={form.materialCode} onChange={(event) => handleFormChange('materialCode', event.target.value)} placeholder="자재코드 또는 단발성 코드" />
                <Input value={form.itemName} onChange={(event) => handleFormChange('itemName', event.target.value)} placeholder="자재 내역" />
                <Row gutter={10}>
                  <Col span={12}>
                    <InputNumber min={1} value={form.quantity} onChange={(value) => handleFormChange('quantity', value)} style={{ width: '100%' }} placeholder="수량" />
                  </Col>
                  <Col span={12}>
                    <Select
                      showSearch
                      allowClear
                      value={form.vendorName || undefined}
                      onChange={(value) => handleFormChange('vendorName', value || '')}
                      options={vendors.map((vendor) => ({ value: vendor.vendor_name, label: vendor.vendor_name }))}
                      placeholder="업체명"
                    />
                  </Col>
                </Row>
                <Row gutter={10}>
                  <Col span={12}>
                    <Input value={form.requester} onChange={(event) => handleFormChange('requester', event.target.value)} placeholder="신청자" />
                  </Col>
                  <Col span={12}>
                    <InputNumber min={0} value={form.actualDraftCount} onChange={(value) => handleFormChange('actualDraftCount', value)} style={{ width: '100%' }} placeholder="실제기안수" />
                  </Col>
                </Row>
                <Select value={form.purchaseReason} onChange={(value) => handleFormChange('purchaseReason', value)} options={reasonOptions.map((value) => ({ value, label: value }))} />
                <Select value={form.approvalStatus} onChange={(value) => handleFormChange('approvalStatus', value)} options={approvalOptions.map((value) => ({ value, label: value }))} />
                <DatePicker value={form.draftDate} onChange={(value) => handleFormChange('draftDate', value)} style={{ width: '100%' }} placeholder="기안작성일" />
                <DatePicker value={form.receiptDate} onChange={(value) => handleFormChange('receiptDate', value)} style={{ width: '100%' }} placeholder="입고일" />
                <Input.TextArea value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="기타(참고사항)" rows={4} />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow} loading={submitting} block>
                  구매요청 추가
                </Button>
              </div>
            </Card>

            <Card className="nowa-card" title="진행 체크">
              <Alert type="warning" showIcon message="기안 전 항목 우선 처리" description={`현재 ${metrics.pendingDrafts}건이 기안 전 또는 작성 중 상태입니다.`} />
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {approvalOptions.map((status) => (
                  <div key={status} className="console-surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--nowa-text-soft)', fontWeight: 600 }}>{status}</span>
                    <Tag color={statusColorMap[status]}>{rows.filter((row) => row.approvalStatus === status).length}건</Tag>
                  </div>
                ))}
                {receiptOptions.map((status) => (
                  <div key={status} className="console-surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--nowa-text-soft)', fontWeight: 600 }}>{status}</span>
                    <Tag color={statusColorMap[status]}>{rows.filter((row) => buildReceiptStatus(row) === status).length}건</Tag>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  )
}
