import { Tabs, Form, InputNumber, Table, Button, Popconfirm, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import { calcMOCVDCostPerRun, calcBakeCostPerRun, calcMeasurementCostPerRun, calcSingleMeasurementCostPerRun, calcShipmentCostPerRun, krw } from './calculations'

function NumField({ label, store, field, step = 1, min = 0, addonAfter }) {
  const val = store[field]
  const setter = store.setter
  return (
    <Form.Item label={label} style={{ marginBottom: 8 }}>
      <InputNumber value={val} min={min} step={step} addonAfter={addonAfter}
        style={{ width: 180 }}
        onChange={v => setter({ [field]: v ?? 0 })}
      />
    </Form.Item>
  )
}

function MOCVDPanel() {
  const { mocvd, setMocvd } = useCostStore()
  const cost = calcMOCVDCostPerRun(mocvd)
  const total = Object.values(cost).reduce((a, b) => a + b, 0)
  const store = { ...mocvd, setter: setMocvd }
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Form layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }} style={{ flex: 1 }}>
        <NumField label="웨이퍼/런" store={store} field="wafersPerRun" addonAfter="매" />
        <NumField label="런 시간" store={store} field="runTimeSec" addonAfter="초" step={600} />
        <NumField label="셋업 시간" store={store} field="setupTimeSec" addonAfter="초" step={300} />
        <NumField label="반응기 수" store={store} field="reactorCount" addonAfter="대" />
        <NumField label="장비비용/시간" store={store} field="equipmentCostPerHour" addonAfter="원" step={1000} />
        <NumField label="유지보수/런" store={store} field="maintenanceCostPerRun" addonAfter="원" step={1000} />
        <NumField label="작업자 수" store={store} field="workers" addonAfter="명" />
        <NumField label="시간당 임금" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumField label="불량률" store={store} field="defectRate" addonAfter="%" min={0} step={0.5} />
        <NumField label="전력 소비" store={store} field="powerConsumptionKW" addonAfter="kW" />
        <NumField label="전기요금" store={store} field="electricityRate" addonAfter="원/kWh" />
        <NumField label="클리닝 주기" store={store} field="cleaningIntervalRuns" addonAfter="런" />
        <NumField label="클리닝 비용" store={store} field="cleaningCostPerSession" addonAfter="원" step={10000} />
      </Form>
      <div style={{ minWidth: 200 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>런당 비용 요약</div>
        {[['노무비', cost.labor], ['장비비', cost.equipment], ['유지보수', cost.maintenance], ['클리닝', cost.cleaning], ['전력', cost.power]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>{k}</span><span>{krw(Math.round(v))}원</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 600, color: '#4f7fff' }}>
          <span>합계</span><span>{krw(Math.round(total))}원</span>
        </div>
      </div>
    </div>
  )
}

function BakePanel() {
  const { bake, setBake, mocvd } = useCostStore()
  const cost = calcBakeCostPerRun(bake, mocvd.wafersPerRun)
  const total = cost.labor + cost.equipment + cost.maintenance
  const store = { ...bake, setter: setBake }
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Form layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }} style={{ flex: 1 }}>
        <NumField label="웨이퍼당 베이크 시간" store={store} field="bakeTimePerWaferSec" addonAfter="초" step={30} />
        <NumField label="로딩 시간/런" store={store} field="loadingTimePerRunSec" addonAfter="초" step={60} />
        <NumField label="냉각 시간" store={store} field="cooldownTimeSec" addonAfter="초" step={60} />
        <NumField label="베이크 온도" store={store} field="bakeTemperatureDegC" addonAfter="°C" step={10} />
        <NumField label="로 수량" store={store} field="furnaceCount" addonAfter="대" />
        <NumField label="장비비용/시간" store={store} field="equipmentCostPerHour" addonAfter="원" step={1000} />
        <NumField label="작업자 수" store={store} field="workers" addonAfter="명" />
        <NumField label="시간당 임금" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumField label="유지보수/런" store={store} field="maintenanceCostPerRun" addonAfter="원" step={1000} />
      </Form>
      <div style={{ minWidth: 200 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>런당 비용 요약</div>
        {[['노무비', cost.labor], ['장비비', cost.equipment], ['유지보수', cost.maintenance]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>{k}</span><span>{krw(Math.round(v))}원</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 600, color: '#4f7fff' }}>
          <span>합계</span><span>{krw(Math.round(total))}원</span>
        </div>
      </div>
    </div>
  )
}

