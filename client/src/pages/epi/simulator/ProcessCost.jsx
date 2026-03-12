import { Button, Form, Input, InputNumber, Popconfirm, Table, Tabs } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import { calcBakeCostPerRun, calcMOCVDCostPerRun, calcShipmentCostPerRun, calcSingleMeasurementCostPerRun, krw } from './calculations'
import { consoleColors } from '../../../theme/consoleTheme'

function NumberField({ label, store, field, min = 0, step = 1, addonAfter }) {
  return (
    <Form.Item label={label} style={{ marginBottom: 10 }}>
      <InputNumber className="console-form" value={store[field]} min={min} step={step} addonAfter={addonAfter} style={{ width: 180 }} onChange={(value) => store.setter({ [field]: value ?? 0 })} />
    </Form.Item>
  )
}

function SummaryList({ rows, total }) {
  return (
    <div className="console-surface" style={{ minWidth: 240 }}>
      <div className="console-label" style={{ marginBottom: 12 }}>런 비용 요약</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(120,145,180,0.12)', color: 'var(--console-text-soft)' }}>
          <span>{label}</span>
          <span>{krw(Math.round(value))}원</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontWeight: 700, color: consoleColors.accent }}>
        <span>합계</span>
        <span>{krw(Math.round(total))}원</span>
      </div>
    </div>
  )
}

function MOCVDPanel() {
  const { mocvd, setMocvd } = useCostStore()
  const cost = calcMOCVDCostPerRun(mocvd)
  const total = Object.values(cost).reduce((sum, value) => sum + value, 0)
  const store = { ...mocvd, setter: setMocvd }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 20 }}>
      <Form className="console-form" layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
        <NumberField label="런당 웨이퍼" store={store} field="wafersPerRun" addonAfter="매" />
        <NumberField label="런 시간" store={store} field="runTimeSec" addonAfter="초" step={600} />
        <NumberField label="셋업 시간" store={store} field="setupTimeSec" addonAfter="초" step={300} />
        <NumberField label="반응기 수" store={store} field="reactorCount" addonAfter="대" />
        <NumberField label="장비비/시간" store={store} field="equipmentCostPerHour" addonAfter="원" step={1000} />
        <NumberField label="유지보수/런" store={store} field="maintenanceCostPerRun" addonAfter="원" step={1000} />
        <NumberField label="작업 인원" store={store} field="workers" addonAfter="명" />
        <NumberField label="시급" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumberField label="불량률" store={store} field="defectRate" addonAfter="%" step={0.5} />
        <NumberField label="전력 사용량" store={store} field="powerConsumptionKW" addonAfter="kW" />
        <NumberField label="전기 요금" store={store} field="electricityRate" addonAfter="원/kWh" />
        <NumberField label="세정 주기" store={store} field="cleaningIntervalRuns" addonAfter="회" />
        <NumberField label="세정 비용" store={store} field="cleaningCostPerSession" addonAfter="원" step={10000} />
      </Form>
      <SummaryList rows={[['인건비', cost.labor], ['장비비', cost.equipment], ['유지보수', cost.maintenance], ['세정', cost.cleaning], ['전력', cost.power]]} total={total} />
    </div>
  )
}

function BakePanel() {
  const { bake, setBake, mocvd } = useCostStore()
  const cost = calcBakeCostPerRun(bake, mocvd.wafersPerRun)
  const total = cost.labor + cost.equipment + cost.maintenance
  const store = { ...bake, setter: setBake }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 20 }}>
      <Form className="console-form" layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
        <NumberField label="웨이퍼당 베이크 시간" store={store} field="bakeTimePerWaferSec" addonAfter="초" step={30} />
        <NumberField label="런당 로딩 시간" store={store} field="loadingTimePerRunSec" addonAfter="초" step={60} />
        <NumberField label="냉각 시간" store={store} field="cooldownTimeSec" addonAfter="초" step={60} />
        <NumberField label="베이크 온도" store={store} field="bakeTemperatureDegC" addonAfter="°C" step={10} />
        <NumberField label="퍼니스 수" store={store} field="furnaceCount" addonAfter="대" />
        <NumberField label="장비비/시간" store={store} field="equipmentCostPerHour" addonAfter="원" step={1000} />
        <NumberField label="작업 인원" store={store} field="workers" addonAfter="명" />
        <NumberField label="시급" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumberField label="유지보수/런" store={store} field="maintenanceCostPerRun" addonAfter="원" step={1000} />
      </Form>
      <SummaryList rows={[['인건비', cost.labor], ['장비비', cost.equipment], ['유지보수', cost.maintenance]]} total={total} />
    </div>
  )
}

