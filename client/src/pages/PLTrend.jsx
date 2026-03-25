import { useRef, useState, useMemo } from 'react'
import { Alert, Button, Card, Col, Empty, Row, Select, Tag, Tooltip, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import PageBanner from '../components/PageBanner'

// .map 파일 파라미터 정의
const PARAMS = [
  { key: 'pw',    label: 'Peak Wavelength (PW)',       unit: 'nm' },
  { key: 'dw',    label: 'Dominant Wavelength (DW)',   unit: 'nm' },
  { key: 'fwhm',  label: 'FWHM',                       unit: 'nm' },
  { key: 'pi',    label: 'Peak Intensity (PI)',         unit: ''   },
  { key: 'ii',    label: 'Integrated Intensity (II)',   unit: ''   },
  { key: 'refl',  label: 'Reflection',                  unit: ''   },
  { key: 'thick', label: 'Thickness',                   unit: ''   },
]

const COL_MAP = {
  peakwavelength:      'pw',
  dominantwavelength:  'dw',
  fwhm:                'fwhm',
  peakintensity:       'pi',
  integratedintensity: 'ii',
  reflection:          'refl',
  thickness:           'thick',
}

const COLORS = [
  '#f59e0b','#60a5fa','#34d399','#f43f5e','#a78bfa',
  '#fb923c','#2dd4bf','#e879f9','#facc15','#4ade80',
]

function parseMapText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const dataLines = []
  let headerCols = []

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) continue
    const parts = line.trim().split(/\s+/)
    if (parts.length < 3) continue
    const maybeX = Number(parts[0])
    const maybeY = Number(parts[1])
    if (!Number.isNaN(maybeX) && !Number.isNaN(maybeY)) {
      dataLines.push(parts)
    } else {
      // 헤더 행 탐지
      const lower = parts.map((p) => p.toLowerCase().replace(/[^a-z]/g, ''))
      if (lower.some((p) => COL_MAP[p])) {
        headerCols = lower.map((p) => COL_MAP[p] ?? null)
      }
    }
  }

  if (dataLines.length === 0) return null

  const result = {}
  PARAMS.forEach(({ key }) => { result[key] = [] })

  dataLines.forEach((parts) => {
    if (headerCols.length > 0) {
      headerCols.forEach((key, i) => {
        if (key && i < parts.length) {
          const v = Number(parts[i])
          if (!Number.isNaN(v) && v !== 0) result[key].push(v)
        }
      })
    } else {
      // 헤더 없으면 컬럼 위치로 추정 (x, y, pw, dw, fwhm, pi, ii ...)
      const keys = ['_x', '_y', 'pw', 'dw', 'fwhm', 'pi', 'ii', 'refl', 'thick']
      parts.forEach((p, i) => {
        const k = keys[i]
        if (k && !k.startsWith('_')) {
          const v = Number(p)
          if (!Number.isNaN(v) && v !== 0) result[k].push(v)
        }
      })
    }
  })

  return result
}

function calcStats(values) {
  if (!values || values.length === 0) return { mean: null, std: null, min: null, max: null, range: null }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { mean, std, min, max, range: max - min }
}

function fmt(v, decimals = 4) {
  if (v == null || Number.isNaN(v)) return '-'
  return v.toFixed(decimals)
}

