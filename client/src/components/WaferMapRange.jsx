import { useRef, useEffect, useCallback, useState } from 'react'
import { Modal, Form, InputNumber, Dropdown, theme } from 'antd'

// ─── 컬러 팔레트 (C# EPIWaferMapRange와 동일) ──────────────────────────────
export const PALETTES = {
  jet: [
    '#00007f','#0000ff','#0080ff','#00ffff',
    '#80ff80','#ffff00','#ff8000','#ff0000','#7f0000',
  ],
  gray: [
    '#ffffff','#eeeeee','#dddddd','#cccccc','#bbbbbb','#aaaaaa',
    '#999999','#888888','#777777','#666666','#555555','#444444',
    '#333333','#222222','#111111','#000000',
  ],
  blue: [
    '#deffff','#cdefff','#bcdeff','#abcdef','#9abcde','#89abcd',
    '#789abc','#6789ab','#56789a','#456789','#345678','#234567','#123456',
  ],
  palette1: [
    '#FF00FF','#EF00FF','#CE00FF','#AD00FF','#8C04FF','#6B00FF','#5200FF','#2900E7',
    '#0000FF','#0028E7','#0041BD','#005194','#006573','#007D52','#008E29','#00A210',
    '#00B600','#00D300','#00EB00','#00FF08','#39FF00','#6BFF00','#A5FF00','#CEFF00',
    '#FFFF00','#FFDB00','#FFC300','#FF9600','#FF8200','#FF5500','#FF4100','#FF0000',
  ],
  palette2: [
    '#000080','#010F84','#031F88','#05308C','#074190','#095294','#0B6498','#0E779C',
    '#108AA1','#139DA5','#15A9A1','#1BB189','#21B971','#27C158','#2BC54B','#32CD32',
    '#41D030','#50D32E','#61D52B','#73D829','#85DB27','#99DD24','#AEE022','#C4E21F',
    '#DBE51D','#E8DD1A','#EAC918','#EDB415','#F09E12','#F2870F','#F56E0C','#F85409',
    '#FA3906','#FD1D03','#FF0000',
  ],
  palette3: [
    '#C01ACE','#9B19E8','#6019E6','#221AD2','#1A45D3','#1A7AD3','#1AB0D4','#1AD5C2',
    '#1AD58B','#1AD754','#1AD81C','#4BDA1A','#84DC1A','#BEDD19','#E1C61A','#E58E1A',
    '#ED561A','#F71A1A',
  ],
}

function fmtVal(v, fmt) {
  if (!fmt || fmt === 'Auto') return v.toPrecision(4)
  const d = parseInt(fmt.replace(/^[Ff]/, ''))
  return v.toFixed(isNaN(d) ? 4 : d)
}

