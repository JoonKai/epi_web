import { useMemo } from 'react'
import { Form, InputNumber, Slider } from 'antd'
import { useCostStore } from './store'
import { calcFullCost, krw } from './calculations'
import { ConsoleChart, consoleColors, makeChartBase } from '../../../theme/consoleTheme'

export default function LotSimulation() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice, setLotSize, setSellingPrice } = useCostStore()

  const points = useMemo(() => {
    const rows = []
    for (let qty = 100; qty <= 5000; qty += 100) {
      const cost = calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, qty)
      rows.push({ qty, unitCost: cost.unitCost, totalCost: cost.totalCost, revenue: sellingPrice * qty, profit: sellingPrice * qty - cost.totalCost })
    }
    return rows
  }, [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice])

  const current = useMemo(() => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize), [bom, mocvd, bake, measurements, shipment, overhead, lotSize])

  const option = {
    ...makeChartBase('로트 수익 분석'),
    tooltip: { ...makeChartBase().tooltip, formatter: (params) => [`생산량 ${params[0]?.axisValue}매`, ...params.map((p) => `${p.seriesName}: ${krw(Math.round(p.value))}원`)].join('<br/>') },
    legend: { ...makeChartBase().legend, bottom: 0 },
    xAxis: { ...makeChartBase().xAxis, type: 'category', data: points.map((p) => p.qty) },
    yAxis: [{ ...makeChartBase().yAxis, type: 'value' }, { ...makeChartBase().yAxis, type: 'value' }],
    series: [
      { name: '단위원가', type: 'line', data: points.map((p) => p.unitCost), smooth: true, symbol: 'none', lineStyle: { color: consoleColors.accent, width: 3 } },
      { name: '판매단가', type: 'line', data: points.map(() => sellingPrice), smooth: true, symbol: 'none', lineStyle: { color: consoleColors.warning, type: 'dashed', width: 2 } },
      { name: '매출', type: 'line', yAxisIndex: 1, data: points.map((p) => p.revenue), smooth: true, symbol: 'none', lineStyle: { color: consoleColors.info, width: 2 } },
      { name: '이익', type: 'line', yAxisIndex: 1, data: points.map((p) => p.profit), smooth: true, symbol: 'none', lineStyle: { color: consoleColors.success, width: 2 }, areaStyle: { color: 'rgba(53,208,127,0.08)' } },
    ],
  }

  const summaries = [
    { label: '현재 단위원가', value: `${krw(Math.round(current.unitCost))}원`, tone: consoleColors.text },
    { label: '예상 매출', value: `${krw(Math.round(sellingPrice * lotSize))}원`, tone: consoleColors.info },
    { label: '예상 이익', value: `${krw(Math.round(sellingPrice * lotSize - current.totalCost))}원`, tone: sellingPrice * lotSize - current.totalCost >= 0 ? consoleColors.success : consoleColors.danger },
    { label: '필요 런 수', value: `${current.runCount}회`, tone: consoleColors.warning },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Form className="console-form" layout="inline">
        <Form.Item label="생산량"><InputNumber value={lotSize} min={100} max={10000} step={100} addonAfter="매" style={{ width: 150 }} onChange={(value) => setLotSize(value ?? 100)} /></Form.Item>
        <Form.Item label="판매단가"><InputNumber value={sellingPrice} min={0} step={1000} addonAfter="원/매" style={{ width: 180 }} onChange={(value) => setSellingPrice(value ?? 0)} /></Form.Item>
      </Form>
      <Slider value={lotSize} min={100} max={5000} step={100} marks={{ 100: '100', 1000: '1K', 2000: '2K', 3000: '3K', 4000: '4K', 5000: '5K' }} onChange={setLotSize} trackStyle={{ background: consoleColors.accent }} railStyle={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="console-surface"><ConsoleChart option={option} style={{ height: 340 }} /></div>
      <div className="console-summary-grid">
        {summaries.map((item) => (
          <div key={item.label} className="console-kpi">
            <div className="console-label">{item.label}</div>
            <div className="console-number" style={{ color: item.tone, marginTop: 8, fontSize: 22 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
