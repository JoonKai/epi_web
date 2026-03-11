import { Form, InputNumber, Divider } from 'antd'
import { useCostStore } from './store'
import { calcFixedOverhead, calcSellingAdminCost, krw } from './calculations'

function Field({ label, value, onChange }) {
  return (
    <Form.Item label={label} style={{ marginBottom: 10 }}>
      <InputNumber
        value={value}
        min={0}
        step={100000}
        addonAfter="원/월"
        style={{ width: 200 }}
        formatter={v => v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={v => v.replace(/,/g, '')}
        onChange={v => onChange(v ?? 0)}
      />
    </Form.Item>
  )
}

export default function OverheadCost() {
  const { overhead, setOverhead } = useCostStore()
  const fixedTotal = calcFixedOverhead(overhead)
  const adminTotal = calcSellingAdminCost(overhead)

  const set = (field) => (v) => setOverhead({ [field]: v })

  return (
    <div style={{ display: 'flex', gap: 40 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>제조 고정경비 (월)</div>
        <Form layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
          <Field label="전기료" value={overhead.electricity} onChange={set('electricity')} />
          <Field label="냉각수" value={overhead.coolingWater} onChange={set('coolingWater')} />
          <Field label="클린룸 유지" value={overhead.cleanroomMaint} onChange={set('cleanroomMaint')} />
          <Field label="질소" value={overhead.nitrogen} onChange={set('nitrogen')} />
          <Field label="감가상각" value={overhead.depreciation} onChange={set('depreciation')} />
          <Field label="소모품" value={overhead.consumables} onChange={set('consumables')} />
        </Form>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#4f7fff' }}>
          <span>월 제조경비 합계</span>
          <span>{krw(Math.round(fixedTotal))}원</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>판매관리비 (월)</div>
        <Form layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
          <Field label="영업비" value={overhead.salesExpense} onChange={set('salesExpense')} />
          <Field label="물류비" value={overhead.logisticsCost} onChange={set('logisticsCost')} />
          <Field label="관리비" value={overhead.adminCost} onChange={set('adminCost')} />
        </Form>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#4f7fff' }}>
          <span>월 판매관리비 합계</span>
          <span>{krw(Math.round(adminTotal))}원</span>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: '#f0f5ff', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
            <span>월 총 고정비</span>
            <span style={{ color: '#4f7fff' }}>{krw(Math.round(fixedTotal + adminTotal))}원</span>
          </div>
        </div>
      </div>
    </div>
  )
}
