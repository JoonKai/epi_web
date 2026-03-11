import { useState, useMemo } from 'react'
import { Card, Select, Upload, Button, Space, Typography, theme, message, Tag, Divider } from 'antd'
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

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

// 표시할 파라미터 (기본 7개 + 값이 있으면 추가)
const BASE_PARAMS = [
  { key: 'pw',    label: 'PW',   fullLabel: 'Peak Wavelength',      unit: 'nm', decimals: 4 },
  { key: 'dw',    label: 'DW',   fullLabel: 'Dominant Wavelength',  unit: 'nm', decimals: 4 },
  { key: 'fwhm',  label: 'FWHM', fullLabel: 'FWHM',                 unit: 'nm', decimals: 4 },
  { key: 'pi',    label: 'PI',   fullLabel: 'Peak Intensity',        unit: '',   decimals: 4 },
  { key: 'ii',    label: 'II',   fullLabel: 'Integrated Intensity',  unit: '',   decimals: 4 },
  { key: 'refl',  label: 'Refl', fullLabel: 'Reflection',            unit: '',   decimals: 4 },
  { key: 'thick', label: 'Thick','fullLabel': 'Thickness',           unit: '',   decimals: 4 },
]

// Jet colormap
const JET = [
  '#00007f', '#0000ff', '#0080ff', '#00ffff',
  '#80ff80', '#ffff00', '#ff8000', '#ff0000', '#7f0000',
]

function waferCircle(r = 11.3, n = 360) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return pts
}

// 데모 데이터 — 실제 .map 파일과 동일한 x,y 좌표계
const noise = (x, y, s) => Math.sin(x * 0.31 + y * 0.71) * Math.cos(x * 0.53 - y * 0.29) * s

function generateDemoData() {
  const points = []
  const R = 11.2

  for (let y = -11; y <= 11; y++) {
    // 각 y 행에서 원 안에 들어오는 x 범위 계산
    const xMax = Math.floor(Math.sqrt(R * R - y * y))
    for (let x = -xMax; x <= xMax; x++) {
      const r  = Math.sqrt(x * x + y * y) / R
      const a  = Math.atan2(y, x)
      const pw   = +(439.5 + 1.5 * r  + noise(x, y, 0.4)).toFixed(4)
      const dw   = +(pw + 4.5          + noise(x, y, 0.3)).toFixed(4)
      const fwhm = +(15.0 + 2.5 * r   + noise(x, y, 0.6)).toFixed(4)
      const pi   = +(17.5 - 4.0 * r * r + noise(x, y, 0.8)).toFixed(4)
      const ii   = +(340  - 70 * r * r + noise(x, y, 12)).toFixed(4)
      const refl = +(222  - 20 * r     + noise(x, y, 5)).toFixed(4)
      const thick = +(7.4 + 0.3 * Math.sin(a * 2) * r + noise(x, y, 0.1)).toFixed(4)
      points.push({ x, y, pw, dw, fwhm, pi, ii, refl, thick, pd: 0, trans: 0, brefl: 0 })
    }
  }
  return { waferId: 'DEMO-W001', lot: 'DEMO', points }
}

// .map 파일 파싱
function parseMapFile(text, filename) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('데이터가 없습니다.')

  // 헤더 파싱 (공백 제거)
  const rawHeaders = lines[0].split(',').map(h => h.trim())
  const headers    = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, ''))

  const xIdx = headers.indexOf('x')
  const yIdx = headers.indexOf('y')
  if (xIdx < 0 || yIdx < 0) throw new Error('x, y 컬럼을 찾을 수 없습니다.')

  // 각 컬럼의 내부 키 매핑
  const colKeys = headers.map(h => COL_MAP[h] ?? null)

  const points = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = line.split(',').map(v => v.trim())
    const x = parseInt(vals[xIdx])
    const y = parseInt(vals[yIdx])
    if (isNaN(x) || isNaN(y)) continue

    const pt = { x, y }
    colKeys.forEach((key, j) => {
      if (key) pt[key] = parseFloat(vals[j]) || 0
    })
    points.push(pt)
  }

  if (!points.length) throw new Error('파싱된 포인트가 없습니다.')
  return {
    waferId: filename.replace(/\.\w+$/, ''),
    lot: '-',
    points,
  }
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

const WAFER_CIRCLE = waferCircle(11.3)

