import { useMemo } from 'react'
import { Row, Col, Card, Statistic, theme } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useCostStore } from './store'
import { calcFullCost, calcBreakEven, krw } from './calculations'

export default function SimDashboard() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice } = useCostStore()
  const { token } = theme.useToken()

  const cost = useMemo(() => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize), [bom, mocvd, bake, measurements, shipment, overhead, lotSize])
  const bep = useMemo(() => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice), [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice])

  const profit = sellingPrice - cost.unitCost
  const profitRate = cost.unitCost > 0 ? (profit / cost.unitCost) * 100 : 0
  const totalRevenue = sellingPrice * lotSize
  const totalProfit = totalRevenue - cost.totalCost
  const yieldPct = (cost.totalYield * 100).toFixed(1)

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, textStyle: { color: token.colorText } },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { name: '직접재료비', value: Math.round(cost.directMaterial), itemStyle: { color: '#4f7fff' } },
        { name: '직접노무비', value: Math.round(cost.directLabor), itemStyle: { color: '#52c41a' } },
        { name: '제조경비', value: Math.round(cost.manufacturingOverhead), itemStyle: { color: '#faad14' } },
        { name: '판매관리비', value: Math.round(cost.sellingAdminCost), itemStyle: { color: '#ff4d4f' } },
      ],
      label: { formatter: '{b}\n{d}%', color: token.colorText },
    }],
  }

  // 자재 카테고리별 비용
  const catMap = {}
  for (const item of bom) {
    const cost_ = item.usagePerRun * item.unitPrice
    catMap[item.category] = (catMap[item.category] || 0) + cost_
  }
  const barOption = {
    tooltip: { formatter: (p) => `${p.name}: ${krw(p.value)}원` },
    xAxis: { type: 'value', axisLabel: { color: token.colorTextSecondary } },
    yAxis: { type: 'category', data: Object.keys(catMap), axisLabel: { color: token.colorTextSecondary } },
    series: [{ type: 'bar', data: Object.values(catMap), itemStyle: { color: '#4f7fff' } }],
    grid: { left: 80, right: 20, top: 10, bottom: 20 },
  }

  const kpi1 = [
    { title: '웨이퍼 단가', value: `${krw(Math.round(cost.unitCost))}원` },
    { title: '단위 이익률', value: `${profitRate.toFixed(1)}%`, color: profit >= 0 ? '#52c41a' : '#ff4d4f', suffix: profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined /> },
    { title: '손익분기 수량', value: bep ? `${krw(bep.bepQuantity)}매` : '불가' },
    { title: '종합 수율', value: `${yieldPct}%` },
  ]
  const kpi2 = [
    { title: '목표 생산량', value: `${krw(lotSize)}매` },
    { title: '총 원가', value: `${krw(Math.round(cost.totalCost))}원` },
    { title: '예상 매출', value: `${krw(Math.round(totalRevenue))}원` },
    { title: '예상 이익', value: `${krw(Math.round(totalProfit))}원`, color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={[12, 12]}>
        {kpi1.map(k => (
          <Col key={k.title} span={6}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic title={k.title} value={k.value} valueStyle={{ fontSize: 18, color: k.color }} suffix={k.suffix} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[12, 12]}>
        {kpi2.map(k => (
          <Col key={k.title} span={6}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic title={k.title} value={k.value} valueStyle={{ fontSize: 18, color: k.color }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[12, 12]}>
        <Col span={10}>
          <Card title="원가 구성" size="small" style={{ borderRadius: 8 }}>
            <ReactECharts option={pieOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="자재 카테고리별 1런 비용" size="small" style={{ borderRadius: 8 }}>
            <ReactECharts option={barOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