// ─── canvas 렌더링 ────────────────────────────────────────────────────────────
function renderCanvas(canvas, container, {
  rangeStart, rangeEnd, colors, distributions, useDistribution,
  useLogScaleBar, displayFormat, labelFontSize,
}) {
  const W = container.clientWidth
  const H = container.clientHeight
  if (W <= 0 || H <= 0) return

  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width  = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`
  }

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)

  const PAD      = 4
  const TICK_LEN = 5
  const TICK_GAP = 3
  const labelW   = Math.max(30, W * 0.42)
  const barLeft  = PAD + labelW + TICK_LEN + TICK_GAP
  const barW     = Math.max(1, W - barLeft - PAD)
  const barTop   = PAD
  const barH     = Math.max(1, H - PAD * 2)

  const n = colors.length
  if (n === 0) { ctx.restore(); return }

  const cellH  = barH / n
  const delta  = rangeEnd - rangeStart
  const useDist = useDistribution && distributions && distributions.length === n
  const maxDist = useDist ? Math.max(...distributions, 1) : 0
  const logMax  = maxDist > 0 ? Math.log10(Math.max(1, maxDist)) : 0

  // ① 컬러 셀
  for (let i = 0; i < n; i++) {
    const y = barTop + cellH * i
    const h = Math.max(0.5, cellH - 0.5)

    if (useDist) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(barLeft, y, barW, h)
      let w = useLogScaleBar && logMax > 0
        ? barW * Math.log10(Math.max(1, distributions[i])) / logMax
        : maxDist > 0 ? barW * distributions[i] / maxDist : 0
      ctx.fillStyle = colors[i]
      ctx.fillRect(barLeft, y, w, h)
    } else {
      ctx.fillStyle = colors[i]
      ctx.fillRect(barLeft, y, barW, h)
    }
  }

  // ② 보더
  ctx.strokeStyle = 'rgba(150,160,180,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(barLeft, barTop, barW, barH)

  // ③ 틱 + 라벨
  if (delta > 0) {
    const step = delta / n
    ctx.font      = `${labelFontSize}px Consolas, monospace`
    ctx.fillStyle = 'rgba(200,215,235,0.9)'
    ctx.strokeStyle = 'rgba(120,140,170,0.7)'
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'

    let lastBottom = -Infinity
    for (let i = 0; i < n; i++) {
      const value = rangeStart + step * (i + 0.5)
      const text  = fmtVal(value, displayFormat)
      const midY  = barTop + cellH * i + cellH / 2
      const textH = labelFontSize * 1.2

      if (midY - textH / 2 < lastBottom + 1) continue
      lastBottom = midY + textH / 2

      // 틱
      ctx.beginPath()
      ctx.moveTo(barLeft - TICK_LEN, midY)
      ctx.lineTo(barLeft,            midY)
      ctx.lineWidth = 1
      ctx.stroke()

      // 라벨
      const tw = ctx.measureText(text).width
      const tx = Math.max(PAD + tw, barLeft - TICK_LEN - TICK_GAP)
      ctx.fillText(text, tx, midY)
    }
  }

  ctx.restore()
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export default function WaferMapRange({
  rangeStart = 0,
  rangeEnd   = 1,
  colors     = PALETTES.jet,
  distributions   = null,
  useDistribution = false,
  useLogScaleBar  = false,
  displayFormat   = 'F4',
  labelFontSize   = 10,
  useAutoRange    = true,
  onRangeChange,
  onColorsChange,
}) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const isDragging   = useRef(false)
  const dragStartY   = useRef(0)
  const dragOrigStart = useRef(rangeStart)
  const dragOrigEnd   = useRef(rangeEnd)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const { token } = theme.useToken()

  const draw = useCallback(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    renderCanvas(canvas, container, {
      rangeStart, rangeEnd, colors, distributions,
      useDistribution, useLogScaleBar, displayFormat, labelFontSize,
    })
  }, [rangeStart, rangeEnd, colors, distributions, useDistribution, useLogScaleBar, displayFormat, labelFontSize])

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => requestAnimationFrame(draw))
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  // ── 마우스 휠: 줌 ──
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const d = (rangeEnd - rangeStart) * Math.sign(e.deltaY) / 20
    onRangeChange?.({ start: rangeStart + d, end: rangeEnd - d, auto: false })
  }, [rangeStart, rangeEnd, onRangeChange])

  // ── 드래그: 패닝 ──
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    isDragging.current   = true
    dragStartY.current   = e.clientY
    dragOrigStart.current = rangeStart
    dragOrigEnd.current   = rangeEnd
  }, [rangeStart, rangeEnd])

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    const container = containerRef.current
    const H = container?.clientHeight || 1
    const dy = e.clientY - dragStartY.current
    const span = dragOrigEnd.current - dragOrigStart.current
    onRangeChange?.({
      start: dragOrigStart.current + span * (-dy / H),
      end:   dragOrigEnd.current   + span * (-dy / H),
      auto: false,
    })
  }, [onRangeChange])

  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const openModal = () => {
    form.setFieldsValue({ start: rangeStart, end: rangeEnd })
    setModalOpen(true)
  }

  // ── 컨텍스트 메뉴 ──
  const menuItems = [
    {
      key: 'autoRange',
      label: `자동 범위 ${useAutoRange ? '✓' : ''}`,
      onClick: () => onRangeChange?.({ start: rangeStart, end: rangeEnd, auto: !useAutoRange }),
    },
    { key: 'setRange', label: '범위 설정...', onClick: openModal },
    { type: 'divider' },
    {
      key: 'colors',
      label: '컬러맵',
      children: [
        { key: 'jet',      label: 'Jet (기본)',  onClick: () => onColorsChange?.(PALETTES.jet) },
        { key: 'gray',     label: '흑백',        onClick: () => onColorsChange?.(PALETTES.gray) },
        { key: 'blue',     label: 'Blue',        onClick: () => onColorsChange?.(PALETTES.blue) },
        { key: 'palette1', label: 'Rainbow 1',   onClick: () => onColorsChange?.(PALETTES.palette1) },
        { key: 'palette2', label: 'Rainbow 2',   onClick: () => onColorsChange?.(PALETTES.palette2) },
        { key: 'palette3', label: 'Spectrum',    onClick: () => onColorsChange?.(PALETTES.palette3) },
      ],
    },
    { type: 'divider' },
    {
      key: 'dist',
      label: `분포 표시 ${useDistribution ? '✓' : ''}`,
      onClick: () => onRangeChange?.({ start: rangeStart, end: rangeEnd, auto: useAutoRange, dist: !useDistribution }),
    },
  ]

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onDoubleClick={openModal}
          style={{ display: 'block', width: '100%', height: '100%', cursor: 'ns-resize' }}
        />
      </Dropdown>

      <Modal
        title="범위 설정"
        open={modalOpen}
        onOk={() => {
          const v = form.getFieldsValue()
          if (v.start != null && v.end != null && v.start < v.end) {
            onRangeChange?.({ start: v.start, end: v.end, auto: false })
          }
          setModalOpen(false)
        }}
        onCancel={() => setModalOpen(false)}
        width={260}
        okText="적용"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="start" label="시작값 (하단)">
            <InputNumber style={{ width: '100%' }} step={0.01} precision={6} />
          </Form.Item>
          <Form.Item name="end" label="끝값 (상단)">
            <InputNumber style={{ width: '100%' }} step={0.01} precision={6} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
