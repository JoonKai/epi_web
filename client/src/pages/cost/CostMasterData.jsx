import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BankOutlined, PlusOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Table, Tabs, Tag, message } from 'antd'
import { authFetch } from '../../context/AuthContext'

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

function ItemMasterTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ category: '소모품', code: '', name: '', unit: 'EA', isActive: true })

  const loadItems = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/cost/items')
      if (!res.ok) throw new Error('품목 기준정보를 불러오지 못했습니다.')
      const json = await res.json()
      setItems(
        json.map((row) => ({
          key: row.id,
          category: row.category,
          code: row.code,
          name: row.name,
          unit: row.unit,
          active: row.is_active,
        })),
      )
    } catch (err) {
      setError(err.message || '품목 기준정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleAdd = async () => {
    if (!form.code || !form.name) {
      message.warning('코드와 품목명은 필수입니다.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch('/api/cost/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          code: form.code.trim(),
          name: form.name.trim(),
          unit: form.unit.trim() || 'EA',
          is_active: form.isActive,
        }),
      })
      if (!res.ok) throw new Error('품목 저장에 실패했습니다.')

      setForm({ category: '소모품', code: '', name: '', unit: 'EA', isActive: true })
      message.success('품목 기준정보를 등록했습니다.')
      await loadItems()
    } catch (err) {
      message.error(err.message || '품목 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const itemCount = items.length
  const activeItemCount = items.filter((row) => row.active).length

  const itemColumns = [
    { title: '분류', dataIndex: 'category', key: 'category' },
    { title: '코드', dataIndex: 'code', key: 'code' },
    { title: '품목명', dataIndex: 'name', key: 'name' },
    { title: '단위', dataIndex: 'unit', key: 'unit' },
    { title: '사용', dataIndex: 'active', key: 'active', render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? '사용' : '중지'}</Tag> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8 }}>
      <div className="nowa-page-banner">
        <div className="nowa-page-banner-left">
          <span className="nowa-page-banner-kicker">비용 관리</span>
          <div className="nowa-page-banner-title">품목 기준정보</div>
          <div className="nowa-page-banner-desc">구매요청에서 사용하는 품목 기준정보를 DB 기준으로 관리합니다.</div>
        </div>
      </div>

      <div className="nowa-kpi-grid">
        <MetricCard icon={<TagsOutlined />} label="등록 품목" value={itemCount} sub="비용 기준 품목 수" accent="#8b5cf6" soft="rgba(139,92,246,0.14)" />
        <MetricCard icon={<BankOutlined />} label="사용 품목" value={activeItemCount} sub="구매요청 사용 가능" accent="#14b8a6" soft="rgba(20,184,166,0.14)" />
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16}>
          <Card className="nowa-card" title="기준정보 목록" styles={{ body: { padding: 0 } }}>
            {loading ? (
              <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><Spin /></div>
            ) : (
              <Table className="console-table" columns={itemColumns} dataSource={items} pagination={false} />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="nowa-card" title="품목 등록">
            <div className="console-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select value={form.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} options={['소모품', '부품', 'PM 자재'].map((value) => ({ value, label: value }))} />
              <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="코드" />
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="품목명" />
              <Input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="단위" />
              <Select
                value={form.isActive}
                onChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
                options={[{ value: true, label: '사용' }, { value: false, label: '중지' }]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} loading={submitting} block>
                품목 등록
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function VendorMasterTab() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [vendorForm, setVendorForm] = useState({
    vendorCode: '',
    vendorName: '',
    businessType: 'MOCVD 부품',
    manager: '',
    contact: '',
    active: true,
  })

  const loadVendors = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/cost/vendors')
      if (!res.ok) throw new Error('업체 데이터를 불러오지 못했습니다.')
      const json = await res.json()
      setVendors(
        json.map((row) => ({
          key: row.id,
          vendorCode: row.vendor_code,
          vendorName: row.vendor_name,
          businessType: row.business_type,
          manager: row.manager,
          contact: row.contact,
          active: row.is_active,
        })),
      )
    } catch (err) {
      setError(err.message || '업체 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const filteredVendors = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) return vendors
    return vendors.filter((vendor) =>
      [vendor.vendorCode, vendor.vendorName, vendor.businessType, vendor.manager, vendor.contact]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedKeyword)),
    )
  }, [keyword, vendors])

  const handleAddVendor = async () => {
    if (!vendorForm.vendorCode || !vendorForm.vendorName || !vendorForm.manager) {
      message.warning('업체코드, 업체명, 담당자는 필수입니다.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch('/api/cost/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_code: vendorForm.vendorCode.trim(),
          vendor_name: vendorForm.vendorName.trim(),
          business_type: vendorForm.businessType.trim(),
          manager: vendorForm.manager.trim(),
          contact: vendorForm.contact.trim(),
          is_active: vendorForm.active,
        }),
      })
      if (!res.ok) throw new Error('업체 저장에 실패했습니다.')

      setVendorForm({ vendorCode: '', vendorName: '', businessType: 'MOCVD 부품', manager: '', contact: '', active: true })
      message.success('업체 기준정보를 등록했습니다.')
      await loadVendors()
    } catch (err) {
      message.error(err.message || '업체 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const vendorColumns = [
    { title: '업체코드', dataIndex: 'vendorCode', key: 'vendorCode', width: 110 },
    { title: '업체명', dataIndex: 'vendorName', key: 'vendorName', width: 130 },
    { title: '취급분야', dataIndex: 'businessType', key: 'businessType', width: 150 },
    { title: '담당자', dataIndex: 'manager', key: 'manager', width: 100 },
    { title: '연락처', dataIndex: 'contact', key: 'contact', width: 140 },
    { title: '상태', dataIndex: 'active', key: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? '사용' : '중지'}</Tag> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8 }}>
      <div className="nowa-page-banner">
        <div className="nowa-page-banner-left">
          <span className="nowa-page-banner-kicker">비용 관리</span>
          <div className="nowa-page-banner-title">업체등록</div>
          <div className="nowa-page-banner-desc">구매요청과 발주에 사용할 공급업체 기준정보를 DB 기준으로 관리합니다.</div>
        </div>
      </div>

      <div className="nowa-kpi-grid">
        <MetricCard icon={<ShopOutlined />} label="등록 업체" value={vendors.length} sub="등록된 공급업체 수" accent="#f59e0b" soft="rgba(245,158,11,0.14)" />
        <MetricCard icon={<BankOutlined />} label="사용 업체" value={vendors.filter((row) => row.active).length} sub="발주 가능 업체 수" accent="#3b82f6" soft="rgba(59,130,246,0.14)" />
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16}>
          <Card
            className="nowa-card"
            title="업체 목록"
            extra={<Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="업체코드, 업체명, 담당자 검색" style={{ width: 260 }} />}
            styles={{ body: { padding: 0 } }}
          >
            {loading ? (
              <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><Spin /></div>
            ) : (
              <Table className="console-table" columns={vendorColumns} dataSource={filteredVendors} pagination={{ pageSize: 6, showSizeChanger: false }} size="small" scroll={{ x: 720 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="nowa-card" title="업체 등록">
            <div className="console-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input value={vendorForm.vendorCode} onChange={(event) => setVendorForm((prev) => ({ ...prev, vendorCode: event.target.value }))} placeholder="업체코드" />
              <Input value={vendorForm.vendorName} onChange={(event) => setVendorForm((prev) => ({ ...prev, vendorName: event.target.value }))} placeholder="업체명" />
              <Select
                value={vendorForm.businessType}
                onChange={(value) => setVendorForm((prev) => ({ ...prev, businessType: value }))}
                options={['MOCVD 부품', '오링/씰', '진공자재', '가공품', '소모품'].map((value) => ({ value, label: value }))}
              />
              <Input value={vendorForm.manager} onChange={(event) => setVendorForm((prev) => ({ ...prev, manager: event.target.value }))} placeholder="담당자" />
              <Input value={vendorForm.contact} onChange={(event) => setVendorForm((prev) => ({ ...prev, contact: event.target.value }))} placeholder="연락처" />
              <Select value={vendorForm.active} onChange={(value) => setVendorForm((prev) => ({ ...prev, active: value }))} options={[{ value: true, label: '사용' }, { value: false, label: '중지' }]} />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVendor} loading={submitting} block>
                업체 등록
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default function CostMasterData() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    return ['items', 'vendors'].includes(tab) ? tab : 'items'
  }, [location.search])

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => navigate(`/cost/master-data?tab=${key}`)}
      items={[
        { key: 'items', label: '품목 기준정보', children: <ItemMasterTab /> },
        { key: 'vendors', label: '업체등록', children: <VendorMasterTab /> },
      ]}
    />
  )
}