export default function WaferMapPage() {
  const [data, setData]       = useState(generateDemoData)
  const [param, setParam]     = useState('pw')
  const [hovered, setHovered] = useState(null)
  const { token }             = theme.useToken()

  // 현재 데이터에서 실제 값이 있는 파라미터만 표시
  const activeParams = useMemo(() => {
    return BASE_PARAMS.filter(p =>
      data.points.some(pt => pt[p.key] != null && pt[p.key] !== 0)
    )
  }, [data])

  const pInfo   = activeParams.find(p => p.key === param) ?? BASE_PARAMS[0]
  const stats   = useMemo(() => calcStats(data.points, param), [data, param])
  const allStats = useMemo(
    () => Object.fromEntries(activeParams.map(p => [p.key, calcStats(data.points, p.key)])),
    [data, activeParams]
  )

  // row,col → point lookup (by x,y)
  const pointMap = useMemo(() => {
    const m = {}
    data.points.forEach(p => { m[`${p.x},${p.y}`] = p })
    return m
  }, [data])

  const chartOption = useMemo(() => {
    const vals = data.points.map(p => p[param]).filter(v => v !== 0 && !isNaN(v))
    const vmin = vals.length ? Math.min(...vals) : 0
    const vmax = vals.length ? Math.max(...vals) : 1

    return {
      backgroundColor: 'transparent',
      tooltip: { show: false },
      visualMap: {
        type: 'continuous',
        seriesIndex: 1,
        dimension: 2,
        min: vmin,
        max: vmax,
        calculable: true,
        orient: 'vertical',
        right: 6,
        top: 'center',
        inRange: { color: JET },
        textStyle: { color: token.colorText, fontSize: 10 },
        formatter: v => v.toFixed(4),
      },
      grid: { left: 36, right: 90, top: 16, bottom: 36 },
      xAxis: {
        type: 'value', min: -12.5, max: 12.5,
        axisLabel: { color: token.colorTextSecondary, fontSize: 10 },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: token.colorBorder } },
      },
      yAxis: {
        type: 'value', min: -12.5, max: 12.5,
        axisLabel: { color: token.colorTextSecondary, fontSize: 10 },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: token.colorBorder } },
      },
      series: [
        // ① 웨이퍼 경계선
        {
          type: 'line',
          data: WAFER_CIRCLE,
          showSymbol: false,
          lineStyle: { color: '#aaaaaa', width: 1.5 },
          z: 3, silent: true,
          encode: { x: 0, y: 1 },
        },
        // ② 데이터 셀 (사각형)
        {
          type: 'custom',
          renderItem: (_p, api) => {
            const cx = api.value(0)
            const cy = api.value(1)
            const tl = api.coord([cx - 0.5, cy + 0.5])
            const br = api.coord([cx + 0.5, cy - 0.5])
            return {
              type: 'rect',
              shape: {
                x: tl[0],
                y: tl[1],
                width:  Math.max(br[0] - tl[0], 1),
                height: Math.max(br[1] - tl[1], 1),
              },
              style: api.style({ stroke: 'rgba(0,0,0,0.15)', lineWidth: 0.5 }),
            }
          },
          encode: { x: 0, y: 1, value: 2 },
          data: data.points.map(p => [p.x, p.y, p[param] || 0]),
          z: 2,
        },
      ],
    }
  }, [data, param, token])

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

  // .map 파일 로드
  const handleUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseMapFile(e.target.result, file.name)
        setData(parsed)
        setHovered(null)
        // 첫 번째 유효 파라미터로 자동 전환
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

        {/* 맵 */}
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
                value={param}
                onChange={setParam}
                size="small"
                style={{ width: 230 }}
                options={activeParams.map(p => ({
                  value: p.key,
                  label: `${p.label}  —  ${p.fullLabel}${p.unit ? ` (${p.unit})` : ''}`,
                }))}
              />
              <Upload
                showUploadList={false}
                beforeUpload={handleUpload}
                accept=".map"
              >
                <Button size="small" icon={<UploadOutlined />}>맵 파일 로드 (.map)</Button>
              </Upload>
              <Button size="small" icon={<ReloadOutlined />}
                onClick={() => { setData(generateDemoData()); setHovered(null); setParam('pw') }}>
                데모
              </Button>
            </Space>
          }
          style={{ flex: 1, borderRadius: 8 }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ width: '100%', aspectRatio: '1 / 1', maxHeight: 580, maxWidth: 580, margin: '0 auto' }}>
            <ReactECharts
              option={chartOption}
              style={{ width: '100%', height: '100%' }}
              onEvents={onEvents}
              opts={{ renderer: 'canvas' }}
            />
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

          {/* 파라미터 선택 */}
          <Card size="small" title="파라미터" style={{ borderRadius: 8 }}>
            {activeParams.map(p => {
              const s = allStats[p.key] ?? { avg: 0, std: 0, uniformity: 0 }
              const active = p.key === param
              return (
                <div
                  key={p.key}
                  onClick={() => setParam(p.key)}
                  style={{
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                    background: active ? token.colorPrimaryBg : token.colorFillAlter,
                    border: `1px solid ${active ? token.colorPrimary : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text strong style={{ fontSize: 12, color: active ? token.colorPrimary : token.colorText }}>
                      {p.label}
                      <Text type="secondary" style={{ fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
                        {p.fullLabel}
                      </Text>
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
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{k}</Text>
                <Text strong style={{ fontSize: 12 }}>{v}</Text>
              </div>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              지원 형식: <strong>.map</strong><br />
              필수 컬럼: number, x, y, PeakWavelength, ...
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
