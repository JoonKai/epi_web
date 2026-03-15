import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Button, Select, Upload, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { PALETTES } from '../components/WaferMapRange'

// ── 상수 ────────────────────────────────────────────────────────
const CELL_HALF_DIAG = Math.SQRT2 * 0.5
const WAFER_R        = 11.3
const DATA_R         = WAFER_R - CELL_HALF_DIAG - 0.05

const COL_MAP = {
  'peakwavelength':      'pw',
  'dominantwavelength':  'dw',
  'fwhm':                'fwhm',
  'peakintensity':       'pi',
  'integratedintensity': 'ii',
  'reflection':          'refl',
  'thickness':           'thick',
}

const PARAMS = [
  { key: 'pw',    label: 'PW',    unit: 'nm' },
  { key: 'dw',    label: 'DW',    unit: 'nm' },
  { key: 'fwhm',  label: 'FWHM',  unit: 'nm' },
  { key: 'pi',    label: 'PI',    unit: '' },
  { key: 'ii',    label: 'II',    unit: '' },
  { key: 'refl',  label: 'Refl',  unit: '' },
  { key: 'thick', label: 'Thick', unit: '' },
]

// ── 웨이퍼 원 경계선 ────────────────────────────────────────────
const WAFER_CIRCLE = (() => {
  const pts = []
  for (let i = 0; i <= 360; i++) {
    const a = (i / 360) * 2 * Math.PI
    pts.push([WAFER_R * Math.cos(a), WAFER_R * Math.sin(a)])
  }
  return pts
})()

// ── 데모 데이터 생성 ─────────────────────────────────────────────
function noise(x, y, seed) {
  return Math.sin(x * 0.31 + y * 0.71 + seed) * Math.cos(x * 0.53 - y * 0.29 + seed * 0.7)
}

function generateDemoWafer(idx) {
  const seed   = idx * 1.37
  const R      = DATA_R
  const points = []
  for (let y = -11; y <= 11; y++) {
    const xMax = Math.floor(Math.sqrt(R * R - y * y))
    for (let x = -xMax; x <= xMax; x++) {
      const r = Math.sqrt(x * x + y * y) / R
      const a = Math.atan2(y, x)
      points.push({
        x, y,
        pw:    +(439.5 + 1.5 * r + noise(x, y, seed) * 0.5).toFixed(4),
        dw:    +(444.0 + 1.5 * r + noise(x, y, seed + 1) * 0.4).toFixed(4),
        fwhm:  +(15.0  + 2.5 * r + noise(x, y, seed + 2) * 0.7).toFixed(4),
        pi:    +(17.5  - 4.0 * r * r + noise(x, y, seed + 3) * 0.9).toFixed(4),
        ii:    +(340   - 70  * r * r + noise(x, y, seed + 4) * 14).toFixed(4),
        refl:  +(222   - 20  * r + noise(x, y, seed + 5) * 6).toFixed(4),
        thick: +(7.4   + 0.3 * Math.sin(a * 2) * r + noise(x, y, seed + 6) * 0.12).toFixed(4),
      })
    }
  }
  return { id: `RUN-${String(idx + 1).padStart(2, '0')}`, points }
}

const DEMO_WAFERS = Array.from({ length: 93 }, (_, i) => generateDemoWafer(i))

// ── 색상 매핑 ───────────────────────────────────────────────────
function valToColor(val, rangeStart, rangeEnd, colors) {
  if (!val || val === 0 || isNaN(val)) return 'rgba(50,60,80,0.35)'
  const t   = Math.max(0, Math.min(1, (val - rangeStart) / Math.max(1e-10, rangeEnd - rangeStart)))
  const idx = Math.min(colors.length - 1, Math.floor(t * colors.length))
  return colors[idx]
}

// ── 미니 웨이퍼 맵 ─────────────────────────────────────────────
function MiniWaferMap({ wafer, param, rangeStart, rangeEnd, colors, size }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { type: 'value', min: -12.5, max: 12.5, show: false },
    yAxis: { type: 'value', min: -12.5, max: 12.5, show: false },
    series: [
      {
        type: 'line',
        data: WAFER_CIRCLE,
        showSymbol: false,
        lineStyle: { color: 'rgba(160,170,190,0.6)', width: 1 },
        z: 3, silent: true,
        encode: { x: 0, y: 1 },
      },
      {
        type: 'custom',
        renderItem: (_p, api) => {
          const cx  = api.value(0)
          const cy  = api.value(1)
          const val = api.value(2)
          const tl  = api.coord([cx - 0.5, cy + 0.5])
          const br  = api.coord([cx + 0.5, cy - 0.5])
          return {
            type: 'rect',
            shape: { x: tl[0], y: tl[1], width: Math.max(br[0] - tl[0], 1), height: Math.max(br[1] - tl[1], 1) },
            style: { fill: valToColor(val, rangeStart, rangeEnd, colors), stroke: 'none' },
          }
        },
        encode: { x: 0, y: 1, value: 2 },
        data: wafer.points.map(p => [p.x, p.y, p[param] || 0]),
        z: 2,
      },
    ],
  }), [wafer, param, rangeStart, rangeEnd, colors])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <div style={{
        width: size, height: size,
        borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(99,102,241,0.15)',
        overflow: 'hidden',
      }}>
        <ReactECharts
          option={option}
          style={{ width: size, height: size }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.3 }}>
        {wafer.id}
      </div>
    </div>
  )
}