function MeasPanel() {
  const { measurements, mocvd, addMeasurement, updateMeasurement, removeMeasurement } = useCostStore()
  const wpr = mocvd.wafersPerRun

  const columns = [
    { title: '측정명', dataIndex: 'name', width: 90, render: (v, r) => <InputNumber style={{ display: 'none' }} /> },
    { title: '측정명', dataIndex: 'name', width: 100, render: (v, r) => <span style={{ cursor: 'text' }}>{v}</span> },
    { title: '장비', dataIndex: 'equipmentName', width: 110 },
    { title: '시간/매(초)', dataIndex: 'timePerWaferSec', width: 100, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 80 }} onChange={val => updateMeasurement(r.id, { timePerWaferSec: val ?? 0 })} /> },
    { title: '샘플링(%)', dataIndex: 'samplingRate', width: 90, render: (v, r) => <InputNumber size="small" value={v} min={0} max={100} style={{ width: 70 }} onChange={val => updateMeasurement(r.id, { samplingRate: val ?? 0 })} /> },
    { title: '장비비/h(원)', dataIndex: 'equipmentCostPerHour', width: 110, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 90 }} onChange={val => updateMeasurement(r.id, { equipmentCostPerHour: val ?? 0 })} /> },
    { title: '유지보수/런', dataIndex: 'maintenanceCostPerRun', width: 100, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 80 }} onChange={val => updateMeasurement(r.id, { maintenanceCostPerRun: val ?? 0 })} /> },
    { title: '런당 비용(원)', width: 110, render: (_, r) => { const c = calcSingleMeasurementCostPerRun(r, wpr); return krw(Math.round(c.labor + c.equipment)) } },
    { title: '', width: 40, render: (_, r) => <Popconfirm title="삭제?" onConfirm={() => removeMeasurement(r.id)}><Button type="text" danger size="small" icon={<DeleteOutlined />} /></Popconfirm> },
  ]

  // Simpler editable table
  const cols = [
    { title: '측정명', dataIndex: 'name', width: 100 },
    { title: '장비명', dataIndex: 'equipmentName', width: 110 },
    { title: '시간/매(초)', dataIndex: 'timePerWaferSec', width: 100, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 80 }} onChange={val => updateMeasurement(r.id, { timePerWaferSec: val ?? 0 })} /> },
    { title: '샘플링(%)', dataIndex: 'samplingRate', width: 90, render: (v, r) => <InputNumber size="small" value={v} min={0} max={100} style={{ width: 70 }} onChange={val => updateMeasurement(r.id, { samplingRate: val ?? 0 })} /> },
    { title: '장비비/h', dataIndex: 'equipmentCostPerHour', width: 100, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 80 }} onChange={val => updateMeasurement(r.id, { equipmentCostPerHour: val ?? 0 })} /> },
    { title: '유지보수/런', dataIndex: 'maintenanceCostPerRun', width: 100, render: (v, r) => <InputNumber size="small" value={v} style={{ width: 80 }} onChange={val => updateMeasurement(r.id, { maintenanceCostPerRun: val ?? 0 })} /> },
    {
      title: '런당비용', width: 100,
      render: (_, r) => { const c = calcSingleMeasurementCostPerRun(r, wpr); return krw(Math.round(c.labor + c.equipment)) + '원' }
    },
    { title: '', width: 40, render: (_, r) => <Popconfirm title="삭제?" onConfirm={() => removeMeasurement(r.id)}><Button type="text" danger size="small" icon={<DeleteOutlined />} /></Popconfirm> },
  ]

  const addNew = () => addMeasurement({ id: `m_${Date.now()}`, name: '신규 측정', equipmentName: '장비', timePerWaferSec: 60, samplingRate: 100, equipmentCostPerHour: 10000, workers: 1, hourlyWage: 18000, loadingTimeSec: 300, maintenanceCostPerRun: 3000 })

  const totalMeas = measurements.reduce((s, m) => { const c = calcSingleMeasurementCostPerRun(m, wpr); return s + c.labor + c.equipment }, 0)

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>런당 측정 총비용: <span style={{ color: '#4f7fff' }}>{krw(Math.round(totalMeas))}원</span></span>
        <Button icon={<PlusOutlined />} size="small" onClick={addNew}>측정 추가</Button>
      </div>
      <Table dataSource={measurements} rowKey="id" columns={cols} size="small" pagination={false} />
    </div>
  )
}

function ShipPanel() {
  const { shipment, setShipment, mocvd } = useCostStore()
  const cost = calcShipmentCostPerRun(shipment, mocvd.wafersPerRun)
  const total = cost.labor + cost.material + cost.equipment
  const store = { ...shipment, setter: setShipment }
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Form layout="horizontal" labelCol={{ span: 16 }} wrapperCol={{ span: 8 }} style={{ flex: 1 }}>
        <NumField label="포장 시간/매" store={store} field="packingTimePerWaferSec" addonAfter="초" step={10} />
        <NumField label="검사 시간/매" store={store} field="inspectionTimePerWaferSec" addonAfter="초" step={10} />
        <NumField label="문서화 시간" store={store} field="documentationTimeSec" addonAfter="초" step={300} />
        <NumField label="포장재비/매" store={store} field="packagingMaterialCost" addonAfter="원" step={100} />
        <NumField label="배송비/매" store={store} field="shippingCostPerWafer" addonAfter="원" step={50} />
        <NumField label="보험료/매" store={store} field="insuranceCostPerWafer" addonAfter="원" step={10} />
        <NumField label="작업자 수" store={store} field="workers" addonAfter="명" />
        <NumField label="시간당 임금" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumField label="검사장비비/h" store={store} field="inspectionEquipmentCostPerHour" addonAfter="원" step={1000} />
        <NumField label="출하 불량률" store={store} field="shipmentDefectRate" addonAfter="%" min={0} step={0.1} />
      </Form>
      <div style={{ minWidth: 200 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>런당 비용 요약</div>
        {[['노무비', cost.labor], ['자재비', cost.material], ['장비비', cost.equipment]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>{k}</span><span>{krw(Math.round(v))}원</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 600, color: '#4f7fff' }}>
          <span>합계</span><span>{krw(Math.round(total))}원</span>
        </div>
      </div>
    </div>
  )
}

export default function ProcessCost() {
  const items = [
    { key: 'mocvd', label: 'MOCVD', children: <MOCVDPanel /> },
    { key: 'bake', label: '베이크', children: <BakePanel /> },
    { key: 'meas', label: '측정', children: <MeasPanel /> },
    { key: 'ship', label: '출하', children: <ShipPanel /> },
  ]
  return <Tabs items={items} size="small" />
}
