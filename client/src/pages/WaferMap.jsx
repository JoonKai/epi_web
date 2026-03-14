import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, Select, Upload, Button, Space, Typography, theme, message, Tag, Divider, Switch } from 'antd'
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import WaferMapRange, { PALETTES } from '../components/WaferMapRange'

const { Text } = Typography

// .map 파일 컬럼 → 내부 키 매핑
const COL_MAP = {
  'peakwavelength':      'pw',
  'dominantwavelength':  'dw',
  'fwhm':                'fwhm',
  'peakintensity':       'pi',
  'integratedintensity': 'ii',
  'reflection':          'refl',
  'thickness':           'thick',
  'photodetect':         'pd',
  'transmittance':       'trans',
  'bluereflection':      'brefl',
}

const BASE_PARAMS = [
  { key: 'pw',    label: 'PW',   fullLabel: 'Peak Wavelength',     unit: 'nm', decimals: 4 },
  { key: 'dw',    label: 'DW',   fullLabel: 'Dominant Wavelength', unit: 'nm', decimals: 4 },
  { key: 'fwhm',  label: 'FWHM', fullLabel: 'FWHM',                unit: 'nm', decimals: 4 },
  { key: 'pi',    label: 'PI',   fullLabel: 'Peak Intensity',       unit: '',   decimals: 4 },
  { key: 'ii',    label: 'II',   fullLabel: 'Integrated Intensity', unit: '',   decimals: 4 },
  { key: 'refl',  label: 'Refl', fullLabel: 'Reflection',           unit: '',   decimals: 4 },
  { key: 'thick', label: 'Thick', fullLabel: 'Thickness',           unit: '',   decimals: 4 },
]

function waferCircle(r = WAFER_R, n = 360) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return pts
}

const noise = (x, y, s) => Math.sin(x * 0.31 + y * 0.71) * Math.cos(x * 0.53 - y * 0.29) * s

// 반경 R 내부 셀만 포함 — 셀 코너가 원 밖으로 나가지 않도록 0.5√2 여유 확보
const CELL_HALF_DIAG = Math.SQRT2 * 0.5  // ≈ 0.707
const WAFER_R        = 11.3               // 표시 원 반경
const DATA_R         = WAFER_R - CELL_HALF_DIAG - 0.05  // ≈ 10.54 → 셀이 완전히 원 안에 수납

function generateDemoData() {
  const points = []
  const R = DATA_R
  for (let y = -11; y <= 11; y++) {
    const xMax = Math.floor(Math.sqrt(R * R - y * y))
    for (let x = -xMax; x <= xMax; x++) {
      const r = Math.sqrt(x * x + y * y) / R
      const a = Math.atan2(y, x)
      points.push({
        x, y,
        pw:   +(439.5 + 1.5 * r  + noise(x, y, 0.4)).toFixed(4),
        dw:   +(444.0 + 1.5 * r  + noise(x, y, 0.3)).toFixed(4),
        fwhm: +(15.0  + 2.5 * r  + noise(x, y, 0.6)).toFixed(4),
        pi:   +(17.5  - 4.0 * r * r + noise(x, y, 0.8)).toFixed(4),
        ii:   +(340   - 70  * r * r + noise(x, y, 12)).toFixed(4),
        refl: +(222   - 20  * r  + noise(x, y, 5)).toFixed(4),
        thick: +(7.4  + 0.3 * Math.sin(a * 2) * r + noise(x, y, 0.1)).toFixed(4),
        pd: 0, trans: 0, brefl: 0,
      })
    }
  }
  return { waferId: 'DEMO-W001', lot: 'DEMO', points }
}

function parseMapFile(text, filename) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('데이터가 없습니다.')
  const rawHeaders = lines[0].split(',').map(h => h.trim())
  const headers    = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, ''))
  const xIdx = headers.indexOf('x')
  const yIdx = headers.indexOf('y')
  if (xIdx < 0 || yIdx < 0) throw new Error('x, y 컬럼을 찾을 수 없습니다.')
  const colKeys = headers.map(h => COL_MAP[h] ?? null)
  const points = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = line.split(',').map(v => v.trim())
    const x = parseInt(vals[xIdx])
    const y = parseInt(vals[yIdx])
    if (isNaN(x) || isNaN(y)) continue
    if (Math.sqrt(x * x + y * y) > DATA_R) continue  // 원 밖 셀 제외
    const pt = { x, y }
    colKeys.forEach((key, j) => { if (key) pt[key] = parseFloat(vals[j]) || 0 })
    points.push(pt)
  }
  if (!points.length) throw new Error('파싱된 포인트가 없습니다.')
  return { waferId: filename.replace(/\.\w+$/, ''), lot: '-', points }
}

