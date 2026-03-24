import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import dayjs from 'dayjs'

const SOURCE_COLORS = [
  '#fbbf24', '#60a5fa', '#fb7185', '#f472b6',
  '#a78bfa', '#fb923c', '#e879f9', '#34d399',
  '#67e8f9', '#f87171',
]

export default function SourceRidgelineChart({ sourceOrder, cellData, machines, forecastDays = 30, historyData = [] }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  // 소스별 일별 예측 잔량 합산 (과거 실적 + 미래 예측)
  const ridgeData = useMemo(() => {
    const activeSources = sourceOrder.filter(src =>
      machines.some(m => !cellData[`${m.machine_no}:${src}`]?.is_disabled)
    )

    const today = dayjs().startOf('day')

    return activeSources.map((src, si) => {
      // 과거 실적 집계
      const pastByDate = {}
      historyData.forEach(row => {
        if (row.source_name !== src) return
        const cell = cellData[`${row.machine_no}:${src}`]
        if (cell?.is_disabled) return
        if (!pastByDate[row.recorded_date]) pastByDate[row.recorded_date] = 0
        pastByDate[row.recorded_date] += row.remaining
      })

      const pastPoints = Object.entries(pastByDate)
        .map(([dateStr, value]) => ({
          day: dayjs(dateStr).diff(today, 'day'),
          value,
        }))
        .filter(p => p.day < 0 && p.day >= -forecastDays)
        .sort((a, b) => a.day - b.day)

      // 오늘 + 미래 예측
      const futurePoints = Array.from({ length: forecastDays + 1 }, (_, day) => {
        let total = 0
        machines.forEach(m => {
          const cell = cellData[`${m.machine_no}:${src}`]
          if (!cell || cell.is_disabled) return
          const remaining = cell.remaining ?? 0
          const daily = cell.daily_usage ?? 0
          total += daily > 0 ? Math.max(0, remaining - day * daily) : remaining
        })
        return { day, value: total }
      })

      const points = [...pastPoints, ...futurePoints]
      const vals = points.map(p => p.value)
      const maxVal = vals.length ? Math.max(...vals) : 0
      const minVal = vals.length ? Math.min(...vals) : 0
      const depletionRate = maxVal > 0 ? (maxVal - minVal) / maxVal : 0

      return {
        src,
        color: SOURCE_COLORS[si % SOURCE_COLORS.length],
        points,
        pastCount: pastPoints.length,
        maxVal,
        minVal,
        depletionRate,
      }
    }).sort((a, b) => b.depletionRate - a.depletionRate)
  }, [sourceOrder, cellData, machines, forecastDays, historyData])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || ridgeData.length === 0) return

    const W = containerRef.current.clientWidth || 800
    const n = ridgeData.length
    const bandH = 32
    const overlap = 20
    const marginL = 68
    const marginR = 16
    const marginT = 10
    const marginB = 24
    const H = marginT + n * bandH + overlap + marginB

    const innerW = W - marginL - marginR
    const innerH = n * bandH

    // X 도메인: 과거 최대 범위 ~ 예측 끝
    const minDay = ridgeData.reduce((acc, rd) => {
      const m = rd.points.length ? Math.min(...rd.points.map(p => p.day)) : 0
      return Math.min(acc, m)
    }, 0)
    const maxDay = forecastDays

    d3.select(svgRef.current).selectAll('*').remove()
    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    const defs = svg.append('defs')

    const xScale = d3.scaleLinear()
      .domain([minDay, maxDay])
      .range([0, innerW])

    // 오늘 구분선 (x=0)
    const todayX = marginL + xScale(0)
    svg.append('line')
      .attr('x1', todayX).attr('x2', todayX)
      .attr('y1', marginT).attr('y2', marginT + innerH + overlap)
      .attr('stroke', 'rgba(251,191,36,0.35)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
    svg.append('text')
      .attr('x', todayX + 3).attr('y', marginT + 9)
      .attr('fill', 'rgba(251,191,36,0.45)')
      .attr('font-size', 9)
      .text('오늘')

    // X축 날짜 레이블
    const totalSpan = maxDay - minDay
    const tickCount = Math.min(totalSpan + 1, 10)
    const tickDays = tickCount <= 1
      ? [minDay]
      : Array.from({ length: tickCount }, (_, i) =>
          Math.round(minDay + (i * totalSpan) / (tickCount - 1))
        )

    tickDays.forEach(d => {
      const x = marginL + xScale(d)
      svg.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', marginT).attr('y2', marginT + innerH + overlap)
        .attr('stroke', 'rgba(255,255,255,0.04)')
        .attr('stroke-width', 1)
      const dt = dayjs().add(d, 'day')
      svg.append('text')
        .attr('x', x).attr('y', marginT + innerH + overlap + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(196,210,226,0.35)')
        .attr('font-size', 10)
        .text(`${dt.month() + 1}/${dt.date()}`)
    })

    // 각 ridge
    ridgeData.forEach((rd, i) => {
      const baseline = marginT + (i + 1) * bandH

      const spread = rd.maxVal - rd.minVal
      const pad = spread > 0 ? spread * 0.1 : rd.maxVal * 0.03
      const yDomain = [Math.max(0, rd.minVal - pad), rd.maxVal + pad]
      const ridgeHeight = bandH + overlap

      const yScale = d3.scaleLinear()
        .domain(yDomain)
        .range([0, ridgeHeight])
        .clamp(true)

      const gradId = `rg-${i}`
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%').attr('x2', '0%')
        .attr('y1', '0%').attr('y2', '100%')
      grad.append('stop').attr('offset', '0%')
        .attr('stop-color', rd.color).attr('stop-opacity', 0.4)
      grad.append('stop').attr('offset', '100%')
        .attr('stop-color', rd.color).attr('stop-opacity', 0.03)

      const clipId = `clip-${i}`
      defs.append('clipPath').attr('id', clipId)
        .append('rect')
        .attr('x', marginL - 2)
        .attr('y', i === 0 ? 0 : marginT + i * bandH)
        .attr('width', innerW + 4)
        .attr('height', ridgeHeight + bandH)

      const g = svg.append('g').attr('clip-path', `url(#${clipId})`)

      const area = d3.area()
        .x(d => marginL + xScale(d.day))
        .y0(baseline)
        .y1(d => baseline - yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.5))

      const line = d3.line()
        .x(d => marginL + xScale(d.day))
        .y(d => baseline - yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.5))

      g.append('path').datum(rd.points)
        .attr('d', area)
        .attr('fill', `url(#${gradId})`)

      // 과거 구간 (실선) vs 미래 구간 (점선) 분리
      const pastPts = rd.points.filter(p => p.day < 0)
      const futurePts = rd.points.filter(p => p.day >= 0)

      if (pastPts.length > 0) {
        // 오늘 점(day=0)을 이어붙여 연결
        const connectedPast = futurePts.length > 0 ? [...pastPts, futurePts[0]] : pastPts
        g.append('path').datum(connectedPast)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', rd.color)
          .attr('stroke-width', 1.8)
          .attr('opacity', 0.7)
      }

      if (futurePts.length > 0) {
        g.append('path').datum(futurePts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', rd.color)
          .attr('stroke-width', 1.8)
          .attr('stroke-dasharray', pastPts.length > 0 ? '4,3' : 'none')
          .attr('opacity', 0.85)
      }

      // baseline 구분선
      svg.append('line')
        .attr('x1', marginL).attr('x2', marginL + innerW)
        .attr('y1', baseline).attr('y2', baseline)
        .attr('stroke', `${rd.color}18`)
        .attr('stroke-width', 1)

      // 소스 라벨
      svg.append('text')
        .attr('x', marginL - 6).attr('y', baseline - 2)
        .attr('text-anchor', 'end')
        .attr('fill', rd.color)
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('opacity', 0.9)
        .text(rd.src)

      // 현재값 표시
      const curVal = futurePts[0]?.value ?? rd.points[rd.points.length - 1]?.value ?? 0
      const fmt = v => v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v >= 1000 ? v.toFixed(0) : v.toFixed(1)
      const curY = baseline - yScale(curVal)

      svg.append('text')
        .attr('x', todayX + 3).attr('y', curY - 3)
        .attr('fill', rd.color).attr('font-size', 9).attr('opacity', 0.55)
        .text(fmt(curVal))

      // 마지막 포인트 남은 양 (감소가 있을 때만)
      if (rd.depletionRate > 0.01 && futurePts.length > 0) {
        const endVal = futurePts[futurePts.length - 1].value
        const endY = baseline - yScale(endVal)
        svg.append('text')
          .attr('x', marginL + innerW - 2).attr('y', endY - 3)
          .attr('text-anchor', 'end')
          .attr('fill', rd.color).attr('font-size', 9).attr('opacity', 0.45)
          .text(fmt(endVal))
      }
    })

  }, [ridgeData, forecastDays])

  if (ridgeData.length === 0) return null

  return (
    <div ref={containerRef} style={{
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid var(--nowa-border)',
      borderRadius: 8,
      padding: '8px 0 4px',
      marginBottom: 12,
    }}>
      <div style={{ paddingLeft: 14, marginBottom: 2, fontSize: 11, color: 'rgba(196,210,226,0.35)', fontWeight: 600, letterSpacing: 0.5 }}>
        소스별 잔량 예측 추이
        {historyData.length > 0 && (
          <span style={{ marginLeft: 8, fontWeight: 400 }}>
            (실선=과거 실적 / 점선=예측)
          </span>
        )}
      </div>
      <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
    </div>
  )
}
