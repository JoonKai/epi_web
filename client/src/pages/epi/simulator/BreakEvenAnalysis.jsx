import { useMemo } from 'react'
import { theme, Alert } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useCostStore } from './store'
import { calcBreakEven, calcFullCost, krw } from './calculations'

export default function BreakEvenAnalysis() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice } = useCostStore()
  const { token } = theme.useToken()

  const bep = useMemo(
    () => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice),
    [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice]
  )

  const points = useMemo(() => {
    const maxQ = bep ? Math.max(bep.bepQuantity * 2, lotSize * 1.5, 500) : 2000
    const step = Math.ceil(maxQ / 40)
    const arr = []
    for (let q = 0; q <= maxQ; q += step) {
      const c = calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, q || 1)
      arr.push({
        q,
        totalCost: q === 0 ? bep?.fixedCost ?? 0 : c.totalCost,
        revenue: sellingPrice * q,
      })
    }
    return arr
  }, [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice, lotSize, bep])

  const lineOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `수량: ${krw(params[0]?.axisValue)}매<br/>${params.map(p => `${p.seriesName}: ${krw(Math.round(p.value))}원`).join('<br/>')}`,
    },
    legend: { data: ['총비용', '매출'], bottom: 0, textStyle: { color: token.colorText } },
    xAxis: { type: 'category', data: points.map(p => p.q), name: '수량(매)', axisLabel: { color: token.colorTextSecondary } },
    yAxis: { type: 'value', name: '금액(원)', axisLabel: { color: token.colorTextSecondary, formatter: v => (v / 1e6).toFixed(0) + 'M' } },
    series: [
      { name: '총비용', type: 'line', data: points.map(p => p.totalCost), itemStyle: { color: '#ff4d4f' }, smooth: false, symbol: 'none' },
      { name: '매출', type: 'line', data: points.map(p => p.revenue), itemStyle: { color: '#52c41a' }, smooth: false, symbol: 'none' },
    ],
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
  }

  if (bep) {
    lineOption.series.push({
      name: '손익분기점',
      type: 'scatter',
      data: [[String(bep.bepQuantity), bep.bepRevenue]],
      symbolSize: 12,
      itemStyle: { color: '#faad14' },
    })
  }

  return (
    <div>
      {!bep ? (
        <Alert type="error" message="손익분기 불가: 판매가가 변동원가보다 낮습니다. 판매가를 높이거나 원가를 줄여주세요." style={{ marginBottom: 12 }} />
      ) : (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {[
            { label: '손익분기 수량', value: `${krw(bep.bepQuantity)}매`, color: '#faad14' },
            { label: '손익분기 매출', value: `${krw(Math.round(bep.bepRevenue))}원` },
            { label: '변동원가/매', value: `${krw(Math.round(bep.variableCostPerWafer))}원` },
            { label: '고정비 합계', value: `${krw(Math.round(bep.fixedCost))}원` },
            { label: '단위 공헌마진', value: `${krw(Math.round(bep.margin))}원` },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, textAlign: 'center', padding: 10, background: token.colorFillAlter, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: token.colorTextSecondary }}>{k.label}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}
      <ReactECharts option={lineOption} style={{ height: 320 }} />
      {bep && (
        <div style={{ marginTop: 12, padding: 12, background: token.colorFillAlter, borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>현재 상황 분석</div>
          <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
            목표 생산량 <b>{krw(lotSize)}매</b>는 손익분기({krw(bep.bepQuantity)}매) 대비{' '}
            <b style={{ color: lotSize >= bep.bepQuantity ? '#52c41a' : '#ff4d4f' }}>
              {lotSize >= bep.bepQuantity ? `+${krw(lotSize - bep.bepQuantity)}매 초과 (흑자)` : `${krw(bep.bepQuantity - lotSize)}매 부족 (적자)`}
            </b>
          </div>
        </div>
      )}
    </div>
  )
}