function calcStats(points, key) {
  const vals = points.map(p => p[key]).filter(v => v != null && !isNaN(v) && v !== 0)
  if (!vals.length) return { avg: 0, std: 0, min: 0, max: 0, range: 0, uniformity: 0 }
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return { avg, std, min, max, range: max - min, uniformity: avg > 0 ? (std / avg) * 100 : 0 }
}

// 값 → 컬러 인덱스
function valToColor(val, rangeStart, rangeEnd, colors) {
  if (!val || val === 0 || isNaN(val)) return 'rgba(50,60,80,0.35)'
  const t   = Math.max(0, Math.min(1, (val - rangeStart) / Math.max(1e-10, rangeEnd - rangeStart)))
  const idx = Math.min(colors.length - 1, Math.floor(t * colors.length))
  return colors[idx]
}

const WAFER_CIRCLE = waferCircle(11.3)

export default function WaferMapPage() {
  const [data, setData]     = useState(generateDemoData)
  const [param, setParam]   = useState('pw')
  const [hovered, setHovered] = useState(null)
  const { token }           = theme.useToken()

  // 범위 상태
  const [rangeStart,    setRangeStart]    = useState(0)
  const [rangeEnd,      setRangeEnd]      = useState(1)
  const [useAutoRange,  setUseAutoRange]  = useState(true)
  const [colors,        setColors]        = useState(PALETTES.jet)
  const [useDistribution, setUseDistribution] = useState(false)

  // 파라미터 / 데이터 변경 시 auto range 계산
  useEffect(() => {
    if (!useAutoRange) return
    const vals = data.points.map(p => p[param]).filter(v => v !== 0 && !isNaN(v))
    if (!vals.length) return
    setRangeStart(Math.min(...vals))
    setRangeEnd(Math.max(...vals))
  }, [data, param, useAutoRange])

  const activeParams = useMemo(() =>
    BASE_PARAMS.filter(p => data.points.some(pt => pt[p.key] != null && pt[p.key] !== 0))
  , [data])

  const pInfo    = activeParams.find(p => p.key === param) ?? BASE_PARAMS[0]
  const stats    = useMemo(() => calcStats(data.points, param), [data, param])
  const allStats = useMemo(
    () => Object.fromEntries(activeParams.map(p => [p.key, calcStats(data.points, p.key)])),
    [data, activeParams]
  )

  // 분포 계산 (WaferMapRange의 히스토그램용)
  const distributions = useMemo(() => {
    if (!useDistribution) return null
    const n = colors.length
    const counts = new Array(n).fill(0)
    data.points.forEach(pt => {
      const v = pt[param]
      if (!v || v === 0 || isNaN(v)) return
      const t   = Math.max(0, Math.min(1, (v - rangeStart) / Math.max(1e-10, rangeEnd - rangeStart)))
      const idx = Math.min(n - 1, Math.floor(t * n))
      counts[idx]++
    })
    return counts
  }, [data, param, rangeStart, rangeEnd, colors.length, useDistribution])

  const pointMap = useMemo(() => {
    const m = {}
    data.points.forEach(p => { m[`${p.x},${p.y}`] = p })
    return m
  }, [data])

  // ECharts 옵션 — visualMap 없이 renderItem에서 직접 컬러 계산
  const chartOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { show: false },
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      xAxis: {
        type: 'value', min: -12.5, max: 12.5,
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value', min: -12.5, max: 12.5,
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        // ① 웨이퍼 경계선
        {
          type: 'line',
          data: WAFER_CIRCLE,
          showSymbol: false,
          lineStyle: { color: 'rgba(160,170,190,0.7)', width: 1.5 },
          z: 3, silent: true,
          encode: { x: 0, y: 1 },
        },
        // ② 데이터 셀 (사각형 — 수동 컬러)
        {
          type: 'custom',
          renderItem: (_p, api) => {
            const cx  = api.value(0)
            const cy  = api.value(1)
            const val = api.value(2)
            const tl  = api.coord([cx - 0.5, cy + 0.5])
            const br  = api.coord([cx + 0.5, cy - 0.5])
            const fill = valToColor(val, rangeStart, rangeEnd, colors)
            return {
              type: 'rect',
              shape: {
                x: tl[0], y: tl[1],
                width:  Math.max(br[0] - tl[0], 1),
                height: Math.max(br[1] - tl[1], 1),
              },
              style: {
                fill,
                stroke: 'rgba(0,0,0,0.12)',
                lineWidth: 0.5,
              },
            }
          },
          encode: { x: 0, y: 1, value: 2 },
          data: data.points.map(p => [p.x, p.y, p[param] || 0]),
          z: 2,
        },
      ],
    }
  }, [data, param, rangeStart, rangeEnd, colors, token])

  const onEvents = useMemo(() => ({
    mousemove: (params) => {
      if (params.seriesIndex === 1 && Array.isArray(params.data)) {
        const [x, y] = params.data
        const pt = pointMap[`${x},${y}`]
        if (pt) setHovered(pt)
      }
    },
    globalout: () => setHovered(null),
  }), [pointMap])

  // WaferMapRange 콜백
  const handleRangeChange = ({ start, end, auto, dist }) => {
    if (dist !== undefined) setUseDistribution(dist)
    setUseAutoRange(auto ?? false)
    if (start != null) setRangeStart(start)
    if (end   != null) setRangeEnd(end)
  }

  const handleUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseMapFile(e.target.result, file.name)
        setData(parsed)
        setHovered(null)
        setUseAutoRange(true)
        const first = BASE_PARAMS.find(p => parsed.points.some(pt => pt[p.key] && pt[p.key] !== 0))
        if (first) setParam(first.key)
        message.success(`${parsed.points.length}개 포인트 로드 완료 — ${parsed.waferId}`)
      } catch (err) {
        message.error(`파일 로드 실패: ${err.message}`)
      }
    }
    reader.readAsText(file)
    return false
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>

      {/* ─── 본문 ─── */}
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

        {/* 맵 카드 */}
        <Card
          size="small"
          title={
            <Space>
              <span>EPI Wafer Map</span>
              <Tag color="blue">{data.waferId}</Tag>
              {data.lot !== '-' && <Tag>{data.lot}</Tag>}
              <Tag color="default">{data.points.length} pts</Tag>
            </Space>
          }
          extra={
            <Space>
              <Select
                value={param} onChange={v => { setParam(v); setUseAutoRange(true) }}
                size="small" style={{ width: 230 }}
                options={activeParams.map(p => ({
                  value: p.key,
                  label: `${p.label}  —  ${p.fullLabel}${p.unit ? ` (${p.unit})` : ''}`,
                }))}
              />
              <Upload showUploadList={false} beforeUpload={handleUpload} accept=".map">
                <Button size="small" icon={<UploadOutlined />}>맵 파일 로드 (.map)</Button>
              </Upload>
              <Button size="small" icon={<ReloadOutlined />}
                onClick={() => { setData(generateDemoData()); setHovered(null); setParam('pw'); setUseAutoRange(true) }}>
                데모
              </Button>
            </Space>
          }
          style={{ flex: 1, borderRadius: 8 }}
          styles={{ body: { padding: 0 } }}
        >
          {/* 차트 + 컬러바 나란히 — 차트는 항상 1:1 정사각형 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 8px 8px 0' }}>
            {/* 1:1 비율 정사각형 차트 */}
            <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 640, aspectRatio: '1 / 1' }}>
              <ReactECharts
                option={chartOption}
                style={{ width: '100%', height: '100%' }}
                onEvents={onEvents}
                opts={{ renderer: 'canvas' }}
              />
            </div>
            {/* 커스텀 WaferMapRange 컬러바 — 차트 높이에 맞춤 */}
            <div style={{
              width: 260,
              alignSelf: 'stretch',
              padding: '16px 8px 36px 4px',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}>
              <WaferMapRange
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                colors={colors}
                distributions={distributions}
                useDistribution={useDistribution}
                useAutoRange={useAutoRange}
                displayFormat="F4"
                labelFontSize={12}
                labelColor={token.colorText}
                tickColor={token.colorTextSecondary}
                borderColor={token.colorBorder}
                onRangeChange={handleRangeChange}
                onColorsChange={setColors}
              />
            </div>
          </div>
        </Card>

        {/* 우측 패널 */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

          {/* 통계 */}
          <Card size="small" title={`통계 — ${pInfo.label}`} style={{ borderRadius: 8 }}>
            {[
              ['평균 (Mean)',   stats.avg.toFixed(pInfo.decimals)],
              ['표준편차 (σ)', stats.std.toFixed(pInfo.decimals)],
              ['Min',           stats.min.toFixed(pInfo.decimals)],
              ['Max',           stats.max.toFixed(pInfo.decimals)],
              ['Range',         stats.range.toFixed(pInfo.decimals)],
              ['균일도 (σ/μ)', `${stats.uniformity.toFixed(3)} %`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                <Text strong style={{ fontSize: 12 }}>{value}{pInfo.unit ? ` ${pInfo.unit}` : ''}</Text>
              </div>
            ))}
          </Card>

          {/* 파라미터 목록 */}
          <Card size="small" title="파라미터" style={{ borderRadius: 8 }}>
            {activeParams.map(p => {
              const s      = allStats[p.key] ?? { avg: 0, std: 0, uniformity: 0 }
              const active = p.key === param
              return (
                <div
                  key={p.key}
                  onClick={() => { setParam(p.key); setUseAutoRange(true) }}
                  style={{
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                    background: active ? token.colorPrimaryBg : token.colorFillAlter,
                    border: `1px solid ${active ? token.colorPrimary : 'transparent'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text strong style={{ fontSize: 12, color: active ? token.colorPrimary : token.colorText }}>
                      {p.label}
                      <Text type="secondary" style={{ fontWeight: 400, fontSize: 11, marginLeft: 4 }}>{p.fullLabel}</Text>
                    </Text>
                    {p.unit && <Tag color={active ? 'blue' : 'default'} style={{ fontSize: 10, margin: 0 }}>{p.unit}</Tag>}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    μ={s.avg.toFixed(2)}  σ={s.std.toFixed(2)}  U={s.uniformity.toFixed(2)}%
                  </Text>
                </div>
              )
            })}
          </Card>

          {/* 파일 정보 */}
          <Card size="small" title="파일 정보" style={{ borderRadius: 8 }}>
            {[
              ['웨이퍼 ID', data.waferId],
              ['포인트 수', `${data.points.length} 점`],
              ['크기', '4" (100 mm)'],
              ['범위 모드', useAutoRange ? '자동' : '수동'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{k}</Text>
                <Text strong style={{ fontSize: 12 }}>{v}</Text>
              </div>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              컬러바 우클릭 → 범위/컬러맵 설정<br />
              스크롤: 줌  |  드래그: 패닝<br />
              더블클릭: 범위 직접 입력
            </Text>
          </Card>

        </div>
      </div>

      {/* ─── 하단 상태바 ─── */}
      <div style={{
        padding: '5px 16px',
        background: token.colorFillAlter,
        borderRadius: 8,
        border: `1px solid ${token.colorBorderSecondary}`,
        minHeight: 34,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {hovered ? (
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: 13, color: token.colorText, whiteSpace: 'nowrap' }}>
            <span style={{ color: token.colorTextSecondary }}>Row: </span>
            <strong>{String(-hovered.y).padStart(3)}</strong>
            {'  '}
            <span style={{ color: token.colorTextSecondary }}>Col: </span>
            <strong>{String(hovered.x).padStart(3)}</strong>
            {'  |  '}
            {activeParams.map(p => (
              <span key={p.key}>
                <span style={{ color: token.colorTextSecondary }}>{p.label}: </span>
                <strong style={{ color: p.key === param ? token.colorPrimary : token.colorText }}>
                  {hovered[p.key] != null ? hovered[p.key].toFixed(4) : '-'}
                </strong>
                {'   '}
              </span>
            ))}
          </span>
        ) : (
          <Text type="secondary" style={{ fontSize: 13, fontFamily: 'monospace' }}>
            셀 위로 마우스를 올리면 측정값이 표시됩니다.
          </Text>
        )}
      </div>

    </div>
  )
}
