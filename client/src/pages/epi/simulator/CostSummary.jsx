import { useMemo } from 'react'
import { Table } from 'antd'
import { useCostStore } from './store'
import { calcFullCost, krw } from './calculations'
import { ConsoleChart, consoleColors, makeChartBase } from '../../../theme/consoleTheme'

export default function CostSummary() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize } = useCostStore()
  const cost = useMemo(() => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize), [bom, mocvd, bake, measurements, shipment, overhead, lotSize])

  const rows = [
    { key: '1', label: '직접재료비', value: cost.directMaterial, note: `${cost.runCount}회 기준 원자재 사용량` },
    { key: '2', label: '직접노무비', value: cost.directLabor, note: 'MOCVD / 베이크 / 측정 / 출하 인건비' },
    { key: '3', label: '제조간접비', value: cost.manufacturingOverhead, note: '설비비, 유지보수, 고정 제조경비 포함' },
    { key: '4', label: '제조원가', value: cost.manufacturingCost, note: '직접재료 + 직접노무 + 제조간접비', strong: true },
    { key: '5', label: '판매관리비', value: cost.sellingAdminCost, note: '영업비, 물류비, 관리비' },
    { key: '6', label: '총원가', value: cost.totalCost, note: `생산량 ${krw(lotSize)}매 기준`, strong: true, color: consoleColors.accent },
    { key: '7', label: '단위원가', value: cost.unitCost, note: '매당 기준 원가', strong: true, color: consoleColors.success },
    { key: '8', label: '런당 원가', value: cost.costPerRun, note: `총 ${cost.runCount}회 기준` },
    { key: '9', label: '총수율', text: `${(cost.totalYield * 100).toFixed(1)}%`, note: '공정 및 출하 불량률 반영' },
  ]

  const columns = [
    { title: '항목', dataIndex: 'label', render: (value, record) => <span style={{ fontWeight: record.strong ? 700 : 500, color: 'var(--console-text)' }}>{value}</span> },
    { title: '값', dataIndex: 'value', align: 'right', render: (value, record) => (record.text ? <span style={{ color: 'var(--console-text)', fontWeight: record.strong ? 700 : 500 }}>{record.text}</span> : <span style={{ color: record.color ?? 'var(--console-text)', fontWeight: record.strong ? 700 : 500 }}>{krw(Math.round(value))}원</span>) },
    { title: '비고', dataIndex: 'note', render: (value) => <span style={{ color: 'var(--console-text-soft)' }}>{value}</span> },
  ]

  const option = {
    ...makeChartBase('원가 구성 비율'),
    tooltip: { trigger: 'item' },
    legend: { ...makeChartBase().legend, bottom: 0 },
    series: [{ type: 'pie', radius: ['45%', '72%'], center: ['50%', '42%'], label: { color: 'var(--console-text-soft)', formatter: '{b}\n{d}%' }, itemStyle: { borderColor: '#0b1220', borderWidth: 4 }, data: [{ name: '직접재료비', value: Math.round(cost.directMaterial), itemStyle: { color: consoleColors.accent } }, { name: '직접노무비', value: Math.round(cost.directLabor), itemStyle: { color: consoleColors.warning } }, { name: '제조간접비', value: Math.round(cost.manufacturingOverhead), itemStyle: { color: consoleColors.info } }, { name: '판매관리비', value: Math.round(cost.sellingAdminCost), itemStyle: { color: consoleColors.danger } }] }],
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
      <Table className="console-table" dataSource={rows} columns={columns} pagination={false} size="small" />
      <div className="console-surface"><ConsoleChart option={option} style={{ height: 300 }} /></div>
    </div>
  )
}
