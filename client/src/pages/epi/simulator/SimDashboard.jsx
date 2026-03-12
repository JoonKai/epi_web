import { useMemo } from 'react'
import { Card, Statistic } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import { calcBreakEven, calcFullCost, krw } from './calculations'
import { ConsoleChart, consoleColors, makeChartBase } from '../../../theme/consoleTheme'

export default function SimDashboard() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice } = useCostStore()
  const cost = useMemo(() => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize), [bom, mocvd, bake, measurements, shipment, overhead, lotSize])
  const bep = useMemo(() => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice), [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice])

  const profitPerWafer = sellingPrice - cost.unitCost
  const totalRevenue = sellingPrice * lotSize
  const totalProfit = totalRevenue - cost.totalCost

  const pieOption = {
    ...makeChartBase('원가 비중'),
    tooltip: { trigger: 'item' },
    legend: { ...makeChartBase().legend, bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '44%'],
      itemStyle: { borderColor: '#0b1220', borderWidth: 4 },
      label: { color: consoleColors.textSoft, formatter: '{b}\n{d}%' },
      data: [
        { value: Math.round(cost.directMaterial), name: '직접재료비', itemStyle: { color: consoleColors.accent } },
        { value: Math.round(cost.directLabor), name: '직접노무비', itemStyle: { color: consoleColors.warning } },
        { value: Math.round(cost.manufacturingOverhead), name: '제조간접비', itemStyle: { color: consoleColors.info } },
        { value: Math.round(cost.sellingAdminCost), name: '판매관리비', itemStyle: { color: consoleColors.danger } },
      ],
    }],
  }

  const categoryMap = bom.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.usagePerRun * item.unitPrice
    return acc
  }, {})

  const barOption = {
    ...makeChartBase('자재 카테고리별 비용'),
    xAxis: { ...makeChartBase().xAxis, type: 'value' },
    yAxis: { ...makeChartBase().yAxis, type: 'category', data: Object.keys(categoryMap) },
    series: [{ type: 'bar', data: Object.values(categoryMap), barWidth: 16, itemStyle: { color: consoleColors.accent, borderRadius: [0, 8, 8, 0] } }],
  }

  const metrics = [
    { label: '단위원가', value: `${krw(Math.round(cost.unitCost))}원`, tone: consoleColors.text },
    { label: '매당 이익', value: `${krw(Math.round(profitPerWafer))}원`, tone: profitPerWafer >= 0 ? consoleColors.success : consoleColors.danger, suffix: profitPerWafer >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined /> },
    { label: '손익분기 수량', value: bep ? `${krw(Math.round(bep.bepQuantity))}매` : '계산 불가', tone: consoleColors.warning },
    { label: '수율', value: `${(cost.totalYield * 100).toFixed(1)}%`, tone: consoleColors.info },
    { label: '생산량', value: `${krw(lotSize)}매`, tone: consoleColors.text },
    { label: '총원가', value: `${krw(Math.round(cost.totalCost))}원`, tone: consoleColors.accent },
    { label: '예상 매출', value: `${krw(Math.round(totalRevenue))}원`, tone: consoleColors.info },
    { label: '예상 이익', value: `${krw(Math.round(totalProfit))}원`, tone: totalProfit >= 0 ? consoleColors.success : consoleColors.danger },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="console-stat-grid">
        {metrics.map((item) => (
          <Card key={item.label} className="console-panel console-metric-card" styles={{ body: { padding: 16 } }}>
            <Statistic title={<span className="console-label">{item.label}</span>} value={item.value} valueStyle={{ color: item.tone, fontSize: 22, fontWeight: 800 }} suffix={item.suffix} />
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <Card className="console-panel" styles={{ body: { padding: 10 } }}><ConsoleChart option={pieOption} style={{ height: 300 }} /></Card>
        <Card className="console-panel" styles={{ body: { padding: 10 } }}><ConsoleChart option={barOption} style={{ height: 300 }} /></Card>
      </div>
    </div>
  )
}
