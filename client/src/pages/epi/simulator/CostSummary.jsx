import { useMemo } from 'react'
import { Table, theme } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useCostStore } from './store'
import { calcFullCost, krw } from './calculations'

export default function CostSummary() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize } = useCostStore()
  const { token } = theme.useToken()

  const cost = useMemo(
    () => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize),
    [bom, mocvd, bake, measurements, shipment, overhead, lotSize]
  )

  const rows = [
    { key: '1', label: '직접재료비', value: cost.directMaterial, note: `${cost.runCount}런 × 자재비` },
    { key: '2', label: '직접노무비', value: cost.directLabor, note: 'MOCVD/베이크/측정/출하 인건비' },
    { key: '3', label: '제조경비', value: cost.manufacturingOverhead, note: '장비비+유지보수+고정경비+포장재' },
    { key: '4', label: '제조원가', value: cost.manufacturingCost, note: '직접재료+직접노무+제조경비', bold: true },
    { key: '5', label: '판매관리비', value: cost.sellingAdminCost, note: '영업비+물류비+관리비' },
    { key: '6', label: '총원가', value: cost.totalCost, note: `로트 ${krw(lotSize)}매 기준`, bold: true, color: '#4f7fff' },
    { key: '7', label: '단위원가 (매당)', value: cost.unitCost, note: '1매당 원가', bold: true, color: '#52c41a' },
    { key: '8', label: '런당 원가', value: cost.costPerRun, note: `총 ${cost.runCount}런` },
    { key: '9', label: '종합 수율', value: null, text: `${(cost.totalYield * 100).toFixed(1)}%`, note: 'MOCVD 불량률 + 출하 불량률 반영' },
  ]

  const columns = [
    { title: '항목', dataIndex: 'label', width: 160, render: (v, r) => <span style={{ fontWeight: r.bold ? 700 : 400 }}>{v}</span> },
    {
      title: '금액(원)', dataIndex: 'value', align: 'right', width: 160,
      render: (v, r) => r.text
        ? <span style={{ fontWeight: r.bold ? 700 : 400 }}>{r.text}</span>
        : <span style={{ fontWeight: r.bold ? 700 : 400, color: r.color }}>{krw(Math.round(v))}원</span>
    },
    { title: '비고', dataIndex: 'note', render: (v) => <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>{v}</span> },
  ]

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, textStyle: { color: token.colorText } },
    series: [{
      type: 'pie', radius: ['35%', '65%'],
      data: [
        { name: '직접재료비', value: Math.round(cost.directMaterial), itemStyle: { color: '#4f7fff' } },
        { name: '직접노무비', value: Math.round(cost.directLabor), itemStyle: { color: '#52c41a' } },
        { name: '제조경비', value: Math.round(cost.manufacturingOverhead), itemStyle: { color: '#faad14' } },
        { name: '판매관리비', value: Math.round(cost.sellingAdminCost), itemStyle: { color: '#ff4d4f' } },
      ],
      label: { formatter: '{b}\n{d}%', color: token.colorText },
    }],
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <Table dataSource={rows} columns={columns} size="small" pagination={false}
          rowClassName={(r) => r.bold ? 'font-bold' : ''}
        />
      </div>
      <div style={{ width: 300 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>원가 구성 비율</div>
        <ReactECharts option={pieOption} style={{ height: 280 }} />
      </div>
    </div>
  )
}
