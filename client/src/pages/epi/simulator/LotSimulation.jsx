import { useMemo } from 'react'
import { Slider, InputNumber, Form, theme } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useCostStore } from './store'
import { calcFullCost, krw } from './calculations'

export default function LotSimulation() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice, setLotSize, setSellingPrice } = useCostStore()
  const { token } = theme.useToken()

  const points = useMemo(() => {
    const arr = []
    for (let q = 100; q <= 5000; q += 100) {
      const c = calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, q)
      arr.push({ q, unitCost: c.unitCost, totalCost: c.totalCost, revenue: sellingPrice * q, profit: sellingPrice * q - c.totalCost })
    }
    return arr
  }, [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice])

  const current = useMemo(
    () => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize),
    [bom, mocvd, bake, measurements, shipment, overhead, lotSize]
  )

  const lineOption = {
    tooltip: { trigger: 'axis', formatter: (params) => params.map(p => `${p.seriesName}: ${krw(Math.round(p.value))}원`).join('<br/>') },
    legend: { data: ['단위원가', '판매가', '매출', '이익'], bottom: 0, textStyle: { color: token.colorText } },
    xAxis: { type: 'category', data: points.map(p => p.q), name: '수량(매)', axisLabel: { color: token.colorTextSecondary } },
    yAxis: [
      { type: 'value', name: '단위(원)', axisLabel: { color: token.colorTextSecondary, formatter: v => krw(v) } },
      { type: 'value', name: '총액(원)', axisLabel: { color: token.colorTextSecondary, formatter: v => (v / 1e6).toFixed(0) + 'M' } },
    ],
    series: [
      { name: '단위원가', type: 'line', data: points.map(p => p.unitCost), itemStyle: { color: '#ff4d4f' }, smooth: true },
      { name: '판매가', type: 'line', data: points.map(() => sellingPrice), itemStyle: { color: '#52c41a' }, lineStyle: { type: 'dashed' } },
      { name: '매출', type: 'line', data: points.map(p => p.revenue), yAxisIndex: 1, itemStyle: { color: '#4f7fff' }, smooth: true },
      { name: '이익', type: 'line', data: points.map(p => p.profit), yAxisIndex: 1, itemStyle: { color: '#faad14' }, smooth: true, areaStyle: { opacity: 0.1 } },
    ],
    grid: { left: 70, right: 80, top: 20, bottom: 50 },
    markLine: { data: [{ xAxis: lotSize, lineStyle: { color: '#ff4d4f', type: 'solid' } }] },
  }

  return (
    <div>
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="목표 생산량">
          <InputNumber value={lotSize} min={100} max={10000} step={100} addonAfter="매"
            style={{ width: 140 }} onChange={v => setLotSize(v ?? 100)} />
        </Form.Item>
        <Form.Item label="판매가">
          <InputNumber value={sellingPrice} min={0} step={1000} addonAfter="원/매"
            style={{ width: 160 }} onChange={v => setSellingPrice(v ?? 0)} />
        </Form.Item>
      </Form>
      <Slider value={lotSize} min={100} max={5000} step={100}
        marks={{ 100: '100', 1000: '1K', 2000: '2K', 3000: '3K', 4000: '4K', 5000: '5K' }}
        onChange={setLotSize} style={{ marginBottom: 24 }}
      />
      <ReactECharts option={lineOption} style={{ height: 300 }} />
      <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
        {[
          { label: '현재 단위원가', value: `${krw(Math.round(current.unitCost))}원` },
          { label: '예상 매출', value: `${krw(Math.round(sellingPrice * lotSize))}원` },
          { label: '예상 이익', value: `${krw(Math.round(sellingPrice * lotSize - current.totalCost))}원`, color: sellingPrice * lotSize - current.totalCost >= 0 ? '#52c41a' : '#ff4d4f' },
          { label: '필요 런수', value: `${current.runCount}런` },
        ].map(k => (
          <div key={k.label} style={{ flex: 1, textAlign: 'center', padding: 8, background: token.colorFillAlter, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.label}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
