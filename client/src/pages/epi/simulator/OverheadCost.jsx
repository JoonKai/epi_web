import { Divider, Form, InputNumber } from 'antd'
import { useCostStore } from './store'
import { calcFixedOverhead, calcSellingAdminCost, krw } from './calculations'
import { consoleColors } from '../../../theme/consoleTheme'

function Field({ label, value, onChange }) {
  return (
    <Form.Item label={label} style={{ marginBottom: 10 }}>
      <InputNumber className="console-form" value={value} min={0} step={100000} addonAfter="원" style={{ width: 220 }} formatter={(next) => `${next}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(next) => next.replace(/,/g, '')} onChange={(next) => onChange(next ?? 0)} />
    </Form.Item>
  )
}

function Summary({ title, total }) {
  return (
    <div className="console-kpi">
      <div className="console-label">{title}</div>
      <div className="console-number" style={{ marginTop: 8, fontSize: 26, color: consoleColors.accent }}>{krw(Math.round(total))}원</div>
    </div>
  )
}

export default function OverheadCost() {
  const { overhead, setOverhead } = useCostStore()
  const fixedTotal = calcFixedOverhead(overhead)
  const adminTotal = calcSellingAdminCost(overhead)
  const setField = (field) => (value) => setOverhead({ [field]: value })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="console-surface">
        <div className="console-label" style={{ marginBottom: 14 }}>제조 고정비</div>
        <Form className="console-form" layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
          <Field label="전기료" value={overhead.electricity} onChange={setField('electricity')} />
          <Field label="냉각수" value={overhead.coolingWater} onChange={setField('coolingWater')} />
          <Field label="클린룸 유지" value={overhead.cleanroomMaint} onChange={setField('cleanroomMaint')} />
          <Field label="질소" value={overhead.nitrogen} onChange={setField('nitrogen')} />
          <Field label="감가상각" value={overhead.depreciation} onChange={setField('depreciation')} />
          <Field label="소모품" value={overhead.consumables} onChange={setField('consumables')} />
        </Form>
        <Divider style={{ borderColor: 'rgba(120,145,180,0.12)' }} />
        <Summary title="제조 고정비 합계" total={fixedTotal} />
      </div>
      <div className="console-surface">
        <div className="console-label" style={{ marginBottom: 14 }}>판매관리비</div>
        <Form className="console-form" layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
          <Field label="영업비" value={overhead.salesExpense} onChange={setField('salesExpense')} />
          <Field label="물류비" value={overhead.logisticsCost} onChange={setField('logisticsCost')} />
          <Field label="관리비" value={overhead.adminCost} onChange={setField('adminCost')} />
        </Form>
        <Divider style={{ borderColor: 'rgba(120,145,180,0.12)' }} />
        <Summary title="판매관리비 합계" total={adminTotal} />
        <div className="console-kpi" style={{ marginTop: 12 }}>
          <div className="console-label">총 고정비</div>
          <div className="console-number" style={{ marginTop: 8, fontSize: 30, color: 'var(--console-text)' }}>{krw(Math.round(fixedTotal + adminTotal))}원</div>
        </div>
      </div>
    </div>
  )
}