// ── 파일 파싱 ────────────────────────────────────────────────────
function parseMapFile(text, filename) {
  const lines   = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('데이터 없음')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''))
  const xIdx    = headers.indexOf('x')
  const yIdx    = headers.indexOf('y')
  if (xIdx < 0 || yIdx < 0) throw new Error('x, y 컬럼 없음')
  const colKeys = headers.map(h => COL_MAP[h] ?? null)
  const points  = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = line.split(',').map(v => v.trim())
    const x = parseInt(vals[xIdx])
    const y = parseInt(vals[yIdx])
    if (isNaN(x) || isNaN(y)) continue
    if (Math.sqrt(x * x + y * y) > DATA_R) continue
    const pt = { x, y }
    colKeys.forEach((key, j) => { if (key) pt[key] = parseFloat(vals[j]) || 0 })
    points.push(pt)
  }
  if (!points.length) throw new Error('포인트 없음')
  return { id: filename.replace(/\.\w+$/, ''), points }
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function RunComparison() {
  const [wafers,   setWafers]   = useState(DEMO_WAFERS)
  const [param,    setParam]    = useState('pw')
  const [colors,   setColors]   = useState(PALETTES.palette1)
  const [mapSize,  setMapSize]  = useState(160)
  const [perRow,   setPerRow]   = useState(31)

  // 전체 범위: 모든 웨이퍼에서 공통 계산
  const { rangeStart, rangeEnd } = useMemo(() => {
    let mn = Infinity, mx = -Infinity
    wafers.forEach(w => {
      w.points.forEach(p => {
        const v = p[param]
        if (v && !isNaN(v) && v !== 0) {
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
      })
    })
    return { rangeStart: mn === Infinity ? 0 : mn, rangeEnd: mx === -Infinity ? 1 : mx }
  }, [wafers, param])

  const makeUploadHandler = (groupIdx) => (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wafer = parseMapFile(e.target.result, file.name)
        setWafers(prev => {
          const next = [...prev]
          const start = groupIdx * 31
          next.splice(start + perRow, 0, wafer)
          return next
        })
        message.success(`${wafer.id} GROUP ${groupIdx + 1}에 추가 완료`)
      } catch (err) {
        message.error(`파일 로드 실패: ${err.message}`)
      }
    }
    reader.readAsText(file)
    return false
  }

  const colormapKey = Object.entries(PALETTES).find(([, v]) => v === colors)?.[0] ?? 'palette1'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* 헤더 */}
      <div style={{
        padding: '16px 20px', borderRadius: 18,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-hero-bg)',
        boxShadow: 'var(--nowa-shadow-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ color: 'var(--nowa-text)', fontSize: 17, fontWeight: 800, marginBottom: 2 }}>런 비교</div>
          <div style={{ color: 'var(--nowa-text-muted)', fontSize: 13 }}>
            {wafers.length}개 웨이퍼 · 공통 범위 [{rangeStart.toFixed(3)} – {rangeEnd.toFixed(3)}]
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select value={param} onChange={setParam} size="small" style={{ width: 100 }}
            options={PARAMS.map(p => ({ value: p.key, label: p.label }))} />
          <Select value={colormapKey} onChange={k => setColors(PALETTES[k])} size="small" style={{ width: 120 }}
            options={Object.keys(PALETTES).map(k => ({ value: k, label: k }))} />
          <Select value={mapSize} onChange={setMapSize} size="small" style={{ width: 90 }}
            options={[{ value: 100, label: '소형' }, { value: 160, label: '중형' }, { value: 220, label: '대형' }]} />
          <Select value={perRow} onChange={setPerRow} size="small" style={{ width: 80 }}
            options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}개` }))} />
          <Button size="small" icon={<DeleteOutlined />} onClick={() => setWafers(DEMO_WAFERS)}>
            데모 초기화
          </Button>
        </div>
      </div>

      {/* 컬러바 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 12,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-soft-fill)',
      }}>
        <span style={{ color: 'var(--nowa-text-muted)', fontSize: 12, flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
          {rangeStart.toFixed(3)}
        </span>
        <div style={{ flex: 1, height: 12, borderRadius: 6, background: `linear-gradient(to right, ${colors.join(',')})` }} />
        <span style={{ color: 'var(--nowa-text-muted)', fontSize: 12, flexShrink: 0, minWidth: 50 }}>
          {rangeEnd.toFixed(3)}
        </span>
      </div>

      {/* 웨이퍼 맵 가로 스크롤 (3행) */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, paddingBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 2px 8px', width: 'max-content' }}>
          {[
            { label: 'GROUP 1', maps: wafers.slice(0, 31).slice(0, perRow) },
            { label: 'GROUP 2', maps: wafers.slice(31, 62).slice(0, perRow) },
            { label: 'GROUP 3', maps: wafers.slice(62, 93).slice(0, perRow) },
          ].map(({ label, maps }, groupIdx) => (
            <div key={groupIdx}>
              {/* 구분선 (첫 그룹 제외) */}
              {groupIdx > 0 && (
                <div style={{ borderTop: '1px solid rgba(99,102,241,0.25)', margin: '16px 0', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: -10, left: 8,
                    background: '#0b0f1a', padding: '0 10px',
                    color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  }}>
                    {label}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: groupIdx === 0 ? 0 : 4 }}>
                <span style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  {label}
                </span>
                {groupIdx < 2 && (
                  <Upload showUploadList={false} beforeUpload={makeUploadHandler(groupIdx)} accept=".map" multiple>
                    <Button size="small" icon={<PlusOutlined />} style={{ fontSize: 11, height: 22, padding: '0 8px' }}>
                      PL+ 추가
                    </Button>
                  </Upload>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, paddingBottom: groupIdx < 2 ? 4 : 0 }}>
                {maps.map((w, i) => (
                  <MiniWaferMap
                    key={`${w.id}-${groupIdx}-${i}`}
                    wafer={w}
                    param={param}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    colors={colors}
                    size={mapSize}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