export default function PLTrend() {
  const [runs, setRuns] = useState([])   // [{ name, data }]
  const [yParam, setYParam] = useState('pw')
  const [xParam, setXParam] = useState('index')  // 'index' | param key
  const chartRef = useRef(null)

  const xOptions = [
    { value: 'index', label: 'Run 순서 (인덱스)' },
    ...PARAMS.map(({ key, label }) => ({ value: key, label })),
  ]

  const handleUpload = ({ file }) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const data = parseMapText(text)
      if (!data) {
        message.error(`${file.name}: 파싱 실패 (지원하지 않는 형식)`)
        return
      }
      const name = file.name.replace(/\.[^.]+$/, '')
      setRuns((prev) => {
        if (prev.some((r) => r.name === name)) {
          message.warning(`${name} 파일이 이미 추가되어 있습니다.`)
          return prev
        }
        return [...prev, { name, data }]
      })
    }
    reader.readAsText(file)
    return false
  }

  const removeRun = (name) => setRuns((prev) => prev.filter((r) => r.name !== name))
  const clearAll = () => setRuns([])

  const yMeta = PARAMS.find((p) => p.key === yParam) ?? PARAMS[0]
  const xMeta = xParam === 'index' ? null : PARAMS.find((p) => p.key === xParam)

  // 스캐터 시리즈: run당 1 시리즈, 각 포인트 = 각 측정값
  const series = useMemo(() => {
    return runs.map((run, ri) => {
      const color = COLORS[ri % COLORS.length]
      const yVals = run.data[yParam] ?? []
      const xVals = xParam === 'index' ? yVals.map((_, i) => i + 1) : (run.data[xParam] ?? [])
      const len = Math.min(xVals.length, yVals.length)
      const pts = Array.from({ length: len }, (_, i) => [xVals[i], yVals[i]])

      return {
        name: run.name,
        type: 'scatter',
        data: pts,
        symbolSize: 6,
        itemStyle: { color, opacity: 0.82 },
      }
    })
  }, [runs, yParam, xParam])

  // 통계 테이블
  const statsRows = useMemo(() => {
    return runs.map((run, ri) => {
      const yVals = run.data[yParam] ?? []
      const stats = calcStats(yVals)
      return { name: run.name, color: COLORS[ri % COLORS.length], ...stats, count: yVals.length }
    })
  }, [runs, yParam])

  const hasData = runs.length > 0

  const chartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { top: 40, bottom: 60, left: 64, right: 32 },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const xLabel = xMeta ? xMeta.label : 'Index'
        return `<b>${params.seriesName}</b><br/>${xLabel}: ${fmt(params.data[0], 2)}<br/>${yMeta.label}: ${fmt(params.data[1], 4)} ${yMeta.unit}`
      },
    },
    legend: {
      bottom: 4,
      textStyle: { color: 'rgba(196,210,226,0.8)', fontSize: 14 },
      type: 'scroll',
    },
    xAxis: {
      name: xMeta ? `${xMeta.label}${xMeta.unit ? ` (${xMeta.unit})` : ''}` : 'Run Index',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: 'rgba(196,210,226,0.6)', fontSize: 14 },
      axisLabel: { color: '#64748b', fontSize: 14 },
      axisLine: { lineStyle: { color: 'rgba(196,210,226,0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(196,210,226,0.07)' } },
    },
    yAxis: {
      name: `${yMeta.label}${yMeta.unit ? ` (${yMeta.unit})` : ''}`,
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: { color: 'rgba(196,210,226,0.6)', fontSize: 14 },
      axisLabel: { color: '#64748b', fontSize: 14 },
      axisLine: { lineStyle: { color: 'rgba(196,210,226,0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(196,210,226,0.07)' } },
    },
    series,
  }), [series, xMeta, yMeta])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageBanner
        kicker="분석"
        title="PL 트렌드"
        desc=".map 파일을 업로드하면 파라미터별 스캐터 차트와 통계를 분석합니다."
      />

      {/* 컨트롤 */}
      <Card className="nowa-card" styles={{ body: { padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } }}>
        <Upload accept=".map,.txt,.csv" showUploadList={false} beforeUpload={handleUpload} multiple>
          <Button icon={<UploadOutlined />} type="primary">.map 파일 업로드</Button>
        </Upload>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>Y축</span>
          <Select
            value={yParam}
            onChange={setYParam}
            style={{ width: 220 }}
            options={PARAMS.map(({ key, label }) => ({ value: key, label }))}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>X축</span>
          <Select
            value={xParam}
            onChange={setXParam}
            style={{ width: 220 }}
            options={xOptions}
          />
        </div>

        {runs.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={clearAll} style={{ marginLeft: 'auto' }}>
            전체 삭제
          </Button>
        )}
      </Card>

      {/* 로드된 파일 태그 */}
      {runs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {runs.map((run, ri) => (
            <Tag
              key={run.name}
              closable
              onClose={() => removeRun(run.name)}
              style={{
                borderRadius: 99,
                padding: '3px 12px',
                fontSize: 14,
                fontWeight: 600,
                color: COLORS[ri % COLORS.length],
                background: `${COLORS[ri % COLORS.length]}18`,
                border: `1px solid ${COLORS[ri % COLORS.length]}44`,
              }}
            >
              {run.name}
            </Tag>
          ))}
        </div>
      )}

      {/* 차트 */}
      <Card className="nowa-card" styles={{ body: { padding: '8px 4px 4px' } }}>
        {!hasData ? (
          <Empty
            description=".map 파일을 업로드하면 스캐터 차트가 표시됩니다."
            style={{ padding: '64px 0' }}
          />
        ) : (
          <ReactECharts
            ref={chartRef}
            theme="dark"
            option={chartOption}
            style={{ height: 460 }}
            notMerge
          />
        )}
      </Card>

      {/* 통계 테이블 */}
      {hasData && (
        <Card className="nowa-card" title={<span style={{ fontWeight: 800 }}>{yMeta.label} 통계 요약</span>} styles={{ body: { padding: 0 } }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.18)' }}>
                  {['Run', '측정수', '평균', '표준편차', '최솟값', '최댓값', '범위'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(251,191,36,0.75)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statsRows.map((row, i) => (
                  <tr
                    key={row.name}
                    style={{ borderBottom: i < statsRows.length - 1 ? '1px solid rgba(196,210,226,0.07)' : 'none' }}
                  >
                    <td style={{ padding: '9px 16px', fontWeight: 700, color: row.color }}>{row.name}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text-muted)' }}>{row.count}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text)', fontWeight: 600 }}>{fmt(row.mean)}{yMeta.unit ? ` ${yMeta.unit}` : ''}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text-muted)' }}>{fmt(row.std)}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text-muted)' }}>{fmt(row.min)}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text-muted)' }}>{fmt(row.max)}</td>
                    <td style={{ padding: '9px 16px', color: 'var(--nowa-text-muted)' }}>{fmt(row.range)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