function MeasurementPanel() {
  const { measurements, mocvd, addMeasurement, updateMeasurement, removeMeasurement } = useCostStore()
  const wafersPerRun = mocvd.wafersPerRun
  const total = measurements.reduce((sum, item) => {
    const cost = calcSingleMeasurementCostPerRun(item, wafersPerRun)
    return sum + cost.labor + cost.equipment
  }, 0)

  const columns = [
    { title: '측정명', dataIndex: 'name', render: (value, record) => <Input className="console-form" size="small" value={value} onChange={(e) => updateMeasurement(record.id, { name: e.target.value })} /> },
    { title: '장비명', dataIndex: 'equipmentName', render: (value, record) => <Input className="console-form" size="small" value={value} onChange={(e) => updateMeasurement(record.id, { equipmentName: e.target.value })} /> },
    { title: '웨이퍼당 시간', dataIndex: 'timePerWaferSec', render: (value, record) => <InputNumber className="console-form" size="small" value={value} style={{ width: 90 }} onChange={(next) => updateMeasurement(record.id, { timePerWaferSec: next ?? 0 })} /> },
    { title: '샘플링율', dataIndex: 'samplingRate', render: (value, record) => <InputNumber className="console-form" size="small" min={0} max={100} value={value} style={{ width: 90 }} onChange={(next) => updateMeasurement(record.id, { samplingRate: next ?? 0 })} /> },
    { title: '장비비/시간', dataIndex: 'equipmentCostPerHour', render: (value, record) => <InputNumber className="console-form" size="small" value={value} style={{ width: 110 }} onChange={(next) => updateMeasurement(record.id, { equipmentCostPerHour: next ?? 0 })} /> },
    { title: '유지보수/런', dataIndex: 'maintenanceCostPerRun', render: (value, record) => <InputNumber className="console-form" size="small" value={value} style={{ width: 110 }} onChange={(next) => updateMeasurement(record.id, { maintenanceCostPerRun: next ?? 0 })} /> },
    { title: '런당 비용', render: (_, record) => `${krw(Math.round(calcSingleMeasurementCostPerRun(record, wafersPerRun).labor + calcSingleMeasurementCostPerRun(record, wafersPerRun).equipment))}원` },
    { title: '', width: 56, render: (_, record) => <Popconfirm title="측정 항목을 삭제할까요?" onConfirm={() => removeMeasurement(record.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="console-toolbar">
        <div className="console-pill">측정 비용 {krw(Math.round(total))}원 / 런</div>
        <Button className="console-button" icon={<PlusOutlined />} onClick={() => addMeasurement({ id: `m_${Date.now()}`, name: '신규 측정', equipmentName: '장비', timePerWaferSec: 60, samplingRate: 100, equipmentCostPerHour: 10000, workers: 1, hourlyWage: 18000, loadingTimeSec: 300, maintenanceCostPerRun: 3000 })}>측정 추가</Button>
      </div>
      <Table className="console-table" dataSource={measurements} rowKey="id" columns={columns} size="small" pagination={false} />
    </div>
  )
}

function ShippingPanel() {
  const { shipment, setShipment, mocvd } = useCostStore()
  const cost = calcShipmentCostPerRun(shipment, mocvd.wafersPerRun)
  const total = cost.labor + cost.material + cost.equipment
  const store = { ...shipment, setter: setShipment }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 20 }}>
      <Form className="console-form" layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
        <NumberField label="웨이퍼당 포장 시간" store={store} field="packingTimePerWaferSec" addonAfter="초" step={10} />
        <NumberField label="웨이퍼당 검사 시간" store={store} field="inspectionTimePerWaferSec" addonAfter="초" step={10} />
        <NumberField label="문서 작성 시간" store={store} field="documentationTimeSec" addonAfter="초" step={300} />
        <NumberField label="포장재 비용" store={store} field="packagingMaterialCost" addonAfter="원" step={100} />
        <NumberField label="웨이퍼당 배송비" store={store} field="shippingCostPerWafer" addonAfter="원" step={100} />
        <NumberField label="웨이퍼당 보험료" store={store} field="insuranceCostPerWafer" addonAfter="원" step={10} />
        <NumberField label="작업 인원" store={store} field="workers" addonAfter="명" />
        <NumberField label="시급" store={store} field="hourlyWage" addonAfter="원" step={1000} />
        <NumberField label="검사 장비비/시간" store={store} field="inspectionEquipmentCostPerHour" addonAfter="원" step={1000} />
        <NumberField label="출하 불량률" store={store} field="shipmentDefectRate" addonAfter="%" step={0.1} />
      </Form>
      <SummaryList rows={[['인건비', cost.labor], ['자재비', cost.material], ['장비비', cost.equipment]]} total={total} />
    </div>
  )
}

export default function ProcessCost() {
  return <Tabs className="console-tabs" items={[{ key: 'mocvd', label: 'MOCVD', children: <MOCVDPanel /> }, { key: 'bake', label: '베이크', children: <BakePanel /> }, { key: 'measurement', label: '측정', children: <MeasurementPanel /> }, { key: 'shipping', label: '출하', children: <ShippingPanel /> }]} />
}
