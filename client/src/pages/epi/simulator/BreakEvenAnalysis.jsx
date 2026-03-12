import { useMemo } from 'react'
import { Alert } from 'antd'
import { useCostStore } from './store'
import { calcBreakEven, calcFullCost, krw } from './calculations'
import { ConsoleChart, consoleColors, makeChartBase } from '../../../theme/consoleTheme'

export default function BreakEvenAnalysis() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice } = useCostStore()
  const bep = useMemo(() => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice), [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice])
  const points = useMemo(() => {
    const maxQty = bep ? Math.max(bep.bepQuantity * 2, lotSize * 1.5, 500) : 2000
    const step = Math.ceil(maxQty / 36)
    const rows = []
    for (let qty = 0; qty <= maxQty; qty += step) {
      const cost = calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, qty || 1)
      rows.push({ qty, totalCost: qty === 0 ? bep?.fixedCost ?? 0 : cost.totalCost, revenue: sellingPrice * qty })
    }
    return rows
  }, [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice, lotSize, bep])

  const option = {
    ...makeChartBase('손익분기점 곡선'),
    tooltip: { ...makeChartBase().tooltip, formatter: (params) => [`생산량 ${params[0]?.axisValue}매`, ...params.map((p) => `${p.seriesName}: ${krw(Math.round(p.value))}원`)].join('<br/>') },
    legend: { ...makeChartBase().legend, bottom: 0 },
    xAxis: { ...makeChartBase().xAxis, type: 'category', data: points.map((p) => p.qty) },
    yAxis: { ...makeChartBase().yAxis, type: 'value' },
    series: [
      { name: '총원가', type: 'line', data: points.map((p) => p.totalCost), symbol: 'none', lineStyle: { color: consoleColors.danger, width: 3 } },
      { name: '매출', type: 'line', data: points.map((p) => p.revenue), symbol: 'none', lineStyle: { color: consoleColors.success, width: 3 } },
      ...(bep ? [{ name: '손익분기점', type: 'scatter', data: [[String(Math.round(bep.bepQuantity)), bep.bepRevenue]], symbolSize: 14, itemStyle: { color: consoleColors.warning } }] : []),
    ],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!bep ? (
        <Alert type="error" showIcon message="현재 판매단가가 변동원가보다 낮아 손익분기점이 계산되지 않습니다." description="판매 가격을 높이거나 공정 원가를 낮춘 뒤 다시 확인하세요." style={{ background: 'rgba(255,91,110,0.08)', borderColor: 'rgba(255,91,110,0.26)', color: 'var(--console-text)' }} />
      ) : (
        <div className="console-summary-grid">
          <div className="console-kpi"><div className="console-label">손익분기 수량</div><div className="console-number" style={{ color: consoleColors.warning, marginTop: 8, fontSize: 24 }}>{krw(Math.round(bep.bepQuantity))}매</div></div>
          <div className="console-kpi"><div className="console-label">손익분기 매출</div><div className="console-number" style={{ color: consoleColors.info, marginTop: 8, fontSize: 24 }}>{krw(Math.round(bep.bepRevenue))}원</div></div>
          <div className="console-kpi"><div className="console-label">변동원가</div><div className="console-number" style={{ marginTop: 8, fontSize: 24 }}>{krw(Math.round(bep.variableCostPerWafer))}원/매</div></div>
          <div className="console-kpi"><div className="console-label">고정비</div><div className="console-number" style={{ marginTop: 8, fontSize: 24 }}>{krw(Math.round(bep.fixedCost))}원</div></div>
          <div className="console-kpi"><div className="console-label">현재 차이</div><div className="console-number" style={{ marginTop: 8, fontSize: 24, color: lotSize >= bep.bepQuantity ? consoleColors.success : consoleColors.danger }}>{lotSize >= bep.bepQuantity ? `+${krw(Math.round(lotSize - bep.bepQuantity))}매` : `-${krw(Math.round(bep.bepQuantity - lotSize))}매`}</div></div>
        </div>
      )}
      <div className="console-surface"><ConsoleChart option={option} style={{ height: 340 }} /></div>
    </div>
  )
}
